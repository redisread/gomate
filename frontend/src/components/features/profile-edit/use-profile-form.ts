import * as React from "react";
import { fetchAPI, fetchCurrentUser, API_BASE } from "@/lib/api";
import { formatBirthday, birthdayToIso } from "@/lib/user-utils";
import { fetchSelectableRegions } from "@/lib/regions";
import type { SessionUser, Region } from "@/lib/types";
import { useI18n } from "@/hooks/useI18n";
import type { MessageState } from "./constants";

interface ProfileFormData {
  nickname: string;
  bio: string;
  level: string;
  wechat: string;
  gender: string;
  birthday: string;
  regionId: string;
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
  const [regions, setRegions] = React.useState<Region[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null!);

  const [formData, setFormData] = React.useState<ProfileFormData>({
    nickname: "", bio: "", level: "beginner", wechat: "",
    gender: "", birthday: "", regionId: "",
  });

  // Region selection is backed by service-enabled city-level Region entities.
  React.useEffect(() => {
    let cancelled = false;
    fetchSelectableRegions().then((regions) => {
      if (!cancelled) setRegions(regions);
    }).catch(() => {
      if (!cancelled) setRegions([]);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load user data
  React.useEffect(() => {
    (async () => {
      try {
        const u = await fetchCurrentUser("/login?redirect=/profile/edit");
        if (!u) return;
        const user = u as unknown as SessionUser;
        setUser(user);
        setAvatarPreview(user.image || null);
        const birthdayStr = formatBirthday(user.birthday);
        setFormData({
          nickname: user.nickname || "",
          bio: user.bio || "",
          level: user.extra.level,
          wechat: user.extra.wechat || "",
          gender: user.gender || "",
          birthday: birthdayStr,
          regionId: user.extra.city || "",
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

  const handleRegionChange = (regionId: string) => {
    setFormData((prev) => ({ ...prev, regionId }));
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
      if (selectedFile) {
        const uploaded = await uploadAvatar();
        if (!uploaded) return;
      }

      const res = await fetchAPI("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          nickname: formData.nickname || null,
          bio: formData.bio,
          gender: formData.gender || null,
          birthday: birthdayToIso(formData.birthday),
          extra: {
            level: formData.level,
            wechat: formData.wechat || null,
            city: formData.regionId || null,
          },
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
    avatarPreview, selectedFile, fileInputRef, regions,
    formData, bioLength, bioNearLimit, bioAtLimit,
    setAvatarPreview, setMessage,
    handleChange, handleRegionChange, handleFileChange, handleSubmit, cancelSelectedFile,
  };
}
