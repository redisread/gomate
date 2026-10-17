import { z } from "zod";

export const FeedbackInputSchema = z
  .object({
    requestId: z.uuid(),
    email: z.string().trim().toLowerCase().max(320).email(),
    content: z.string().trim().min(1).max(5000),
  })
  .strict();
export type FeedbackInput = z.infer<typeof FeedbackInputSchema>;
