import type { z } from "zod";
import type { TimelineTeamSchema } from "@/contracts/public-responses";
export type TeamItem = z.infer<typeof TimelineTeamSchema>;
