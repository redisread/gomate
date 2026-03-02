import { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamClientPage } from "./team-client-page";
import { getTeamForMetadata } from "@/lib/team-data";

interface TeamPageProps {
  params: Promise<{
    id: string;
  }>;
}

// 生成动态元数据，支持社交分享
export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { id } = await params;
  const team = await getTeamForMetadata(id);

  if (!team) {
    return {
      title: "队伍未找到 - GoMate",
    };
  }

  const title = `${team.title} - GoMate`;
  const description = team.description || `${team.title} - ${team.location?.name || "徒步活动"}`;
  const imageUrl = team.location?.coverImage;
  const pageUrl = `${process.env.BETTER_AUTH_URL || "https://gomate.cn"}/teams/${team.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: pageUrl,
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630, alt: team.title }] : [],
      siteName: "GoMate",
      locale: "zh_CN",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

// 服务端组件，获取 params 并传递给客户端组件
export default async function TeamPage({ params }: TeamPageProps) {
  const { id } = await params;

  // 验证队伍是否存在（用于 SEO 和 404 处理）
  const team = await getTeamForMetadata(id);

  if (!team) {
    notFound();
  }

  return <TeamClientPage teamId={id} />;
}