"use client";

/**
 * 地点编辑页 · 极致优化版
 *
 * 整合8大Agent成果：
 * - 封面图拖拽上传（CoverImageUpload）
 * - 季节视觉化选择（SeasonPicker）
 * - 进度指示器（EditProgressBar）
 * - 城市搜索下拉（CitySelect）
 * - 自动草稿保存（useAutoDraft）
 * - 粘性底部操作栏（StickyActionBar）
 * - 字段实时校验（useFormValidation）
 * - 桌面端双栏布局 + 实时预览
 * - 骨架屏加载态
 */

import * as React from "react";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  FileText,
  Image as ImageIcon,
  Settings,
  Eye,
  EyeOff,
  Navigation,
  Map,
  Search,
  X,
  Check,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI, apiPut } from "@/lib/api";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CoverImageUpload } from "@/components/ui/cover-image-upload";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";
import { SeasonPicker, EditProgressBar } from "@/components/ui/season-picker";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { CitySelect } from "@/components/ui/city-select";
import { PoiEditModal, PoiDeleteConfirm } from "@/components/ui/poi-edit-modal";
import { useAutoDraft } from "@/hooks/useAutoDraft";
import { useFormValidation } from "@/hooks/useFormValidation";
import { cn } from "@/lib/utils";
import type { Location, City, PoiDetail } from "@/lib/types";

/* ================================================================
   类型与常量
   ================================================================ */

/** 中文季节名 → 英文 key 映射（兼容旧数据） */
const SEASON_ZH_TO_KEY: Record<string, string> = {
  春季: "spring",
  夏季: "summer",
  秋季: "autumn",
  冬季: "winter",
};

/** 规范化季节数组：将中文值转换为英文 key */
function normalizeSeasons(seasons: string[]): string[] {
  return seasons.map((s) => SEASON_ZH_TO_KEY[s] ?? s);
}

interface LocationEditClientProps {
  locationId: string;
}

interface FormData {
  name: string;
  type: string;
  subtitle: string;
  description: string;
  address: string;
  cityId: string;
  bestSeason: string[];
  coverImage: string;
  images: string[];
  lat: number | string;
  lng: number | string;
  extra: { facilities: string[]; tips: string[]; warnings: string[] };
  tagIds: string[];
  poiLinks: Array<{ poiId: string; roleType: string; order: number }>;
}

const LOCATION_TYPE_OPTIONS = [
  { value: "hiking", label: "户外徒步" },
  { value: "explore", label: "城市探索" },
  { value: "leisure", label: "休闲探店" },
  { value: "travel", label: "旅行" },
] as const;

const DEFAULT_FORM: FormData = {
  name: "",
  type: "",
  subtitle: "",
  description: "",
  address: "",
  cityId: "",
  bestSeason: [],
  coverImage: "",
  images: [],
  lat: "",
  lng: "",
  extra: { facilities: [], tips: [], warnings: [] },
  tagIds: [],
  poiLinks: [],
};

/** 配套设施选项 */
const FACILITY_OPTIONS = [
  { value: "parking", label: "🅿️ 停车场" },
  { value: "restroom", label: "🚻 卫生间" },
  { value: "water", label: "💧 补给水源" },
  { value: "food", label: "🍱 餐饮" },
];

/** 打卡点角色类型选项 */
const POI_ROLE_OPTIONS = [
  { value: "waypoint", label: "途经点" },
  { value: "checkpoint", label: "打卡点" },
  { value: "viewpoint", label: "观景点" },
  { value: "facility", label: "设施" },
  { value: "poi", label: "兴趣点" },
];

/** 字段校验规则 */
const VALIDATION_RULES: Record<string, (v: string) => string | undefined> = {
  name: (v) => {
    if (!v.trim()) return copy.admin.validationNameRequired;
    if (v.trim().length > 50) return copy.admin.validationNameTooLong;
  },
  description: (v) => {
    if (!v.trim()) return copy.admin.validationDescRequired;
    if (v.trim().length < 10) return copy.admin.validationDescTooShort;
  },
  cityId: (v) => {
    if (!v) return copy.admin.validationCityRequired;
  },
  lat: (v) => {
    if (v === "" || v === undefined) return undefined; // 可选
    const n = parseFloat(String(v));
    if (isNaN(n) || n < -90 || n > 90) return copy.admin.validationLatInvalid;
  },
  lng: (v) => {
    if (v === "" || v === undefined) return undefined; // 可选
    const n = parseFloat(String(v));
    if (isNaN(n) || n < -180 || n > 180) return copy.admin.validationLngInvalid;
  },
};

/* ================================================================
   骨架屏组件
   ================================================================ */

function EditSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "#FAF7F4" }}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        {/* 返回 + 标题 */}
        <div className="h-5 w-24 bg-stone-200 rounded mb-6" />
        <div className="h-7 w-48 bg-stone-200 rounded mb-8" />
        {/* 进度条骨架 */}
        <div className="h-10 bg-stone-100 rounded-2xl mb-8" />
        {/* 内容骨架 */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
          <div className="space-y-4">
            {[180, 220, 160].map((h, i) => (
              <div key={i} className="rounded-2xl bg-white border border-stone-100" style={{ height: h }} />
            ))}
          </div>
          <div className="hidden lg:block">
            <div className="rounded-2xl bg-white border border-stone-100 h-80" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   章节卡片容器
   ================================================================ */

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}

function SectionCard({ icon, title, badge, children, defaultOpen = true, collapsible = false }: SectionCardProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <button
        type="button"
        onClick={() => collapsible && setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 px-5 py-4 text-left",
          collapsible && "hover:bg-stone-50/60 transition-colors cursor-pointer",
          !collapsible && "cursor-default"
        )}
      >
        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(217,119,6,0.1)" }}>
          <span style={{ color: "#D97706" }}>{icon}</span>
        </span>
        <span className="text-sm font-semibold text-stone-800 flex-1">{title}</span>
        {badge && <span>{badge}</span>}
        {collapsible && (
          <svg
            className={cn("h-4 w-4 text-stone-400 transition-transform duration-200", open && "rotate-180")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-stone-50">
          <div className="pt-4 space-y-4">{children}</div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   字段组件
   ================================================================ */

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold" style={{ color: "#5C4033" }}>
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
          </svg>
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-xs text-stone-400">{hint}</p>
      )}
    </div>
  );
}

/** 通用输入框样式 */
function styledInput(hasError?: boolean) {
  return cn(
    "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-150",
    "border focus:ring-2",
    hasError
      ? "border-red-300 focus:ring-red-200 focus:border-red-400"
      : "border-stone-200 focus:ring-amber-200 focus:border-amber-400"
  );
}

/* ================================================================
   高德地图工具函数
   ================================================================ */

const AMAP_KEY = (import.meta.env.PUBLIC_AMAP_KEY as string | undefined) ?? "YOUR_AMAP_KEY";

/** 动态加载高德地图 JS SDK（幂等，重复调用安全） */
function loadAmapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).AMap) { resolve(); return; }
    const existing = document.getElementById("amap-script");
    if (existing) {
      // 脚本已存在但 AMap 尚未挂载（正在加载中），等待 load 事件
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("高德地图加载失败")));
      // 如果脚本已加载完成但 AMap 尚未挂载（极少数情况），轮询等待
      const poll = setInterval(() => {
        if ((window as any).AMap) { clearInterval(poll); resolve(); }
      }, 100);
      setTimeout(() => clearInterval(poll), 5000);
      return;
    }
    const script = document.createElement("script");
    script.id = "amap-script";
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.AutoComplete,AMap.Geocoder`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("高德地图加载失败"));
    document.head.appendChild(script);
  });
}

/* ================================================================
   MapSearchInput – 高德地图地址搜索输入框
   ================================================================ */

interface MapSearchInputProps {
  /** 选中候选项后的回调，提供地址文本和坐标 */
  onSelect: (address: string, lat: number, lng: number) => void;
}

function MapSearchInput({ onSelect }: MapSearchInputProps) {
  const [query, setQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // 点击外部关闭下拉
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    setSelected("");

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!value.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      setLoading(true);
      // 通过后端代理调用高德地图输入提示（避免浏览器 CORS 限制）
      fetchAPI(
        `/amap/inputtips?keywords=${encodeURIComponent(value)}&city=全国`
      )
        .then((r) => r.json())
        .then((data) => {
          setLoading(false);
          if (data.status === "1" && data.tips?.length > 0) {
            const valid = data.tips
              .filter((t: any) => t.location && t.location !== "[]")
              .slice(0, 8);
            setSuggestions(valid);
            setOpen(valid.length > 0);
          } else {
            setSuggestions([]);
            setOpen(false);
          }
        })
        .catch(() => {
          setLoading(false);
          setSuggestions([]);
          setOpen(false);
        });
    }, 350);
  }

  function handleSelect(tip: any) {
    const addressText = [tip.district, tip.name].filter(Boolean).join("");

    if (tip.location && tip.location !== "[]") {
      // REST API 返回的 location 格式为 "lng,lat"
      const parts = tip.location.split(",");
      if (parts.length === 2) {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          onSelect(addressText, lat, lng);
          setSelected(tip.name);
          setQuery(tip.name);
          setOpen(false);
          setSuggestions([]);
          return;
        }
      }
    }

    // 降级：通过后端代理查询坐标
    fetchAPI(
      `/amap/geocode?address=${encodeURIComponent(addressText)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "1" && data.geocodes?.length > 0) {
          const loc = data.geocodes[0].location;
          const parts = loc.split(",");
          if (parts.length === 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            onSelect(addressText, lat, lng);
          }
        }
      })
      .catch(() => {});
    setSelected(tip.name);
    setQuery(tip.name);
    setOpen(false);
    setSuggestions([]);
  }

  function handleClear() {
    setQuery("");
    setSelected("");
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="搜索地点名称或地址..."
          className={cn(
            styledInput(),
            "pl-9 pr-9 text-stone-900"
          )}
          style={{ background: "#FAF7F4", color: "#1e1812" }}
        />
        {/* 加载中图标 或 清除按钮 */}
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 animate-spin" />
        )}
        {!loading && (query || selected) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 候选下拉列表 */}
      {open && suggestions.length > 0 && (
        <div
          className="absolute z-30 left-0 right-0 mt-1 rounded-xl bg-white border border-stone-100 overflow-hidden"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}
        >
          {suggestions.map((tip, idx) => (
            <button
              key={idx}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // 防止 input onBlur 先触发
                handleSelect(tip);
              }}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-amber-50 transition-colors border-b border-stone-50 last:border-b-0"
            >
              <MapPin className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-stone-800 font-medium truncate">{tip.name}</p>
                {tip.district && (
                  <p className="text-xs text-stone-400 truncate">{tip.district}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   MapPickerModal – 高德地图选点弹窗
   ================================================================ */

interface MapPickerModalProps {
  initialLat?: number | string;
  initialLng?: number | string;
  onConfirm: (address: string, lat: number, lng: number) => void;
  onClose: () => void;
}

function MapPickerModal({ initialLat, initialLng, onConfirm, onClose }: MapPickerModalProps) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markerRef = React.useRef<any>(null);
  const [pickedAddress, setPickedAddress] = React.useState("");
  const [pickedLat, setPickedLat] = React.useState<number | null>(null);
  const [pickedLng, setPickedLng] = React.useState<number | null>(null);
  const [mapError, setMapError] = React.useState("");
  const [isLoadingMap, setIsLoadingMap] = React.useState(true);

  // 弹窗内搜索状态
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchSuggestions, setSearchSuggestions] = React.useState<any[]>([]);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  // 点击弹窗外部关闭搜索下拉
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
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
      fetchAPI(`/amap/inputtips?keywords=${encodeURIComponent(value)}&city=全国`)
        .then((r) => r.json())
        .then((data) => {
          setSearchLoading(false);
          if (data.status === "1" && data.tips?.length > 0) {
            const valid = data.tips.filter((t: any) => t.location && t.location !== "[]").slice(0, 8);
            setSearchSuggestions(valid);
            setSearchOpen(valid.length > 0);
          } else { setSearchSuggestions([]); setSearchOpen(false); }
        })
        .catch(() => { setSearchLoading(false); setSearchSuggestions([]); setSearchOpen(false); });
    }, 350);
  }

  function handleSearchSelect(tip: any) {
    setSearchQuery(tip.name);
    setSearchOpen(false);
    setSearchSuggestions([]);
    if (!tip.location || tip.location === "[]") return;
    const parts = tip.location.split(",");
    if (parts.length !== 2) return;
    const lng = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return;

    const map = mapRef.current;
    if (!map) return;
    const AMap = (window as any).AMap;

    // 地图跳转并放置标记
    map.setCenter([lng, lat]);
    map.setZoom(15);
    if (markerRef.current) {
      markerRef.current.setPosition([lng, lat]);
    } else {
      const marker = new AMap.Marker({ position: [lng, lat] });
      marker.setMap(map);
      markerRef.current = marker;
    }
    setPickedLat(lat);
    setPickedLng(lng);
    setPickedAddress("");
    reverseGeocode(AMap, lng, lat, (addr) => setPickedAddress(addr));
  }

  // 初始化地图
  React.useEffect(() => {
    let destroyed = false;

    loadAmapScript()
      .then(() => {
        if (destroyed || !mapContainerRef.current) return;
        const AMap = (window as any).AMap;

        const parsedLat = parseFloat(String(initialLat));
        const parsedLng = parseFloat(String(initialLng));
        const hasCoords = !isNaN(parsedLat) && !isNaN(parsedLng);

        const map = new AMap.Map(mapContainerRef.current, {
          zoom: hasCoords ? 15 : 12,
          center: hasCoords
            ? [parsedLng, parsedLat]
            : [114.05, 22.55], // 默认深圳市中心
          mapStyle: "amap://styles/light",
        });
        mapRef.current = map;
        setIsLoadingMap(false);

        // 若有初始坐标则放置标记
        if (hasCoords) {
          const marker = new AMap.Marker({ position: [parsedLng, parsedLat] });
          marker.setMap(map);
          markerRef.current = marker;
          setPickedLat(parsedLat);
          setPickedLng(parsedLng);
          // 逆地理编码获取地址
          reverseGeocode(AMap, parsedLng, parsedLat, (addr) => {
            if (!destroyed) setPickedAddress(addr);
          });
        }

        // 点击地图选点
        map.on("click", (e: any) => {
          if (destroyed) return;
          const AMapInner = (window as any).AMap;
          const { lng, lat } = e.lnglat;

          // 更新或创建标记
          if (markerRef.current) {
            markerRef.current.setPosition([lng, lat]);
          } else {
            const marker = new AMapInner.Marker({ position: [lng, lat] });
            marker.setMap(map);
            markerRef.current = marker;
          }

          setPickedLat(lat);
          setPickedLng(lng);
          setPickedAddress("");

          reverseGeocode(AMapInner, lng, lat, (addr) => {
            if (!destroyed) setPickedAddress(addr);
          });
        });
      })
      .catch(() => {
        if (!destroyed) setMapError("高德地图加载失败，请检查网络或 API Key 配置");
        setIsLoadingMap(false);
      });

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 逆地理编码辅助函数（通过后端代理） */
  function reverseGeocode(_AMap: any, lng: number, lat: number, callback: (addr: string) => void) {
    fetchAPI(
      `/amap/regeo?location=${lng},${lat}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "1" && data.regeocode?.formatted_address) {
          callback(data.regeocode.formatted_address);
        } else {
          callback(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      })
      .catch(() => callback(`${lat.toFixed(5)}, ${lng.toFixed(5)}`));
  }

  function handleConfirm() {
    if (pickedLat == null || pickedLng == null) return;
    onConfirm(pickedAddress, pickedLat, pickedLng);
  }

  // 阻止弹窗内部滚动穿透到 body
  function handleModalWheel(e: React.WheelEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onWheel={handleModalWheel}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white overflow-hidden flex flex-col"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.25)", maxHeight: "90vh" }}
      >
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(217,119,6,0.1)" }}
            >
              <Map className="h-4 w-4" style={{ color: "#D97706" }} />
            </span>
            <span className="text-sm font-semibold text-stone-800">地图选点</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 弹窗内搜索框 */}
        <div ref={searchContainerRef} className="relative px-5 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchSuggestions.length > 0 && setSearchOpen(true)}
              placeholder="搜索地点跳转到地图位置..."
              className={cn(styledInput(), "pl-9 pr-9 text-stone-900 text-sm")}
              style={{ background: "#FAF7F4", color: "#1e1812" }}
            />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 animate-spin" />
            )}
            {!searchLoading && searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setSearchSuggestions([]); setSearchOpen(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchOpen && searchSuggestions.length > 0 && (
            <div
              className="absolute z-50 left-5 right-5 mt-1 rounded-xl bg-white border border-stone-100 overflow-hidden"
              style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
            >
              {searchSuggestions.map((tip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSearchSelect(tip); }}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-amber-50 transition-colors border-b border-stone-50 last:border-b-0"
                >
                  <MapPin className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-stone-800 font-medium truncate">{tip.name}</p>
                    {tip.district && <p className="text-xs text-stone-400 truncate">{tip.district}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-stone-400 mt-2">搜索后跳转，或直接点击地图选点</p>
        </div>

        {/* 地图容器 */}
        <div className="relative mx-5 rounded-xl overflow-hidden shrink-0" style={{ height: 380 }}>
          {isLoadingMap && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-100 z-10">
              <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
            </div>
          )}
          {mapError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-50 z-10 gap-2 p-4">
              <Map className="h-8 w-8 text-stone-300" />
              <p className="text-sm text-stone-500 text-center">{mapError}</p>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* 已选地址展示 */}
        <div className="px-5 py-3 shrink-0">
          {pickedLat != null && pickedLng != null ? (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
              <MapPin className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                {pickedAddress ? (
                  <p className="text-sm text-stone-700 leading-snug">{pickedAddress}</p>
                ) : (
                  <p className="text-sm text-stone-400 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                    正在获取地址...
                  </p>
                )}
                <p className="text-xs text-stone-400 mt-0.5 tabular-nums">
                  {pickedLat.toFixed(6)}, {pickedLng.toFixed(6)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-100">
              <MapPin className="h-4 w-4 text-stone-300 shrink-0" />
              <p className="text-sm text-stone-400">点击地图以选择位置</p>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-5 pb-5 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-stone-600 border border-stone-200 hover:bg-stone-50 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pickedLat == null || pickedLng == null}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)" }}
          >
            <Check className="h-4 w-4" />
            确认选点
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   实时预览组件（桌面端右栏）
   ================================================================ */

interface PreviewPanelProps {
  data: FormData;
  cityName: string;
}

function PreviewPanel({ data, cityName }: PreviewPanelProps) {
  const seasonEmojis: Record<string, string> = {
    spring: "🌸", summer: "☀️", autumn: "🍂", winter: "❄️",
  };

  return (
    <div className="sticky top-20">
      <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {/* 预览标题 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-50">
          <Eye className="h-4 w-4" style={{ color: "#D97706" }} />
          <span className="text-xs font-semibold text-stone-600">实时预览</span>
        </div>

        {/* 封面图 */}
        <div className="w-full bg-stone-100" style={{ aspectRatio: "16/9" }}>
          {data.coverImage ? (
            <img src={data.coverImage} alt="封面预览" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-stone-300" />
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* 名称 */}
          <div>
            <h3 className="font-bold text-stone-900 text-base leading-snug">
              {data.name || <span className="text-stone-300">地点名称</span>}
            </h3>
            {data.subtitle && (
              <p className="text-sm text-stone-500 mt-0.5">{data.subtitle}</p>
            )}
          </div>

          {/* 城市 + 地址 */}
          {(cityName || data.address) && (
            <div className="flex items-start gap-1.5 text-xs text-stone-500">
              <MapPin className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
              <span>{[cityName, data.address].filter(Boolean).join(" · ")}</span>
            </div>
          )}

          {/* 描述 */}
          {data.description && (
            <p className="text-xs text-stone-500 leading-relaxed line-clamp-3">
              {data.description}
            </p>
          )}

          {/* 季节 */}
          {data.bestSeason.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.bestSeason.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-100">
                  {seasonEmojis[s]} {copy.admin[`season${s.charAt(0).toUpperCase() + s.slice(1)}` as keyof typeof copy.admin] as string}
                </span>
              ))}
            </div>
          )}

          {/* 坐标 */}
          {(data.lat || data.lng) && (
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <Navigation className="h-3 w-3" />
              <span>{data.lat}, {data.lng}</span>
            </div>
          )}
        </div>
      </div>

      {/* 预览提示 */}
      <p className="text-xs text-stone-400 text-center mt-2">
        编辑时自动同步预览
      </p>
    </div>
  );
}

/* ================================================================
   主组件
   ================================================================ */

export function LocationEditClient({ locationId }: LocationEditClientProps) {
  const [location, setLocation] = React.useState<Location | null>(null);
  const [cities, setCities] = React.useState<City[]>([]);
  const [allTags, setAllTags] = React.useState<Array<{ id: string; name: string; type: string }>>([]);
  const [allPois, setAllPois] = React.useState<Array<{ id: string; name: string; description?: string | null }>>([]);
  const [poiSearch, setPoiSearch] = React.useState("");
  const [poiSearchResults, setPoiSearchResults] = React.useState<typeof allPois>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDraftBanner, setShowDraftBanner] = React.useState(false);
  const [pendingDraft, setPendingDraft] = React.useState<FormData | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const [showMapPicker, setShowMapPicker] = React.useState(false);

  // POI 弹窗状态
  const [poiModalOpen, setPoiModalOpen] = React.useState(false);
  const [poiModalMode, setPoiModalMode] = React.useState<"create" | "edit">("create");
  const [editingPoi, setEditingPoi] = React.useState<PoiDetail | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deletingPoi, setDeletingPoi] = React.useState<{ id: string; name: string } | null>(null);
  const [deletingPoiAssociations, setDeletingPoiAssociations] = React.useState(0);
  const [isDeletingPoi, setIsDeletingPoi] = React.useState(false);

  const [formData, setFormData] = React.useState<FormData>(DEFAULT_FORM);

  // 字段校验
  const { errors, touch, validate, reset: resetValidation } = useFormValidation(VALIDATION_RULES);

  // 自动草稿保存
  const draftKey = `location-edit-draft-${locationId}`;
  const { lastSaved, restoreDraft, clearDraft } = useAutoDraft(draftKey, formData);

  // 前端权限守卫
  React.useEffect(() => {
    fetchAPI("/auth/get-session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.role !== "admin") window.location.href = "/";
      })
      .catch(() => { window.location.href = "/"; });
  }, []);

  // 并发加载数据
  React.useEffect(() => {
    Promise.all([
      fetchAPI(`/api/locations/${locationId}`).then((r) => r.json()),
      fetchAPI("/api/cities").then((r) => r.json()),
      fetchAPI(`/api/locations/${locationId}/tags`).then((r) => r.json()).catch(() => ({ tags: [] })),
      fetchAPI(`/api/locations/${locationId}/pois`).then((r) => r.json()).catch(() => ({ pois: [] })),
      fetchAPI("/api/tags?type=location&limit=200").then((r) => r.json()).catch(() => ({ tags: [] })),
      fetchAPI("/pois?limit=200").then((r) => r.json()).catch(() => ({ pois: [] })),
    ])
      .then(([locData, cityData, locTagsData, locPoisData, allTagsData, allPoisData]) => {
        if (locData.location) {
          const loc: Location = locData.location;
          setLocation(loc);

          // 填充标签和 POI 状态
          setAllTags(allTagsData.tags ?? []);
          setAllPois(allPoisData.pois ?? []);

          const currentTagIds: string[] = (locTagsData.tags ?? []).map((t: { id: string }) => t.id);
          const currentPoiLinks: FormData["poiLinks"] = (locPoisData.pois ?? []).map(
            (p: { id: string; roleType: string; order?: number }, idx: number) => ({
              poiId: p.id,
              roleType: p.roleType ?? "poi",
              order: p.order ?? idx,
            })
          );

          const serverData: FormData = {
            name: loc.name,
            type: loc.type ?? "",
            subtitle: loc.subtitle ?? "",
            description: loc.description,
            address: loc.address ?? "",
            cityId: loc.cityId,
            bestSeason: normalizeSeasons(loc.bestSeason ?? []),
            coverImage: loc.coverImage,
            images: loc.images ?? [],
            lat: loc.coordinates?.lat ?? "",
            lng: loc.coordinates?.lng ?? "",
            extra: {
              facilities: (loc.extra as any)?.facilities ?? [],
              tips: Array.isArray((loc.extra as any)?.tips) ? (loc.extra as any)?.tips : [],
              warnings: Array.isArray((loc.extra as any)?.warnings) ? (loc.extra as any)?.warnings : [],
            },
            tagIds: currentTagIds,
            poiLinks: currentPoiLinks,
          };

          // 检查是否有未过期草稿
          const draft = restoreDraft();
          if (draft && JSON.stringify(draft) !== JSON.stringify(serverData)) {
            setPendingDraft(draft);
            setShowDraftBanner(true);
            setFormData(serverData); // 先用服务器数据，等用户决定
          } else {
            setFormData(serverData);
          }
        }
        if (cityData.cities) setCities(cityData.cities);
      })
      .catch(() => {
        setSaveMessage({ type: "error", text: "加载地点数据失败，请刷新重试" });
      })
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  // 通用字段更新
  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaveMessage(null);
    // 触发实时校验（字符串字段）
    if (typeof value === "string" && VALIDATION_RULES[key]) {
      touch(key, value);
    }
  };

  // POI 相关处理函数
  const handleOpenCreatePoi = () => {
    setPoiModalMode("create");
    setEditingPoi(null);
    setPoiModalOpen(true);
  };

  const handleOpenEditPoi = async (poiId: string) => {
    try {
      const res = await fetchAPI(`/api/pois/${poiId}`);
      const data = await res.json();
      if (data.success && data.poi) {
        setEditingPoi(data.poi);
        setPoiModalMode("edit");
        setPoiModalOpen(true);
      }
    } catch (err) {
      console.error("获取 POI 详情失败:", err);
    }
  };

  const handlePoiModalSuccess = (poi: { id: string; name: string; coordinates: { lat: number; lng: number } }) => {
    // 更新 allPois 列表
    setAllPois((prev) => {
      const exists = prev.find((p) => p.id === poi.id);
      if (exists) {
        return prev.map((p) => (p.id === poi.id ? { ...p, name: poi.name } : p));
      }
      return [...prev, { id: poi.id, name: poi.name }];
    });

    // 如果是新建，自动添加到关联列表
    if (poiModalMode === "create") {
      updateField("poiLinks", [
        ...formData.poiLinks,
        { poiId: poi.id, roleType: "poi", order: formData.poiLinks.length },
      ]);
    }

    setPoiModalOpen(false);
    setEditingPoi(null);
  };

  const handleOpenDeletePoi = async (poiId: string, poiName: string) => {
    // 查询关联数量
    try {
      const res = await fetchAPI(`/api/locations/${locationId}/pois`);
      const data = await res.json();
      const count = (data.pois ?? []).filter((p: { id: string }) => p.id === poiId).length;
      setDeletingPoiAssociations(count);
    } catch {
      setDeletingPoiAssociations(0);
    }
    setDeletingPoi({ id: poiId, name: poiName });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDeletePoi = async () => {
    if (!deletingPoi) return;
    setIsDeletingPoi(true);
    try {
      const res = await fetchAPI(`/api/pois/${deletingPoi.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        // 从 allPois 中移除
        setAllPois((prev) => prev.filter((p) => p.id !== deletingPoi.id));
        // 从关联列表中移除
        updateField("poiLinks", formData.poiLinks.filter((l) => l.poiId !== deletingPoi.id));
        setDeleteConfirmOpen(false);
        setDeletingPoi(null);
      } else {
        throw new Error(data.error || "删除失败");
      }
    } catch (err) {
      console.error("删除 POI 失败:", err);
    } finally {
      setIsDeletingPoi(false);
    }
  };

  // 保存
  const handleSave = async () => {
    // 全量校验
    const validationData: Record<string, string> = {
      name: formData.name,
      description: formData.description,
      cityId: formData.cityId,
      lat: String(formData.lat),
      lng: String(formData.lng),
    };
    if (!validate(validationData)) return;

    if (!location) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const extraPayload = {
        facilities: formData.extra.facilities.length > 0 ? formData.extra.facilities : undefined,
        tips: (() => { const t = formData.extra.tips.filter(s => s.trim()); return t.length > 0 ? t : undefined; })(),
        warnings: (() => { const w = formData.extra.warnings.filter(s => s.trim()); return w.length > 0 ? w : undefined; })(),
      };
      const hasExtra = extraPayload.facilities || extraPayload.tips || extraPayload.warnings;

      await Promise.all([
        apiPut("/api/locations", {
          id: location.id,
          name: formData.name,
          type: formData.type || null,
          subtitle: formData.subtitle || undefined,
          description: formData.description,
          address: formData.address || undefined,
          cityId: formData.cityId,
          bestSeason: formData.bestSeason,
          coverImage: formData.coverImage,
          images: formData.images,
          coordinates: {
            lat: parseFloat(String(formData.lat)) || 0,
            lng: parseFloat(String(formData.lng)) || 0,
          },
          extra: hasExtra ? extraPayload : null,
        }),
        apiPut(`/api/locations/${location.id}/tags`, { tagIds: formData.tagIds }),
        apiPut(`/api/locations/${location.id}/pois`, { pois: formData.poiLinks }),
      ]);

      clearDraft();
      setIsDirty(false);
      resetValidation();
      setSaveMessage({ type: "success", text: "保存成功！正在跳转..." });
      setTimeout(() => {
        window.location.href = `/locations/${locationId}`;
      }, 800);
    } catch (err) {
      setSaveMessage({ type: "error", text: (err as Error).message || "保存失败，请重试" });
    } finally {
      setIsSaving(false);
    }
  };

  // 放弃更改
  const handleDiscard = () => {
    if (!location) return;
    if (!window.confirm("确定放弃所有未保存的更改？")) return;
    setFormData({
      name: location.name,
      type: location.type ?? "",
      subtitle: location.subtitle ?? "",
      description: location.description,
      address: location.address ?? "",
      cityId: location.cityId,
      bestSeason: normalizeSeasons(location.bestSeason ?? []),
      coverImage: location.coverImage,
      images: location.images ?? [],
      lat: location.coordinates?.lat ?? "",
      lng: location.coordinates?.lng ?? "",
      extra: {
        facilities: (location.extra as any)?.facilities ?? [],
        tips: Array.isArray((location.extra as any)?.tips) ? (location.extra as any)?.tips : [],
        warnings: Array.isArray((location.extra as any)?.warnings) ? (location.extra as any)?.warnings : [],
      },
      tagIds: formData.tagIds,
      poiLinks: formData.poiLinks,
    });
    clearDraft();
    setIsDirty(false);
    resetValidation();
    setSaveMessage(null);
  };

  // 恢复草稿
  const handleRestoreDraft = () => {
    if (pendingDraft) {
      setFormData(pendingDraft);
      setIsDirty(true);
    }
    setShowDraftBanner(false);
    setPendingDraft(null);
  };

  // 放弃草稿
  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftBanner(false);
    setPendingDraft(null);
  };

  // 计算进度步骤
  const progressSteps = [
    { id: "core", label: copy.admin.progressStep1, done: !!formData.name && !!formData.description },
    { id: "location", label: copy.admin.progressStep2, done: !!formData.cityId },
    { id: "media", label: copy.admin.progressStep3, done: !!formData.coverImage },
    { id: "finish", label: copy.admin.progressStep4, done: !!formData.name && !!formData.description && !!formData.cityId && !!formData.coverImage },
  ];

  // 当前城市名（用于预览）
  const currentCityName = React.useMemo(
    () => cities.find((c) => c.id === formData.cityId)?.name ?? "",
    [cities, formData.cityId]
  );

  // ── 加载中 ──
  if (isLoading) return <EditSkeleton />;

  return (
    <div className="min-h-screen pb-24" style={{ background: "#FAF7F4" }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ── 顶部导航 ── */}
        <div className="flex items-center justify-between mb-6">
          <a
            href={`/locations/${locationId}`}
            className="inline-flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
            style={{ color: "#8B6E5A" }}
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.common.back}
          </a>

          {/* 移动端预览切换 */}
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="lg:hidden flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-600 transition-colors"
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? "关闭预览" : "预览效果"}
          </button>
        </div>

        {/* ── 标题 ── */}
        <div className="flex items-center gap-2 mb-6">
          <span className="w-1.5 h-6 rounded-full" style={{ background: "#D97706" }} />
          <h1 className="text-xl font-bold" style={{ color: "#1e1812" }}>
            {copy.admin.editLocation}
          </h1>
        </div>

        {/* ── 进度指示器 ── */}
        <div className="mb-8 px-2">
          <EditProgressBar steps={progressSteps} />
        </div>

        {/* ── 草稿恢复横幅 ── */}
        {showDraftBanner && (
          <div className="mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <p className="text-sm text-amber-800">
              🗒 {copy.admin.draftRestorePrompt}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="text-xs text-amber-600 hover:text-amber-800 transition-colors"
              >
                {copy.admin.draftDiscardBtn}
              </button>
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="text-xs font-semibold px-3 py-1 rounded-lg text-white transition-colors"
                style={{ background: "#D97706" }}
              >
                {copy.admin.draftRestoreBtn}
              </button>
            </div>
          </div>
        )}

        {/* ── 保存结果消息 ── */}
        {saveMessage && (
          <div
            className="mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
            style={{
              background: saveMessage.type === "success" ? "#F0FDF4" : "#FEF2F2",
              color: saveMessage.type === "success" ? "#166534" : "#991B1B",
              border: `1px solid ${saveMessage.type === "success" ? "#BBF7D0" : "#FECACA"}`,
            }}
          >
            {saveMessage.type === "success" ? (
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
              </svg>
            )}
            {saveMessage.text}
          </div>
        )}

        {/* ── 主内容：双栏布局 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">

          {/* ── 左栏：编辑表单 ── */}
          <div className={cn("space-y-4", showPreview && "hidden lg:block")}>

            {/* 基本信息 */}
            <SectionCard
              icon={<FileText className="h-4 w-4" />}
              title="基本信息"
            >
              <Field label={copy.admin.formNameRequired} required error={errors.name}>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  onBlur={(e) => touch("name", e.target.value)}
                  placeholder="例如：梧桐山风景区"
                  className={cn(styledInput(!!errors.name), "bg-stone-50 text-stone-900")}
                  style={{ background: "#FAF7F4", color: "#1e1812" }}
                />
              </Field>

              <Field label={copy.admin.formSubtitle}>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  placeholder={copy.admin.placeholderSubtitle}
                  className={cn(styledInput(), "bg-stone-50 text-stone-900")}
                  style={{ background: "#FAF7F4", color: "#1e1812" }}
                />
              </Field>

              <Field label="地点类型">
                <div className="flex flex-wrap gap-2">
                  {LOCATION_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField("type", formData.type === opt.value ? "" : opt.value)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-sm font-medium transition-all",
                        formData.type === opt.value
                          ? "bg-stone-800 text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field
                label={copy.admin.formDescriptionRequired}
                required
                error={errors.description}
                hint={`已写 ${formData.description.length} 字 · 建议 100-500 字`}
              >
                <div className="relative">
                  <textarea
                    rows={6}
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    onBlur={(e) => touch("description", e.target.value)}
                    className={cn(
                      styledInput(!!errors.description),
                      "resize-none leading-relaxed"
                    )}
                    style={{ background: "#FAF7F4", color: "#1e1812" }}
                  />
                  {/* 字数指示条 */}
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5">
                    <div className="h-1 w-16 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          formData.description.length < 50 ? "bg-stone-300"
                          : formData.description.length < 100 ? "bg-amber-400"
                          : "bg-emerald-400"
                        )}
                        style={{ width: `${Math.min((formData.description.length / 500) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] tabular-nums",
                      formData.description.length > 450 ? "text-amber-500" : "text-stone-300"
                    )}>
                      {formData.description.length}
                    </span>
                  </div>
                </div>
              </Field>
            </SectionCard>

            {/* 位置信息 */}
            <SectionCard
              icon={<MapPin className="h-4 w-4" />}
              title="位置信息"
            >
              <Field label={copy.admin.formCity} required error={errors.cityId}>
                <CitySelect
                  value={formData.cityId}
                  onChange={(id) => {
                    updateField("cityId", id);
                    touch("cityId", id);
                  }}
                  cities={cities}
                  error={errors.cityId}
                />
              </Field>

              <Field label={copy.admin.formAddress}>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="例如：广东省深圳市盐田区"
                  className={cn(styledInput(), "text-stone-900")}
                  style={{ background: "#FAF7F4", color: "#1e1812" }}
                />
              </Field>

              <Field
                label={copy.admin.formCoordinates}
                hint={copy.admin.coordinatesHelp}
              >
                <div className="flex items-end gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-stone-400 mb-1">{copy.admin.latLabel}</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.lat}
                        onChange={(e) => updateField("lat", e.target.value)}
                        onBlur={(e) => touch("lat", e.target.value)}
                        placeholder="22.5619"
                        className={cn(styledInput(!!errors.lat), "text-stone-900")}
                        style={{ background: "#FAF7F4", color: "#1e1812" }}
                      />
                      {errors.lat && <p className="text-xs text-red-500 mt-1">{errors.lat}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-400 mb-1">{copy.admin.lngLabel}</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.lng}
                        onChange={(e) => updateField("lng", e.target.value)}
                        onBlur={(e) => touch("lng", e.target.value)}
                        placeholder="114.1985"
                        className={cn(styledInput(!!errors.lng), "text-stone-900")}
                        style={{ background: "#FAF7F4", color: "#1e1812" }}
                      />
                      {errors.lng && <p className="text-xs text-red-500 mt-1">{errors.lng}</p>}
                    </div>
                  </div>

                  {/* 地图选点按钮 */}
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    title="地图选点"
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors"
                    style={{
                      borderColor: "#D97706",
                      color: "#D97706",
                      background: "rgba(217,119,6,0.05)",
                    }}
                  >
                    <Map className="h-4 w-4" />
                    <span className="hidden sm:inline">地图选点</span>
                  </button>
                </div>
              </Field>
            </SectionCard>

            {/* 地图选点弹窗 */}
            {showMapPicker && (
              <MapPickerModal
                initialLat={formData.lat}
                initialLng={formData.lng}
                onConfirm={(address, lat, lng) => {
                  updateField("address", address);
                  updateField("lat", lat);
                  updateField("lng", lng);
                  setShowMapPicker(false);
                }}
                onClose={() => setShowMapPicker(false)}
              />
            )}

            {/* 封面与季节 */}
            <SectionCard
              icon={<ImageIcon className="h-4 w-4" />}
              title="封面与季节"
            >
              <Field label={copy.admin.formCoverImageRequired} hint="可上传新图，或从下方相册选择">
                <CoverImageUpload
                  value={formData.coverImage}
                  onChange={(url) => updateField("coverImage", url)}
                  disabled={isSaving}
                />
              </Field>

              <Field
                label="相册图片"
                hint="点击图片可设为封面"
              >
                <MultiImageUpload
                  values={formData.images}
                  onChange={(urls) => updateField("images", urls)}
                  max={9}
                  disabled={isSaving}
                  coverImage={formData.coverImage}
                  onSetCover={(url) => updateField("coverImage", url)}
                />
              </Field>

              <Field label={copy.admin.formBestSeason} hint={copy.admin.seasonSelectHint}>
                <SeasonPicker
                  value={formData.bestSeason}
                  onChange={(v) => updateField("bestSeason", v)}
                  disabled={isSaving}
                />
              </Field>
            </SectionCard>

            {/* 高级设置（可折叠） */}
            <SectionCard
              icon={<Settings className="h-4 w-4" />}
              title="高级设置"
              collapsible
              defaultOpen={false}
              badge={
                <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">可选</span>
              }
            >
              {/* ── 配套设施 ── */}
              <Field label="配套设施">
                <div className="flex flex-wrap gap-2">
                  {FACILITY_OPTIONS.map((f) => {
                    const selected = formData.extra.facilities.includes(f.value);
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => {
                          const next = selected
                            ? formData.extra.facilities.filter((v) => v !== f.value)
                            : [...formData.extra.facilities, f.value];
                          updateField("extra", { ...formData.extra, facilities: next });
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                          selected
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-white text-stone-600 border-stone-200 hover:border-amber-300"
                        )}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* ── 徒步贴士 ── */}
              <Field label="徒步贴士">
                <div className="space-y-2">
                  {formData.extra.tips.map((tip, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tip}
                        onChange={(e) => {
                          const next = [...formData.extra.tips];
                          next[idx] = e.target.value;
                          updateField("extra", { ...formData.extra, tips: next });
                        }}
                        placeholder="如：建议早上登山，避开人流高峰"
                        className={cn(styledInput(), "flex-1")}
                        style={{ background: "#FAF7F4", color: "#1e1812" }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = formData.extra.tips.filter((_, i) => i !== idx);
                          updateField("extra", { ...formData.extra, tips: next });
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {formData.extra.tips.length < 10 && (
                    <button
                      type="button"
                      onClick={() => updateField("extra", { ...formData.extra, tips: [...formData.extra.tips, ""] })}
                      className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      添加贴士
                    </button>
                  )}
                </div>
              </Field>

              {/* ── 安全警告 ── */}
              <Field label="安全警告">
                <div className="space-y-2">
                  {formData.extra.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={w}
                        onChange={(e) => {
                          const next = [...formData.extra.warnings];
                          next[idx] = e.target.value;
                          updateField("extra", { ...formData.extra, warnings: next });
                        }}
                        placeholder="如：悬崖路段注意安全，勿靠近边缘"
                        className={cn(styledInput(), "flex-1")}
                        style={{ background: "#FAF7F4", color: "#1e1812" }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = formData.extra.warnings.filter((_, i) => i !== idx);
                          updateField("extra", { ...formData.extra, warnings: next });
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {formData.extra.warnings.length < 10 && (
                    <button
                      type="button"
                      onClick={() => updateField("extra", { ...formData.extra, warnings: [...formData.extra.warnings, ""] })}
                      className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      添加警告
                    </button>
                  )}
                </div>
              </Field>

              {/* ── 关联标签 ── */}
              <Field label="关联标签" hint="选择与该地点相关的标签">
                {allTags.length === 0 ? (
                  <p className="text-xs text-stone-400">暂无可用标签</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => {
                      const selected = formData.tagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            const next = selected
                              ? formData.tagIds.filter((id) => id !== tag.id)
                              : [...formData.tagIds, tag.id];
                            updateField("tagIds", next);
                          }}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                            selected
                              ? "bg-amber-500 text-white border-amber-500"
                              : "bg-white text-stone-600 border-stone-200 hover:border-amber-300"
                          )}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Field>

              {/* ── 关联打卡点 ── */}
              <Field label="关联打卡点" hint="搜索并添加该地点的打卡点">
                {/* 搜索框 + 新建按钮 */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                    <input
                      type="text"
                      value={poiSearch}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPoiSearch(v);
                        if (!v.trim()) { setPoiSearchResults([]); return; }
                        const q = v.toLowerCase();
                        setPoiSearchResults(
                          allPois
                            .filter((p) => p.name.toLowerCase().includes(q))
                            .slice(0, 8)
                        );
                      }}
                      placeholder={copy.pois.searchPlaceholder}
                      className={cn(styledInput(), "pl-9")}
                      style={{ background: "#FAF7F4", color: "#1e1812" }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCreatePoi}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 transition-opacity shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{copy.pois.createBtn}</span>
                  </button>
                </div>
                {/* 搜索结果 */}
                {poiSearchResults.length > 0 && (
                  <div className="mb-2 rounded-xl border border-stone-100 overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    {poiSearchResults.map((poi) => {
                      const already = formData.poiLinks.some((l) => l.poiId === poi.id);
                      return (
                        <button
                          key={poi.id}
                          type="button"
                          disabled={already}
                          onClick={() => {
                            if (already) return;
                            updateField("poiLinks", [
                              ...formData.poiLinks,
                              { poiId: poi.id, roleType: "poi", order: formData.poiLinks.length },
                            ]);
                            setPoiSearch("");
                            setPoiSearchResults([]);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-left border-b border-stone-50 last:border-b-0 transition-colors",
                            already ? "opacity-40 cursor-not-allowed" : "hover:bg-amber-50"
                          )}
                        >
                          <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <p className="text-sm text-stone-800 font-medium truncate">{poi.name}</p>
                          {already && <span className="ml-auto text-xs text-stone-400 shrink-0">{copy.pois.alreadyAdded}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* 已关联列表 */}
                {formData.poiLinks.length === 0 ? (
                  <p className="text-xs text-stone-400">{copy.pois.noResults}</p>
                ) : (
                  <div className="space-y-2">
                    {formData.poiLinks.map((link, idx) => {
                      const poi = allPois.find((p) => p.id === link.poiId);
                      return (
                        <div key={link.poiId} className="px-3 py-2 rounded-xl bg-stone-50 border border-stone-100">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="flex-1 text-sm text-stone-700 truncate">{poi?.name ?? link.poiId}</span>
                            {/* 编辑按钮 */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditPoi(link.poiId)}
                              className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-amber-500 hover:bg-amber-50 transition-colors shrink-0"
                              title={copy.pois.editBtn}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {/* 删除按钮 */}
                            <button
                              type="button"
                              onClick={() => handleOpenDeletePoi(link.poiId, poi?.name ?? link.poiId)}
                              className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                              title={copy.pois.deleteBtn}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            {/* 角色选择 */}
                            <select
                              value={link.roleType}
                              onChange={(e) => {
                                const next = [...formData.poiLinks];
                                next[idx] = { ...next[idx], roleType: e.target.value };
                                updateField("poiLinks", next);
                              }}
                              className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white text-stone-600 outline-none focus:border-amber-400 shrink-0"
                            >
                              {POI_ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                            {/* 解除关联按钮 */}
                            <button
                              type="button"
                              onClick={() => updateField("poiLinks", formData.poiLinks.filter((_, i) => i !== idx))}
                              className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                              title={copy.pois.unlinkBtn}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Field>
            </SectionCard>

            {/* 移动端保存按钮（粘性栏未展示时的备选） */}
            {!isDirty && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)" }}
              >
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {copy.admin.saving}</>
                ) : (
                  copy.admin.save
                )}
              </button>
            )}
          </div>

          {/* ── 右栏：实时预览 ── */}
          <div className={cn(showPreview ? "block" : "hidden", "lg:block")}>
            <PreviewPanel data={formData} cityName={currentCityName} />
          </div>
        </div>
      </div>

      <Footer />

      {/* ── 粘性底部操作栏 ── */}
      <StickyActionBar
        isDirty={isDirty}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      {/* ── POI 编辑弹窗 ── */}
      <PoiEditModal
        mode={poiModalMode}
        open={poiModalOpen}
        onClose={() => { setPoiModalOpen(false); setEditingPoi(null); }}
        onSuccess={handlePoiModalSuccess}
        initialData={editingPoi}
      />

      {/* ── POI 删除确认弹窗 ── */}
      <PoiDeleteConfirm
        open={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setDeletingPoi(null); }}
        onConfirm={handleConfirmDeletePoi}
        poiName={deletingPoi?.name ?? ""}
        associationCount={deletingPoiAssociations}
        isDeleting={isDeletingPoi}
      />
    </div>
  );
}
