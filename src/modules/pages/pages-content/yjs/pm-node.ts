type JsonObject = Record<string, unknown>;

interface PmMark {
  type: string;
  attrs?: JsonObject;
}

interface PmNode {
  type: string;
  attrs?: JsonObject;
  content?: PmNode[];
  text?: string;
  marks?: PmMark[];
}

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export type { JsonObject, PmMark, PmNode };
export { isObject };
