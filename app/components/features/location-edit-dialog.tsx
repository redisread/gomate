"use client";

import * as React from "react";
import { Loader2, Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import {
  searchAddress,
  parseAmapLocation,
  getAmapNavigateUrl,
  AmapGeocodeResult,
} from "@/lib/map-utils";

const a = copy.admin;

// 季节选项
const SEASONS = [
  { value: "春季", label: copy.admin.seasons.spring },
  { value: "夏季", label: copy.admin.seasons.summer },
  { value: "秋季", label: copy.admin.seasons.autumn },
  { value: "冬季", label: copy.admin.seasons.winter },
] as const;

interface Location {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  description: string;
  coverImage: string;
  images?: string[];
  bestSeason?: string[] | string;
  address?: string | null;
  cityId?: string | null;
  cityName?: string | null;
  coordinates?: { lat: number; lng: number } | null;
  extra?: {
    facilities?: string[];
    tips?: string;
    warnings?: string[];
  } | null;
}

interface LocationEditDialogProps {
  location: Location;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const defaultFormData = {
  name: "",
  slug: "",
  subtitle: "",
  description: "",
  coverImage: "",
  images: [] as string[],
  bestSeason: [] as string[],
  address: "",
  cityId: "",
  cityName: "",
  coordinates: "",
};

export function LocationEditDialog({
  location,
  open,
  onOpenChange,
  onSuccess,
}: LocationEditDialogProps) {
  const [formData, setFormData] = React.useState(defaultFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // 城市列表状态
  const [cities, setCities] = React.useState<Array<{id: string; name: string; province: string}>>([]);

  // 地址搜索状态
  const [searchResults, setSearchResults] = React.useState<AmapGeocodeResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showSearchResults, setShowSearchResults] = React.useState(false);

  // 加载城市列表
  React.useEffect(() => {
    fetch("/api/cities")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCities(data.cities);
        }
      })
      .catch(err => console.error("加载城市列表失败:", err));
  }, []);

  // 切换季节选择
  const toggleSeason = (season: string) => {
    setFormData(prev => {
      const current = prev.bestSeason as string[];
      const exists = current.includes(season);
      return {
        ...prev,
        bestSeason: exists
          ? current.filter(s => s !== season)
          : [...current, season],
      };
    });
  };

  // 执行地址搜索
  const handleSearchAddress = async () => {
    if (!formData.address.trim()) return;

    setIsSearching(true);
    setShowSearchResults(false);

    try {
      const results = await searchAddress(
        formData.address,
        formData.cityName || undefined
      );
      setSearchResults(results);
      setShowSearchResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  // 选择搜索结果
  const selectSearchResult = (result: AmapGeocodeResult) => {
    const coords = parseAmapLocation(result.location);
    if (coords) {
      setFormData(prev => ({
        ...prev,
        address: result.formatted_address,
        coordinates: JSON.stringify(coords),
      }));
    }
    setShowSearchResults(false);
  };

  // 在地图中查看坐标
  const viewOnMap = () => {
    if (!formData.coordinates) return;
    try {
      const coords = JSON.parse(formData.coordinates);
      if (coords.lat && coords.lng) {
        const url = getAmapNavigateUrl(coords, formData.name || "地点");
        window.open(url, "_blank");
      }
    } catch {
      // 无效的坐标格式
    }
  };

  // 当弹窗打开时，加载地点数据
  React.useEffect(() => {
    if (open && location) {
      setFormData({
        name: location.name || "",
        slug: location.slug || "",
        subtitle: location.subtitle || "",
        description: location.description || "",
        coverImage: location.coverImage || "",
        images: Array.isArray(location.images) ? location.images : [],
        bestSeason: Array.isArray(location.bestSeason)
          ? location.bestSeason
          : [],
        address: location.address || "",
        cityId: location.cityId || "",
        cityName: location.cityName || "",
        coordinates: location.coordinates
          ? JSON.stringify(location.coordinates)
          : "",
      });
    }
  }, [open, location]);

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = {
        id: location.id,
        name: formData.name,
        slug: formData.slug || undefined,
        subtitle: formData.subtitle || null,
        description: formData.description,
        coverImage: formData.coverImage,
        bestSeason: formData.bestSeason,
        address: formData.address || null,
        cityId: formData.cityId || null,
        cityName: formData.cityName || null,
        coordinates: formData.coordinates
          ? JSON.parse(formData.coordinates)
          : { lat: 0, lng: 0 },
        extra: {},
        images: formData.images,
      };

      const res = await fetch("/api/locations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();

      if (data.success) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        alert(data.error || a.operationFailed);
      }
    } catch (error) {
      console.error(a.submitFailed, error);
      alert(a.operationFailedRetry);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{a.editLocation}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{a.formNameRequired}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">{a.formSlug}</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder={a.placeholderSlug}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">{a.formSubtitle}</Label>
            <Input
              id="subtitle"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder={a.placeholderSubtitle}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{a.formDescriptionRequired}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{a.formBestSeason}</Label>
              <div className="flex flex-wrap gap-2">
                {SEASONS.map((season) => (
                  <button
                    key={season.value}
                    type="button"
                    onClick={() => toggleSeason(season.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm transition-colors",
                      (formData.bestSeason as string[]).includes(season.value)
                        ? "bg-stone-800 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    )}
                  >
                    {season.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cityName">{a.formCity}</Label>
              <Select
                value={formData.cityId}
                onValueChange={(value) => {
                  const selected = cities.find((c) => c.id === value);
                  setFormData({
                    ...formData,
                    cityId: selected ? selected.id : "",
                    cityName: selected?.name || "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={a.placeholderSelectCity} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name} ({city.province})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{a.formCoverImageRequired}</Label>
            <ImageUpload
              value={formData.coverImage}
              onChange={(url) => setFormData({ ...formData, coverImage: url })}
              uploadEndpoint="/api/upload/location"
              maxSize={10}
              hint={a.placeholderUploadCover}
            />
          </div>

          <div className="space-y-2">
            <Label>{a.formImages}</Label>
            <MultiImageUpload
              value={formData.images}
              onChange={(urls) => setFormData({ ...formData, images: urls })}
              uploadEndpoint="/api/upload/location"
              maxImages={9}
              maxSize={10}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{a.formAddress}</Label>
            <div className="flex gap-2">
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="输入地址后点击搜索"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearchAddress}
                disabled={isSearching || !formData.address.trim()}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-1" />
                )}
                搜索
              </Button>
            </div>

            {/* 搜索结果 */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="border rounded-md mt-2 overflow-hidden">
                <div className="bg-stone-50 px-3 py-2 text-xs text-stone-500 border-b">
                  搜索结果：
                </div>
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectSearchResult(result)}
                    className="w-full text-left px-3 py-2 hover:bg-stone-50 border-b last:border-b-0 text-sm"
                  >
                    <div className="font-medium text-stone-800">
                      {result.formatted_address}
                    </div>
                    <div className="text-xs text-stone-500">
                      {result.province} {result.city} {result.district}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showSearchResults && searchResults.length === 0 && !isSearching && (
              <div className="text-sm text-stone-500 mt-2">
                未找到相关地址，请尝试其他关键词
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coordinates">{a.formCoordinates}</Label>
              <Input
                id="coordinates"
                value={formData.coordinates}
                onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                placeholder={a.placeholderCoordinates}
              />
            </div>
            <div className="space-y-2 flex items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={viewOnMap}
                disabled={!formData.coordinates}
                className="text-stone-600"
              >
                <MapPin className="h-4 w-4 mr-1" />
                在地图中查看
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {a.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-stone-800 hover:bg-stone-700">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {a.saving}
                </>
              ) : (
                a.save
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
