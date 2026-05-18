import { z } from "zod";
export * from "./supabase";
export * from "./themes";
export * from "./db";

export const TaskSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  minutes: z.number().int().min(1).max(480),
  color: z.string(),
  icon: z.string(),
});

export type Task = z.infer<typeof TaskSchema>;

