import { extractPlainText } from './extract-plain-text';

describe('extractPlainText', () => {
  it('returns empty string for empty or invalid input', () => {
    expect(extractPlainText({ type: 'doc', content: [] })).toBe('');
    expect(extractPlainText(null)).toBe('');
    expect(extractPlainText('x')).toBe('');
  });

  it('joins inline text and separates blocks', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'world', marks: [{ type: 'bold' }] },
          ],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Second' }],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('Hello world Second');
  });

  it('collects nested text', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
              ],
            },
          ],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('a');
  });
});
