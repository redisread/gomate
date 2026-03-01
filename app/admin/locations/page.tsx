"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";

interface Location {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  description: string;
  difficulty: string;
  duration: string;
  distance: string;
  elevation: string | null;
  coverImage: string;
  bestSeason: string;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
}

const difficultyOptions = [
  { value: "easy", label: "简单" },
  { value: "moderate", label: "中等" },
  { value: "hard", label: "困难" },
  { value: "expert", label: "专家" },
];

const defaultFormData = {
  name: "",
  slug: "",
  subtitle: "",
  description: "",
  difficulty: "easy",
  duration: "",
  distance: "",
  elevation: "",
  coverImage: "",
  bestSeason: "",
  tags: "",
  address: "",
  coordinates: "",
  routeDescription: "",
  tips: "",
};

export default function AdminLocationsPage() {
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // 表单相关状态
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingLocation, setEditingLocation] = React.useState<Location | null>(null);
  const [formData, setFormData] = React.useState(defaultFormData);

  // 删除确认对话框状态
  const [deleteTarget, setDeleteTarget] = React.useState<Location | null>(null);

  // 加载地点列表
  const loadLocations = React.useCallback(async () => {
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations);
      }
    } catch (error) {
      console.error("加载地点列表失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // 打开创建表单
  const openCreateForm = () => {
    setEditingLocation(null);
    setFormData(defaultFormData);
    setIsFormOpen(true);
  };

  // 打开编辑表单
  const openEditForm = async (location: Location) => {
    setEditingLocation(location);
    // 获取完整数据
    try {
      const res = await fetch(`/api/locations/${location.id}`);
      const data = await res.json();
      if (data.success) {
        const loc = data.location;
        setFormData({
          name: loc.name || "",
          slug: loc.slug || "",
          subtitle: loc.subtitle || "",
          description: loc.description || "",
          difficulty: loc.difficulty || "easy",
          duration: loc.duration || "",
          distance: loc.distance || "",
          elevation: loc.elevation || "",
          coverImage: loc.coverImage || "",
          bestSeason: Array.isArray(loc.bestSeason) ? loc.bestSeason.join(", ") : (loc.bestSeason || ""),
          tags: Array.isArray(loc.tags) ? loc.tags.join(", ") : (loc.tags || ""),
          address: loc.address || "",
          coordinates: loc.coordinates ? JSON.stringify(loc.coordinates) : "",
          routeDescription: loc.routeDescription || "",
          tips: loc.tips || "",
        });
      }
    } catch (error) {
      console.error("获取地点详情失败:", error);
    }
    setIsFormOpen(true);
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = {
        ...(editingLocation ? { id: editingLocation.id } : {}),
        name: formData.name,
        slug: formData.slug || undefined,
        subtitle: formData.subtitle || null,
        description: formData.description,
        difficulty: formData.difficulty,
        duration: formData.duration,
        distance: formData.distance,
        elevation: formData.elevation || null,
        coverImage: formData.coverImage,
        bestSeason: formData.bestSeason.split(",").map(s => s.trim()).filter(Boolean),
        tags: formData.tags ? formData.tags.split(",").map(s => s.trim()).filter(Boolean) : null,
        address: formData.address || null,
        coordinates: formData.coordinates ? JSON.parse(formData.coordinates) : { lat: 0, lng: 0 },
        routeDescription: formData.routeDescription || null,
        tips: formData.tips || null,
        images: [],
      };

      const res = await fetch("/api/locations", {
        method: editingLocation ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();

      if (data.success) {
        setIsFormOpen(false);
        loadLocations();
      } else {
        alert(data.error || "操作失败");
      }
    } catch (error) {
      console.error("提交失败:", error);
      alert("操作失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除地点
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/locations/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        setDeleteTarget(null);
        loadLocations();
      } else {
        alert(data.error || "删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      alert("删除失败，请重试");
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    return difficultyOptions.find(d => d.value === difficulty)?.label || difficulty;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">地点管理</h1>
          <p className="text-stone-500 mt-1">管理所有徒步地点信息</p>
        </div>
        <Button onClick={openCreateForm} className="bg-stone-800 hover:bg-stone-700">
          <Plus className="h-4 w-4 mr-2" />
          新增地点
        </Button>
      </div>

      {/* 地点列表表格 */}
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">名称</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">难度</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">时长</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">距离</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">创建时间</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">更新时间</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-stone-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {locations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                  暂无地点数据
                </td>
              </tr>
            ) : (
              locations.map((location) => (
                <tr key={location.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {location.coverImage && (
                        <img
                          src={location.coverImage}
                          alt={location.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium text-stone-800">{location.name}</div>
                        {location.subtitle && (
                          <div className="text-xs text-stone-500">{location.subtitle}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 text-xs rounded ${
                      location.difficulty === "easy" ? "bg-green-100 text-green-700" :
                      location.difficulty === "moderate" ? "bg-yellow-100 text-yellow-700" :
                      location.difficulty === "hard" ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {getDifficultyLabel(location.difficulty)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{location.duration || "-"}</td>
                  <td className="px-4 py-3 text-stone-600">{location.distance || "-"}</td>
                  <td className="px-4 py-3 text-stone-500 text-sm">
                    {location.createdAt ? new Date(location.createdAt).toLocaleDateString("zh-CN") : "-"}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-sm">
                    {location.updatedAt ? new Date(location.updatedAt).toLocaleDateString("zh-CN") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditForm(location)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteTarget(location)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 新增/编辑表单对话框 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "编辑地点" : "新增地点"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug（留空自动生成）</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="如: wutong-mountain"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">副标题</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="如: 深圳第二高峰"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述 *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">难度 *</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">时长 *</Label>
                <Input
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="如: 4-5小时"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="distance">距离 *</Label>
                <Input
                  id="distance"
                  value={formData.distance}
                  onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                  placeholder="如: 8.5公里"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="elevation">海拔</Label>
                <Input
                  id="elevation"
                  value={formData.elevation}
                  onChange={(e) => setFormData({ ...formData, elevation: e.target.value })}
                  placeholder="如: 869米"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bestSeason">最佳季节（逗号分隔）</Label>
                <Input
                  id="bestSeason"
                  value={formData.bestSeason}
                  onChange={(e) => setFormData({ ...formData, bestSeason: e.target.value })}
                  placeholder="如: 春季, 秋季"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>封面图片 *</Label>
              <ImageUpload
                value={formData.coverImage}
                onChange={(url) => setFormData({ ...formData, coverImage: url })}
                uploadEndpoint="/api/upload/location"
                maxSize={10}
                hint="点击上传封面图片"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tags">标签（逗号分隔）</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="如: 海景, 山峰, 摄影"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">地址</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coordinates">坐标（JSON 格式）</Label>
              <Input
                id="coordinates"
                value={formData.coordinates}
                onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                placeholder='{"lat": 22.5, "lng": 114.1}'
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="routeDescription">路线描述</Label>
              <Textarea
                id="routeDescription"
                value={formData.routeDescription}
                onChange={(e) => setFormData({ ...formData, routeDescription: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tips">徒步贴士</Label>
              <Textarea
                id="tips"
                value={formData.tips}
                onChange={(e) => setFormData({ ...formData, tips: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-stone-800 hover:bg-stone-700">
                {isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除地点「{deleteTarget?.name}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}