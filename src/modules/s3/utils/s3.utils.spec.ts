import { NotFound } from '@aws-sdk/client-s3';
import { isNotFoundError, normalizeKey, normalizeUrl } from './s3.utils';

describe('isNotFoundError', () => {
  it('возвращает true для NotFound из AWS SDK', () => {
    const error = new NotFound({
      message: 'The specified key does not exist.',
      $metadata: {},
    });

    expect(isNotFoundError(error)).toBe(true);
  });

  it('возвращает true для ошибки с name = "NotFound"', () => {
    const error = { name: 'NotFound', message: 'Not found' };

    expect(isNotFoundError(error)).toBe(true);
  });

  it('возвращает true для ошибки с name = "NoSuchKey"', () => {
    const error = {
      name: 'NoSuchKey',
      message: 'The specified key does not exist.',
    };

    expect(isNotFoundError(error)).toBe(true);
  });

  it('возвращает false для других ошибок', () => {
    const error = { name: 'AccessDenied', message: 'Access Denied' };

    expect(isNotFoundError(error)).toBe(false);
  });

  it('возвращает false для обычных ошибок', () => {
    expect(isNotFoundError(new Error('fail'))).toBe(false);
  });

  it('возвращает false для null и undefined', () => {
    expect(isNotFoundError(null)).toBe(false);
    expect(isNotFoundError(undefined)).toBe(false);
  });
});

describe('normalizeKey', () => {
  it('убирает ведущие слэши', () => {
    expect(normalizeKey('/path/to/file.txt')).toBe('path/to/file.txt');
  });

  it('убирает несколько ведущих слэшей', () => {
    expect(normalizeKey('///path/to/file.txt')).toBe('path/to/file.txt');
  });

  it('не изменяет ключ без ведущих слэшей', () => {
    expect(normalizeKey('path/to/file.txt')).toBe('path/to/file.txt');
  });

  it('обрабатывает пустую строку', () => {
    expect(normalizeKey('')).toBe('');
  });

  it('обрабатывает строку только из слэшей', () => {
    expect(normalizeKey('///')).toBe('');
  });

  it('сохраняет внутренние слэши', () => {
    expect(normalizeKey('path//to//file.txt')).toBe('path//to//file.txt');
  });

  it('сохраняет завершающий слэш', () => {
    expect(normalizeKey('path/to/')).toBe('path/to/');
  });
});

describe('normalizeUrl', () => {
  it('убирает завершающие слэши', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
  });

  it('убирает несколько завершающих слэшей', () => {
    expect(normalizeUrl('https://example.com///')).toBe('https://example.com');
  });

  it('не изменяет URL без завершающих слэшей', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('обрабатывает пустую строку', () => {
    expect(normalizeUrl('')).toBe('');
  });

  it('обрабатывает строку только из слэшей', () => {
    expect(normalizeUrl('///')).toBe('');
  });

  it('сохраняет внутренние слэши', () => {
    expect(normalizeUrl('https://example.com/path/to/')).toBe(
      'https://example.com/path/to',
    );
  });

  it('не изменяет корневой URL', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('обрабатывает URL с query параметрами', () => {
    expect(normalizeUrl('https://example.com/path?query=1/')).toBe(
      'https://example.com/path?query=1',
    );
  });
});
