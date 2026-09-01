import { config } from "./app/config";
import app from "./app";
import { prisma } from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis";
const PORT = config.port;

const main = async () => {
  try {
    await prisma.$connect();
    console.log("DB is Connected");
    await redisClient.connect()
    console.log("Redis is Connected")
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
