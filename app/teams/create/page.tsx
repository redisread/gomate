"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Users, Calendar, MapPin, Route } from "lucide-react";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequirementSelector } from "@/components/ui/requirement-selector";
import { useLocations } from "@/lib/locations-context";
import { useTeams } from "@/lib/teams-context";
import { useAuth } from "@/lib/auth-context";
import { copy } from "@/lib/copy";
import { Checkbox } from "@/components/ui/checkbox";

function CreateTeamForm() {
  const { addTeam } = useTeams();
  const { locations, getLocationById } = useLocations();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationIdFromUrl = searchParams.get("locationId");
  const routeIdFromUrl = searchParams.get("routeId");

  // 获取默认日期和时间（日期为今天，时间为4小时后）
  const getDefaultDateTime = () => {
    const now = new Date();

    // 默认日期：今天
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const defaultDate = `${year}-${month}-${day}`;

    // 默认时间：4小时后
    const futureTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const hours = String(futureTime.getHours()).padStart(2, '0');
    const minutes = String(futureTime.getMinutes()).padStart(2, '0');
    const defaultTime = `${hours}:${minutes}`;

    return { defaultDate, defaultTime };
  };

  const { defaultDate, defaultTime } = getDefaultDateTime();

  const [formData, setFormData] = React.useState({
    title: "",
    locationId: locationIdFromUrl || "",
    routeId: routeIdFromUrl || "", // 新增路线 ID
    date: defaultDate,
    time: defaultTime,
    duration: "",
    maxMembers: "",
    description: "",
  });

  const [requirements, setRequirements] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  // 是否关联具体路线
  const [hasRoute, setHasRoute] = React.useState(true);

  const selectedLocation = formData.locationId
    ? getLocationById(formData.locationId)
    : null;

  // 获取选中地点的路线列表
  const locationRoutes = selectedLocation?.routes || [];

  // 当地点改变时,根据 hasRoute 状态自动选择第一条路线(如果有)
  React.useEffect(() => {
    if (selectedLocation && locationRoutes.length > 0 && hasRoute && !formData.routeId) {
      setFormData((prev) => ({ ...prev, routeId: locationRoutes[0].id }));
    }
  }, [selectedLocation, locationRoutes, formData.routeId, hasRoute]);

  // 获取选中的路线
  const selectedRoute = formData.routeId
    ? locationRoutes.find((r) => r.id === formData.routeId)
    : null;

  // 检查登录状态，未登录重定向到登录页
  React.useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 验证：如果勾选了"关联路线"，则必须选择路线
      if (hasRoute && !formData.routeId) {
        alert("请选择一条路线，或取消勾选\"关联具体路线\"");
        setIsSubmitting(false);
        return;
      }

      // 创建新队伍
      const newTeam = await addTeam({
        locationId: formData.locationId,
        routeId: hasRoute ? formData.routeId : undefined, // 根据 hasRoute 决定是否传递 routeId
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        maxMembers: parseInt(formData.maxMembers, 10),
        requirements: requirements,
      });

      // 跳转到新创建的队伍详情页
      router.push(`/teams/${newTeam.id}`);
    } catch (error) {
      console.error("创建队伍失败:", error);
      alert(error instanceof Error ? error.message : copy.teams.createBtnLoading);
      setIsSubmitting(false);
    }
  };

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
            <Link href={locationIdFromUrl ? `/locations/${locationIdFromUrl}` : "/"}>
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
          <h1 className="text-3xl font-bold text-stone-900">{copy.teams.createTitle}</h1>
          <p className="text-stone-600 mt-2">
            {copy.teams.createSubtitle}
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

                {/* 选择地点 */}
                <div className="space-y-2">
                  <Label htmlFor="locationId">
                    {copy.teams.formLabel.location} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <select
                      id="locationId"
                      name="locationId"
                      value={formData.locationId}
                      onChange={handleInputChange}
                      required
                      className="flex h-10 w-full rounded-md border border-stone-200 bg-white pl-10 pr-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
                    >
                      <option value="">{copy.teams.formPlaceholder.location}</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} - {loc.subtitle}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 关联路线开关 */}
                {selectedLocation && locationRoutes.length > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-stone-200 bg-stone-50">
                    <Checkbox
                      id="hasRoute"
                      checked={hasRoute}
                      onCheckedChange={(checked) => {
                        const isChecked = checked as boolean;
                        setHasRoute(isChecked);
                        if (!isChecked) {
                          setFormData(prev => ({ ...prev, routeId: "" }));
                        } else if (locationRoutes.length > 0) {
                          setFormData(prev => ({ ...prev, routeId: locationRoutes[0].id }));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <Label htmlFor="hasRoute" className="cursor-pointer font-medium">
                        关联具体路线
                      </Label>
                      <p className="text-sm text-stone-500">
                        不勾选则表示自由组队、路线未定
                      </p>
                    </div>
                    <Route className="h-5 w-5 text-stone-400" />
                  </div>
                )}

                {/* 选择路线（仅在勾选"关联路线"时显示） */}
                {selectedLocation && hasRoute && locationRoutes.length > 0 && (
                  <div className="space-y-2">
                    <Label>
                      选择路线 <span className="text-red-500">*</span>
                    </Label>
                    <div className="space-y-2">
                      {locationRoutes.map((route) => {
                        const difficultyLabel =
                          route.difficulty === "easy" ? copy.enums.difficulty.easy :
                          route.difficulty === "moderate" ? copy.enums.difficulty.moderate :
                          route.difficulty === "hard" ? copy.enums.difficulty.hard :
                          copy.enums.difficulty.expert;

                        return (
                          <label
                            key={route.id}
                            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              formData.routeId === route.id
                                ? "border-stone-900 bg-stone-50"
                                : "border-stone-200 hover:border-stone-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="routeId"
                              value={route.id}
                              checked={formData.routeId === route.id}
                              onChange={handleInputChange}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-stone-900">{route.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  route.difficulty === "easy" ? "bg-green-100 text-green-800" :
                                  route.difficulty === "moderate" ? "bg-blue-100 text-blue-800" :
                                  route.difficulty === "hard" ? "bg-orange-100 text-orange-800" :
                                  "bg-red-100 text-red-800"
                                }`}>
                                  {difficultyLabel}
                                </span>
                              </div>
                              <div className="text-sm text-stone-500">
                                {route.duration} · {route.distance}
                                {route.elevation && ` · 爬升 ${route.elevation}`}
                              </div>
                              {route.description && (
                                <p className="text-sm text-stone-600 mt-1 line-clamp-2">
                                  {route.description}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 无路线提示（仅在勾选"关联路线"但无可用路线时显示） */}
                {selectedLocation && hasRoute && locationRoutes.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      该地点暂无可用路线，请取消勾选"关联具体路线"或联系管理员添加路线信息。
                    </p>
                  </div>
                )}

                {/* 日期和时间 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">
                      {copy.teams.formLabel.date} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        required
                        className="border-stone-200 pl-10"
                      />
                    </div>
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

                {/* 时长和人数 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">
                      {copy.teams.formLabel.duration} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <Input
                        id="duration"
                        name="duration"
                        placeholder={copy.teams.formPlaceholder.duration}
                        value={formData.duration}
                        onChange={handleInputChange}
                        required
                        className="border-stone-200 pl-10"
                      />
                    </div>
                  </div>
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
                        min={2}
                        max={50}
                        placeholder={copy.teams.formPlaceholder.maxSize}
                        value={formData.maxMembers}
                        onChange={handleInputChange}
                        required
                        className="border-stone-200 pl-10"
                      />
                    </div>
                  </div>
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

                {/* 提示信息 */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>{copy.common.confirm}：</strong>
                    {copy.teams.createTip}
                  </p>
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
                    {isSubmitting ? copy.teams.createBtnLoading : copy.teams.createBtn}
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
function CreateTeamLoading() {
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
export default function CreateTeamPage() {
  return (
    <Suspense fallback={<CreateTeamLoading />}>
      <CreateTeamForm />
    </Suspense>
  );
}
