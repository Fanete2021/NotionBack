ALTER TABLE "users" ADD COLUMN "telegramChatId" TEXT;
ALTER TABLE "users" ADD COLUMN "telegramUsername" TEXT;
ALTER TABLE "users" ADD COLUMN "telegramConnectedAt" TIMESTAMP(3);

ALTER TABLE "calendar_events" ADD COLUMN "reminderMinutes" INTEGER;
ALTER TABLE "calendar_events" ADD COLUMN "telegramReminder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "calendar_events" ADD COLUMN "reminderUserId" TEXT;

CREATE TABLE "telegram_connect_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_connect_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventReminders" BOOLEAN NOT NULL DEFAULT true,
    "dailySummary" BOOLEAN NOT NULL DEFAULT false,
    "taskUpdates" BOOLEAN NOT NULL DEFAULT false,
    "scheduleConflicts" BOOLEAN NOT NULL DEFAULT false,
    "reminderMinutes" INTEGER NOT NULL DEFAULT 15,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_telegramChatId_key" ON "users"("telegramChatId");
CREATE UNIQUE INDEX "telegram_connect_codes_code_key" ON "telegram_connect_codes"("code");
CREATE INDEX "telegram_connect_codes_userId_idx" ON "telegram_connect_codes"("userId");
CREATE INDEX "telegram_connect_codes_expiresAt_idx" ON "telegram_connect_codes"("expiresAt");
CREATE UNIQUE INDEX "notification_settings_userId_key" ON "notification_settings"("userId");
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_reminderUserId_fkey" FOREIGN KEY ("reminderUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "telegram_connect_codes" ADD CONSTRAINT "telegram_connect_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
