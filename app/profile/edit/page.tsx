"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Camera } from "lucide-react";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

// 经验等级选项
const levelOptions = [
  { value: "beginner", label: "初级", description: "刚开始徒步之旅" },
  { value: "intermediate", label: "中级", description: "有一定徒步经验" },
  { value: "advanced", label: "高级", description: "经验丰富的徒步者" },
  { value: "expert", label: "资深", description: "资深户外专家" },
];

export default function EditProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [formData, setFormData] = React.useState({
    name: "",
    bio: "",
    level: "beginner" as const,
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // 初始化表单数据
  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        bio: user.bio,
        level: user.level,
      });
    }
  }, [user]);

  // 未登录重定向
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    // 模拟保存延迟
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 更新 localStorage 中的用户信息
    if (user) {
      const updatedUser = {
        ...user,
        name: formData.name,
        bio: formData.bio,
        level: formData.level as "beginner" | "intermediate" | "advanced" | "expert",
      };
      localStorage.setItem("gomate_auth", JSON.stringify(updatedUser));

      // 触发存储事件以更新其他组件
      window.dispatchEvent(new StorageEvent("storage", {
        key: "gomate_auth",
        newValue: JSON.stringify(updatedUser),
      }));
    }

    setMessage({ type: "success", text: "保存成功！" });
    setIsSaving(false);

    // 延迟返回个人资料页
    setTimeout(() => {
      router.push("/profile");
    }, 1000);
  };

  if (isLoading || !user) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">加载中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
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
            <Link href="/profile">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回个人资料
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
          <h1 className="text-3xl font-bold text-stone-900">编辑个人资料</h1>
          <p className="text-stone-600 mt-2">更新你的个人信息和户外经验</p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-stone-200">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-stone-100">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-2xl bg-stone-200 text-stone-600">
                        {user.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      className="absolute bottom-0 right-0 h-8 w-8 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-stone-800 transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-stone-500">点击更换头像（功能开发中）</p>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    昵称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    minLength={2}
                    maxLength={20}
                    className="border-stone-200"
                    placeholder="请输入昵称"
                  />
                  <p className="text-xs text-stone-500">2-20个字符</p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">个人简介</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    maxLength={200}
                    className="border-stone-200 resize-none"
                    placeholder="介绍一下你自己，让更多人了解你..."
                  />
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>简短介绍你的户外经历和兴趣</span>
                    <span>{formData.bio.length}/200</span>
                  </div>
                </div>

                {/* Experience Level */}
                <div className="space-y-2">
                  <Label>徒步经验等级</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {levelOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.level === option.value
                            ? "border-stone-900 bg-stone-50"
                            : "border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="level"
                          value={option.value}
                          checked={formData.level === option.value}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <span className="font-medium text-stone-900">{option.label}</span>
                        <span className="text-xs text-stone-500 mt-1">{option.description}</span>
                        {formData.level === option.value && (
                          <Badge className="absolute top-2 right-2 bg-stone-900 text-white text-xs">
                            当前
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="border-stone-200 bg-stone-50 text-stone-500"
                  />
                  <p className="text-xs text-stone-500">邮箱暂不支持修改</p>
                </div>

                {/* Message */}
                {message && (
                  <div
                    className={`p-4 rounded-lg ${
                      message.type === "success"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                {/* Submit */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-stone-200"
                    asChild
                  >
                    <Link href="/profile">取消</Link>
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-stone-900 hover:bg-stone-800"
                    disabled={isSaving || formData.name.length < 2}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        保存
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Footer />
    </main>
  );
}
