"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Users,
  MapPin,
  Calendar,
  Crown,
  User,
  ChevronRight,
  Clock,
} from "lucide-react";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useTeams } from "@/lib/teams-context";
import { useLocations } from "@/lib/locations-context";

// Loading fallback
function MyTeamsLoading() {
  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-stone-200 rounded mb-8" />
          <div className="h-10 w-full bg-stone-200 rounded mb-6" />
          <div className="space-y-4">
            <div className="h-24 bg-stone-200 rounded" />
            <div className="h-24 bg-stone-200 rounded" />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

// 状态映射
const statusLabels: Record<string, { label: string; color: string }> = {
  open: { label: "招募中", color: "bg-emerald-100 text-emerald-700" },
  full: { label: "已满员", color: "bg-amber-100 text-amber-700" },
  closed: { label: "已结束", color: "bg-stone-100 text-stone-600" },
};

function MyTeamsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { teams, getUserJoinedTeams } = useTeams();
  const { locations } = useLocations();

  // 从 URL 参数获取默认 Tab
  const defaultTab = searchParams.get("tab") || "created";
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  // 未登录重定向
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // 当 URL 参数变化时更新 Tab
  React.useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["created", "joined", "history"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // 当 Tab 切换时更新 URL（不刷新页面）
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    router.replace(`/my-teams?${params.toString()}`, { scroll: false });
  };

  if (isLoading || !user) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">加载中...</div>
      </main>
    );
  }

  const [joinedTeams, setJoinedTeams] = React.useState<Team[]>([]);
  const [joinedTeamsLoading, setJoinedTeamsLoading] = React.useState(true);

  // 加载用户加入的队伍
  React.useEffect(() => {
    const fetchJoinedTeams = async () => {
      if (user?.id) {
        try {
          setJoinedTeamsLoading(true);
          const userJoinedTeams = await getUserJoinedTeams();
          setJoinedTeams(userJoinedTeams);
        } catch (error) {
          console.error("获取用户加入的队伍失败:", error);
          setJoinedTeams([]);
        } finally {
          setJoinedTeamsLoading(false);
        }
      } else {
        setJoinedTeams([]);
        setJoinedTeamsLoading(false);
      }
    };

    fetchJoinedTeams();
  }, [user?.id, getUserJoinedTeams]);

  // 获取用户创建的队伍
  const createdTeams = teams.filter((t) => t.leader.id === user.id);

  // 获取历史队伍（已结束的）
  const historyTeams = teams.filter(
    (t) => t.leader.id === user.id && t.status === "closed"
  );

  const TeamCard = ({ team, isLeader = false }: { team: typeof teams[0]; isLeader?: boolean }) => {
    const location = locations.find((l) => l.id === team.locationId);
    const status = statusLabels[team.status] || statusLabels.open;

    return (
      <Link href={`/teams/${team.id}`}>
        <Card className="border-stone-200 hover:shadow-lg transition-all cursor-pointer group">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Location Image */}
              <div
                className="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
                style={{ backgroundImage: `url(${location?.coverImage})` }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">
                        {team.title}
                      </h3>
                      {isLeader && (
                        <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          <Crown className="h-3 w-3 mr-1" />
                          队长
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-stone-500 mt-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {location?.name}
                    </p>
                  </div>
                  <Badge className={status.color}>
                    {status.label}
                  </Badge>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-stone-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {team.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {team.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className={team.currentMembers >= team.maxMembers ? "text-amber-600" : "text-emerald-600"}>
                      {team.currentMembers}/{team.maxMembers}人
                    </span>
                  </span>
                </div>

                {/* Requirements */}
                {team.requirements.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {team.requirements.slice(0, 3).map((req) => (
                      <span
                        key={req}
                        className="text-xs px-2 py-1 bg-stone-100 text-stone-600 rounded-full"
                      >
                        {req}
                      </span>
                    ))}
                    {team.requirements.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-stone-100 text-stone-500 rounded-full">
                        +{team.requirements.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  const EmptyState = ({ type }: { type: "created" | "joined" | "history" }) => {
    const configs = {
      created: {
        icon: Crown,
        title: "还没有创建队伍",
        description: "作为队长创建队伍，带领伙伴探索山野",
        action: "创建队伍",
        href: "/teams/create",
      },
      joined: {
        icon: User,
        title: "还没有加入队伍",
        description: "浏览地点，加入感兴趣的队伍",
        action: "探索地点",
        href: "/locations",
      },
      history: {
        icon: Clock,
        title: "没有历史记录",
        description: "完成的徒步活动会显示在这里",
        action: "去徒步",
        href: "/locations",
      },
    };

    const config = configs[type];
    const Icon = config.icon;

    return (
      <Card className="border-dashed border-stone-300 bg-stone-50/50">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon className="h-8 w-8 text-stone-400" />
          </div>
          <h3 className="text-lg font-medium text-stone-900 mb-2">{config.title}</h3>
          <p className="text-sm text-stone-500 mb-4">{config.description}</p>
          <Button className="bg-stone-900 hover:bg-stone-800" asChild>
            <Link href={config.href}>{config.action}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-stone-600 hover:text-stone-900"
              asChild
            >
              <Link href="/profile">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-stone-900">我的队伍</h1>
          </div>
          <Button className="bg-stone-900 hover:bg-stone-800" asChild>
            <Link href="/teams/create">
              <Plus className="h-4 w-4 mr-2" />
              创建队伍
            </Link>
          </Button>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex bg-stone-100">
              <TabsTrigger value="created" className="data-[state=active]:bg-white">
                <Crown className="h-4 w-4 mr-2 sm:mr-1" />
                <span className="hidden sm:inline">我创建的</span>
                <span className="sm:hidden">创建的</span>
                {createdTeams.length > 0 && (
                  <span className="ml-1.5 text-xs bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded-full">
                    {createdTeams.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="joined" className="data-[state=active]:bg-white">
                <User className="h-4 w-4 mr-2 sm:mr-1" />
                <span className="hidden sm:inline">我加入的</span>
                <span className="sm:hidden">加入的</span>
                {joinedTeams.length > 0 && (
                  <span className="ml-1.5 text-xs bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded-full">
                    {joinedTeams.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-white">
                <Clock className="h-4 w-4 mr-2 sm:mr-1" />
                历史
                {historyTeams.length > 0 && (
                  <span className="ml-1.5 text-xs bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded-full">
                    {historyTeams.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Created Teams */}
            <TabsContent value="created" className="mt-6">
              {createdTeams.length === 0 ? (
                <EmptyState type="created" />
              ) : (
                <div className="space-y-4">
                  {createdTeams.map((team) => (
                    <TeamCard key={team.id} team={team} isLeader />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Joined Teams */}
            <TabsContent value="joined" className="mt-6">
              {joinedTeamsLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-24 bg-stone-200 rounded" />
                  <div className="h-24 bg-stone-200 rounded" />
                </div>
              ) : joinedTeams.length === 0 ? (
                <EmptyState type="joined" />
              ) : (
                <div className="space-y-4">
                  {joinedTeams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* History */}
            <TabsContent value="history" className="mt-6">
              {historyTeams.length === 0 ? (
                <EmptyState type="history" />
              ) : (
                <div className="space-y-4">
                  {historyTeams.map((team) => (
                    <TeamCard key={team.id} team={team} isLeader={team.leader.id === user.id} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <Footer />
    </main>
  );
}

// Main page component with Suspense
export default function MyTeamsPage() {
  return (
    <Suspense fallback={<MyTeamsLoading />}>
      <MyTeamsContent />
    </Suspense>
  );
}
