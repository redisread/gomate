"use client";

// DEBUG VERSION 3 - Force rebuild - TIMESTAMP: $(date +%s)
import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { TeamHeader } from "@/app/components/features/team-header";
import { TeamInfo } from "@/app/components/features/team-info";
import { LeaderCard } from "@/app/components/features/leader-card";
import { JoinButton } from "@/components/features/join-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocations } from "@/lib/locations-context";
import { useAuth } from "@/lib/auth-context";
import type { Team } from "@/lib/types";
import type { Location } from "@/lib/types";

interface TeamPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function TeamPage({ params }: TeamPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [teamId, setTeamId] = React.useState<string>("");
  const [team, setTeam] = React.useState<Team | null>(null);
  const [location, setLocation] = React.useState<Location | undefined>(undefined);
  const { getLocationById, isLoading: locationsLoading } = useLocations();
  const [otherTeams, setOtherTeams] = React.useState<Team[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);


  React.useEffect(() => {
    params.then(({ id }) => {
      setTeamId(id);
      fetchTeam(id);
    });
  }, [params]);

  const fetchTeam = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/teams/${id}`);

      if (response.status === 404) {
        setError("队伍不存在");
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error("获取队伍详情失败");
      }

      const result = await response.json();
      if (result.success && result.team) {
        const teamData = result.team;
        setTeam(teamData);

        // 获取该地点的其他队伍
        fetchOtherTeams(id, teamData.locationId);
      } else {
        setError("队伍不存在");
      }
    } catch (err) {
      console.error("获取队伍详情失败:", err);
      setError("获取队伍详情失败");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOtherTeams = async (currentId: string, locationId: string) => {
    try {
      const response = await fetch(`/api/teams?locationId=${locationId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.teams) {
          const filtered = result.teams
            .filter((t: Team) => t.id !== currentId && t.status === "open")
            .slice(0, 2);
          setOtherTeams(filtered);
        }
      }
    } catch (err) {
      console.error("获取其他队伍失败:", err);
    }
  };

  // 当 team 数据和 locations 都加载完成后，查找对应的 location
  React.useEffect(() => {
    if (team && !locationsLoading) {
      const loc = getLocationById(team.locationId);
      setLocation(loc);
    }
  }, [team, locationsLoading, getLocationById]);

  if (isLoading || (team && locationsLoading)) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">加载中...</div>
      </div>
    );
  }

  if (error || !team || !location) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-900 mb-2">{error || "队伍不存在"}</h1>
          <button
            onClick={() => router.push("/teams")}
            className="text-stone-600 hover:text-stone-900 underline"
          >
            返回队伍列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Location Preview Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative h-48 sm:h-64"
      >
        <Image
          src={location.coverImage}
          alt={location.name}
          fill
          className="object-cover"
          unoptimized={location.coverImage.includes('gomate.cos.jiahongw.com')}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <Link
              href={`/locations/${location.id}`}
              className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-2 transition-colors"
            >
              <MapPin className="h-4 w-4" />
              {location.name}
            </Link>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {location.subtitle}
            </h2>
          </div>
        </div>
      </motion.div>

      {/* Team Header */}
      <TeamHeader team={team} location={location} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Team Info */}
          <div className="lg:col-span-2 space-y-6">
            <TeamInfo team={team} />

            {/* Location Info Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <Card className="border-stone-200">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
                      style={{ backgroundImage: `url(${location.coverImage})` }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-stone-900 mb-1">
                        {location.name}
                      </h3>
                      <p className="text-sm text-stone-500 mb-3">
                        {location.difficulty === "easy"
                          ? "简单"
                          : location.difficulty === "moderate"
                          ? "中等"
                          : location.difficulty === "hard"
                          ? "困难"
                          : "极难"}{" "}
                        · {location.duration} · {location.distance}
                      </p>
                      <Link
                        href={`/locations/${location.id}`}
                        className="inline-flex items-center text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors"
                      >
                        查看地点详情
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Other Teams */}
            {otherTeams.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
              >
                <h3 className="text-lg font-semibold text-stone-900 mb-4">
                  该地点的其他队伍
                </h3>
                <div className="space-y-3">
                  {otherTeams.map((otherTeam) => (
                    <Link key={otherTeam.id} href={`/teams/${otherTeam.id}`}>
                      <Card className="border-stone-200 hover:shadow-md transition-all cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-stone-900">
                                {otherTeam.title}
                              </h4>
                              <p className="text-sm text-stone-500 mt-1">
                                {otherTeam.date} · {otherTeam.time} ·{" "}
                                {otherTeam.currentMembers}/{otherTeam.maxMembers}人
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className="bg-emerald-50 text-emerald-700"
                            >
                              招募中
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Leader & Actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <LeaderCard team={team} />

              {/* Safety Notice */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-amber-800 mb-2">
                      安全提示
                    </h4>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• 请评估自身体能，量力而行</li>
                      <li>• 建议购买户外保险</li>
                      <li>• 遵守领队安排，不擅自离队</li>
                      <li>• 注意天气变化，做好防护</li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Join Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 z-40">
        <div className="max-w-7xl mx-auto">
          <JoinButton team={team} />
        </div>
      </div>

      <Footer />
    </main>
  );
}
