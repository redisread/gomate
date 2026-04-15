"use client";

/**
 * 地点编辑页 · 重组版
 *
 * 主组件为薄组装层（<150 行），所有逻辑和子组件已提取至 ./location-form/ 目录。
 */

import * as React from "react";
import { ArrowLeft, Eye, EyeOff, Map } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { EditProgressBar } from "@/components/ui/season-picker";
import { PoiEditModal, PoiDeleteConfirm } from "@/components/ui/poi-edit-modal";
import { cn } from "@/lib/utils";

import {
  useLocationForm,
  LocationFormBasicFields,
  LocationFormContentFields,
  LocationFormRouteFields,
  LocationFormSettingsFields,
  LocationActionBar,
} from "./location-form";

/* ================================================================
   骨架屏
   ================================================================ */

function EditSkeleton() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-5 w-24 bg-stone-200 dark:bg-stone-800 rounded mb-6" />
        <div className="h-7 w-48 bg-stone-200 dark:bg-stone-800 rounded mb-8" />
        <div className="h-10 bg-stone-100 dark:bg-stone-900 rounded-2xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
          <div className="space-y-4">
            {[180, 220, 160].map((h, i) => (
              <div key={i} className="rounded-2xl bg-stone-200 dark:bg-stone-800 border border-stone-100 dark:border-stone-800" style={{ height: h }} />
            ))}
          </div>
          <div className="hidden lg:block">
            <div className="rounded-2xl bg-stone-200 dark:bg-stone-800 border border-stone-100 dark:border-stone-800 h-80" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   地图选点弹窗（独立组件，因其复杂度高）
   ================================================================ */

const AMAP_KEY = (import.meta.env.PUBLIC_AMAP_KEY as string | undefined) || "";

function loadAmapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).AMap) { resolve(); return; }
    const existing = document.getElementById("amap-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("AMap failed to load")));
      const poll = setInterval(() => { if ((window as any).AMap) { clearInterval(poll); resolve(); } }, 100);
      setTimeout(() => clearInterval(poll), 5000);
      return;
    }
    const script = document.createElement("script");
    script.id = "amap-script";
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.AutoComplete,AMap.Geocoder`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("AMap failed to load"));
    document.head.appendChild(script);
  });
}

interface MapPickerModalProps {
  initialLat: number | string;
  initialLng: number | string;
  onConfirm: (address: string, lat: number, lng: number) => void;
  onClose: () => void;
}

function MapPickerModal({ initialLat, initialLng, onConfirm, onClose }: MapPickerModalProps) {
  const { t } = useI18n(["admin", "common", "locations"]);
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markerRef = React.useRef<any>(null);
  const [pickedAddress, setPickedAddress] = React.useState("");
  const [pickedLat, setPickedLat] = React.useState<number | null>(null);
  const [pickedLng, setPickedLng] = React.useState<number | null>(null);
  const [mapError, setMapError] = React.useState("");
  const [isLoadingMap, setIsLoadingMap] = React.useState(true);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchSuggestions, setSearchSuggestions] = React.useState<any[]>([]);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) { setSearchSuggestions([]); setSearchOpen(false); return; }
    searchDebounceRef.current = setTimeout(() => {
      setSearchLoading(true);
      import("@/lib/api").then(({ fetchAPI }) =>
        fetchAPI(`/amap/inputtips?keywords=${encodeURIComponent(value)}&city=全国`)
          .then((r) => r.json()).then((data) => {
            setSearchLoading(false);
            if (data.status === "1" && data.tips?.length > 0) {
              const valid = data.tips.filter((t: any) => t.location && t.location !== "[]").slice(0, 8);
              setSearchSuggestions(valid); setSearchOpen(valid.length > 0);
            } else { setSearchSuggestions([]); setSearchOpen(false); }
          }).catch(() => { setSearchLoading(false); setSearchSuggestions([]); setSearchOpen(false); })
      );
    }, 350);
  }

  function handleSearchSelect(tip: any) {
    setSearchQuery(tip.name); setSearchOpen(false); setSearchSuggestions([]);
    if (!tip.location || tip.location === "[]") return;
    const parts = tip.location.split(","); if (parts.length !== 2) return;
    const lng = parseFloat(parts[0]); const lat = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return;
    const map = mapRef.current; if (!map) return;
    map.setCenter([lng, lat]); map.setZoom(15);
    const AMap = (window as any).AMap;
    if (markerRef.current) { markerRef.current.setPosition([lng, lat]); }
    else { const marker = new AMap.Marker({ position: [lng, lat] }); marker.setMap(map); markerRef.current = marker; }
    setPickedLat(lat); setPickedLng(lng); setPickedAddress("");
    reverseGeocode(AMap, lng, lat, (addr) => setPickedAddress(addr));
  }

  React.useEffect(() => {
    let destroyed = false;
    loadAmapScript().then(() => {
      if (destroyed || !mapContainerRef.current) return;
      const AMap = (window as any).AMap;
      const parsedLat = parseFloat(String(initialLat));
      const parsedLng = parseFloat(String(initialLng));
      const hasCoords = !isNaN(parsedLat) && !isNaN(parsedLng);
      const map = new AMap.Map(mapContainerRef.current, {
        zoom: hasCoords ? 15 : 12, center: hasCoords ? [parsedLng, parsedLat] : [114.05, 22.55],
        mapStyle: "amap://styles/light",
      });
      if (destroyed) return;
      mapRef.current = map; setIsLoadingMap(false);
      if (hasCoords) {
        const marker = new AMap.Marker({ position: [parsedLng, parsedLat] });
        marker.setMap(map); markerRef.current = marker;
      }
      map.on("click", (e: any) => {
        const { lng, lat } = e.lnglat;
        setPickedLat(lat); setPickedLng(lng); setPickedAddress("");
        if (markerRef.current) { markerRef.current.setPosition([lng, lat]); }
        else { const marker = new AMap.Marker({ position: [lng, lat] }); marker.setMap(map); markerRef.current = marker; }
        reverseGeocode(AMap, lng, lat, (addr) => setPickedAddress(addr));
      });
    }).catch(() => { if (!destroyed) { setIsLoadingMap(false); setMapError(t("locations.mapLoadFailed")); } });
    return () => { destroyed = true; };
  }, [initialLat, initialLng]);

  function reverseGeocode(AMap: any, lng: number, lat: number, callback: (addr: string) => void) {
    if (!AMap.Geocoder) { callback(`${lat.toFixed(6)}, ${lng.toFixed(6)}`); return; }
    const geocoder = new AMap.Geocoder({ radius: 100 });
    geocoder.getAddress([lng, lat], (_status: string, result: any) => {
      if (result?.regeocode?.formattedAddress) callback(result.regeocode.formattedAddress);
      else callback(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    });
  }

  function handleConfirm() {
    if (pickedLat == null || pickedLng == null) return;
    const address = pickedAddress || `${pickedLat.toFixed(6)}, ${pickedLng.toFixed(6)}`;
    onConfirm(address, pickedLat, pickedLng);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(217,119,6,0.1)" }}>
              <Map className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </span>
            <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">{t("admin.mapPickerTitle")}</span>
          </div>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Search */}
        <div ref={searchContainerRef} className="relative px-5 pt-3 pb-2 shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" /></svg>
            <input type="text" value={searchQuery} onChange={handleSearchChange}
              onFocus={() => searchSuggestions.length > 0 && setSearchOpen(true)}
              placeholder={t("admin.mapPickerSearchPlaceholder")}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-150 border bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 border-stone-200 dark:border-stone-700 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 pl-9 pr-9" />
            {searchLoading && <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
            {!searchLoading && searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(""); setSearchSuggestions([]); setSearchOpen(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          {searchOpen && searchSuggestions.length > 0 && (
            <div className="absolute z-50 left-5 right-5 mt-1 rounded-xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 overflow-hidden" style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
              {searchSuggestions.map((tip, idx) => (
                <button key={idx} type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSearchSelect(tip); }}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors border-b border-stone-50 dark:border-stone-800 last:border-b-0">
                  <span className="text-amber-500 dark:text-amber-400 text-sm">📍</span>
                  <div className="min-w-0">
                    <p className="text-sm text-stone-800 dark:text-stone-200 font-medium truncate">{tip.name}</p>
                    {tip.district && <p className="text-xs text-stone-400 truncate">{tip.district}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-stone-400 mt-2">{t("admin.mapPickerSearchHint")}</p>
        </div>

        {/* Map */}
        <div className="relative mx-5 rounded-xl overflow-hidden shrink-0" style={{ height: 380 }}>
          {isLoadingMap && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-100 dark:bg-stone-800 z-10">
              <svg className="h-6 w-6 text-amber-500 dark:text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            </div>
          )}
          {mapError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-900 z-10 gap-2 p-4">
              <Map className="h-8 w-8 text-stone-300 dark:text-stone-600" />
              <p className="text-sm text-stone-500 dark:text-stone-400 text-center">{mapError}</p>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Selected address */}
        <div className="px-5 py-3 shrink-0">
          {pickedLat != null && pickedLng != null ? (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
              <span className="text-amber-500 dark:text-amber-400 text-sm">📍</span>
              <div className="min-w-0 flex-1">
                {pickedAddress ? (
                  <p className="text-sm text-stone-700 dark:text-stone-300 leading-snug">{pickedAddress}</p>
                ) : (
                  <p className="text-sm text-stone-400 flex items-center gap-1.5">
                    <svg className="h-3 w-3 animate-spin text-amber-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    {t("admin.mapPickerFetchingAddress")}
                  </p>
                )}
                <p className="text-xs text-stone-400 mt-0.5 tabular-nums">{pickedLat.toFixed(6)}, {pickedLng.toFixed(6)}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-400 text-center">{t("admin.mapPickerClickHint")}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-stone-100 dark:border-stone-800 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
            {t("admin.mapPickerCancel")}
          </button>
          <button type="button" onClick={handleConfirm} disabled={pickedLat == null}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-500 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
            {t("admin.mapPickerConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   预览面板
   ================================================================ */

import { MapPin as MapPinIcon, Image as ImageIcon, Navigation } from "lucide-react";
import type { FormData } from "./location-form";

interface PreviewPanelProps { data: FormData; cityName: string; }

function PreviewPanel({ data, cityName }: PreviewPanelProps) {
  const { t } = useI18n(["admin", "common", "locations"]);
  const seasonEmojis: Record<string, string> = { spring: "🌸", summer: "☀️", autumn: "🍂", winter: "❄️" };
  return (
    <div className="sticky top-20">
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-50 dark:border-stone-800">
          <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">{t("admin.previewEffect")}</span>
        </div>
        <div className="w-full bg-stone-100 dark:bg-stone-800" style={{ aspectRatio: "16/9" }}>
          {data.coverImage ? <img src={data.coverImage} alt={t("admin.coverImagePreview")} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-8 w-8 text-stone-300 dark:text-stone-600" /></div>}
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base leading-snug">
              {data.name || <span className="text-stone-300 dark:text-stone-600">{t("admin.locationNamePlaceholder")}</span>}
            </h3>
            {data.subtitle && <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{data.subtitle}</p>}
          </div>
          {(cityName || data.address) && (
            <div className="flex items-start gap-1.5 text-xs text-stone-500 dark:text-stone-400">
              <MapPinIcon className="h-3.5 w-3.5 mt-0.5 text-amber-500 dark:text-amber-400 shrink-0" />
              <span>{[cityName, data.address].filter(Boolean).join(" · ")}</span>
            </div>
          )}
          {data.description && <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-3">{data.description}</p>}
          {data.bestSeason.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.bestSeason.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium border border-amber-100 dark:border-amber-900/50">
                  {seasonEmojis[s]} {s}
                </span>
              ))}
            </div>
          )}
          {(data.lat || data.lng) && (
            <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
              <Navigation className="h-3 w-3" /><span>{data.lat}, {data.lng}</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-stone-400 dark:text-stone-500 text-center mt-2">{t("admin.previewAutoSync")}</p>
    </div>
  );
}

/* ================================================================
   主组件
   ================================================================ */

interface LocationEditClientProps { locationId: string; }

export function LocationEditClient({ locationId }: LocationEditClientProps) {
  const { t } = useI18n(["admin", "common", "locations"]);
  const form = useLocationForm(locationId);
  const [showPreview, setShowPreview] = React.useState(false);
  const [showMapPicker, setShowMapPicker] = React.useState(false);

  const currentCityName = React.useMemo(
    () => form.cities.find((c) => c.id === form.formData.cityId)?.name ?? "",
    [form.cities, form.formData.cityId]
  );

  const progressSteps = [
    { id: "core", label: t("admin.progressStep1"), done: !!form.formData.name && !!form.formData.description },
    { id: "location", label: t("admin.progressStep2"), done: !!form.formData.cityId },
    { id: "media", label: t("admin.progressStep3"), done: !!form.formData.coverImage },
    { id: "finish", label: t("admin.progressStep4"), done: !!form.formData.name && !!form.formData.description && !!form.formData.cityId && !!form.formData.coverImage },
  ];

  // Close POI modal/delete from parent
  const closePoiModal = React.useCallback(() => {
    // handled internally by hook
  }, []);
  const closeDeleteConfirm = React.useCallback(() => {
    // handled internally by hook
  }, []);

  if (!form.location) return <EditSkeleton />;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Top nav */}
        <div className="flex items-center justify-between mb-6">
          <a href={`/locations/${locationId}`} className="inline-flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400 hover:opacity-70 transition-opacity">
            <ArrowLeft className="h-4 w-4" />{t("common.back")}
          </a>
          <button type="button" onClick={() => setShowPreview((v) => !v)}
            className="lg:hidden flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-600 transition-colors">
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? t("admin.closePreview") : t("admin.previewEffect")}
          </button>
        </div>

        {/* Title */}
        <div className="flex items-center gap-2 mb-6">
          <span className="w-1.5 h-6 rounded-full bg-amber-600" />
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">{t("admin.editLocation")}</h1>
        </div>

        {/* Progress */}
        <div className="mb-8 px-2"><EditProgressBar steps={progressSteps} /></div>

        {/* Draft banner */}
        {form.showDraftBanner && (
          <div className="mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
            <p className="text-sm text-amber-800 dark:text-amber-300">🗒 {t("admin.draftRestorePrompt")}</p>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={form.handleDiscardDraft} className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors">{t("admin.draftDiscardBtn")}</button>
              <button type="button" onClick={form.handleRestoreDraft} className="text-xs font-semibold px-3 py-1 rounded-lg text-white bg-amber-600 hover:bg-amber-700 transition-colors">{t("admin.draftRestoreBtn")}</button>
            </div>
          </div>
        )}

        {/* Save message */}
        {form.saveMessage && (
          <div className={cn("mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2",
            form.saveMessage.type === "success" ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50" : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50")}>
            {form.saveMessage.type === "success" ? (
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" /></svg>
            )}
            {form.saveMessage.text}
          </div>
        )}

        {/* Main content: two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
          <div className={cn("space-y-4", showPreview && "hidden lg:block")}>
            <LocationFormBasicFields formData={form.formData} errors={form.errors} cities={form.cities}
              updateField={form.updateField} touch={form.touch} onOpenMapPicker={() => setShowMapPicker(true)} />
            <LocationFormContentFields formData={form.formData} isSaving={form.isSaving} updateField={form.updateField} />
            <LocationFormSettingsFields formData={form.formData} allTags={form.allTags} updateField={form.updateField} />
            <LocationFormRouteFields formData={form.formData} allPois={form.allPois}
              poiModalOpen={form.poiModalOpen} poiModalMode={form.poiModalMode} editingPoi={form.editingPoi}
              deleteConfirmOpen={form.deleteConfirmOpen} deletingPoi={form.deletingPoi}
              deletingPoiAssociations={form.deletingPoiAssociations} isDeletingPoi={form.isDeletingPoi}
              poiSearch={form.poiSearch} poiSearchResults={form.poiSearchResults}
              updateField={form.updateField} handlePoiSearch={form.handlePoiSearch}
              handleOpenCreatePoi={form.handleOpenCreatePoi} handleOpenEditPoi={form.handleOpenEditPoi}
              handlePoiModalSuccess={form.handlePoiModalSuccess} handleOpenDeletePoi={form.handleOpenDeletePoi}
              handleConfirmDeletePoi={form.handleConfirmDeletePoi} />
            <LocationActionBar isDirty={form.isDirty} isSaving={form.isSaving} onSave={form.handleSave} onDiscard={form.handleDiscard} />
          </div>

          {/* Right column: preview */}
          <div className={cn(showPreview ? "block" : "hidden", "lg:block")}>
            <PreviewPanel data={form.formData} cityName={currentCityName} />
          </div>
        </div>
      </div>

      <Footer />
      <StickyActionBar isDirty={form.isDirty} isSaving={form.isSaving} lastSaved={null}
        onSave={form.handleSave} onDiscard={form.handleDiscard} />

      {/* Map picker */}
      {showMapPicker && (
        <MapPickerModal initialLat={form.formData.lat} initialLng={form.formData.lng}
          onConfirm={(address, lat, lng) => { form.updateField("address", address); form.updateField("lat", lat); form.updateField("lng", lng); setShowMapPicker(false); }}
          onClose={() => setShowMapPicker(false)} />
      )}
    </div>
  );
}
