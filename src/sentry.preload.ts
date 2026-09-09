import { initSentry } from './config';

/**
 * Точка входа инициализации Sentry.
 *
 * Импортируется САМОЙ ПЕРВОЙ в main.ts (до NestFactory и остальных импортов),
 * чтобы SDK успел инструментировать http/pg/express до их загрузки.
 * Сама конфигурация — в src/config/sentry.config.ts (initSentry).
 */
initSentry();
