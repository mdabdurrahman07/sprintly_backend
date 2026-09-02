import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { IUserRegisterPayload } from "./auth.interface";
import bcrypt from "bcryptjs";
import { config } from "../../config";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";

const registerUserInDB = async (payload: IUserRegisterPayload) => {
  const { name, email, password, member: memberData } = payload;

  const isUserExists = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExists) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds),
  );

  //? redisDataStore
  const expirationSeconds = 5 * 60;

  //? email verification OTP , storing in redisDB
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpKey = `member-register-otp:${email}`;
  await redisClient.set(otpKey, otp, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });
  //? storing the user data at redisDB
  const memberRegisterKey = `member-register:${email}`;
  const redisUserDataPayload = {
    name,
    email,
    password: hashedPassword,
    patient: memberData,
  };

  await redisClient.set(
    memberRegisterKey,
    JSON.stringify(redisUserDataPayload),
    {
      expiration: {
        type: "EX",
        value: expirationSeconds,
      },
    },
  );

  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/verification-code.ejs",
  );

  	const templateData = {
		name,
		email,
		otp : otp,
		expirationMinutes: expirationSeconds / 60

	}

	const html = await ejs.renderFile(templatePath, templateData)
		await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Email Verification",
		html
	})
};

export const authServices = {
  registerUserInDB
}