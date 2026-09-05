import httpStatus from "http-status";
import { Role } from "../../../generated/prisma/enums";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { AppError } from "./AppError";
import bcrypt from "bcryptjs";

export const seedAdmin = async () => {
  try {
    const superAdmin = await prisma.user.findFirst({
      where: {
        role: Role.ADMIN,
      },
    });
    if (superAdmin) {
      console.log("Admin already exists");
      return;
    }
    const name = config.admin_name;
    const email = config.admin_email;
    const password = config.admin_password;
    if (!name || !email || !password) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Super admin name, email, password is missing",
      );
    }
    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );
    const Admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.ADMIN,
        needPasswordChange: false,
        emailVerified: true,
      },
    });
    console.log("Admin created", Admin);
  } catch (error) {
    console.log("Error seeding super admin", error);
    await prisma.user.delete({
      where: {
        email: config.admin_email,
      },
    });
  }
};
