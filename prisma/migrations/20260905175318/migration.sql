/*
  Warnings:

  - Added the required column `planId` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "planId" TEXT NOT NULL;
