"use client";

import * as React from "react";
import { ArrowLeft, Clock, Users, Calendar, MapPin, AlertCircle, Loader2 } from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Location } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

/**
 * 创建队伍页客户端组件 - React Island
 */
export function CreateTeamClient() {
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const [hasWechat, setHasWechat] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  // 获取默认日期/时间
  const now = new Date();
  const defaultDate = now.toISOString().split("T")[0];
  const futureTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const defaultTime = `${String(futureTime.getHours()).padStart(2, "0")}:${String(futureTime.getMinutes()).padStart(2, "0")}`;

  const [formData, setFormData] = React.useState({
    title: "",
    locationId: "",
    date: defaultDate,
    time: defaultTime,
    durationMin: "240",
    maxMembers: "",
    description: "",
  });

  React.useEffect(() => {
    // Check auth
    fetchAPI("/auth/get-session")
      .then((r) => r.json())
      .then((data) => {
        if (!data?.user?.id) {
          const redirect = encodeURIComponent("/teams/create");
          window.location.href = `/login?redirect=${redirect}`;
        } else {
          setIsAuthenticated(true);
          setHasWechat(!!data.user.wechat);
        }
      })
      .catch(() => {
        window.location.href = "/login?redirect=/teams/create";
      });

    // Load locations
    fetchAPI("/api/locations?pageSize=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLocations(data.locations || []);
      })
      .catch(() => {});

    // Pre-fill locationId from URL
    const params = new URLSearchParams(window.location.search);
    const locId = params.get("locationId");
    if (locId) setFormData((prev) => ({ ...prev, locationId: locId }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetchAPI("/api/teams", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title,
          locationId: formData.locationId,
          date: formData.date,
          time: formData.time,
          durationMin: parseInt(formData.durationMin, 10),
          maxMembers: parseInt(formData.maxMembers, 10),
          description: formData.description,
        }),
      });
      const data = await res.json();
      if (data.success && data.team?.id) {
        window.location.href = `/teams/${data.team.id}`;
      } else {
        setError(data.error || "创建失败，请稍后重试");
        setIsSubmitting(false);
      }
    } catch {
      setError("创建失败，请稍后重试");
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Back */}
        <a href="/" className="inline-flex items-center text-stone-600 hover:text-stone-900 transition-colors mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {copy.common.back}
        </a>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900">{copy.teams.createTitle}</h1>
          <p className="text-stone-600 mt-2">{copy.teams.createSubtitle}</p>
        </div>

        {/* WeChat Warning */}
        {!hasWechat && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">{copy.teams.wechatRequiredTitle}</p>
                <p className="text-sm text-amber-700 mt-1">{copy.teams.wechatRequiredDesc}</p>
                <div className="mt-3">
                  <a href="/profile">
                    <button className="bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                      去填写微信号
                    </button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className={`bg-white rounded-2xl border border-stone-200 p-6 ${!hasWechat ? "opacity-50 pointer-events-none" : ""}`}>
          <h2 className="text-lg font-semibold text-stone-900 mb-6">队伍信息</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium text-stone-700">
                {copy.teams.formLabel.name} <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder={copy.teams.formPlaceholder.name}
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-900"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label htmlFor="locationId" className="text-sm font-medium text-stone-700">
                {copy.teams.formLabel.location} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <select
                  id="locationId"
                  name="locationId"
                  value={formData.locationId}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-900 bg-white"
                >
                  <option value="">{copy.teams.formPlaceholder.location}</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="date" className="text-sm font-medium text-stone-700">
                  {copy.teams.formLabel.date} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    min={defaultDate}
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-900"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="time" className="text-sm font-medium text-stone-700">
                  {copy.teams.formLabel.meetTime} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    id="time"
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-900"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {copy.teams.dateImmutableTip}
            </p>

            {/* Duration + Max Members */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="durationMin" className="text-sm font-medium text-stone-700">
                  {copy.teams.formLabel.duration} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <select
                    id="durationMin"
                    name="durationMin"
                    value={formData.durationMin}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-900 bg-white"
                  >
                    {[120,180,240,300,360,420,480,540,600,720].map((m) => (
                      <option key={m} value={m}>{m/60}小时</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="maxMembers" className="text-sm font-medium text-stone-700">
                  {copy.teams.formLabel.maxSize} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    id="maxMembers"
                    name="maxMembers"
                    type="number"
                    min={2}
                    max={50}
                    placeholder={copy.teams.formPlaceholder.maxSize}
                    value={formData.maxMembers}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-900"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-stone-700">
                {copy.teams.formLabel.description} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                placeholder={copy.teams.formPlaceholder.description}
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-900 resize-none"
              />
            </div>

            {/* Tip */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>{copy.common.confirm}：</strong>
                {copy.teams.createTip}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="flex-1 border border-stone-200 text-stone-900 py-2.5 rounded-lg font-medium transition-colors hover:bg-stone-50"
              >
                {copy.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !hasWechat}
                className="flex-1 bg-stone-900 hover:bg-stone-800 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {!hasWechat ? "请先填写微信号" : (isSubmitting ? copy.teams.createBtnLoading : copy.teams.createBtn)}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </main>
  );
}
