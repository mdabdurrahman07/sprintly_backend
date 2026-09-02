import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  member: z.object({
    skills: z.array(z.string()).min(1, "At least one skill is required"),
  }),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const VerifyEmailOTPSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  otp: z.string().length(6)
})

export const userValidation = {
    RegisterSchema,
    LoginSchema,
    VerifyEmailOTPSchema
}