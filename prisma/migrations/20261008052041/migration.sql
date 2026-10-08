-- DropForeignKey
ALTER TABLE "taskAssignments" DROP CONSTRAINT "taskAssignments_memberId_fkey";

-- DropForeignKey
ALTER TABLE "taskAssignments" DROP CONSTRAINT "taskAssignments_taskId_fkey";

-- AddForeignKey
ALTER TABLE "taskAssignments" ADD CONSTRAINT "taskAssignments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taskAssignments" ADD CONSTRAINT "taskAssignments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
