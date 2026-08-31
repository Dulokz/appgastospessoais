-- DropIndex
DROP INDEX "Transaction_userId_accountId_importHash_key";

-- CreateIndex
CREATE INDEX "Transaction_userId_accountId_importHash_idx" ON "Transaction"("userId", "accountId", "importHash");

