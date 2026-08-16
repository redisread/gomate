import * as React from "react";
import { Loader2, Camera, X, Check, MessageCircle } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { RegionSelect } from "@/components/ui/region-select";
import type { Region } from "@/lib/types";
import { inputCls, LEVEL_OPTIONS } from "./constants";

// ─── FieldLabel ─────────────────────────────────────────────────────
export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
      {children}{required && <span className="text-red-400">*</span>}
    </label>
  );
}

// ─── Card ───────────────────────────────────────────────────────────
export function Card({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn("scroll-mt-24 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-5 sm:p-6", className)}>
      {children}
    </section>
  );
}

// ─── CardSection ────────────────────────────────────────────────────
export function CardSection({ icon: Icon, title, id }: { icon: React.ElementType; title: string; id?: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
        <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
      <h2 id={id} className="text-sm font-semibold text-stone-700 dark:text-stone-300">{title}</h2>
    </div>
  );
}

// ─── AvatarSection ──────────────────────────────────────────────────
interface AvatarSectionProps {
  user: { name?: string; image?: string | null } | null;
  avatarPreview: string | null;
  selectedFile: File | null;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCancelFile: () => void;
}

export function AvatarSection({ user, avatarPreview, selectedFile, isUploading, fileInputRef, onFileChange, onCancelFile }: AvatarSectionProps) {
  const { t } = useI18n(["profile", "common"]);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <button type="button" onClick={() => !isUploading && fileInputRef.current?.click()} aria-label={t("profile.changeAvatar")} className="group cursor-pointer rounded-full transition-transform duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <div className="w-28 h-28 rounded-full ring-4 ring-white dark:ring-stone-800 shadow-xl overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            {avatarPreview ? (
              <img src={avatarPreview} alt={t("common.avatar")} className="w-full h-full object-cover outline outline-1 -outline-offset-1 outline-[oklch(0_0_0_/_0.1)] dark:outline-[oklch(1_0_0_/_0.1)]" />
            ) : (
              <span className="text-4xl font-bold text-white select-none">{user?.name?.[0]?.toUpperCase() || "?"}</span>
            )}
          </div>
          <span aria-hidden="true" className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {isUploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
          </span>
        </button>
        {selectedFile && !isUploading && (
          <button type="button" onClick={onCancelFile} aria-label={t("common.close")}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={onFileChange} className="hidden" />
      {selectedFile ? (
        <div className="flex max-w-full items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
          <Check className="h-3 w-3" />
          <span className="min-w-0 truncate">{t('profile.avatarSelected')} {selectedFile.name}</span>
          <button type="button" onClick={onCancelFile} aria-label={t("common.close")} className="ml-0.5 rounded-full text-amber-500 transition-[color,transform] duration-150 hover:text-amber-700 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"><X className="h-3 w-3" aria-hidden="true" /></button>
        </div>
      ) : (
        <p className="text-xs text-stone-400">{t('profile.avatarSupportHint')}</p>
      )}
    </div>
  );
}

// ─── BasicInfoFields ────────────────────────────────────────────────
interface BasicInfoFieldsProps {
  userName: string;
  nickname: string;
  bio: string;
  bioLength: number;
  bioNearLimit: boolean;
  bioAtLimit: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  regionId: string;
  regions: Region[];
  onRegionChange: (regionId: string) => void;
}

export function BasicInfoFields({ userName, nickname, bio, bioLength, bioNearLimit, bioAtLimit, onChange, regionId, regions, onRegionChange }: BasicInfoFieldsProps) {
  const { t } = useI18n(["profile", "common"]);
  return (
    <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
      <div className="space-y-1.5">
        <FieldLabel>{t('profile.nameLabel')}</FieldLabel>
        <input value={userName} disabled className={cn(inputCls, "bg-stone-50 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed")} />
        <p className="text-xs text-stone-400 flex items-center gap-1"><span className="sr-only">info</span>{t('profile.nameHint')}</p>
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{t('profile.nicknameLabel')}</FieldLabel>
        <input name="nickname" type="text" value={nickname} onChange={onChange} maxLength={20} placeholder={t('profile.nicknamePlaceholder')} className={inputCls} />
        <p className="text-xs text-stone-400">{t('profile.nicknameHint')}</p>
      </div>
      {/* 所在地区（非必填）—— 设置后本地圈子可见邻居维度 */}
      <div className="space-y-1.5">
        <FieldLabel>{t('profile.regionLabel')}</FieldLabel>
        <RegionSelect value={regionId} onChange={onRegionChange} regions={regions} clearable />
        <p className="text-xs text-stone-400">{t('profile.regionHint')}</p>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <FieldLabel>{t('profile.bio')}</FieldLabel>
        <textarea name="bio" value={bio} onChange={onChange} rows={4} maxLength={200} placeholder={t('profile.bioPlaceholder')} className={cn(inputCls, "resize-none")} />
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-400">{t('profile.bioHint')}</span>
          <span className={cn(bioAtLimit ? "text-red-500 font-medium" : bioNearLimit ? "text-amber-500" : "text-stone-400")}>{bioLength}/200</span>
        </div>
      </div>
    </div>
  );
}

// ─── OutdoorInfoFields ──────────────────────────────────────────────
interface OutdoorInfoFieldsProps {
  level: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export function OutdoorInfoFields({ level, onChange }: OutdoorInfoFieldsProps) {
  const { t } = useI18n(["profile", "enums"]);
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <FieldLabel>{t('profile.levelLabel')}</FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          {LEVEL_OPTIONS.map((opt) => {
            const isSelected = level === opt.value;
            return (
              <label key={opt.value} className={cn("relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-[transform,background-color,border-color,color,opacity,box-shadow]",
                isSelected ? "border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 shadow-md shadow-amber-100 dark:shadow-amber-950/30" : "border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-200 dark:hover:border-amber-900 hover:bg-amber-50/30 dark:hover:bg-amber-950/20"
              )}>
                <input type="radio" name="level" value={opt.value} checked={isSelected} onChange={onChange} className="sr-only" />
                <span className="text-2xl mb-1.5">{opt.emoji}</span>
                <span className={cn("text-sm font-bold", isSelected ? "text-amber-700 dark:text-amber-400" : "text-stone-800 dark:text-stone-200")}>{t(opt.label)}</span>
                <span className={cn("text-xs mt-0.5", isSelected ? "text-amber-600 dark:text-amber-500" : "text-stone-400 dark:text-stone-500")}>{t(opt.description)}</span>
                {isSelected && <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center"><Check className="h-3 w-3" /></span>}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ContactFields ──────────────────────────────────────────────────
interface ContactFieldsProps {
  wechat: string;
  gender: string;
  birthday: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export function ContactFields({ wechat, gender, birthday, onChange }: ContactFieldsProps) {
  const { t } = useI18n(["profile", "common", "enums"]);
  return (
    <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <FieldLabel>{t('profile.wechat')}</FieldLabel>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-[#07C160] flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-3.5 w-3.5 text-white" />
          </div>
          <input name="wechat" type="text" value={wechat} onChange={onChange} maxLength={50} placeholder={t('profile.wechatPlaceholder')} className={cn(inputCls, "pl-12 focus:ring-[#07C160] focus:border-[#07C160]")} />
        </div>
        <p className="text-xs text-stone-400">{t('profile.wechatFieldHint')}</p>
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{t('profile.genderLabel')}</FieldLabel>
        <select name="gender" value={gender} onChange={onChange} className={cn(inputCls, "bg-white dark:bg-stone-800 appearance-none")}>
          <option value="">{t('common.unknown')}</option>
          <option value="male">{t('enums.gender.male')}</option>
          <option value="female">{t('enums.gender.female')}</option>
          <option value="other">{t('enums.gender.other')}</option>
        </select>
        <p className="text-xs text-stone-400">{t('profile.genderHint')}</p>
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{t('profile.birthdayLabel')}</FieldLabel>
        <input name="birthday" type="date" value={birthday} onChange={onChange} className={inputCls} />
        <p className="text-xs text-stone-400">{t('profile.birthdayHint')}</p>
      </div>
    </div>
  );
}

// ─── MessageBanner ──────────────────────────────────────────────────
export function MessageBanner({ message }: { message: { type: "success" | "error"; text: string } | null }) {
  if (!message) return null;
  return (
    <div role={message.type === "error" ? "alert" : "status"} className={cn("flex items-center gap-3 p-4 rounded-xl border",
      message.type === "success" ? "bg-gradient-to-r from-amber-50 to-amber-100/60 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400"
    )}>
      {message.type === "success" ? <Check className="h-4 w-4 flex-shrink-0" /> : <X className="h-4 w-4 flex-shrink-0" />}
      <span className="text-sm">{message.text}</span>
    </div>
  );
}

// ─── ActionBar ──────────────────────────────────────────────────────
interface ActionBarProps {
  isSaving: boolean;
  isUploading: boolean;
  savedDone: boolean;
}

export function ActionBar({ isSaving, isUploading, savedDone }: ActionBarProps) {
  const { t } = useI18n(["profile", "common"]);
  const loading = isSaving || isUploading;
  return (
    <div className="sticky bottom-3 z-10 -mx-2 flex gap-3 rounded-2xl border border-stone-200/80 bg-white/90 p-3 shadow-lg shadow-stone-900/5 backdrop-blur dark:border-stone-800/80 dark:bg-stone-950/90 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-2 sm:shadow-none sm:backdrop-blur-none">
      <a href="/profile" className="flex flex-1 items-center justify-center rounded-xl border border-stone-200 py-3 text-sm font-medium text-stone-600 transition-[transform,background-color,border-color] duration-150 hover:bg-stone-50 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800">
        {t('common.cancel')}
      </a>
      <button type="submit" disabled={loading} className={cn("flex-1 py-3 rounded-xl font-medium text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] flex items-center justify-center gap-2 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed",
        savedDone ? "bg-amber-500 text-white shadow-md shadow-amber-100 dark:shadow-amber-950/30" : "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/30 disabled:opacity-50"
      )}>
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" />{isUploading ? t('common.uploadingImg') : t('common.saving')}</>
        ) : savedDone ? (
          <><Check className="h-4 w-4" />{t('profile.savedSuccess')}</>
        ) : t('common.save')}
      </button>
    </div>
  );
}
