const MAX_DEPTH = 100;

function collect(node: unknown, parts: string[], depth: number): void {
  if (depth > MAX_DEPTH || node === null || typeof node !== 'object') {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collect(item, parts, depth + 1);
    }
    return;
  }

  const record = node as Record<string, unknown>;
  if (typeof record.text === 'string') {
    parts.push(record.text);
  }
  if (Array.isArray(record.content)) {
    collect(record.content, parts, depth + 1);
    parts.push(' ');
  }
}

export function extractPlainText(json: unknown): string {
  const parts: string[] = [];
  collect(json, parts, 0);
  return parts.join('').replace(/\s+/g, ' ').trim();
}
