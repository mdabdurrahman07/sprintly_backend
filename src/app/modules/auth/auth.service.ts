import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { IUserRegisterPayload, IVerifyEmailPayload } from "./auth.interface";
import bcrypt from "bcryptjs";
import { config } from "../../config";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import path from "path";
import ejs, { name } from "ejs";
import { transporter } from "../../lib/nodemailer";
import { Role, UserStatus } from "../../../../generated/prisma/enums";

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

const verifyUserEmailAndStoreUserInDB = async (payload: IVerifyEmailPayload) => {
  	const otp = payload.otp;
	const email = payload.email.trim().toLowerCase();

	const isUserExist = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExist?.status === "BLOCKED") {
		throw new Error("User is Blocked")
	}

	if (isUserExist?.emailVerified) {
		throw new Error("Email ALready Verified")
	}

	if (isUserExist?.isDeleted || isUserExist?.status === "DELETED") {
		throw new Error("User is Deleted")
	}
  //! redis OTP
  const otpKey = `member-register-otp:${email}`;

	const redisOtp = await redisClient.get(otpKey)

	if (!redisOtp) {
		throw new Error("Invalid OTP")
	}

	if (redisOtp !== otp) {
		throw new Error("OTP Does Not Match")
	}

	await redisClient.del(otpKey)
  //? storing the user data at redisDB
  const memberRegisterKey = `member-register:${email}`;

  const redisMemberData = await redisClient.get(memberRegisterKey)
  if(!redisMemberData){
    throw new AppError(httpStatus.BAD_REQUEST, "Member Dosen't Exists")
  }

  const memberPayload : IUserRegisterPayload = JSON.parse(redisMemberData)

  const createUser = await prisma.user.create({
    data:{
      name: memberPayload.name,
      email: memberPayload.email,
      password: memberPayload.password,
      role: Role.MEMBER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      memberProfile:{
        create:{
          name: memberPayload.name,
          email: memberPayload.email,
          skills: memberPayload.member.skills || [""]
        }
      }
    },
    omit:{password: true},
    include:{memberProfile: true}
  })

  await redisClient.del(memberRegisterKey)

  // TODO 
  // ! add here ejs
  // ! provide token
  // ! return created user
}

export const authServices = {
  registerUserInDB
}