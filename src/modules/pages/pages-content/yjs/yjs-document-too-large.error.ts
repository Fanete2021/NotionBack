/** Обновление отклонено: документ превысил бы MAX_PAGE_CONTENT_BYTES. */
class YjsDocumentTooLargeError extends Error {
  constructor() {
    super('Document is too large');
    this.name = 'YjsDocumentTooLargeError';
  }
}

export { YjsDocumentTooLargeError };
