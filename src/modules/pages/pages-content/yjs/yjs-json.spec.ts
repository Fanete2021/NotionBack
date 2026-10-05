import * as Y from 'yjs';
import { fragmentToJson, jsonToFragment } from './yjs-json';

const DOC = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Title' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'plain ' },
        { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'item' }],
            },
          ],
        },
      ],
    },
  ],
};

describe('yjs-json', () => {
  it('round-trips ProseMirror JSON through a Y.XmlFragment', () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment('default');

    jsonToFragment(DOC, fragment);

    expect(fragmentToJson(fragment)).toEqual(DOC);
  });

  it('survives encoding the state and applying it to another doc', () => {
    const source = new Y.Doc();
    jsonToFragment(DOC, source.getXmlFragment('default'));

    const target = new Y.Doc();
    Y.applyUpdate(target, Y.encodeStateAsUpdate(source));

    expect(fragmentToJson(target.getXmlFragment('default'))).toEqual(DOC);
  });

  it('returns an empty doc for empty or invalid input', () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment('default');

    jsonToFragment({ type: 'doc', content: [] }, fragment);
    jsonToFragment(null, fragment);

    expect(fragmentToJson(fragment)).toEqual({ type: 'doc', content: [] });
  });
});
