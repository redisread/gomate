import * as React from "react";
import { fetchAPI, fetchCurrentUser, API_BASE } from "@/lib/api";
import { parseExtra, formatBirthday, birthdayToTimestamp } from "@/lib/user-utils";
import type { SessionUser } from "@/lib/types";
import { useI18n } from "@/hooks/useI18n";
import type { MessageState } from "./constants";

interface ProfileFormData {
  nickname: string;
  bio: string;
  level: string;
  wechat: string;
  gender: string;
  birthday: string;
  experience: string;
  equipment: string[];
}

export function useProfileForm() {
  const { t } = useI18n(["profile", "common", "errors"]);
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [savedDone, setSavedDone] = React.useState(false);
  const [message, setMessage] = React.useState<MessageState>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [equipmentInput, setEquipmentInput] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null!);

  const [formData, setFormData] = React.useState<ProfileFormData>({
    nickname: "", bio: "", level: "beginner", wechat: "",
    gender: "", birthday: "", experience: "", equipment: [],
  });

  // Load user data
  React.useEffect(() => {
    (async () => {
      try {
        const u = await fetchCurrentUser("/login?redirect=/profile/edit");
        if (!u) return;
        const user = u as unknown as SessionUser;
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
        setMessage({ type: "error", text: t('profile.equipmentMaxReached') });
        return;
      }
      if (formData.equipment.includes(value)) { setEquipmentInput(""); return; }
      setFormData((prev) => ({ ...prev, equipment: [...prev.equipment, value] }));
      setEquipmentInput("");
      setMessage(null);
    }
  };

  const handleRemoveEquipment = (index: number) => {
    setFormData((prev) => ({ ...prev, equipment: prev.equipment.filter((_, i) => i !== index) }));
  };

  const handleAddPresetEquipment = (item: string) => {
    if (formData.equipment.length >= 10) { setMessage({ type: "error", text: t('profile.equipmentMaxReached') }); return; }
    if (formData.equipment.includes(item)) return;
    setFormData((prev) => ({ ...prev, equipment: [...prev.equipment, item] }));
    setMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) { setMessage({ type: "error", text: t('profile.avatarInvalidType') }); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage({ type: "error", text: t('profile.avatarTooLarge') }); return; }
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
      const res = await fetch(`${API_BASE}/upload/avatar`, { method: "POST", body: fd, credentials: "include" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t('errors.failed'));
      return result.url;
    } catch {
      setMessage({ type: "error", text: t('profile.avatarUploadFailed') });
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

      const extra: { experience?: string; equipment?: string[] } = {};
      if (formData.experience) extra.experience = formData.experience;
      if (formData.equipment.length > 0) extra.equipment = formData.equipment;

      const res = await fetchAPI("/api/users/update", {
        method: "PATCH",
        body: JSON.stringify({
          userId: user!.id, nickname: formData.nickname || null, image: avatarUrl,
          bio: formData.bio, level: formData.level, wechat: formData.wechat,
          gender: formData.gender || null, birthday: birthdayToTimestamp(formData.birthday), extra,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t('common.save'));
      setSavedDone(true);
      setMessage({ type: "success", text: t('profile.saveSuccess') });
      setTimeout(() => { window.location.replace("/profile"); }, 1000);
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message || t('common.save') });
    } finally {
      setIsSaving(false);
    }
  };

  const cancelSelectedFile = () => {
    setSelectedFile(null);
    setAvatarPreview(user?.image || null);
  };

  const bioLength = formData.bio.length;
  const bioNearLimit = bioLength >= 160;
  const bioAtLimit = bioLength >= 200;

  return {
    user, isLoading, isSaving, isUploading, savedDone, message,
    avatarPreview, selectedFile, equipmentInput, fileInputRef,
    formData, bioLength, bioNearLimit, bioAtLimit,
    setEquipmentInput, setAvatarPreview, setMessage,
    handleChange, handleEquipmentKeyDown, handleRemoveEquipment,
    handleAddPresetEquipment, handleFileChange, handleSubmit, cancelSelectedFile,
  };
}
