import z from "zod";
import { TaskPriority, TaskStatus } from "../../../../generated/prisma/enums";

const taskBaseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  labels: z.array(z.string()).optional(),
  assigneeId: z.string().nullable().optional(),
});


export const createTaskSchema = taskBaseSchema;

export const updateTaskSchema = taskBaseSchema.partial();