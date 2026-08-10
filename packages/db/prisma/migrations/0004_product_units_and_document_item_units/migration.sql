-- CreateTable
CREATE TABLE "ProductUnit" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "conversionFactor" DECIMAL(18,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductUnit_pkey" PRIMARY KEY ("id")
);

-- Add unit snapshots to historical document lines.
ALTER TABLE "DocumentItem"
ADD COLUMN "unit" TEXT,
ADD COLUMN "unitFactor" DECIMAL(18,6) NOT NULL DEFAULT 1;

UPDATE "DocumentItem"
SET "unit" = "Product"."unit"
FROM "Product"
WHERE "DocumentItem"."productId" = "Product"."id";

ALTER TABLE "DocumentItem"
ALTER COLUMN "unit" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductUnit_productId_name_key" ON "ProductUnit"("productId", "name");
CREATE INDEX "ProductUnit_productId_idx" ON "ProductUnit"("productId");

-- AddForeignKey
ALTER TABLE "ProductUnit"
ADD CONSTRAINT "ProductUnit_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
