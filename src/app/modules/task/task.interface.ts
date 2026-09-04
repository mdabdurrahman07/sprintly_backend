import { TaskPriority, TaskStatus } from "../../../../generated/prisma/enums";

export interface ICreateTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  labels?: string[];
  assigneeId?: string | null;
}

export interface IUpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  labels?: string[];
  assigneeId?: string | null;
  isDeleted?: boolean;
}