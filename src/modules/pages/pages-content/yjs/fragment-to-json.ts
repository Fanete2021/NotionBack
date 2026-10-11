import * as Y from 'yjs';
import { isObject, type JsonObject, type PmMark, type PmNode } from './pm-node';

/**
 * Y.XmlFragment (формат y-prosemirror / TipTap) → ProseMirror JSON.
 * Схема редактора не нужна: типы узлов и марок лежат в самих данных.
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

export { fragmentToJson };
