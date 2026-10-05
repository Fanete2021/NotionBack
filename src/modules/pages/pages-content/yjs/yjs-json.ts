import * as Y from 'yjs';

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

/**
 * Конвертация Y.XmlFragment (формат y-prosemirror) в ProseMirror JSON
 * без знания схемы редактора: типы узлов и марок берутся из самих данных.
 */
function xmlTextToNodes(text: Y.XmlText): PmNode[] {
  const nodes: PmNode[] = [];

  for (const op of text.toDelta() as Array<{
    insert?: unknown;
    attributes?: JsonObject;
  }>) {
    if (typeof op.insert !== 'string' || op.insert.length === 0) continue;

    const node: PmNode = { type: 'text', text: op.insert };

    if (op.attributes) {
      const marks: PmMark[] = Object.entries(op.attributes).map(
        ([type, attrs]) =>
          isObject(attrs) && Object.keys(attrs).length > 0
            ? { type, attrs }
            : { type },
      );
      if (marks.length > 0) node.marks = marks;
    }

    nodes.push(node);
  }

  return nodes;
}

function xmlChildrenToNodes(parent: Y.XmlElement | Y.XmlFragment): PmNode[] {
  const nodes: PmNode[] = [];

  for (const child of parent.toArray()) {
    if (child instanceof Y.XmlText) {
      nodes.push(...xmlTextToNodes(child));
    } else if (child instanceof Y.XmlElement) {
      const node: PmNode = { type: child.nodeName };
      const attrs = child.getAttributes() as JsonObject;
      if (Object.keys(attrs).length > 0) node.attrs = attrs;
      const content = xmlChildrenToNodes(child);
      if (content.length > 0) node.content = content;
      nodes.push(node);
    }
  }

  return nodes;
}

function fragmentToJson(fragment: Y.XmlFragment): PmNode {
  return { type: 'doc', content: xmlChildrenToNodes(fragment) };
}

/**
 * Заполняет фрагмент из ProseMirror JSON. Используется только для
 * первичной инициализации страниц, у которых ещё нет yjsState.
 */
function jsonToFragment(json: unknown, fragment: Y.XmlFragment): void {
  if (!isObject(json) || !Array.isArray(json.content)) return;

  const build = (node: PmNode): Y.XmlElement | null => {
    if (node.type === 'text') return null;

    const element = new Y.XmlElement(node.type);
    for (const [key, value] of Object.entries(node.attrs ?? {})) {
      if (value !== undefined && value !== null) {
        element.setAttribute(key, value as string);
      }
    }
    const children = buildChildren(node.content ?? []);
    if (children.length > 0) element.insert(0, children);
    return element;
  };

  const buildChildren = (nodes: PmNode[]) => {
    const result: Array<Y.XmlElement | Y.XmlText> = [];
    let text: Y.XmlText | null = null;

    for (const node of nodes) {
      if (node.type === 'text') {
        if (!text) {
          text = new Y.XmlText();
          result.push(text);
        }
        continue;
      }
      text = null;
      const element = build(node);
      if (element) result.push(element);
    }

    return result;
  };

  const roots = buildChildren(json.content as PmNode[]);
  if (roots.length === 0) return;
  fragment.insert(0, roots);

  // Тексты можно наполнить только после интеграции в документ.
  fillTexts(fragment, json.content as PmNode[]);
}

function fillTexts(parent: Y.XmlElement | Y.XmlFragment, nodes: PmNode[]) {
  const children = parent.toArray();
  let childIndex = 0;
  let activeText: Y.XmlText | null = null;

  for (const node of nodes) {
    if (node.type === 'text') {
      if (!activeText) {
        const next = children[childIndex++];
        activeText = next instanceof Y.XmlText ? next : null;
      }
      if (activeText) {
        const attributes: JsonObject = {};
        for (const mark of node.marks ?? []) {
          attributes[mark.type] = mark.attrs ?? {};
        }
        activeText.insert(
          activeText.length,
          node.text ?? '',
          Object.keys(attributes).length > 0 ? attributes : undefined,
        );
      }
      continue;
    }

    activeText = null;
    const next = children[childIndex++];
    if (next instanceof Y.XmlElement) fillTexts(next, node.content ?? []);
  }
}

export { fragmentToJson, jsonToFragment };
export type { PmNode };
