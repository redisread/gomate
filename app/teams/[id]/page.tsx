import { teams } from "@/lib/data/mock";
import TeamPageContent from "./content";

// 静态导出参数生成
export function generateStaticParams() {
  return teams.map((team) => ({
    id: team.id,
  }));
}

interface TeamPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { id } = await params;
  return <TeamPageContent teamId={id} />;
}
