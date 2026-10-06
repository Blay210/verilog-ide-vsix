"""slang adapter. Inputs are data only; no project Python or simulator is executed."""
import json
import os
import sys
import locale
import re
import pyslang as slang


def dependencies(tree, manager):
    graph = {'declarations': [], 'references': []}
    sequence = 0
    def source(location):
        location = manager.getFullyExpandedLoc(location)
        while manager.getIncludedFrom(location.buffer):
            location = manager.getIncludedFrom(location.buffer)
        return str(manager.getFullPath(location.buffer))
    def visit(node):
        nonlocal sequence
        if not isinstance(node, slang.syntax.SyntaxNode):
            return
        sequence += 1
        kind = str(node.kind).split('.')[-1]
        if kind == 'PackageDeclaration':
            graph['declarations'].append({'name': node.header.name.valueText, 'file': source(node.sourceRange.start), 'offset': sequence})
        elif kind == 'PackageImportItem':
            graph['references'].append({'name': node.package.valueText, 'file': source(node.sourceRange.start), 'offset': sequence, 'explicit': True})
        elif kind == 'ScopedName' and str(node.left.kind).endswith('.IdentifierName') and node.separator.valueText == '::':
            graph['references'].append({'name': node.left.getFirstToken().valueText, 'file': source(node.sourceRange.start), 'offset': sequence, 'explicit': False})
    tree.root.visit(visit)
    return graph


def hierarchy(root, manager, point):
    count = 0
    def spelling(expression):
        if isinstance(expression, slang.ast.ConversionExpression) and expression.isImplicit:
            return spelling(expression.operand)
        if expression.syntax is None:
            if isinstance(expression, slang.ast.RangeSelectExpression):
                return spelling(expression.value) + '[' + spelling(expression.left) + ':' + spelling(expression.right) + ']'
            if isinstance(expression, slang.ast.ElementSelectExpression):
                return spelling(expression.value) + '[' + spelling(expression.selector) + ']'
            if isinstance(expression, slang.ast.IntegerLiteral):
                return str(expression.value)
        start = manager.getFullyOriginalLoc(expression.sourceRange.start)
        end = manager.getFullyOriginalLoc(expression.sourceRange.end)
        if start and end and start.buffer == end.buffer:
            return manager.getSourceText(start.buffer).encode('utf-8')[start.offset:end.offset].decode('utf-8', errors='replace').strip()
        return str(expression.kind).split('.')[-1]

    def bindings(instance, top):
        connections = {c.port.name: c for c in instance.portConnections}
        ports = []
        for port in instance.body.portList:
            direction = str(getattr(port, 'direction', 'interface')).split('.')[-1].lower()
            binding = {'kind': 'top' if top else 'unconnected', 'text': '', 'references': []}
            connection = connections.get(port.name)
            if direction == 'interface':
                binding.update(kind='interface', text='Interface/modport binding: inspect source')
            elif connection is not None and connection.expression is not None:
                expression = connection.expression
                # Output binding is represented as an implicit assignment to the
                # parent expression. Its synthetic RHS is the child's port value.
                if isinstance(expression, slang.ast.AssignmentExpression):
                    expression = expression.left
                start = manager.getFullyOriginalLoc(expression.sourceRange.start)
                text = spelling(expression)
                references = {}
                def reference(node):
                    if isinstance(node, (slang.ast.NamedValueExpression, slang.ast.HierarchicalValueExpression)):
                        symbol = node.symbol
                        if symbol.location:
                            references[symbol.hierarchicalPath] = {'name': symbol.name, 'path': symbol.hierarchicalPath, 'location': point(symbol.location)}
                expression.visit(reference)
                if text in ('.*', '.' + port.name) and len(references) == 1:
                    text = next(iter(references.values()))['name']
                binding.update(kind='expression', text=text or str(expression.kind).split('.')[-1], references=list(references.values()))
                if start:
                    binding['location'] = point(start)
            ports.append({'name': port.name, 'direction': {'in': 'input', 'out': 'output'}.get(direction, direction),
                          'type': str(getattr(port, 'type', 'interface')), 'location': point(port.location), 'connection': binding,
                          **({'signalType': signal_type(port.type)} if hasattr(port, 'type') else {})})
        return ports

    def node(symbol, parent='', depth=0, top=False, segments=()):
        nonlocal count
        if isinstance(symbol, (slang.ast.GenerateBlockSymbol, slang.ast.GenerateBlockArraySymbol)) and symbol.isUninstantiated:
            return None
        instance = isinstance(symbol, slang.ast.InstanceSymbol)
        generate = isinstance(symbol, slang.ast.GenerateBlockSymbol)
        array = isinstance(symbol, (slang.ast.GenerateBlockArraySymbol, slang.ast.InstanceArraySymbol))
        if not (instance or generate or array):
            return None
        count += 1
        if count > 10000 or depth > 128:
            raise ValueError('Hierarchy exceeds 10000 nodes or 128 levels; select a smaller design.')
        identifier = symbol.hierarchicalPath
        members = list(symbol.body if instance else symbol)
        result = {'id': identifier, 'name': identifier[len(parent):].lstrip('.') if parent and (identifier.startswith(parent + '.') or identifier.startswith(parent + '[')) else identifier,
                  'kind': 'instance' if instance else 'generate' if generate else 'array',
                  'location': point(symbol.location), 'parameters': [], 'ports': [], 'children': []}
        # Use compiler symbol spelling, not escaped pretty-print hierarchical IDs.
        local = result['name'] if result['name'].startswith('[') else (symbol.name or result['name'])
        parts = (*segments[:-1], segments[-1] + local) if segments and local.startswith('[') else (*segments, local)
        result['instancePath'] = list(parts)
        enums = []
        for member in members:
            if not isinstance(member, (slang.ast.VariableSymbol, slang.ast.NetSymbol)):
                continue
            t = member.type.canonicalType
            if not t.isEnum or not 0 < t.bitWidth <= 256:
                continue
            values = []
            for constant in t:
                value = constant.value
                if not isinstance(value.value, slang.SVInt) or value.hasUnknown():
                    values = []
                    break
                bits = format(int(value.value) & ((1 << t.bitWidth) - 1), '0%db' % t.bitWidth)
                values.append({'name': constant.name, 'bits': bits})
                if len(values) > 256:
                    values = []
                    break
            if values:
                enums.append({'name': member.name, 'width': t.bitWidth, 'values': values})
        if enums:
            result['enumSignals'] = enums
        for member in members:
            if isinstance(member, (slang.ast.ParameterSymbol, slang.ast.TypeParameterSymbol)):
                result['parameters'].append({'name': member.name, 'value': str(member.value) if isinstance(member, slang.ast.ParameterSymbol) else str(member.targetType.type),
                                             'overridden': member.isOverridden, 'local': member.isLocalParam, 'location': point(member.location)})
            child = node(member, identifier, depth + 1, segments=parts)
            if child is not None:
                result['children'].append(child)
        if instance:
            result.update(module=symbol.definition.name, definition=point(symbol.definition.location), ports=bindings(symbol, top))
        return result
    return [node(instance, top=True) for instance in root.topInstances]


def complete(compilation, defaults, query, manager, point, source_files):
    """Enumerate candidates, but let slang perform visibility/import/name resolution."""
    filename = os.path.normcase(os.path.realpath(query['file']))
    offset = query['offset']
    # Overlays include other open tabs too. Only compiled sources and headers that
    # were actually included belong to this compilation's visibility context.
    known_files = {os.path.normcase(os.path.realpath(file)) for file in source_files}
    known_files.update(os.path.normcase(os.path.realpath(str(manager.getFullPath(buffer)))) for buffer in manager.getAllBuffers() if manager.getIncludedFrom(buffer))
    if filename not in known_files:
        return []
    qualifier = query.get('qualifier')
    names = set()
    scopes = []
    allowed = {'InstanceBody', 'Package', 'Subroutine', 'StatementBlock', 'GenerateBlock', 'CompilationUnit'}

    def in_file(location):
        return location['file'] and os.path.normcase(os.path.realpath(location['file'])) == filename

    def collect(symbol):
        if not isinstance(symbol, slang.ast.Symbol):
            return
        if re.fullmatch(r'[A-Za-z_][A-Za-z0-9_$]*', symbol.name):
            names.add(symbol.name)
        if isinstance(symbol, slang.ast.Scope) and symbol.syntax is not None:
            start = point(symbol.syntax.sourceRange.start)
            end = point(symbol.syntax.sourceRange.end)
            if in_file(start) and in_file(end) and start['offset'] <= offset <= end['offset']:
                scopes.append((end['offset'] - start['offset'], symbol))

    compilation.getRoot().visit(collect)
    if not any(str(scope.kind).split('.')[-1] != 'CompilationUnit' for _, scope in scopes):
        # Uninstantiated modules still need editing support, using their defaults.
        defaults.getRoot().visit(collect)
    # fromBuffers creates one compilation unit whose syntax can span several files.
    # Its start/end cannot serve as a same-file range, but file-level imports and
    # declarations must still be available when the caret is outside a module.
    if not scopes:
        scopes.extend((float('inf'), unit) for unit in compilation.getCompilationUnits())
    for package in compilation.getPackages():
        if package.name != 'std':
            package.visit(lambda symbol: names.add(symbol.name) if isinstance(symbol, slang.ast.Symbol) and re.fullmatch(r'[A-Za-z_][A-Za-z0-9_$]*', symbol.name) else None)
            names.add(package.name)
    if qualifier and (not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_$]*', qualifier) or compilation.getPackage(qualifier) is None):
        return []
    if not scopes:
        return []
    if any(str(scope.kind).split('.')[-1] == 'ClassType' for _, scope in scopes):
        return []
    smallest = min(size for size, _ in scopes)
    innermost = [scope for size, scope in scopes if size == smallest]
    results = []
    for scope in innermost:
        kind = str(scope.kind).split('.')[-1]
        # A class or other unsupported nested scope must not leak its outer scope.
        if kind not in allowed:
            return []
        lookup_location = slang.ast.LookupLocation.max
        # Preserve declaration order. Select the next actual symbol's lookup index,
        # rather than inferring SystemVerilog ordering rules from text.
        following = []
        for member in scope:
            if not member.location:
                continue
            location = point(member.location)
            if in_file(location) and location['offset'] >= offset:
                following.append((location['offset'], member))
        if following:
            lookup_location = slang.ast.LookupLocation.before(min(following, key=lambda entry: entry[0])[1])
        found = {}
        for name in sorted(names):
            symbol = scope.lookupName((qualifier + '::' if qualifier else '') + name, lookup_location, slang.ast.LookupFlags.NoUndeclaredError)
            if symbol is None or not symbol.location:
                continue
            entry = describe_symbol(symbol, point)
            if entry is not None and os.path.normcase(os.path.realpath(entry['location']['file'])) in known_files:
                # A typedef/enum import may resolve to another declaration; the
                # candidate name is the spelling available at the query location.
                entry['name'] = name
                t = getattr(symbol, 'type', None)
                if t is not None and t.canonicalType.isEnum:
                    values = []
                    for member in t.canonicalType:
                        if len(values) >= 256 or not isinstance(member.value.value, slang.SVInt) or member.value.hasUnknown():
                            values = []
                            break
                        spelling = None
                        visible = scope.lookupName(member.name, lookup_location, slang.ast.LookupFlags.NoUndeclaredError)
                        if visible is not None and visible.location and point(visible.location) == point(member.location):
                            spelling = member.name
                        else:
                            for package in compilation.getPackages():
                                if package.name == 'std':
                                    continue
                                qualified_name = package.name + '::' + member.name
                                visible = scope.lookupName(qualified_name, lookup_location, slang.ast.LookupFlags.NoUndeclaredError)
                                if visible is not None and visible.location and point(visible.location) == point(member.location):
                                    spelling = qualified_name
                                    break
                        if spelling is None:
                            values = []
                            break
                        values.append({'name': spelling, 'value': str(member.value)})
                    if values:
                        entry['enumValues'] = values
                found[name] = entry
        results.append(found)
    # Multiple parameterizations at the same source location must agree.
    return [value for name, value in results[0].items() if all(result.get(name) == value for result in results[1:])]


def signal_type(t):
    simple = t.isSimpleBitVector
    result = {'text': str(t), 'simpleIntegral': simple}
    if simple:
        result.update(width=t.bitWidth, signed=t.isSigned, fourState=t.isFourState)
    return result


def describe_symbol(symbol, point):
    kind = str(symbol.kind).split('.')[-1]
    categories = {'Variable': 'variable', 'Net': 'variable', 'FormalArgument': 'variable', 'Port': 'variable',
                  'Parameter': 'constant', 'EnumValue': 'constant', 'Genvar': 'constant',
                  'TypeAlias': 'type', 'TypeParameter': 'type', 'ClassType': 'type',
                  'Subroutine': 'function', 'Instance': 'module', 'Package': 'package'}
    if kind not in categories:
        return None
    try:
        detail = str(getattr(symbol, 'type', ''))
    except RuntimeError:
        # Invalid enum initializers can leave a native error type whose display
        # conversion raises. Do not turn one broken symbol into a failed query.
        return None
    if kind == 'Subroutine':
        detail = str(symbol.returnType) + ' ' + symbol.name + '(' + ', '.join(str(arg.type) + ' ' + arg.name for arg in symbol.arguments) + ')'
    elif kind in ('TypeAlias', 'TypeParameter', 'ClassType'):
        detail = 'type ' + symbol.name
    elif kind == 'Instance':
        detail = symbol.definition.name + ' ' + symbol.name
    elif kind == 'Package':
        detail = 'package ' + symbol.name
    else:
        detail = kind.lower() + ' ' + detail + ' ' + symbol.name
    result = {'name': symbol.name, 'kind': categories[kind], 'detail': detail, 'location': point(symbol.location)}
    if kind in ('Variable', 'Net', 'FormalArgument', 'Port', 'Parameter', 'EnumValue'):
        result['signalType'] = signal_type(symbol.type)
    if kind == 'Subroutine':
        arguments = []
        for arg in symbol.arguments:
            direction = str(arg.direction).split('.')[-1].lower()
            direction = {'in': 'input', 'out': 'output', 'inout': 'inout', 'ref': 'ref'}.get(direction, direction)
            initializer = getattr(arg.syntax, 'initializer', None) if arg.syntax is not None else None
            label = direction + ' ' + str(arg.type) + ' ' + arg.name
            if initializer is not None:
                label += ' ' + str(initializer).strip()
            arguments.append({'name': arg.name, 'label': label})
        result['callable'] = {'kind': str(symbol.subroutineKind).split('.')[-1].lower(), 'returnType': str(symbol.returnType), 'arguments': arguments}
    return result


def analyze(request):
    if os.name == 'nt':
        # Native std::filesystem string conversion must use UTF-8, not the system ACP.
        locale.setlocale(locale.LC_ALL, '.UTF8')
    manager = slang.SourceManager()
    for directory in request['includeDirs']:
        manager.addUserDirectories(os.path.abspath(directory))
    buffers = {}
    for overlay in request['overlays']:
        # readHeader canonicalizes junctions; use that same cache key for overlays.
        filename = os.path.realpath(overlay['file'])
        buffers[os.path.normcase(filename)] = manager.assignText(filename, overlay['text'])
    sources = []
    for filename in request['sources']:
        filename = os.path.abspath(filename)
        key = os.path.normcase(os.path.realpath(filename))
        sources.append(buffers[key] if key in buffers else manager.readSource(filename))
    preprocessor = slang.parsing.PreprocessorOptions()
    # Bindings hold string_views: keep the Python strings alive for compilation.
    predefines = [key + '=' + value for key, value in request['defines'].items()]
    preprocessor.predefines = predefines
    tree = slang.syntax.SyntaxTree.fromBuffers(sources, manager, slang.Bag([preprocessor]))
    if request.get('operation') == 'dependencies':
        return dependencies(tree, manager)
    compilation_options = slang.ast.CompilationOptions()
    selected_tops = {request['top']} if request.get('top') else set()
    compilation_options.topModules = selected_tops
    compilation = slang.ast.Compilation(slang.Bag([compilation_options]))
    compilation.addSyntaxTree(tree)
    root = compilation.getRoot()

    def point(location):
        location = manager.getFullyOriginalLoc(location)
        filename = str(manager.getFullPath(location.buffer))
        # slang uses UTF-8 bytes; LSP and JavaScript use UTF-16 code units.
        prefix = manager.getSourceText(location.buffer).encode('utf-8')[:location.offset].decode('utf-8', errors='replace')
        return {'file': filename, 'offset': len(prefix.encode('utf-16-le')) // 2,
                'line': prefix.count('\n'), 'character': len(prefix.rsplit('\n', 1)[-1].encode('utf-16-le')) // 2}

    def ports(instance):
        result = []
        for port in instance.body.portList:
            direction = str(getattr(port, 'direction', 'interface')).split('.')[-1].lower()
            result.append({'name': port.name, 'direction': {'in': 'input', 'out': 'output'}.get(direction, direction),
                           'type': str(getattr(port, 'type', 'interface')), 'location': point(port.location),
                           **({'signalType': signal_type(port.type)} if hasattr(port, 'type') else {})})
        return result

    def parameters(instance):
        result = []
        for member in instance.body:
            if isinstance(member, (slang.ast.ParameterSymbol, slang.ast.TypeParameterSymbol)) and not member.isLocalParam:
                value_parameter = isinstance(member, slang.ast.ParameterSymbol)
                result.append({'name': member.name, 'type': str(member.type) if value_parameter else 'type',
                               'defaultValue': str(member.value) if value_parameter else str(member.targetType.type)})
        return result

    instances = []
    covered_instances = None
    def visit(symbol):
        if isinstance(symbol, slang.ast.InstanceSymbol) and symbol.syntax is not None:
            start = point(symbol.syntax.sourceRange.start)
            # Preserve actual selected-top elaborations (including ambiguity).
            # Default elaboration only fills source locations absent from them.
            key = (os.path.normcase(start['file']), start['offset'])
            if covered_instances is not None and key in covered_instances:
                return
            end = point(symbol.syntax.sourceRange.end)
            if os.path.normcase(end['file']) != os.path.normcase(start['file']):
                # Parser recovery can consume the next source buffer when a
                # closer is absent. Editor ranges are single-file: cap this
                # compiler-confirmed instance at its original buffer's EOF.
                origin = manager.getFullyOriginalLoc(symbol.syntax.sourceRange.start)
                text = manager.getSourceText(origin.buffer)
                end = {'file': start['file'], 'offset': len(text.encode('utf-16-le')) // 2,
                       'line': text.count('\n'), 'character': len(text.rsplit('\n', 1)[-1].encode('utf-16-le')) // 2}
            instances.append({'name': symbol.name, 'module': symbol.definition.name,
                              'start': start, 'end': end,
                              'ports': ports(symbol)})
            parent = symbol.syntax.parent
            if parent is not None and str(parent.kind).split('.')[-1] == 'HierarchyInstantiation' and parent.parameters is not None:
                instances[-1].update(parameterStart=point(parent.parameters.sourceRange.start), parameterEnd=point(parent.parameters.sourceRange.end))
    root.visit(visit)
    engine = slang.DiagnosticEngine(manager)
    diagnostics = []
    for diagnostic in compilation.getAllDiagnostics():
        if not diagnostic.location:
            continue
        severity = str(engine.getSeverity(diagnostic.code, diagnostic.location)).split('.')[-1].lower()
        if severity == 'ignored':
            continue
        diagnostics.append({'location': point(diagnostic.location), 'severity': 'error' if severity in ('fatal', 'error') else 'warning' if severity == 'warning' else 'note',
                            'message': engine.formatMessage(diagnostic), 'code': str(diagnostic.code)})
    if request.get('operation') == 'hierarchy':
        return {'roots': [] if any(d['severity'] == 'error' for d in diagnostics) else hierarchy(root, manager, point), 'diagnostics': diagnostics}
    # Elaborate every module with its default parameters for declaration signatures.
    # Instance signatures above retain actual parameter overrides.
    options = slang.ast.CompilationOptions()
    top_names = {definition.name for definition in compilation.getDefinitions()}
    options.topModules = top_names
    defaults = slang.ast.Compilation(slang.Bag([options]))
    defaults.addSyntaxTree(tree)
    covered_instances = {(os.path.normcase(i['start']['file']), i['start']['offset']) for i in instances}
    defaults.getRoot().visit(visit)
    modules = [{'name': instance.definition.name, 'kind': instance.definition.getKindString(),
                'location': point(instance.definition.location), 'ports': ports(instance), 'parameters': parameters(instance)}
               for instance in defaults.getRoot().topInstances]
    result = {'modules': modules, 'instances': instances, 'diagnostics': diagnostics}
    if request.get('query'):
        result['completions'] = complete(compilation, defaults, request['query'], manager, point, request['sources'])
    return result


if __name__ == '__main__':
    with open(sys.argv[1], encoding='utf-8') as source:
        request = json.load(source)
    result = analyze(request)
    with open(sys.argv[2], 'w', encoding='utf-8') as destination:
        json.dump(result, destination, ensure_ascii=False)
