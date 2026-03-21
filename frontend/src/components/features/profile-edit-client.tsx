"use client";

import * as React from "react";
import { ArrowLeft, Save, Loader2, Camera, X } from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { SessionUser } from "@/lib/types";

const levelOptions = [
  { value: "beginner", label: copy.enums.level.beginner, description: copy.enums.levelDesc.beginner },
  { value: "intermediate", label: copy.enums.level.intermediate, description: copy.enums.levelDesc.intermediate },
  { value: "advanced", label: copy.enums.level.advanced, description: copy.enums.levelDesc.advanced },
  { value: "expert", label: copy.enums.level.expert, description: copy.enums.levelDesc.expert },
];

/**
 * 编辑个人资料页客户端组件 - React Island
 */
export function ProfileEditClient() {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = React.useState({
    name: "",
    nickname: "",
    bio: "",
    level: "beginner",
    wechat: "",
    gender: "",
    birthday: "",
    experience: "",
  });

  React.useEffect(() => {
    fetchAPI("/auth/get-session")
      .then((r) => r.json())
      .then((data) => {
        if (!data?.user?.id) {
          window.location.href = "/login?redirect=/profile/edit";
          return;
        }
        const u = data.user;
        setUser(u);
        setAvatarPreview(u.image || null);
        let experience = "";
        if (u.extra) {
          try { experience = JSON.parse(u.extra).experience || ""; } catch {}
        }
        let birthdayStr = "";
        if (u.birthday) {
          const d = new Date(u.birthday);
          birthdayStr = d.toISOString().split("T")[0];
        }
        setFormData({
          name: u.name || "",
          nickname: u.nickname || "",
          bio: u.bio || "",
          level: u.level || "beginner",
          wechat: u.wechat || "",
          gender: u.gender || "",
          birthday: birthdayStr,
          experience,
        });
      })
      .catch(() => { window.location.href = "/login?redirect=/profile/edit"; })
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) { setMessage({ type: "error", text: copy.profile.avatarInvalidType }); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage({ type: "error", text: copy.profile.avatarTooLarge }); return; }
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    setSelectedFile(file);
    setMessage(null);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!selectedFile || !user) return null;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("userId", user.id);
      const apiBase = (import.meta.env.PUBLIC_API_URL as string) || "http://localhost:8799";
      const res = await fetch(`${apiBase}/upload/avatar`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || copy.api.failed);
      return result.url;
    } catch {
      setMessage({ type: "error", text: copy.profile.avatarUploadFailed });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      let avatarUrl = user?.image;
      if (selectedFile) {
        const uploaded = await uploadAvatar();
        if (uploaded) avatarUrl = uploaded;
      }

      const extra = { experience: formData.experience || undefined };

      const res = await fetchAPI("/api/user/update", {
        method: "PATCH",
        body: JSON.stringify({
          userId: user.id,
          name: formData.name,
          nickname: formData.nickname || null,
          image: avatarUrl,
          bio: formData.bio,
          level: formData.level,
          wechat: formData.wechat,
          gender: formData.gender || null,
          birthday: formData.birthday || null,
          extra,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || copy.common.save);
      setMessage({ type: "success", text: copy.profile.saveSuccess });
      setTimeout(() => { window.location.href = "/profile"; }, 1000);
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message || copy.common.save });
    } finally {
      setIsSaving(false);
    }
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

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Back */}
        <a href="/profile" className="inline-flex items-center text-stone-600 hover:text-stone-900 transition-colors mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {copy.profile.backProfile}
        </a>

        <div className="mb-8">
          <div className="border-l-4 border-stone-900 pl-4">
            <h1 className="text-3xl font-bold text-stone-900">{copy.profile.editTitle}</h1>
            <p className="text-stone-600 mt-2">{copy.profile.editSubtitle}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-24 w-24 rounded-full border-4 border-white shadow-lg bg-stone-200 flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="头像" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-stone-600">{user?.name?.[0] || "?"}</span>
                  )}
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                  className="absolute bottom-0 right-0 h-8 w-8 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-stone-800 transition-colors disabled:opacity-50">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                {selectedFile && (
                  <button type="button" onClick={() => { setSelectedFile(null); setAvatarPreview(user?.image || null); }}
                    className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange} className="hidden" />
              <p className="text-sm text-stone-500">{selectedFile ? `已选择: ${selectedFile.name}` : copy.profile.changeAvatar}</p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">{copy.profile.usernameLabel} <span className="text-red-500">*</span></label>
              <input name="name" type="text" value={formData.name} onChange={handleChange} required minLength={2} maxLength={20}
                placeholder={copy.profile.usernamePlaceholder}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 text-stone-900" />
            </div>

            {/* Nickname */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">{copy.profile.nicknameLabel}</label>
              <input name="nickname" type="text" value={formData.nickname} onChange={handleChange} maxLength={20}
                placeholder={copy.profile.nicknamePlaceholder}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 text-stone-900" />
              <p className="text-xs text-stone-500">{copy.profile.nicknameHint}</p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">{copy.profile.bio}</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4} maxLength={200}
                placeholder={copy.profile.bioPlaceholder}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 text-stone-900 resize-none" />
              <div className="flex justify-between text-xs text-stone-500">
                <span>{copy.profile.bioHint}</span>
                <span>{formData.bio.length}/200</span>
              </div>
            </div>

            {/* Level */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">{copy.profile.levelLabel}</label>
              <div className="grid grid-cols-2 gap-3">
                {levelOptions.map((opt) => (
                  <label key={opt.value} className={`relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.level === opt.value ? "border-stone-900 bg-stone-900" : "border-stone-200 hover:border-stone-300"
                  }`}>
                    <input type="radio" name="level" value={opt.value} checked={formData.level === opt.value}
                      onChange={handleChange} className="sr-only" />
                    <span className={`font-medium ${formData.level === opt.value ? "text-white" : "text-stone-900"}`}>{opt.label}</span>
                    <span className={`text-xs mt-1 ${formData.level === opt.value ? "text-stone-300" : "text-stone-500"}`}>{opt.description}</span>
                    {formData.level === opt.value && (
                      <span className="absolute top-2 right-2 bg-white text-stone-900 text-xs px-1.5 py-0.5 rounded">{copy.profile.levelCurrent}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* WeChat */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">{copy.profile.wechat}</label>
              <input name="wechat" type="text" value={formData.wechat} onChange={handleChange} maxLength={50}
                placeholder={copy.profile.wechatPlaceholder}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 text-stone-900" />
              <p className="text-xs text-stone-500">{copy.profile.wechatHint}</p>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">{copy.profile.genderLabel}</label>
              <select name="gender" value={formData.gender} onChange={handleChange}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 text-stone-900 bg-white">
                <option value="">{copy.common.unknown}</option>
                <option value="male">{copy.enums.gender.male}</option>
                <option value="female">{copy.enums.gender.female}</option>
                <option value="other">{copy.enums.gender.other}</option>
              </select>
            </div>

            {/* Birthday */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">{copy.profile.birthdayLabel}</label>
              <input name="birthday" type="date" value={formData.birthday} onChange={handleChange}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 text-stone-900" />
            </div>

            {/* Experience */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">{copy.profile.experience}</label>
              <textarea name="experience" value={formData.experience} onChange={handleChange} rows={3} maxLength={200}
                placeholder={copy.profile.experiencePlaceholder}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 text-stone-900 resize-none" />
            </div>

            {/* Email (readonly) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">{copy.profile.emailLabel}</label>
              <input value={user?.email || ""} disabled
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50 text-stone-500 cursor-not-allowed" />
              <p className="text-xs text-stone-500">{copy.profile.emailReadonly}</p>
            </div>

            {/* Message */}
            {message && (
              <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {message.text}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <a href="/profile" className="flex-1">
                <button type="button" className="w-full border border-stone-200 text-stone-900 py-2.5 rounded-lg font-medium hover:bg-stone-50 transition-colors">
                  {copy.common.cancel}
                </button>
              </a>
              <button type="submit" disabled={isSaving || isUploading || formData.name.length < 2}
                className="flex-1 bg-stone-900 hover:bg-stone-800 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {(isSaving || isUploading) ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{isUploading ? copy.common.uploadingImg : copy.common.saving}</>
                ) : (
                  <><Save className="h-4 w-4" />{copy.common.save}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </main>
  );
}
