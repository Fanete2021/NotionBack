/** Имя Y.XmlFragment, в котором клиент хранит документ (дефолт TipTap/y-prosemirror). */
const YJS_FRAGMENT_NAME = 'default';

/** Через сколько мс после последней правки состояние сохраняется в БД. */
const YJS_SAVE_DEBOUNCE_MS = 3000;

/** Максимальный размер одного бинарного обновления от клиента. */
const YJS_MAX_UPDATE_BYTES = 1024 * 1024;

export { YJS_FRAGMENT_NAME, YJS_MAX_UPDATE_BYTES, YJS_SAVE_DEBOUNCE_MS };
