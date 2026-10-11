import * as Y from 'yjs';
import { isObject, type JsonObject, type PmNode } from './pm-node';

/**
 * ProseMirror JSON → Y.XmlFragment. Только для страниц, у которых ещё нет yjsState.
 *
 * Текст пишется вторым проходом: Y.XmlText можно наполнять только после того,
 * как элемент уже вставлен в документ.
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

  const buildChildren = (nodes: PmNode[]): Array<Y.XmlElement | Y.XmlText> => {
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

  fillTexts(fragment, json.content as PmNode[]);
}

function fillTexts(
  parent: Y.XmlElement | Y.XmlFragment,
  nodes: PmNode[],
): void {
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

export { jsonToFragment };
