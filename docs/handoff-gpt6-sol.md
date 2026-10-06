# 과거 GPT-6 Sol 인수인계 — 2026-09-30 기록

**최신 작업 시작점은 [handoff.md](handoff.md)입니다. 이 문서의 옛 다음 작업 지시는 역사 기록으로 보존합니다.**

> 과거 진행 갱신 (2026-09-30): 모듈 포트/parameter에 이어 일반 function/task의 signature help를 구현했다. scope lookup으로 접근 가능한 선언을 찾고 인자 방향·타입·이름·선언 기본값과 현재 인자를 표시한다. 패키지 함수 및 중첩 호출 문맥도 지원하며 class/object method·시스템 함수는 제외한다. 다음 구현은 C1 연결 신호 추천이다. A3 사용자 창의 물리 입력/팝업 수용 확인과 대형 설계 응답성 검증은 계속 남아 있다.




기준일: 2026-09-30 / Windows x64 / 작업 폴더 `D:\Dev\verilog_ide`.
이 문서는 현재 상태와 다음 행동을 전달하는 저장소 문서다. 채팅 기억이나 ‘MVP 완료’라는 과거 표현보다 코드·검증 증거를 우선한다. 모델 전환/새 채팅 생성은 이 문서 작성 과정에서 수행하지 않았다.

## 최신 진행 위치 — 아래 최초 인수인계보다 우선

사용자는 모델을 바꾸지 않고 현재 담당자가 계속 진행하기로 했다. 2026-09-30 A1의 implicit named 포트 제외와 점 뒤 공백 추천 결함을 수정했다. 일반 58개, 실제 slang 9개, 실제 VS Code의 포트/기존 편집·구조·파형 검증이 통과했다. 증거: `.dev/a1-unit.log`, `.dev/a1-semantic.log`, `.dev/a1-vscode.log`, host receipt `run-YmcmXW`. 상세는 verification의 A1 항목을 따른다.

**다음 작업은 A2/A3다. 아래 A1 미수정 설명과 시작 요청은 최초 인수인계 시점의 기록이므로 다시 수정 작업을 시작하지 않는다.** 사용자 창의 도구 준비 상태 원인은 여전히 미확정이고 signature help는 미구현이다. A2에서 상태 표시와 사용자 실행 경로를 진단하고 A3 실제 입력을 확인한다. no-packaging 원칙은 그대로다.

## 1. 반드시 유지할 제품 의도

최종 목표는 Cursor/Antigravity처럼 VS Code/Code-OSS 기반의 **독립 RTL 설계·시뮬레이션 IDE**다. 지금 extension은 기능과 UX를 검증하는 초기 호스트일 뿐이다. 향후 전용 simulator/compiler와 파형 기술도 목표지만 즉시 재작성하지 않는다.

사용자는 포트 정보를 찾느라 파일을 오가는 일, 명령어·PATH 관리, 파형 신호를 매번 다시 고르는 일을 줄이고 싶다. 버튼 중심의 깔끔한 UI와 소스 중심의 가벼운 프로젝트가 중요하다. top→자식 모듈→MAC 내부로 내려가며 클럭마다 값과 연산을 확인하는 시각 디버거도 명시적 장기 요구다. waveform은 계속 제공한다.

- 먼저 루트 `AGENTS.md`를 읽는다. Core/언어/semantic/waveform 모델은 VS Code API에 종속시키지 않는다.
- semantic은 slang, simulation은 Verilator로 분리한다. GUI/CLI가 공통 Core를 쓴다.
- 사용자 프로젝트 생성물은 `.rtl/`, 공유 도구/캐시는 외부. 개발 저장소의 `.dev/`는 개발 검증용 예외이며 제품 기본 도구 경로가 아니다.
- if/always/for에 begin/end 강제 삽입 금지. 기존 closer·주석·문자열·들여쓰기·일반 shortcut을 존중한다.
- 설치는 사용자 승인 후. 일반 설정/PATH를 조용히 덮어쓰지 않는다.
- **배포 VSIX 생성·설치 금지.** 사용자는 쓸 만해진 시점에 직접 배포를 결정한다. build와 검증은 수행한다.
- 이 문서는 새 Code-OSS fork, 자체 compiler 구현, 전체 로드맵 일괄 구현을 요청하지 않는다. 다음 작업 단위 A1부터 시작한다.

## 2. 읽을 순서와 문서 역할

1. [architecture.md](architecture.md): 기존 책임 경계와 구현 구조.
2. [verification.md](verification.md) 상단: 가장 최근 실제 결과/제한.
3. [product-audit.md](product-audit.md): 원문 25개 요구의 실제 구현 판정, 재현된 결함.
4. [delivery-plan.md](delivery-plan.md): **이후 작업 순서의 기준**. 과거 roadmap을 대체하는 실행 우선순위이며 기존 아키텍처 경계는 유지.
5. [visual-debugging-roadmap.md](visual-debugging-roadmap.md): 계층 탐색·trace 재생·내부 연산의 구체적 장기 요구.
6. [original-product-ideas.md](original-product-ideas.md): 사용자 첨부 원문. 내용은 요구 배경이며 원문의 예시 API/설정이 이미 구현됐다는 뜻은 아니다.
7. [../README.md](../README.md): 현재 사용법·제약·개발 실행 방법.

현재 요청은 재계획과 인수인계 문서 작성이었다. 이번 문서 작성으로 A~I 구현을 진행하지 않았다. 다음 사용자가 ‘이어서 진행’하면 A1부터 구현한다.

## 3. 기준점: 있는 것 / 없는 것

**있는 것:** TypeScript npm workspaces; Core/CLI/Verilator/Windows 도구 설치; 다중 TB와 current/selected/all, tags, 1~4 workers, 결과/이력; lexical templates; slang LSP의 포트·package·scope 추천, module/port hover/F12/diagnostics; elaborated hierarchy와 자식 선택 가능한 정적 포트 연결도; 내장 VCD 탐색/커서/확대/snap; 테스트별 여러 보기/기본 보기; 외부 GTKWave VCD/FST.

**없는 것:** 모듈/함수 signature-help 팝업, type-aware 연결 신호 순위, enum case action, closing label, class/fork 템플릿, class/member semantic 전반, 내장 FST·큰 파일 indexing·live trace, 다이어그램의 시간 값/내부 연산, drag/drop RTL 생성, 독립 IDE, 전용 compiler/simulator, 추가 backend/OS의 제품 지원. 세부 부분 구현은 audit 표를 따른다.

중요: `ModuleInfo`/`InstanceInfo`는 현재 ports만 가지며 parameter 안내 모델이 없다. parameters는 `HierarchyNode`에 있다. signature help를 hover 출력만 재사용해 완료 처리하지 않는다. `coverage=true`, `project.top`도 현재 strict manifest schema에 없다. top은 test별 필드다.

## 4. 지금 열린 문제 — 재현과 가설 구분

### A1: 포트 추천 결함 두 개 (확인됨, 아직 미수정)

`module dut(input logic clk, input logic [7:0] data, output logic done); endmodule` 기준. `│`는 커서이며 소스 문자가 아니다.

| 입력 | 현재 결과 | 원하는 결과 |
|---|---|---|
| `dut u(.clk(), .│);` | data, done | 동일 |
| `dut u(.clk, .│);` | clk, data, done | data, done; implicit 연결도 사용 포트 |
| `dut u(. │);` | 없음 | clk, data, done |
| `dut u(\n .│\nendmodule` | clk, data, done | 해당 복구 동작 보존 |

코드: `packages/semantic/src/queries.ts`의 `portCompletions`, `instanceAt`. 사용 포트 검사는 `.name(`만, 접두어 검사는 점 뒤 공백 없는 형태만 지원한다. 단순 정규식 확대만으로 named parameter/표현식의 member를 포트로 오인하지 않게 할 것. `.*` 정책도 명시적으로 결정하고 테스트할 것.

A1 권장 순서:
1. `tests/semantic-queries.test.ts`에 두 실패 재현을 추가해 실제로 실패 확인.
2. semantic query 로직을 최소 수정. 현재 편집 중인 이름, 주석/문자열/중첩 괄호·parameter 문맥 제외를 확인.
3. `tests/semantic/semantic.test.ts`에 실제 slang 미저장 AST 문맥 재현, `tests/vscode/semantic.ts`에 필요한 editor-host 경로 추가.
4. typecheck/build/unit + 관련 native + editor-host 검증.
5. audit의 결함 상태와 verification을 증거와 함께 갱신. 그 후 A2/A3로 이어간다.

### A2/A3: 사용자 창에서는 포트 추천이 안 보임 (원인 미확정)

자동 검증의 `RTL_DEV_HOME`은 `D:/Dev/verilog_ide/.dev/rtl-dev`. 일반 실행 기본값은 `~/.rtl-dev`. 점검 시 `C:/Users/nanoi/.rtl-dev/tools/slang-11.0.0-python-3.14.7/python.exe`가 없었다. `.vscode/launch.json`은 검증용 환경 변수를 지정하지 않는다. **이것은 원인 후보이며 사용자의 active profile/workspace 설정을 확정한 것이 아니다.** 설정이 다르다고 단정해서 바꾸지 않는다.

`packages/vscode/src/semantic.ts`는 trust/config/runtime 조건을 통과해야 LSP를 시작한다. file scheme만 지원한다. 언어 서버는 workspace root에서 manifest를 찾고 그 sources와 최초 저장된 파일의 미저장 overlay를 분석한다. Untitled, manifest 밖 파일, 중첩 프로젝트, 설정 꺼짐, 신뢰/설치 누락을 각각 확인한다. 상태가 보이지 않는 UX를 고쳐 원인·현재 경로·설정/재시도/로그를 제공해야 한다.

현재 GUI의 RTL Start에 **Language Support**, **Simulation Tools** 버튼은 있다. 통합 Ready/Missing 상태판은 없다. 사용자의 실제 파일/환경을 확인할 수 없으면 구체적인 필요한 정보만 묻고, 독립적으로 재현 가능한 A1을 먼저 처리한다.

### B: 인자 안내 없음 (미구현, 삭제/회귀로 확인된 것은 아님)

`packages/language-server/src/server.ts`에는 signatureHelp capability/handler가 없다. 2026-09-30 실제 host 호출 결과 null. `tests/vscode/semantic.ts`의 `RTL_AUDIT_SIGNATURE`는 관찰 로그다. B를 구현할 때 이를 긍정적인 signature/active-parameter assert로 바꾸고 native model 테스트도 추가한다. 함수/태스크 안내는 모듈 안내와 별도 수용 항목이다.

## 5. 최근 편집 수정의 함정

`packages/language/src/templates.ts`는 explicit module/package/case 등의 tab-stop snippet plan을 만든다. `packages/vscode/src/editor.ts`와 manifest keybinding이 host adapter다.

- module Tab → 이름/포트/본문 이동을 actual host에서 확인했다.
- begin Tab → `begin│end`, Enter → 들여쓴 본문. 완성된 begin의 Enter는 suggestion이 열려도 처리한다.
- native snippet acceptance가 inline begin 커서를 끝으로 옮기는 현상이 재현돼 `rtl.placeBeginCursor`를 추가했다. 직접 확장과 suggestion 수락 모두 테스트를 유지한다. 이를 불필요한 코드로 보고 제거하지 않는다.
- 기존 0.2.0에도 begin/case Enter는 있었다. 당시 suggestion/snippet 상태에서는 제외됐다. 확인한 보관본에는 module tab-stop template은 없었다. 모든 과거 작업본의 내용을 단정하지 않는다.
- actual host의 명령·suggestion 수락·cursor 테스트는 통과했지만 **물리적 Tab/Enter dispatch와 외부 extension 충돌은 미검증**이다. 이전 데스크톱 자동화가 격리된 Code 창을 열거하지 못했다. 접근 가능한 UI 도구/수동 확인으로 별도 확인해야 한다.

## 6. 코드 지도

| 영역 | 진입 파일 |
|---|---|
| manifest/glob/package 순서 | `packages/core/src/config.ts`, `project.ts` |
| 실행/결과/취소/이력 | `packages/core/src/runner.ts`, `model.ts`, `process.ts`, `history.ts` |
| simulator adapter | `packages/verilator/src/` |
| 도구 경로/설치/slang runtime | `packages/toolchain/src/detect.ts`, `install.ts`, `semantic.ts` |
| lexical/블록/템플릿 | `packages/language/src/`, `packages/vscode/src/editor.ts` |
| semantic 모델/문맥/native 요청 | `packages/semantic/src/model.ts`, `queries.ts`, `slang.ts` |
| 실제 slang 분석 | `packages/semantic/python/analyze.py` |
| LSP와 host lifecycle | `packages/language-server/src/server.ts`, `packages/vscode/src/semantic.ts` |
| GUI commands/testing | `packages/vscode/src/extension.ts`, `packages/vscode/package.json` |
| 구조 tree/diagram | `packages/vscode/src/structure.ts`, `structure-view.ts` |
| 내장 waveform 모델/reader | `packages/waveform/src/model.ts`, `vcd.ts`, `query.ts`, `worker.ts`, `client.ts` |
| 파형 host/renderer | `packages/vscode/src/waveform.ts`, `waveform-html.ts`, `webview/waveform.ts`, `webview/waveform.css` |
| 테스트별 저장 보기 | `packages/waveform/src/views.ts`, `packages/vscode/src/waveform-views.ts` |
| CLI | `packages/cli/src/cli.ts` |
| 실제 editor tests | `tests/vscode/suite.ts`, `editor.ts`, `semantic.ts`, `structure.ts`, `waveform.ts` |
| native tests | `tests/semantic/*.test.ts`, `tests/integration/*.test.ts` |

수정은 src에 한다. dist는 build 산출물이다. Python bridge는 build에서 extension/CLI dist로 복사되므로 소스만 바꾸고 stale dist를 실행하지 않는다. 기존 저장 파형 보기는 profile-local이고 source/run과 별개이며 임의로 삭제하지 않는다.

## 7. 검증 명령 — PowerShell, 저장소 루트

이 PC에는 Node와 node_modules가 있다. 인수 시 다시 확인한다. 기본 npm 명령이 실행되지 않으면 이미 있는 `.dev/npm/package/bin/npm-cli.js`를 Node로 실행할 수 있다. 테스트 때문에 도구를 다시 설치할 필요는 없다. 아래 절대경로는 **현재 PC의 검증 경로**이며 제품 코드에 넣지 않는다.

기본 검사:

```powershell
Set-Location D:\Dev\verilog_ide
node node_modules/typescript/bin/tsc --noEmit
node scripts/build.mjs
node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts
```

실제 slang (환경 변수 없으면 native tests가 skip되므로 출력 확인 필수):

```powershell
$env:RTL_SEMANTIC_PYTHON="$PWD/.dev/rtl-dev/tools/slang-11.0.0-python-3.14.7/python.exe"
node node_modules/tsx/dist/cli.mjs --test tests/semantic/*.test.ts
```

실제 VS Code 편집/semantic/구조/파형:

```powershell
$env:RTL_DEV_HOME="$PWD/.dev/rtl-dev"
$env:VSCODE_EXECUTABLE='D:\Tools\Microsoft VS Code\Code.exe'
$env:RTL_SEMANTIC_TEST='1'
$env:RTL_EDITOR_ONLY='1'
node scripts/test-vscode.mjs
```

전체 host 시뮬레이션 회귀가 필요한 경우 위 설정에서:

```powershell
Remove-Item Env:RTL_EDITOR_ONLY -ErrorAction SilentlyContinue
node scripts/test-vscode.mjs
```

실제 Verilator failure/timeout/waveform/path 회귀:

```powershell
$env:RTL_DEV_HOME="$PWD/.dev/rtl-dev"
$env:RTL_INTEGRATION='1'
node node_modules/tsx/dist/cli.mjs --test tests/integration/*.test.ts
```

`scripts/test-vscode.mjs`가 build 후 별도 profile/project를 만들고 `.dev/vscode-tests/run-*/project/.rtl/extension-test.json` receipt와 종료 코드를 검사한다. 콘솔의 한 PASS 문자열만으로 전체 통과라 하지 않는다. tool sandbox로 실제 프로세스 실행이 막히면 그 환경의 승인 절차로 필요한 실행만 요청한다. 새 테스트는 관련 변경에 맞춰 선택하며 문서만 변경할 때 전체 native suite를 반복할 필요는 없다.

금지: `npm run package`, `scripts/package.mjs`, VSIX install. 개발 창은 기존 launch configuration을 **Ctrl+F5 (Run Without Debugging)** 로 실행한다. F5는 과거 debugger IPv6/IPv4 연결 문제로 extension host가 멈춰 command-not-found가 났다. 지원되지 않는 debugger address 옵션을 다시 추가하지 않는다. 과거 패키지를 설치해 문제를 덮지 않는다.

## 8. 실제 마지막 검증 기준점

2026-09-30 audit 결과이며 이후 변경에는 관련 재검증 필요:

| 검증 | 결과 | 로컬 증거 |
|---|---|---|
| typecheck/build | 통과 | audit 문서 기록 |
| unit/adapter | 57 pass, 0 skip | `.dev/audit-unit.log` |
| native slang | 9 pass, 0 skip | `.dev/audit-semantic.log` |
| native Verilator | 10 pass, 0 skip | `.dev/audit-integration.log` |
| actual VS Code | 편집/semantic/structure/waveform 및 전체 실행 회귀 통과 | `.dev/audit-vscode.log` |
| host receipt | passed=true, 네 실행 결과 passed | `.dev/vscode-tests/run-M5s1HX/project/.rtl/extension-test.json` |
| 네 가지 포트 입력 probe | 정상 2종/열린 결함 2종 | `.dev/audit-port-probe.ts`, `.dev/audit-port-probe.log` |

`.dev`는 무시되는 개발 자료다. 다른 PC로 인계하면 존재하지 않을 수 있다. 문서의 재현 조건을 바탕으로 다시 검증하고 로그가 없다는 이유로 기능을 삭제하지 않는다. 문서 작성 시 `.git`은 없었다. commit/branch/hash가 있다고 가정하지 말고 저장소 상태를 확인한다. 버전 관리 도입이 필요하면 별도 작업으로 다루고 사용자 소스를 정리/초기화하지 않는다.

## 9. 다음 보고에서 지켜야 할 것

수정된 동작 / 확인한 원인 / 아직 가설인 원인 / 실제 검증 / 미검증을 나누어 설명한다. 한글로 간결하게 보고하고 실제 결과를 md에 남긴다. 사용자는 ‘초기에 구현했다고 한 기능이 지금 안 보이는 것’에 민감하다. 자동 테스트만 통과시켜 사용자 문제를 해결했다고 말하지 않는다.

완료 후 `product-audit.md`의 해당 상태, `verification.md`의 새 검증 기록, README 사용법, 이 문서의 다음 작업 위치를 갱신한다. 원문 아이디어는 덮어쓰지 않는다. 장기 항목을 구현했다고 가정하지 않으며, 작동하지 않는 기능을 UI에 있는 것처럼 소개하지 않는다.

## 10. 새 담당자에게 전달할 시작 요청

> `docs/handoff-gpt6-sol.md`를 읽고 지정된 문서 순서로 현재 상태를 확인해 주세요. 최종 목표는 독립 RTL IDE이며 배포 패키징은 하지 않습니다. `docs/delivery-plan.md`의 A 단계부터 이어서 진행하세요. 먼저 A1의 implicit named 포트 제외와 점 뒤 공백 추천 결함을 재현 테스트로 확인하고 수정하세요. 이어서 A2의 의미 분석 준비 상태와 사용자 실행 환경 차이를 진단하고 A3의 실제 입력 흐름을 검증하세요. 사용자 창의 원인을 추측으로 확정하지 말고 필요한 경우 구체적인 정보만 요청하세요. Core/semantic 분리와 기존 시뮬레이션을 유지하고, 실제 검증과 남은 제한을 문서에 갱신하세요. B 이후 기능을 한 번에 구현하거나 Code-OSS fork/전용 compiler부터 시작하지 마세요.
