"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Users, Calendar, AlertCircle } from "lucide-react";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequirementSelector } from "@/components/ui/requirement-selector";
import { useAuth } from "@/lib/auth-context";
import { copy } from "@/lib/copy";
import type { Team } from "@/lib/types";

interface EditTeamPageProps {
  params: Promise<{
    id: string;
  }>;
}

function EditTeamForm({ params }: EditTeamPageProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const [teamId, setTeamId] = React.useState<string>("");
  const [team, setTeam] = React.useState<Team | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [formData, setFormData] = React.useState({
    title: "",
    date: "",
    time: "",
    durationMin: "240",
    maxMembers: "",
    description: "",
  });

  const [requirements, setRequirements] = React.useState<string[]>([]);

  // 获取队伍数据
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

      if (!response.ok) {
        router.push("/teams");
        return;
      }

      const result = await response.json();
      if (result.success && result.team) {
        const teamData = result.team as Team;

        // 检查是否是队长
        if (teamData.leader.id !== user?.id) {
          router.push(`/teams/${id}`);
          return;
        }

        setTeam(teamData);
        setFormData({
          title: teamData.title,
          date: teamData.date,
          time: teamData.time,
          durationMin: (teamData.durationMin || 240).toString(),
          maxMembers: teamData.maxMembers.toString(),
          description: teamData.description,
        });
        setRequirements(teamData.requirements || []);
      }
    } catch (error) {
      console.error("获取队伍详情失败:", error);
      router.push("/teams");
    } finally {
      setIsLoading(false);
    }
  };

  // 检查登录状态
  React.useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // 等待用户数据加载
  React.useEffect(() => {
    if (team && user && team.leader.id !== user.id) {
      router.push(`/teams/${teamId}`);
    }
  }, [team, user, teamId, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          maxMembers: parseInt(formData.maxMembers, 10),
          requirements,
          time: formData.time,
          durationMin: parseInt(formData.durationMin, 10),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        router.push(`/teams/${teamId}`);
      } else {
        alert(result.error || copy.teams.editFailed);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("更新队伍失败:", error);
      alert(copy.teams.editFailed);
      setIsSubmitting(false);
    }
  };

  if (isLoading || isAuthLoading || !team) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-stone-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
            <div className="animate-pulse">
              <div className="h-8 w-32 bg-stone-200 rounded mb-6" />
              <div className="h-10 w-64 bg-stone-200 rounded mb-2" />
              <div className="h-6 w-96 bg-stone-200 rounded mb-8" />
              <div className="h-96 bg-stone-200 rounded-xl" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-stone-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              variant="ghost"
              className="mb-6 text-stone-600 hover:text-stone-900"
              asChild
            >
              <Link href={`/teams/${teamId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {copy.common.back}
              </Link>
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-stone-900">{copy.teams.editTitle}</h1>
            <p className="text-stone-600 mt-2">
              {copy.teams.editSubtitle}
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="border-stone-200">
              <CardHeader>
                <CardTitle className="text-lg">队伍信息</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 队伍标题 */}
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      {copy.teams.formLabel.name} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder={copy.teams.formPlaceholder.name}
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="border-stone-200"
                    />
                  </div>

                  {/* 日期和时间 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        {copy.teams.formLabel.date}
                      </Label>
                      <div className="flex items-center gap-2 p-2.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                        <Calendar className="h-4 w-4 text-stone-500" />
                        <span>{formData.date}</span>
                      </div>
                      <p className="text-xs text-stone-500">活动日期创建后不可修改</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">
                        {copy.teams.formLabel.meetTime} <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                        <Input
                          id="time"
                          name="time"
                          type="time"
                          value={formData.time}
                          onChange={handleInputChange}
                          required
                          className="border-stone-200 pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 预计时长 */}
                  <div className="space-y-2">
                    <Label htmlFor="durationMin">
                      {copy.teams.formLabel.duration} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <select
                        id="durationMin"
                        name="durationMin"
                        value={formData.durationMin}
                        onChange={handleInputChange}
                        required
                        className="flex h-10 w-full rounded-md border border-stone-200 bg-white px-3 py-2 pl-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="120">2小时</option>
                        <option value="180">3小时</option>
                        <option value="240">4小时</option>
                        <option value="300">5小时</option>
                        <option value="360">6小时</option>
                        <option value="420">7小时</option>
                        <option value="480">8小时</option>
                        <option value="540">9小时</option>
                        <option value="600">10小时</option>
                        <option value="720">12小时</option>
                      </select>
                    </div>
                  </div>

                  {/* 最大人数 */}
                  <div className="space-y-2">
                    <Label htmlFor="maxMembers">
                      {copy.teams.formLabel.maxSize} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <Input
                        id="maxMembers"
                        name="maxMembers"
                        type="number"
                        min={team.currentMembers}
                        max={50}
                        placeholder={copy.teams.formPlaceholder.maxSize}
                        value={formData.maxMembers}
                        onChange={handleInputChange}
                        required
                        className="border-stone-200 pl-10"
                      />
                    </div>
                    <p className="text-xs text-stone-500">
                      当前已有 {team.currentMembers} 人加入，最小人数为 {team.currentMembers}
                    </p>
                  </div>

                  {/* 队伍描述 */}
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      {copy.teams.formLabel.description} <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder={copy.teams.formPlaceholder.description}
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="border-stone-200 resize-none"
                    />
                  </div>

                  {/* 加入要求 */}
                  <div className="space-y-2">
                    <Label>{copy.teams.formLabel.requirements}</Label>
                    <RequirementSelector
                      value={requirements}
                      onChange={setRequirements}
                      placeholder={copy.teams.formPlaceholder.requirements}
                    />
                  </div>

                  {/* 提交按钮 */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 border-stone-200"
                      onClick={() => router.back()}
                    >
                      {copy.common.cancel}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-stone-900 hover:bg-stone-800"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? copy.teams.editBtnLoading : copy.common.save}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
}

// Loading fallback for Suspense
function EditTeamLoading() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-stone-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-stone-200 rounded mb-6" />
            <div className="h-10 w-64 bg-stone-200 rounded mb-2" />
            <div className="h-6 w-96 bg-stone-200 rounded mb-8" />
            <div className="h-96 bg-stone-200 rounded-xl" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

// Main page component with Suspense
export default function EditTeamPage({ params }: EditTeamPageProps) {
  return (
    <Suspense fallback={<EditTeamLoading />}>
      <EditTeamForm params={params} />
    </Suspense>
  );
}