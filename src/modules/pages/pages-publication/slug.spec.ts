import { SLUG_MAX_LENGTH } from './consts';
import { slugifyTitle, suffixSlug } from './slug';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('slugifyTitle', () => {
  it('транслитерирует заголовок и склеивает слова дефисом', () => {
    expect(slugifyTitle('Ёжик в Х')).toBe('yozhik-v-kh');
    expect(slugifyTitle('Привет, мир!')).toBe('privet-mir');
  });

  it('оставляет латиницу и цифры', () => {
    expect(slugifyTitle('Hello, World 2!')).toBe('hello-world-2');
  });

  it('подставляет article, если из заголовка нечего собрать', () => {
    expect(slugifyTitle('!!!')).toBe('article');
    expect(slugifyTitle('   ')).toBe('article');
  });

  it('обрезает slug до лимита без хвостового дефиса', () => {
    const slug = slugifyTitle(`${'а'.repeat(100)} б`);

    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(slug.endsWith('-')).toBe(false);
    expect(slug).toMatch(SLUG_PATTERN);
  });
});

describe('suffixSlug', () => {
  it('добавляет номер и не выходит за лимит длины', () => {
    const base = 'a'.repeat(SLUG_MAX_LENGTH);

    expect(suffixSlug('vvedenie', 2)).toBe('vvedenie-2');
    expect(suffixSlug(base, 2)).toHaveLength(SLUG_MAX_LENGTH);
    expect(suffixSlug(base, 2)).toMatch(SLUG_PATTERN);
  });
});
