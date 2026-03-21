"use client";

import * as React from "react";
import {
  ArrowLeft,
  User,
  Mail,
  Mountain,
  Edit3,
  LogOut,
  MapPin,
  Calendar,
  Award,
  Users,
  Loader2,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import { signOut } from "@/lib/auth-client";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { SessionUser } from "@/lib/types";

const levelStyles: Record<string, { color: string; label: string }> = {
  beginner: { color: "bg-emerald-100 text-emerald-700", label: "初级" },
  intermediate: { color: "bg-blue-100 text-blue-700", label: "中级" },
  advanced: { color: "bg-purple-100 text-purple-700", label: "高级" },
  expert: { color: "bg-amber-100 text-amber-700", label: "专家" },
};

/**
 * 个人资料页客户端组件 - React Island
 */
export function ProfileClient() {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [createdTeams, setCreatedTeams] = React.useState<any[]>([]);
  const [joinedTeams, setJoinedTeams] = React.useState<any[]>([]);

  React.useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAPI("/auth/get-session");
      const data = await res.json();
      if (!data?.user?.id) {
        window.location.href = "/login?redirect=/profile";
        return;
      }
      setUser(data.user);
      loadTeams(data.user.id);
    } catch {
      window.location.href = "/login?redirect=/profile";
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeams = async (userId: string) => {
    try {
      const [createdRes, joinedRes] = await Promise.all([
        fetchAPI(`/api/teams?leaderId=${userId}&pageSize=3`),
        fetchAPI("/api/user/teams/joined?pageSize=3"),
      ]);
      const createdData = await createdRes.json();
      const joinedData = await joinedRes.json();
      if (createdData.success) setCreatedTeams(createdData.teams || []);
      if (joinedData.success) setJoinedTeams(joinedData.teams || []);
    } catch {}
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </div>
      </main>
    );
  }

  if (!user) return null;

  const levelStyle = levelStyles[user.level] || levelStyles.beginner;
  const displayName = user.nickname || user.name;

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Back */}
        <a href="/" className="inline-flex items-center text-stone-600 hover:text-stone-900 transition-colors mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {copy.common.backHome}
        </a>

        {/* Profile Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="relative h-40 bg-gradient-to-r from-stone-900 to-stone-700">
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/30 to-transparent" />
            </div>
            <div className="relative px-6 pb-6">
              {/* Avatar */}
              <div className="absolute -top-20 left-6">
                <div className="h-32 w-32 rounded-full border-4 border-white shadow-lg bg-stone-200 flex items-center justify-center overflow-hidden">
                  {user.image ? (
                    <img src={user.image} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-stone-600">{displayName?.[0]}</span>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="pt-24 sm:pt-4 sm:pl-40">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-stone-900">{displayName}</h1>
                    <p className="text-stone-500 flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a href="/profile/edit">
                      <button className="flex items-center gap-2 bg-stone-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors">
                        <Edit3 className="h-4 w-4" />
                        {copy.profile.editProfileBtn}
                      </button>
                    </a>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 border border-stone-200 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      {copy.profile.logoutBtn}
                    </button>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${levelStyle.color}`}>
                    <Award className="h-3 w-3" />
                    {copy.enums.level[user.level as keyof typeof copy.enums.level] || levelStyle.label}{copy.profile.levelTitleSuffix}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600">
                    <Mountain className="h-3 w-3" />
                    {copy.common.person} {user.completedHikes || 0} {copy.profile.hikesCompleted}
                  </span>
                </div>

                {/* Bio */}
                {user.bio && <p className="mt-4 text-stone-600 leading-relaxed">{user.bio}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <a href="/my-teams?tab=created">
            <div className="bg-white rounded-2xl border border-stone-200 hover:shadow-md hover:border-stone-300 transition-all cursor-pointer p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-500">{copy.profile.createdTeams}</p>
                  <p className="text-3xl font-bold text-stone-900 mt-1">{createdTeams.length}</p>
                </div>
                <div className="h-12 w-12 bg-stone-900 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </a>
          <a href="/my-teams?tab=joined">
            <div className="bg-white rounded-2xl border border-stone-200 hover:shadow-md hover:border-stone-300 transition-all cursor-pointer p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-500">{copy.profile.joinedTeams}</p>
                  <p className="text-3xl font-bold text-stone-900 mt-1">{joinedTeams.length}</p>
                </div>
                <div className="h-12 w-12 bg-stone-900 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </a>
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">{copy.profile.registeredAt}</p>
                <p className="text-lg font-bold text-stone-900 mt-1">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString("zh-CN") : "-"}
                </p>
              </div>
              <div className="h-12 w-12 bg-stone-900 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Created Teams */}
        {createdTeams.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-stone-900">{copy.profile.recentTeams}</h2>
                <p className="text-sm text-stone-500 mt-1">{copy.profile.createdTeamsDesc}</p>
              </div>
              <a href="/my-teams">
                <button className="border border-stone-200 text-stone-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors">
                  {copy.common.viewAll}
                </button>
              </a>
            </div>
            <div className="space-y-3">
              {createdTeams.map((team: any) => (
                <a key={team.id} href={`/teams/${team.id}`}>
                  <div className="bg-white rounded-xl border border-stone-200 hover:shadow-xl transition-all duration-300 p-4 mb-3">
                    <div className="flex items-start gap-4">
                      {team.location?.coverImage && (
                        <div className="w-16 h-16 rounded-lg bg-cover bg-center flex-shrink-0"
                          style={{ backgroundImage: `url(${team.location.coverImage})` }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-stone-900 truncate">{team.title}</h3>
                        <p className="text-sm text-stone-500 mt-1">
                          {team.location?.name && <><MapPin className="h-3 w-3 inline mr-1" />{team.location.name} · </>}
                          {team.date} · {team.currentMembers}/{team.maxMembers}{copy.common.person}
                        </p>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {createdTeams.length === 0 && joinedTeams.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-12 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-stone-400" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 mb-2">{copy.profile.noTeamsYet}</h3>
            <p className="text-sm text-stone-500 mb-4">{copy.profile.noTeamsTip}</p>
            <a href="/teams/create">
              <button className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
                {copy.profile.createTeamBtn}
              </button>
            </a>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
