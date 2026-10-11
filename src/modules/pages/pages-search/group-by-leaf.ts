export function groupByLeaf<T extends { leafId: string }>(
  rows: T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const items = grouped.get(row.leafId) ?? [];
    items.push(row);
    grouped.set(row.leafId, items);
  }
  return grouped;
}
