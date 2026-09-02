/*
  Warnings:

  - You are about to drop the column `organizationId` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `managers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `members` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `managers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `managers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `members` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "managers" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "organizationId";

-- CreateIndex
CREATE UNIQUE INDEX "managers_email_key" ON "managers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");
