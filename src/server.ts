import { config } from "./app/config";
import app from "./app";
import { prisma } from "./app/lib/prisma";
import { ensureRedisConnection } from "./app/lib/redis";
import { seedAdmin } from "./app/utils/seed";
import { transporter } from "./app/lib/nodemailer";
import { deleteAllSoftDeletedProject } from "./app/lib/cron";
const PORT = config.port;
const main = async () => {
  try {
    await prisma.$connect();
    console.log("DB is Connected");
    await ensureRedisConnection();
    console.log("Redis is Connected");
    await transporter.verify();
    console.log("Nodemailer Connected Successfully.");
    await seedAdmin();
    await deleteAllSoftDeletedProject();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

main();
