export interface ApplicationRecord {
  id: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  team: {
    id: string;
    title: string;
    date: string | null;
    time: string | null;
    currentMembers: number;
    maxMembers: number;
    status: string;
    location: { id: string; name: string; coverImage: string } | null;
    leader: { id: string; name: string; avatar: string | null } | null;
  } | null;
}

export interface PendingApproval {
  id: string;
  teamId: string;
  userId: string;
  createdAt: string;
  team: {
    id: string;
    title: string;
    date: string | null;
    time: string | null;
    currentMembers: number;
    maxMembers: number;
    location: { id: string; name: string; coverImage: string } | null;
  } | null;
  applicant: {
    id: string;
    name: string;
    avatar: string | null;
    bio: string | null;
    level: string;
    wechat?: string | null;
  } | null;
}

export interface TeamItem {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  currentMembers: number;
  maxMembers: number;
  status: string;
  location: { id: string; name: string; coverImage: string } | null;
}
