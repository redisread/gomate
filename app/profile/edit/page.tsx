"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Camera, X } from "lucide-react";

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
import { copy } from "@/lib/copy";

// 经验等级选项
const levelOptions = [
  { value: "beginner", label: copy.enums.level.beginner, description: copy.enums.levelDesc.beginner },
  { value: "intermediate", label: copy.enums.level.intermediate, description: copy.enums.levelDesc.intermediate },
  { value: "advanced", label: copy.enums.level.advanced, description: copy.enums.levelDesc.advanced },
  { value: "expert", label: copy.enums.level.expert, description: copy.enums.levelDesc.expert },
];

// 默认头像
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();

  const [formData, setFormData] = React.useState({
    name: "",
    bio: "",
    level: "beginner" as const,
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // 头像上传相关状态
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 初始化表单数据
  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        bio: user.bio,
        level: user.level,
      });
      setAvatarPreview(user.avatar);
    }
  }, [user]);

  // 处理头像选择
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: "error", text: copy.profile.avatarInvalidType });
      return;
    }

    // 验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessage({ type: "error", text: copy.profile.avatarTooLarge });
      return;
    }

    // 创建预览
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setSelectedFile(file);
    setMessage(null);
  };

  // 清除选中的头像
  const handleClearAvatar = () => {
    setSelectedFile(null);
    setAvatarPreview(user?.avatar || DEFAULT_AVATAR);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 上传头像
  const uploadAvatar = async (): Promise<string | null> => {
    if (!selectedFile || !user) return null;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("userId", user.id);

      const response = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || copy.api.failed);
      }

      return result.url;
    } catch (error) {
      console.error("Avatar upload error:", error);
      setMessage({ type: "error", text: copy.profile.avatarUploadFailed });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

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

    try {
      if (!user) {
        throw new Error(copy.api.notAuthorized);
      }

      let avatarUrl = user.avatar;

      // 如果有新选择的头像，先上传
      if (selectedFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      // 调用自定义 API 更新用户信息（支持 bio 和 level 自定义字段）
      const response = await fetch("/api/user/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          name: formData.name,
          image: avatarUrl === DEFAULT_AVATAR ? null : avatarUrl,
          bio: formData.bio,
          level: formData.level,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || copy.common.save);
      }

      // 刷新用户信息，确保获取最新的数据
      await refreshUser();

      setMessage({ type: "success", text: copy.profile.saveSuccess });

      // 延迟返回个人资料页
      setTimeout(() => {
        router.push("/profile");
      }, 1000);
    } catch (error) {
      console.error("Save error:", error);
      setMessage({ type: "error", text: (error as Error).message || copy.common.save });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">{copy.common.loading}</div>
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
              {copy.profile.backProfile}
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
          <h1 className="text-3xl font-bold text-stone-900">{copy.profile.editTitle}</h1>
          <p className="text-stone-600 mt-2">{copy.profile.editSubtitle}</p>
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
                    <Avatar
                      className="h-24 w-24 border-4 border-stone-100 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={handleAvatarClick}
                    >
                      <AvatarImage src={avatarPreview || DEFAULT_AVATAR} />
                      <AvatarFallback className="text-2xl bg-stone-200 text-stone-600">
                        {user.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={handleAvatarClick}
                      disabled={isUploading}
                      className="absolute bottom-0 right-0 h-8 w-8 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={handleClearAvatar}
                        className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="text-center">
                    <p className="text-sm text-stone-500">
                      {selectedFile ? `${copy.profile.avatarSelected}: ${selectedFile.name}` : copy.profile.changeAvatar}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                      {copy.profile.avatarHint}
                    </p>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {copy.auth.nickname} <span className="text-red-500">*</span>
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
                    placeholder={copy.auth.nicknamePlaceholder}
                  />
                  <p className="text-xs text-stone-500">{copy.auth.nicknameRange}</p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">{copy.profile.bio}</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    maxLength={200}
                    className="border-stone-200 resize-none"
                    placeholder={copy.profile.bioPlaceholder}
                  />
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>{copy.profile.bioHint}</span>
                    <span>{formData.bio.length}/200</span>
                  </div>
                </div>

                {/* Experience Level */}
                <div className="space-y-2">
                  <Label>{copy.profile.levelLabel}</Label>
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
                            {copy.profile.levelCurrent}
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">{copy.profile.emailLabel}</Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="border-stone-200 bg-stone-50 text-stone-500"
                  />
                  <p className="text-xs text-stone-500">{copy.profile.emailReadonly}</p>
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
                    <Link href="/profile">{copy.common.cancel}</Link>
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-stone-900 hover:bg-stone-800"
                    disabled={isSaving || isUploading || formData.name.length < 2}
                  >
                    {isSaving || isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isUploading ? copy.common.uploadingImg : copy.common.saving}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {copy.common.save}
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
