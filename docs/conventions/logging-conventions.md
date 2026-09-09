# Конвенция логгирования

Проект использует [`nestjs-pino`](https://github.com/iamolegga/nestjs-pino) поверх [`pino`](https://getpino.io/). Логгер внедряется через DI:

```ts
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

@Injectable()
export class SomeService {
  constructor(@InjectPinoLogger(SomeService.name) private readonly logger: PinoLogger) {}
}
```

## Уровень логов в dev/prod

Настройка в `src/shared/logger/logger.config.ts`:

```ts
const isProduction = configService.get<string>("NODE_ENV", "development") === "production";
const level = configService.get<string>("LOG_LEVEL", isProduction ? "info" : "debug");
```

`LOG_LEVEL` из env всегда имеет приоритет. Если он не задан — в `development` уровень `debug`, в `production` — `info`.

**Важно**: это не просто "не показывается в консоли" — сообщения ниже установленного уровня вообще не сериализуются и не попадают никуда (ни в консоль, ни в файл/агрегатор). Поэтому `debug`-логи в проде по умолчанию **не существуют**, и полагаться на них для расследования продовых инцидентов нельзя.

Отдельно от ручных вызовов `logger.*` в коде работают HTTP access-логи `pino-http` (`pinoHttp.customLogLevel` в том же файле) — они автоматически логируют каждый запрос с уровнем, зависящим от статус-кода ответа (`>=500` → `error`, `>=400` → `warn`, иначе `info`). Этот документ — про **ручные** вызовы логгера внутри бизнес-кода, а не про access-логи.

## Формат вызова

```ts
logger.<level>(metadata, message);
```

- **Первый аргумент** — объект метаданных (структурированные данные для поиска/фильтрации в логах).
- **Второй аргумент** — короткое сообщение в прошедшем времени, констатирующее факт ("idea created", "login failed"), без дублирования данных из объекта метаданных.

Рекомендуемые поля метаданных:

- `action` — snake_case имя операции (`user_login`, `idea_create`, `tokens_generate`);
- id сущностей — `userId`, `ideaId` и т.п. (camelCase, единообразно);
- `reason` — для отклонённых/неуспешных кейсов (`invalid_credentials`, `idea_not_exist`).

Не передавайте в метаданные пароли, токены и прочие секреты вручную. HTTP-заголовки и тело запроса редактируются автоматически (`redact` в `logger.config.ts`), но это не защищает объект, который вы сами передаёте в `logger.*` — эта ответственность на разработчике.

## Уровни: краткая сводка

| Уровень | Когда использовать                                                                     | Виден в проде |
| ------- | -------------------------------------------------------------------------------------- | ------------- |
| `debug` | Промежуточный технический шаг внутри сценария, полезен только при локальной отладке    | Нет           |
| `info`  | Успешно завершённый, значимый для бизнеса сценарий                                     | Да            |
| `warn`  | Ожидаемая, обработанная ошибка — приложение продолжает штатно работать                 | Да            |
| `error` | Непредвиденная ошибка / отказ внешней системы, не зависящий от нас и не обрабатываемый | Да            |

## `debug` — промежуточные шаги

Используется для внутренних технических деталей успешного сценария, которые сами по себе не являются событием, важным для бизнеса или мониторинга — они нужны только при локальной отладке. В проде эти сообщения не пишутся вообще.

**Как надо:**

```ts
// src/modules/tokens/tokens.service.ts
this.logger.debug({ action: "tokens_generate", userId: payload.userId }, "old token deleted");
this.logger.debug({ action: "tokens_generate", userId: payload.userId }, "auth tokens issued");
```

```ts
// src/modules/auth/auth.service.ts
const hashedPassword = await hash(dto.password);
this.logger.debug({ action: "user_register" }, "password hashed");
```

```ts
// src/modules/prisma/prisma.service.ts
async onModuleInit() {
  await this.$connect();
  this.logger.debug("prisma connected");
}
```

**Как не надо:**

```ts
// Промежуточный шаг залогирован через info — в проде он "просочится"
// и будет засорять логи техническими деталями, не несущими ценности
// для мониторинга или бизнес-аналитики.
this.logger.info({ action: "user_register" }, "password hashed");
```

## `info` — успешные бизнес-значимые кейсы

Используется для результата успешно завершённого сценария, значимого для бизнеса или продукта: создание/изменение сущности, успешный вход, регистрация и т.п. — то есть всё, что не подпадает под `debug`, `warn` или `error`.

**Как надо:**

```ts
// src/modules/auth/auth.service.ts
this.logger.info({ userId: user.id, action: "user_register" }, "user registered");
this.logger.info({ userId: user.id, action: "user_login" }, "login success");
```

```ts
// src/modules/ideas/ideas.service.ts
this.logger.info({ ideaId: idea.id, userId: authorId, action: "idea_create" }, "idea created");
this.logger.info({ ideaId: idea.id, action: "idea_update" }, "idea updated");
```

**Как не надо:**

```ts
// Технический промежуточный шаг залогирован как info — это debug,
// он не представляет самостоятельной ценности вне отладки и будет
// шуметь в проде без пользы.
this.logger.info({ action: "cache_lookup", key }, "cache checked");
```

## `warn` — ожидаемые ошибки, не мешающие работе приложения

Используется, когда возникла ошибка, но она **ожидаема и обработана** — приложение отклоняет операцию (обычно через `throw` HTTP-исключения) и продолжает штатно работать. Типичные случаи: неверные учётные данные, сущность не найдена, конфликт данных, недостаточно прав.

**Как надо:**

```ts
// src/modules/auth/auth.service.ts
if (!isPasswordValid) {
  this.logger.warn(
    { userId: user.id, reason: "invalid_credentials", action: "user_login" },
    "login failed",
  );
  throw new BadRequestException("Неверный логин или пароль");
}
```

```ts
// src/modules/ideas/ideas.service.ts
if (!idea) {
  this.logger.warn(
    { ideaId: id, userId, action, reason: "idea_not_exist" },
    "idea action rejected",
  );
  throw new NotFoundException("Идея не найдена");
}
```

```ts
// src/shared/guards/roles.guard.ts
this.logger.warn(
  { guard: "roles", userId: user?.id, role: user?.role, reason: "insufficient_role" },
  "access denied",
);
```

**Как не надо:**

```ts
// Неверный пароль — это ожидаемая, штатная ветка бизнес-логики,
// а не ошибка системы. Логировать её через error засоряет
// error-алерты ложными срабатываниями и обесценивает сигнал
// "что-то реально сломалось".
this.logger.error({ userId: user.id, reason: "invalid_credentials" }, "login failed");
throw new BadRequestException("Неверный логин или пароль");
```

## `error` — ошибки, не зависящие от нас и необрабатываемые

Используется для непредвиденных исключений и отказов внешних систем (БД, S3, почтовый провайдер и т.п.), которые не являются ожидаемой веткой бизнес-логики и не могут быть обработаны на месте.

**Как надо:**

```ts
// src/modules/s3/s3.service.ts
} catch (err: unknown) {
  const reason = err instanceof Error ? err.message : "unknown error";
  this.logger.error({ action: "file_upload", reason, key, contentType, err }, "upload file failed");
  throw err;
}
```

```ts
// src/shared/filters/all-exceptions.filter.ts — глобальный fallback
// для любого необработанного/5xx исключения
this.logger.error({
  reqId: request.id,
  method: request.method,
  url: request.url,
  statusCode,
  err: exception,
});
```

Правило: при `error` всегда прикладывайте исходный объект ошибки в поле `err` (pino умеет сериализовать `Error` вместе со стеком). Без него сообщение теряет диагностическую ценность.

**Как не надо:**

```ts
// Ошибка проглочена и залогирована одной строкой без err/стектрейса —
// невозможно понять, что именно пошло не так и где.
} catch (err) {
  this.logger.error("upload failed");
  throw err;
}
```

## Чек-лист: какой уровень выбрать

1. Это техническая деталь для отладки, не значимая сама по себе? → **`debug`**
2. Операция завершилась успехом и значима для бизнеса/продукта? → **`info`**
3. Есть ожидаемая, обработанная ошибка (бросаем `HttpException`, приложение работает штатно)? → **`warn`**
4. Непредвиденная ошибка или отказ внешней системы, не зависящий от нас? → **`error`**
