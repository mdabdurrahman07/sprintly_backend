import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  IGoogleLoginPayload,
  IUserLoginPayload,
  IUserRegisterPayload,
  IVerifyEmailPayload,
} from "./auth.interface";
import bcrypt from "bcryptjs";
import { config } from "../../config";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";
import {
  AuthProvider,
  Role,
  UserStatus,
} from "../../../../generated/prisma/enums";
import { jwtUtils } from "../../utils/jwt";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import { ReqUser } from "../../middleware/checkAuth";
import { TokenPayload } from "google-auth-library";
import { googleClient } from "../../lib/google.auth";

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
    member: memberData,
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
    otp: otp,
    expirationMinutes: expirationSeconds / 60,
  };

  const html = await ejs.renderFile(templatePath, templateData);
  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "Email Verification",
    html,
  });
};
const verifyUserEmailAndStoreUserInDB = async (
  payload: IVerifyEmailPayload,
) => {
  const otp = payload.otp;
  const email = payload.email.trim().toLowerCase();

  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExist?.status === "BLOCKED") {
    throw new AppError(httpStatus.FORBIDDEN, "User is Blocked");
  }

  if (isUserExist?.emailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email Already Verified");
  }

  if (isUserExist?.isDeleted || isUserExist?.status === "DELETED") {
    throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
  }
  //! redis OTP
  const otpKey = `member-register-otp:${email}`;

  const redisOtp = await redisClient.get(otpKey);

  if (!redisOtp) {
    throw new Error("Invalid OTP");
  }

  if (redisOtp !== otp) {
    throw new Error("OTP Does Not Match");
  }

  await redisClient.del(otpKey);
  //? storing the user data at redisDB
  const memberRegisterKey = `member-register:${email}`;

  const redisMemberData = await redisClient.get(memberRegisterKey);
  if (!redisMemberData) {
    throw new AppError(httpStatus.BAD_REQUEST, "Member Dosen't Exists");
  }

  const memberPayload: IUserRegisterPayload = JSON.parse(redisMemberData);

  const createdUser = await prisma.user.create({
    data: {
      name: memberPayload.name,
      email: memberPayload.email,
      password: memberPayload.password,
      role: Role.MEMBER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      memberProfile: {
        create: {
          name: memberPayload.name,
          email: memberPayload.email,
          skills: memberPayload.member.skills || [""],
        },
      },
    },
    omit: { password: true },
    include: { memberProfile: true },
  });

  await redisClient.del(memberRegisterKey);

  // ejs
  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/verificationSuccessful.ejs",
  );

  const templateData = {
    name: createdUser.name,
    email: createdUser.email,
  };

  const html = await ejs.renderFile(templatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "Welcome To Sprintly Project Management App",
    html,
  });

  const { memberProfile, ...user } = createdUser;

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );
  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    user,
    memberProfile,
    accessToken,
    refreshToken,
  };
};
const login = async (payload: IUserLoginPayload) => {
  const { email, password } = payload;
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.FORBIDDEN, "User not found");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
  }

  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new AppError(httpStatus.FORBIDDEN, "User is deleted");
  }

  if (user.password === null && user.googleId !== null) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "User Already Has Account Registered With Google. Try To Login With Google.",
    );
  }

  const isPasswordMatched = await bcrypt.compare(
    password,
    user.password as string,
  );

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid credentials");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};
const getMe = async (userPayload: ReqUser) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userPayload.userId,
    },
    include: {
      memberProfile: true,
      managerProfile: true,
    },
    omit: {
      password: true,
    },
  });
  if (!user) {
    throw new AppError(httpStatus.FORBIDDEN, "User not found");
  }

  return user;
};
const refreshToken = async (token: string) => {
  const verifiedRefreshToken = jwtUtils.verifyToken(
    token,
    config.jwt_refresh_secret,
  );
  if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      config.node_env === "development"
        ? verifiedRefreshToken.error
        : "Invalid refresh token",
    );
  }
  const data = verifiedRefreshToken.data as JwtPayload;

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
    throw new AppError(httpStatus.BAD_REQUEST, "User is inactive or not found");
  }
  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};
const googleLogin = async (payload: IGoogleLoginPayload) => {
  let googleIdTokenPayload: TokenPayload | null | undefined;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: payload.idToken,
      audience: config.google_client_id,
    });

    googleIdTokenPayload = ticket.getPayload();
  } catch (error) {
    console.log("GoogleId Token Verification Failed", error);
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Invalid Or Expired Google Id Token",
    );
  }
  if (!googleIdTokenPayload) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Invalid Or Expired Google Id Token",
    );
  }
  if (!googleIdTokenPayload.email) {
    throw new AppError(httpStatus.NOT_FOUND, "Google Email Not Found");
  }
  if (!googleIdTokenPayload.name) {
    throw new AppError(httpStatus.NOT_FOUND, "Google User Name Not Found");
  }
  const ifMemberExistWithGoogleAuth = await prisma.user.findUnique({
    where: {
      email: googleIdTokenPayload.email,
      role: Role.MEMBER,
      googleId: googleIdTokenPayload.sub,
    },
  });
  let user = ifMemberExistWithGoogleAuth;
  if (!ifMemberExistWithGoogleAuth) {
    const ifMemberExistWithCredentials = await prisma.user.findUnique({
      where: {
        email: googleIdTokenPayload.email,
        role: Role.MEMBER,
        authProvider: AuthProvider.CREDENTIAL,
      },
    });
    if (ifMemberExistWithCredentials) {
      if (!ifMemberExistWithCredentials.emailVerified) {
        throw new AppError(httpStatus.BAD_REQUEST, "Email not verified");
      }
      if (ifMemberExistWithCredentials.status === UserStatus.BLOCKED) {
        throw new AppError(httpStatus.BAD_REQUEST, "User is blocked");
      }
      if (
        ifMemberExistWithCredentials.isDeleted ||
        ifMemberExistWithCredentials.status === UserStatus.DELETED
      ) {
        throw new AppError(httpStatus.BAD_REQUEST, "User is deleted");
      }
      user = await prisma.user.update({
        where: {
          id: ifMemberExistWithCredentials.id,
        },
        data: {
          googleId: googleIdTokenPayload.sub,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: googleIdTokenPayload.name,
          email: googleIdTokenPayload.email,
          role: Role.MEMBER,
          googleId: googleIdTokenPayload.sub,
          authProvider: AuthProvider.GOOGLE,
          emailVerified: true,
          memberProfile: {
            create: {
              name: googleIdTokenPayload.name,
              email: googleIdTokenPayload.email,
            },
          },
        },
      });
      const templatePath = path.join(
        process.cwd(),
        "src/app/templates/welcomeEmail.ejs",
      );
      const templateData = {
        name: user.name,
        email: user.email,
      };
      const html = await ejs.renderFile(templatePath, templateData);
      await transporter.sendMail({
        from: config.email_sender,
        to: user.email,
        subject: "Welcome To Sprintly Project Management App",
        html,
      });
    }
  }
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
  }
  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new AppError(httpStatus.NOT_FOUND, "User Is deleted");
  }
  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};
export const authServices = {
  registerUserInDB,
  verifyUserEmailAndStoreUserInDB,
  login,
  getMe,
  refreshToken,
  googleLogin
};
