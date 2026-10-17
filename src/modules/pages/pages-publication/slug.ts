import { SLUG_MAX_LENGTH } from './consts';

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

function slugifyTitle(title: string): string {
  const transliterated = transliterate(title.toLowerCase());
  const slug = transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');

  return slug || 'article';
}

function suffixSlug(base: string, n: number): string {
  const suffix = `-${n}`;
  const stem = base
    .slice(0, SLUG_MAX_LENGTH - suffix.length)
    .replace(/-+$/g, '');

  return `${stem || 'article'}${suffix}`;
}

function transliterate(value: string): string {
  let result = '';
  for (const char of value) {
    result += CYRILLIC_TO_LATIN[char] ?? char;
  }
  return result;
}

export { slugifyTitle, suffixSlug };
