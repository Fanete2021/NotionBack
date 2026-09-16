DELETE FROM "workspace_invites";

ALTER TABLE "workspace_invites" DROP COLUMN "tokenHash";
ALTER TABLE "workspace_invites" ADD COLUMN "token" TEXT NOT NULL;

CREATE UNIQUE INDEX "workspace_invites_token_key" ON "workspace_invites"("token");
