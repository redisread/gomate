"use client";

import * as React from "react";
import {
  ArrowLeft,
  Loader2,
  Camera,
  X,
  Check,
  MessageCircle,
  User,
  FileText,
  MapPin,
  Mail,
  Info,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { parseExtra, formatBirthday, birthdayToTimestamp } from "@/lib/user-utils";
import type { SessionUser } from "@/lib/types";

const LEVEL_OPTIONS = [
  { value: "beginner", emoji: "🌱", label: copy.enums.level.beginner, description: copy.enums.levelDesc.beginner },
  { value: "intermediate", emoji: "⛰️", label: copy.enums.level.intermediate, description: copy.enums.levelDesc.intermediate },
  { value: "advanced", emoji: "🏔️", label: copy.enums.level.advanced, description: copy.enums.levelDesc.advanced },
  { value: "expert", emoji: "🦅", label: copy.enums.level.expert, description: copy.enums.levelDesc.expert },
] as const;

/** 字段 Label 组件 */
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-semibold text-stone-700 flex items-center gap-1">
      {children}
      {required && <span className="text-red-400">*</span>}
    </label>
  );
}

/** 卡片容器 */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-stone-100 shadow-sm p-6 ${className}`}>
      {children}
    </div>
  );
}

/** 卡片标题行 */
function CardSection({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5 pb-4 border-b border-stone-50">
      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
        <Icon className="h-4 w-4 text-amber-600" />
      </div>
      <span className="text-sm font-semibold text-stone-700">{title}</span>
    </div>
  );
}

/** 通用 Input 样式 */
const inputCls =
  "w-full px-4 py-3 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-300 " +
  "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all";

/**
 * 编辑个人资料页客户端组件 - React Island
 */
export function ProfileEditClient() {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [savedDone, setSavedDone] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = React.useState({
    nickname: "",
    bio: "",
    level: "beginner",
    wechat: "",
    gender: "",
    birthday: "",
    experience: "",
    equipment: [] as string[],
  });
  const [equipmentInput, setEquipmentInput] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const u = await fetchCurrentUser("/login?redirect=/profile/edit");
        if (!u) return;
        const user = u as SessionUser;
        setUser(user);
        setAvatarPreview(user.image || null);
const { experience, equipment } = parseExtra(user.extra);
        const birthdayStr = formatBirthday(user.birthday);
        setFormData({
          nickname: user.nickname || "",
          bio: user.bio || "",
          level: user.level || "beginner",
          wechat: user.wechat || "",
          gender: user.gender || "",
          birthday: birthdayStr,
          experience: experience || "",
          equipment: equipment || [],
        });
      } catch {
        window.location.href = "/login?redirect=/profile/edit";
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setMessage(null);
  };

  const handleEquipmentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = equipmentInput.trim();
      if (!value) return;
      if (formData.equipment.length >= 10) {
        setMessage({ type: "error", text: copy.profile.equipmentMaxReached });
        return;
      }
      if (formData.equipment.includes(value)) {
        setEquipmentInput("");
        return;
      }
      setFormData((prev) => ({ ...prev, equipment: [...prev.equipment, value] }));
      setEquipmentInput("");
      setMessage(null);
    }
  };

  const handleRemoveEquipment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((_, i) => i !== index),
    }));
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

      // 构建 extra 数据
      const extra: { experience?: string; equipment?: string[] } = {};
      if (formData.experience) extra.experience = formData.experience;
      if (formData.equipment.length > 0) extra.equipment = formData.equipment;

      const res = await fetchAPI("/api/user/update", {
        method: "PATCH",
        body: JSON.stringify({
          userId: user!.id,
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
      setSavedDone(true);
      setMessage({ type: "success", text: copy.profile.saveSuccess });
      // 使用 replace 强制刷新，确保 profile 页从服务端重新获取最新数据
      setTimeout(() => { window.location.replace("/profile"); }, 1000);
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
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      </main>
    );
  }

  const bioLength = formData.bio.length;
  const bioNearLimit = bioLength >= 160;
  const bioAtLimit = bioLength >= 200;

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* 面包屑返回 */}
        <a
          href="/profile"
          className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-800 transition-colors text-sm mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.profile.backProfile}
        </a>

        {/* 页面标题区 */}
        <div className="mb-8 flex items-start gap-4">
          <div className="w-1 h-12 rounded-full bg-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{copy.profile.editTitle}</h1>
            <p className="text-stone-500 mt-1 text-sm">{copy.profile.editWarmSubtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── 头像卡片 ── */}
          <Card>
            <CardSection icon={User} title={copy.profile.sectionAvatar} />
            <div className="flex flex-col items-center gap-4">
              {/* 头像主体 */}
              <div
                className="relative group cursor-pointer"
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <div className="w-28 h-28 rounded-full ring-4 ring-white shadow-xl overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="头像" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-white select-none">
                      {user?.name?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                {/* 悬停遮罩 */}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </div>
                {/* 取消已选文件按钮 */}
                {selectedFile && !isUploading && (
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setSelectedFile(null);
                      setAvatarPreview(user?.image || null);
                    }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition-colors"
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

              {/* 已选文件提示条 */}
              {selectedFile ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700">
                  <Check className="h-3 w-3" />
                  <span>{copy.profile.avatarSelected} {selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setAvatarPreview(user?.image || null); }}
                    className="text-amber-500 hover:text-amber-700 transition-colors ml-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-stone-400">{copy.profile.avatarSupportHint}</p>
              )}
            </div>
          </Card>

          {/* ── 基本信息卡片 ── */}
          <Card>
            <CardSection icon={FileText} title={copy.profile.sectionBasicInfo} />
            <div className="space-y-5">
              {/* 用户名（只读） */}
              <div className="space-y-1.5">
                <FieldLabel>{copy.profile.nameLabel}</FieldLabel>
                <input
                  value={user?.name || ""}
                  disabled
                  className={`${inputCls} bg-stone-50 text-stone-400 cursor-not-allowed`}
                />
                <p className="text-xs text-stone-400 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {copy.profile.nameHint}
                </p>
              </div>

              {/* 昵称 */}
              <div className="space-y-1.5">
                <FieldLabel>{copy.profile.nicknameLabel}</FieldLabel>
                <input
                  name="nickname"
                  type="text"
                  value={formData.nickname}
                  onChange={handleChange}
                  maxLength={20}
                  placeholder={copy.profile.nicknamePlaceholder}
                  className={inputCls}
                />
                <p className="text-xs text-stone-400">{copy.profile.nicknameHint}</p>
              </div>

              {/* 个人简介 */}
              <div className="space-y-1.5">
                <FieldLabel>{copy.profile.bio}</FieldLabel>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  maxLength={200}
                  placeholder={copy.profile.bioPlaceholder}
                  className={`${inputCls} resize-none`}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400">{copy.profile.bioHint}</span>
                  <span className={
                    bioAtLimit ? "text-red-500 font-medium" :
                    bioNearLimit ? "text-amber-500" :
                    "text-stone-400"
                  }>
                    {bioLength}/200
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* ── 户外信息卡片 ── */}
          <Card>
            <CardSection icon={MapPin} title={copy.profile.sectionOutdoorInfo} />
            <div className="space-y-5">
              {/* 徒步等级 */}
              <div className="space-y-2">
                <FieldLabel>{copy.profile.levelLabel}</FieldLabel>
                <div className="grid grid-cols-2 gap-3">
                  {LEVEL_OPTIONS.map((opt) => {
                    const isSelected = formData.level === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? "border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-md shadow-amber-100"
                            : "border-stone-100 bg-white hover:border-amber-200 hover:bg-amber-50/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="level"
                          value={opt.value}
                          checked={isSelected}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span className="text-2xl mb-1.5">{opt.emoji}</span>
                        <span className={`text-sm font-bold ${isSelected ? "text-amber-700" : "text-stone-800"}`}>
                          {opt.label}
                        </span>
                        <span className={`text-xs mt-0.5 ${isSelected ? "text-amber-600" : "text-stone-400"}`}>
                          {opt.description}
                        </span>
                        {isSelected && (
                          <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 徒步经历 */}
              <div className="space-y-1.5">
                <FieldLabel>{copy.profile.experienceLabel}</FieldLabel>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  rows={3}
                  maxLength={200}
                  placeholder={copy.profile.experiencePlaceholder}
                  className={`${inputCls} resize-none`}
                />
                <p className="text-xs text-stone-400">{copy.profile.experienceHint}</p>
              </div>

              {/* 常用装备 */}
              <div className="space-y-1.5">
                <FieldLabel>{copy.profile.equipment}</FieldLabel>
                <input
                  type="text"
                  value={equipmentInput}
                  onChange={(e) => setEquipmentInput(e.target.value)}
                  onKeyDown={handleEquipmentKeyDown}
                  placeholder={copy.profile.equipmentPlaceholder}
                  className={inputCls}
                />
                <p className="text-xs text-stone-400">{copy.profile.equipmentHint}</p>
                
                {/* 已添加的装备标签 */}
                {formData.equipment.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.equipment.map((item, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-sm border border-amber-200"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => handleRemoveEquipment(index)}
                          className="text-amber-400 hover:text-amber-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* ── 联系方式卡片 ── */}
          <Card>
            <CardSection icon={MessageCircle} title={copy.profile.sectionContact} />
            <div className="space-y-5">
              {/* 微信号 */}
              <div className="space-y-1.5">
                <FieldLabel>{copy.profile.wechat}</FieldLabel>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-[#07C160] flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-3.5 w-3.5 text-white" />
                  </div>
                  <input
                    name="wechat"
                    type="text"
                    value={formData.wechat}
                    onChange={handleChange}
                    maxLength={50}
                    placeholder={copy.profile.wechatPlaceholder}
                    className={`${inputCls} pl-12 focus:ring-[#07C160] focus:border-[#07C160]`}
                  />
                </div>
                <p className="text-xs text-stone-400">{copy.profile.wechatFieldHint}</p>
              </div>

              {/* 性别 */}
              <div className="space-y-1.5">
                <FieldLabel>{copy.profile.genderLabel}</FieldLabel>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={`${inputCls} bg-white appearance-none`}
                >
                  <option value="">{copy.common.unknown}</option>
                  <option value="male">{copy.enums.gender.male}</option>
                  <option value="female">{copy.enums.gender.female}</option>
                  <option value="other">{copy.enums.gender.other}</option>
                </select>
                <p className="text-xs text-stone-400">{copy.profile.genderHint}</p>
              </div>

              {/* 生日 */}
              <div className="space-y-1.5">
                <FieldLabel>{copy.profile.birthdayLabel}</FieldLabel>
                <input
                  name="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={handleChange}
                  className={inputCls}
                />
                <p className="text-xs text-stone-400">{copy.profile.birthdayHint}</p>
              </div>
            </div>
          </Card>

          {/* ── 账号信息卡片 ── */}
          <Card>
            <CardSection icon={Mail} title={copy.profile.sectionAccount} />
            <div className="space-y-1.5">
              <FieldLabel>{copy.profile.emailLabel}</FieldLabel>
              <input
                value={user?.email || ""}
                disabled
                className={`${inputCls} bg-stone-50 text-stone-400 cursor-not-allowed`}
              />
              <p className="text-xs text-stone-400">{copy.profile.emailReadonly}</p>
            </div>
          </Card>

          {/* 消息提示 */}
          {message && (
            <div
              className={`flex items-center gap-3 p-4 rounded-xl border ${
                message.type === "success"
                  ? "bg-gradient-to-r from-amber-50 to-amber-100/60 border-amber-200 text-amber-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {message.type === "success" ? (
                <Check className="h-4 w-4 flex-shrink-0" />
              ) : (
                <X className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          {/* 底部操作区 */}
          <div className="flex gap-3 pt-2">
            <a href="/profile" className="flex-1">
              <button
                type="button"
                className="w-full border border-stone-200 text-stone-600 hover:bg-stone-50 py-3 rounded-xl font-medium text-sm transition-colors"
              >
                {copy.common.cancel}
              </button>
            </a>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
                savedDone
                  ? "bg-amber-500 text-white shadow-md shadow-amber-100"
                  : "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-200 disabled:opacity-50"
              }`}
            >
              {(isSaving || isUploading) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isUploading ? copy.common.uploadingImg : copy.common.saving}
                </>
              ) : savedDone ? (
                <>
                  <Check className="h-4 w-4" />
                  {copy.profile.savedSuccess}
                </>
              ) : (
                copy.common.save
              )}
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </main>
  );
}
