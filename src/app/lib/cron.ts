import  cron  from 'node-cron';
import { prisma } from "./prisma";

export const deleteAllSoftDeletedProject = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const deletedProject = await prisma.project.deleteMany({
        where: {
          isDeleted: true,
        },
      });

      if (deletedProject.count > 0) {
        console.log(
          `Cron: Deleted ${deletedProject.count} softDeleted projects`,
        );
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(
          "Cron failed to delete softDeleted projects:",
          error,
        );
      }
    }
  });

  console.log("Project delete cron scheduled: every 1 hour");
};