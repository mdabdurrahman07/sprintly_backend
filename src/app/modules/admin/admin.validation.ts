import z from "zod";
import { UserStatus } from "../../../../generated/prisma/enums";

export const IUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});