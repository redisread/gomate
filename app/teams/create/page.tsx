"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, X, Clock, Users, Calendar, MapPin } from "lucide-react";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { locations, getLocationById } from "@/lib/data/mock";
import { useTeams } from "@/lib/teams-context";
import { useAuth } from "@/lib/auth-context";

function CreateTeamForm() {
  const { addTeam } = useTeams();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationIdFromUrl = searchParams.get("locationId");

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
    date: defaultDate,
    time: defaultTime,
    duration: "",
    maxMembers: "",
    description: "",
  });

  const [requirements, setRequirements] = React.useState<string[]>([]);
  const [newRequirement, setNewRequirement] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const selectedLocation = formData.locationId
    ? getLocationById(formData.locationId)
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

  const handleAddRequirement = () => {
    if (newRequirement.trim() && !requirements.includes(newRequirement.trim())) {
      setRequirements((prev) => [...prev, newRequirement.trim()]);
      setNewRequirement("");
    }
  };

  const handleRemoveRequirement = (req: string) => {
    setRequirements((prev) => prev.filter((r) => r !== req));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 创建新队伍
      const newTeam = await addTeam({
        locationId: formData.locationId,
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
      alert(error instanceof Error ? error.message : "创建队伍失败，请稍后重试");
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
              返回
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
          <h1 className="text-3xl font-bold text-stone-900">发布队伍</h1>
          <p className="text-stone-600 mt-2">
            创建一个新的徒步队伍，邀请志同道合的伙伴一起探索山野
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
                    队伍标题 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="例如：七娘山挑战队 - 周六登顶看海"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="border-stone-200"
                  />
                </div>

                {/* 选择地点 */}
                <div className="space-y-2">
                  <Label htmlFor="locationId">
                    徒步地点 <span className="text-red-500">*</span>
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
                      <option value="">请选择徒步地点</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} - {loc.subtitle}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedLocation && (
                    <p className="text-sm text-stone-500">
                      {selectedLocation.difficulty === "easy"
                        ? "简单"
                        : selectedLocation.difficulty === "moderate"
                        ? "中等"
                        : selectedLocation.difficulty === "hard"
                        ? "困难"
                        : "极难"}{" "}
                      · {selectedLocation.duration} · {selectedLocation.distance}
                    </p>
                  )}
                </div>

                {/* 日期和时间 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">
                      活动日期 <span className="text-red-500">*</span>
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
                      集合时间 <span className="text-red-500">*</span>
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
                      预计时长 <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <Input
                        id="duration"
                        name="duration"
                        placeholder="例如：6-8小时"
                        value={formData.duration}
                        onChange={handleInputChange}
                        required
                        className="border-stone-200 pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxMembers">
                      最大人数 <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <Input
                        id="maxMembers"
                        name="maxMembers"
                        type="number"
                        min={2}
                        max={50}
                        placeholder="例如：6"
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
                    队伍描述 <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="描述一下这次行程的具体安排、难度、风景特色等..."
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="border-stone-200 resize-none"
                  />
                </div>

                {/* 加入要求 */}
                <div className="space-y-2">
                  <Label>加入要求</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="例如：有徒步经验"
                      value={newRequirement}
                      onChange={(e) => setNewRequirement(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddRequirement();
                        }
                      }}
                      className="border-stone-200"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddRequirement}
                      className="border-stone-200"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {requirements.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {requirements.map((req) => (
                        <Badge
                          key={req}
                          variant="secondary"
                          className="bg-stone-100 text-stone-700 hover:bg-stone-200 px-3 py-1"
                        >
                          {req}
                          <button
                            type="button"
                            onClick={() => handleRemoveRequirement(req)}
                            className="ml-2 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* 提示信息 */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>提示：</strong>
                    发布队伍后，其他用户可以申请加入。请确保填写的信息准确，并在活动开始前及时与队员沟通集合细节。
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
                    取消
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-stone-900 hover:bg-stone-800"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "发布中..." : "发布队伍"}
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
