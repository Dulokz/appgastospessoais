CREATE TABLE "ImportClassificationRule" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "financialInstitution" TEXT,
  "matchText" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "counterpartAccountId" TEXT,
  "investmentPositionId" TEXT,
  "categoryId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportClassificationRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ImportClassificationRule_userId_financialInstitution_active_idx" ON "ImportClassificationRule"("userId", "financialInstitution", "active");
ALTER TABLE "ImportClassificationRule" ADD CONSTRAINT "ImportClassificationRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;