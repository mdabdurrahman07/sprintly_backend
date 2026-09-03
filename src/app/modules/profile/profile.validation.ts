import z from "zod";

export const MemberProfileUpdateSchema = z.object({
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  phoneNumber: z.string().optional(),
});
export const ManagerProfileUpdateSchema = z.object({
  bio: z.string().optional(),
  phoneNumber: z.string().optional(),
});