import z from "zod";
import { TaskPriority, TaskStatus } from "../../../../generated/prisma/enums";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  labels: z.array(z.string()).optional(),
  assigneeId: z.string().nullable().optional(),
});


export const updateTaskSchema = z
  .object({
    title: z.string().min(1, "Title is required").optional(),
    description: z.string().nullable().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    labels: z.array(z.string()).optional(),
    assigneeId: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update a task",
  });