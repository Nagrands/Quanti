CREATE TABLE "ProductAlias" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductAlias_normalizedName_key" ON "ProductAlias"("normalizedName");
CREATE INDEX "ProductAlias_productId_idx" ON "ProductAlias"("productId");
ALTER TABLE "ProductAlias" ADD CONSTRAINT "ProductAlias_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
