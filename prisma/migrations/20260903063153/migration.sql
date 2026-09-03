/*
  Warnings:

  - You are about to drop the column `avatarUrl` on the `managers` table. All the data in the column will be lost.
  - You are about to drop the column `avatarUrl` on the `members` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "managers" DROP COLUMN "avatarUrl",
ADD COLUMN     "managerAvatarUrl" TEXT;

-- AlterTable
ALTER TABLE "members" DROP COLUMN "avatarUrl",
ADD COLUMN     "memberAvatarUrl" TEXT;
