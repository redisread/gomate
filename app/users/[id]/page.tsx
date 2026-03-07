import { Metadata } from "next";
import { notFound } from "next/navigation";
import { UserClientPage } from "./user-client-page";
import type { UserPublicProfile } from "@/lib/types";

interface UserPageProps {
  params: Promise<{ id: string }>;
}

/**
 * 获取用户公开信息
 */
async function getUserProfile(id: string): Promise<UserPublicProfile | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/users/${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error("Failed to fetch user profile");
    }

    const data = await response.json();
    return data.user || null;
  } catch (error) {
    console.error("[User Page] Fetch error:", error);
    return null;
  }
}

/**
 * 生成页面 metadata
 */
export async function generateMetadata({
  params,
}: UserPageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getUserProfile(id);

  if (!user) {
    return {
      title: "用户不存在 - GoMate",
    };
  }

  const displayName = user.nickname || user.name;

  return {
    title: `${displayName}的个人主页 - GoMate`,
    description: user.bio || `${displayName}的户外徒步档案`,
  };
}

/**
 * 用户详情页（服务端组件）
 */
export default async function UserPage({ params }: UserPageProps) {
  const { id } = await params;
  const user = await getUserProfile(id);

  if (!user) {
    notFound();
  }

  return <UserClientPage user={user} />;
}
