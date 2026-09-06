/*
  Warnings:

  - You are about to drop the `TaskAssignment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TaskAssignment" DROP CONSTRAINT "TaskAssignment_memberId_fkey";

-- DropForeignKey
ALTER TABLE "TaskAssignment" DROP CONSTRAINT "TaskAssignment_taskId_fkey";

-- DropTable
DROP TABLE "TaskAssignment";

-- CreateTable
CREATE TABLE "taskAssignments" (
    "taskId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "taskAssignments_pkey" PRIMARY KEY ("taskId","memberId")
);

-- AddForeignKey
ALTER TABLE "taskAssignments" ADD CONSTRAINT "taskAssignments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taskAssignments" ADD CONSTRAINT "taskAssignments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
