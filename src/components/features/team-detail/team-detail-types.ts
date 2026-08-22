import type { SessionUser, TeamJoinRequest } from "@/lib/types";

export interface TeamJoinApplication extends TeamJoinRequest {
  user: Pick<SessionUser, "id" | "name" | "nickname" | "image">;
}
