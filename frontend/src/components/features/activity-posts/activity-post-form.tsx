"use client";

import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { fetchAPI } from "@/lib/api";
import { ImagePlus, X } from "lucide-react";

interface ActivityPostFormProps {
  teamId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function ActivityPostForm({ teamId, onSuccess, onCancel, className }: ActivityPostFormProps) {
  const { t } = useI18n(["teams"]);
  const [content, setContent] = React.useState("");
  const [images, setImages] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const maxContentLength = 200;
  const maxImages = 3;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxContentLength) {
      setContent(value);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      setError(t("teams.activityPosts.maxImagesError"));
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    try {
      for (const file of filesToUpload) {
        // Upload to R2 via existing upload API
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetchAPI("/upload/activity-post", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.url) {
          setImages((prev) => [...prev, data.url]);
        }
      }
    } catch {
      setError(t("teams.activityPosts.uploadError"));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError(t("teams.activityPosts.contentRequired"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetchAPI(`/teams/${teamId}/activity-posts`, {
        method: "POST",
        body: JSON.stringify({
          content: content.trim(),
          images,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setContent("");
        setImages([]);
        onSuccess?.();
      } else {
        setError(data.message || t("teams.activityPosts.submitError"));
      }
    } catch {
      setError(t("teams.activityPosts.submitError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Content textarea */}
      <div className="space-y-2">
        <textarea
          placeholder={t("teams.activityPosts.placeholder")}
          value={content}
          onChange={handleContentChange}
          rows={4}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{error && <span className="text-red-500">{error}</span>}</span>
          <span>
            {content.length}/{maxContentLength}
          </span>
        </div>
      </div>

      {/* Image preview */}
      {images.length > 0 && (
        <div className="flex gap-2">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image}
                alt={`Upload preview ${index + 1}`}
                className="w-20 h-20 object-cover rounded-lg"
              />
              <button
                onClick={() => handleRemoveImage(index)}
                className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {images.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            <ImagePlus className="h-4 w-4" />
            {t("teams.activityPosts.addImage")} ({images.length}/{maxImages})
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            {t("common.cancel")}
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? t("common.submitting") : t("teams.activityPosts.publish")}
        </button>
      </div>
    </div>
  );
}
