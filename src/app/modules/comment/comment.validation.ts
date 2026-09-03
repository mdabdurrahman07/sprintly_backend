import z from "zod";

export const CommentPayloadSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Comment content cannot be empty" })
    .trim()
    .refine((val) => val.length > 0, {
      message: "Comment content cannot be only whitespace",
    }),
});