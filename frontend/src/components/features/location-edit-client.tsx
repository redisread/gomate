"use client";

import * as React from "react";
import { ArrowLeft, Loader2, Save, MapPin, Image, FileText, Pencil } from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI, apiPut } from "@/lib/api";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { Location, City } from "@/lib/types";

interface LocationEditClientProps {
  locationId: string;
}

const SEASONS = [
  { key: "spring", label: copy.admin.seasons.spring },
  { key: "summer", label: copy.admin.seasons.summer },
  { key: "autumn", label: copy.admin.seasons.autumn },
  { key: "winter", label: copy.admin.seasons.winter },
] as const;

/**
 * 管理员地点编辑页客户端组件
 * 前端鉴权（mount 时检查 role）+ 后端二次鉴权（PUT /locations 的 requireAdmin）
 */
export function LocationEditClient({ locationId }: LocationEditClientProps) {
  const [location, setLocation] = React.useState<Location | null>(null);
  const [cities, setCities] = React.useState<City[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = React.useState({
    name: "",
    subtitle: "",
    description: "",
    address: "",
    cityId: "",
    bestSeason: [] as string[],
    coverImage: "",
    lat: 0,
    lng: 0,
  });

  // 前端权限守卫：非 admin 立即重定向
  React.useEffect(() => {
    fetchAPI("/auth/get-session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.role !== "admin") {
          window.location.href = "/";
        }
      })
      .catch(() => {
        window.location.href = "/";
      });
  }, []);

  // 并发加载地点数据和城市列表
  React.useEffect(() => {
    Promise.all([
      fetchAPI(`/api/locations/${locationId}`).then((r) => r.json()),
      fetchAPI("/api/cities").then((r) => r.json()),
    ])
      .then(([locData, cityData]) => {
        if (locData.location) {
          const loc: Location = locData.location;
          setLocation(loc);
          setFormData({
            name: loc.name,
            subtitle: loc.subtitle ?? "",
            description: loc.description,
            address: loc.address ?? "",
            cityId: loc.cityId,
            bestSeason: loc.bestSeason ?? [],
            coverImage: loc.coverImage,
            lat: loc.coordinates?.lat ?? 0,
            lng: loc.coordinates?.lng ?? 0,
          });
        }
        if (cityData.cities) setCities(cityData.cities);
      })
      .catch(() => {
        setMessage({ type: "error", text: "加载地点数据失败，请刷新重试" });
      })
      .finally(() => setIsLoading(false));
  }, [locationId]);

  const handleSeasonToggle = (season: string) => {
    setFormData((prev) => ({
      ...prev,
      bestSeason: prev.bestSeason.includes(season)
        ? prev.bestSeason.filter((s) => s !== season)
        : [...prev.bestSeason, season],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await apiPut("/api/locations", {
        id: location.id,
        name: formData.name,
        subtitle: formData.subtitle || undefined,
        description: formData.description,
        address: formData.address || undefined,
        cityId: formData.cityId,
        bestSeason: formData.bestSeason,
        coverImage: formData.coverImage,
        coordinates: { lat: formData.lat, lng: formData.lng },
      });
      setMessage({ type: "success", text: "保存成功，即将返回详情页..." });
      setTimeout(() => {
        window.location.href = `/locations/${locationId}`;
      }, 1200);
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message || "保存失败，请重试" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAF7F4" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#D97706" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAF7F4" }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 顶部返回 */}
        <a
          href={`/locations/${locationId}`}
          className="inline-flex items-center gap-1.5 text-sm mb-6 hover:opacity-70 transition-opacity"
          style={{ color: "#8B6E5A" }}
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.common.back}
        </a>

        {/* 标题 */}
        <div className="flex items-center gap-2 mb-6">
          <Pencil className="h-5 w-5" style={{ color: "#D97706" }} />
          <h1 className="text-xl font-bold" style={{ color: "#1e1812" }}>
            {copy.admin.editLocation}
          </h1>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className="mb-6 px-4 py-3 rounded-xl text-sm"
            style={{
              background: message.type === "success" ? "#F0FDF4" : "#FEF2F2",
              color: message.type === "success" ? "#166534" : "#991B1B",
              border: `1px solid ${message.type === "success" ? "#BBF7D0" : "#FECACA"}`,
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "#fff", border: "1px solid #EDE8E3" }}>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4" style={{ color: "#D97706" }} />
              <span className="text-sm font-semibold" style={{ color: "#1e1812" }}>基本信息</span>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#5C4033" }}>
                {copy.admin.formNameRequired}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2"
                style={{ background: "#FAF7F4", border: "1px solid #DDD5CC", color: "#1e1812" }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#5C4033" }}>
                {copy.admin.formSubtitle}
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData((p) => ({ ...p, subtitle: e.target.value }))}
                placeholder={copy.admin.placeholderSubtitle}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "#FAF7F4", border: "1px solid #DDD5CC", color: "#1e1812" }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#5C4033" }}>
                {copy.admin.formDescriptionRequired}
              </label>
              <textarea
                required
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                style={{ background: "#FAF7F4", border: "1px solid #DDD5CC", color: "#1e1812" }}
              />
            </div>
          </div>

          {/* 位置信息 */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "#fff", border: "1px solid #EDE8E3" }}>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4" style={{ color: "#D97706" }} />
              <span className="text-sm font-semibold" style={{ color: "#1e1812" }}>位置信息</span>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#5C4033" }}>
                {copy.admin.formCity}
              </label>
              <select
                value={formData.cityId}
                onChange={(e) => setFormData((p) => ({ ...p, cityId: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "#FAF7F4", border: "1px solid #DDD5CC", color: "#1e1812" }}
              >
                <option value="">{copy.admin.placeholderSelectCity}</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#5C4033" }}>
                {copy.admin.formAddress}
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "#FAF7F4", border: "1px solid #DDD5CC", color: "#1e1812" }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#5C4033" }}>
                {copy.admin.formCoordinates}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "#8B6E5A" }}>纬度 (lat)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData((p) => ({ ...p, lat: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "#FAF7F4", border: "1px solid #DDD5CC", color: "#1e1812" }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "#8B6E5A" }}>经度 (lng)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => setFormData((p) => ({ ...p, lng: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "#FAF7F4", border: "1px solid #DDD5CC", color: "#1e1812" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 封面与季节 */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "#fff", border: "1px solid #EDE8E3" }}>
            <div className="flex items-center gap-2 mb-1">
              <Image className="h-4 w-4" style={{ color: "#D97706" }} />
              <span className="text-sm font-semibold" style={{ color: "#1e1812" }}>封面与季节</span>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#5C4033" }}>
                {copy.admin.formCoverImageRequired}
              </label>
              <input
                type="url"
                value={formData.coverImage}
                onChange={(e) => setFormData((p) => ({ ...p, coverImage: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "#FAF7F4", border: "1px solid #DDD5CC", color: "#1e1812" }}
              />
              {formData.coverImage && (
                <img
                  src={formData.coverImage}
                  alt="封面预览"
                  className="mt-2 w-full h-32 object-cover rounded-xl"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#5C4033" }}>
                {copy.admin.formBestSeason}
              </label>
              <div className="flex gap-3 flex-wrap">
                {SEASONS.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-1.5 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={formData.bestSeason.includes(key)}
                      onChange={() => handleSeasonToggle(key)}
                      className="rounded"
                      style={{ accentColor: "#D97706" }}
                    />
                    <span className="text-sm" style={{ color: "#1e1812" }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)" }}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {copy.admin.saving}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {copy.admin.save}
              </>
            )}
          </button>
        </form>
      </div>

      <Footer />
    </div>
  );
}
