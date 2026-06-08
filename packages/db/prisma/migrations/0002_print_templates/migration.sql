CREATE TYPE "PrintTemplateScope" AS ENUM ('DOCUMENT');

CREATE TABLE "PrintTemplate" (
  "id" TEXT NOT NULL,
  "scope" "PrintTemplateScope" NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "html" TEXT NOT NULL,
  "styles" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PrintTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrintTemplate_scope_version_key"
ON "PrintTemplate"("scope", "version");

CREATE INDEX "PrintTemplate_scope_isActive_idx"
ON "PrintTemplate"("scope", "isActive");
