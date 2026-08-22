import type {
  ActivityType,
  RecruitmentStatus,
  TeamJoinRequestStatus,
  TeamLifecycle,
  UserExtra,
} from "@/contracts";

export interface TeamItem {
  id: string;
  locationId: string;
  leaderId: string;
  activityType: ActivityType;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  maxParticipants: number;
  activeParticipantCount: number;
  requirements: string[];
  recruitmentStatus: RecruitmentStatus;
  formedAt: string | null;
  cancelledAt: string | null;
  lifecycle: TeamLifecycle;
  isFull: boolean;
  createdAt: string;
  updatedAt: string;
  location?: {
    id: string;
    name: string;
    coverImageUrl: string;
  };
}

interface JoinRequestBase {
  id: string;
  teamId: string;
  userId: string;
  status: TeamJoinRequestStatus;
  message: string | null;
  decidedByUserId: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  team: { id: string; title: string };
}

export type ApplicationRecord = JoinRequestBase;

export interface PendingApproval extends JoinRequestBase {
  status: "pending";
  user: {
    id: string;
    name: string;
    nickname: string | null;
    image: string | null;
    bio: string | null;
    extra: UserExtra;
  };
}
