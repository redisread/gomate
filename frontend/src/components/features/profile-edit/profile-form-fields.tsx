import * as React from "react";
import { Loader2, Camera, X, Check, ArrowLeft, User, MessageCircle } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { inputCls, LEVEL_OPTIONS, PRESET_EQUIPMENT } from "./constants";

// ─── FieldLabel ─────────────────────────────────────────────────────
export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
      {children}{required && <span className="text-red-400">*</span>}
    </label>
  );
}

// ─── Card ───────────────────────────────────────────────────────────
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-6", className)}>
      {children}
    </div>
  );
}

// ─── CardSection ────────────────────────────────────────────────────
export function CardSection({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5 pb-4 border-b border-stone-50 dark:border-stone-800">
      <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
        <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
      <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">{title}</span>
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
  const { t } = useI18n(["profile"]);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group cursor-pointer" onClick={() => !isUploading && fileInputRef.current?.click()}>
        <div className="w-28 h-28 rounded-full ring-4 ring-white dark:ring-stone-800 shadow-xl overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
          {avatarPreview ? (
            <img src={avatarPreview} alt="头像" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-bold text-white select-none">{user?.name?.[0]?.toUpperCase() || "?"}</span>
          )}
        </div>
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isUploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
        </div>
        {selectedFile && !isUploading && (
          <button type="button" onClick={(ev) => { ev.stopPropagation(); onCancelFile(); }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition-colors">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={onFileChange} className="hidden" />
      {selectedFile ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-full text-xs text-amber-700 dark:text-amber-400">
          <Check className="h-3 w-3" />
          <span>{t('profile.avatarSelected')} {selectedFile.name}</span>
          <button type="button" onClick={onCancelFile} className="text-amber-500 hover:text-amber-700 transition-colors ml-0.5"><X className="h-3 w-3" /></button>
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
}

export function BasicInfoFields({ userName, nickname, bio, bioLength, bioNearLimit, bioAtLimit, onChange }: BasicInfoFieldsProps) {
  const { t } = useI18n(["profile"]);
  return (
    <div className="space-y-5">
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
      <div className="space-y-1.5">
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
  experience: string;
  equipment: string[];
  equipmentInput: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onEquipmentKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onRemoveEquipment: (index: number) => void;
  onAddPresetEquipment: (item: string) => void;
  onEquipmentInputChange: (v: string) => void;
}

export function OutdoorInfoFields({ level, experience, equipment, equipmentInput, onChange, onEquipmentKeyDown, onRemoveEquipment, onAddPresetEquipment, onEquipmentInputChange }: OutdoorInfoFieldsProps) {
  const { t } = useI18n(["profile", "enums"]);
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <FieldLabel>{t('profile.levelLabel')}</FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          {LEVEL_OPTIONS.map((opt) => {
            const isSelected = level === opt.value;
            return (
              <label key={opt.value} className={cn("relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                isSelected ? "border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 shadow-md shadow-amber-100 dark:shadow-amber-950/30" : "border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-200 dark:hover:border-amber-900 hover:bg-amber-50/30 dark:hover:bg-amber-950/20"
              )}>
                <input type="radio" name="level" value={opt.value} checked={isSelected} onChange={onChange} className="sr-only" />
                <span className="text-2xl mb-1.5">{opt.emoji}</span>
                <span className={cn("text-sm font-bold", isSelected ? "text-amber-700 dark:text-amber-400" : "text-stone-800 dark:text-stone-200")}>{opt.label}</span>
                <span className={cn("text-xs mt-0.5", isSelected ? "text-amber-600 dark:text-amber-500" : "text-stone-400 dark:text-stone-500")}>{opt.description}</span>
                {isSelected && <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center"><Check className="h-3 w-3" /></span>}
              </label>
            );
          })}
        </div>
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{t('profile.experienceLabel')}</FieldLabel>
        <textarea name="experience" value={experience} onChange={onChange} rows={3} maxLength={200} placeholder={t('profile.experiencePlaceholder')} className={cn(inputCls, "resize-none")} />
        <p className="text-xs text-stone-400">{t('profile.experienceHint')}</p>
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{t('profile.equipment')}</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_EQUIPMENT.map((item) => {
            const isSelected = equipment.includes(item);
            return (
              <button key={item} type="button" onClick={() => onAddPresetEquipment(item)} disabled={isSelected}
                className={cn("px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                  isSelected ? "bg-amber-100 dark:bg-amber-900/40 text-amber-400 dark:text-amber-600 cursor-not-allowed" : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-700 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-900 border border-transparent"
                )}>
                {item}
              </button>
            );
          })}
        </div>
        <input type="text" value={equipmentInput} onChange={(e) => onEquipmentInputChange(e.target.value)} onKeyDown={onEquipmentKeyDown} placeholder={t('profile.equipmentPlaceholder')} className={inputCls} />
        <p className="text-xs text-stone-400">{t('profile.equipmentHint')}</p>
        {equipment.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {equipment.map((item, index) => (
              <span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-full text-sm border border-amber-200 dark:border-amber-900/50">
                {item}
                <button type="button" onClick={() => onRemoveEquipment(index)} className="text-amber-400 hover:text-amber-600 transition-colors"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
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
    <div className="space-y-5">
      <div className="space-y-1.5">
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
          <option value="male">{(t('enums.gender') as any).male}</option>
          <option value="female">{(t('enums.gender') as any).female}</option>
          <option value="other">{(t('enums.gender') as any).other}</option>
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
    <div className={cn("flex items-center gap-3 p-4 rounded-xl border",
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
    <div className="flex gap-3 pt-2">
      <a href="/profile" className="flex-1">
        <button type="button" className="w-full border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 py-3 rounded-xl font-medium text-sm transition-colors">
          {t('common.cancel')}
        </button>
      </a>
      <button type="submit" disabled={loading} className={cn("flex-1 py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed",
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
