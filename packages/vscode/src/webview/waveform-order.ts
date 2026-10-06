/** Display selection is separate from which signals are present in the trace. */
export function selectRows(order: string[], current: string[], anchor: string | undefined, id: string, toggle: boolean, range: boolean): { ids: string[]; anchor: string } {
  if (!order.includes(id)) return { ids: current.filter(value => order.includes(value)), anchor: anchor ?? id };
  if (range && anchor && order.includes(anchor)) {
    const a = order.indexOf(anchor), b = order.indexOf(id), interval = order.slice(Math.min(a, b), Math.max(a, b) + 1);
    return { ids: toggle ? order.filter(value => current.includes(value) || interval.includes(value)) : interval, anchor };
  }
  return { ids: toggle ? order.filter(value => value === id ? !current.includes(value) : current.includes(value)) : [id], anchor: id };
}

/** Move the selected rows as one block, preserving their displayed order. */
export function moveRows(order: string[], moving: string[], target: string, after: boolean): string[] {
  const group = order.filter(id => moving.includes(id));
  if (!group.length || group.includes(target) || !order.includes(target)) return [...order];
  const rest = order.filter(id => !group.includes(id)), index = rest.indexOf(target) + Number(after);
  return [...rest.slice(0, index), ...group, ...rest.slice(index)];
}
