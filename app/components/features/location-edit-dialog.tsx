"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
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
  tips: "",
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
        tips: location.extra?.tips || "",
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
        extra: {
          tips: formData.tips || null,
        },
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">{a.formAddress}</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coordinates">{a.formCoordinates}</Label>
              <Input
                id="coordinates"
                value={formData.coordinates}
                onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                placeholder={a.placeholderCoordinates}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tips">{a.formTips}</Label>
            <Textarea
              id="tips"
              value={formData.tips}
              onChange={(e) => setFormData({ ...formData, tips: e.target.value })}
              rows={2}
              placeholder={a.placeholderTips}
            />
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
