import { cn } from "@/lib/utils";
import type { TFunction } from "./story-detail-types";
import { CONTENT_WIDTH, SHELL_WIDTH } from "./story-detail-ui";

const STORY_SKELETON_LINES = ["w-full", "w-11/12", "w-4/5", "w-full", "w-2/3", "w-5/6"];

export function StoryDetailSkeleton({ t }: { t: TFunction }) {
  return (
    <div
      className="min-h-screen bg-background pb-16 pt-20 sm:pt-24"
      aria-busy="true"
      aria-label={t("content.discover.loading")}
    >
      <div className={SHELL_WIDTH}>
        <div className="mb-8 flex items-center justify-between">
          <div className="skeleton h-10 w-24 rounded-lg" />
          <div className="skeleton h-10 w-24 rounded-lg" />
        </div>
      </div>

      <div className={cn(CONTENT_WIDTH, "space-y-6")}>
        <div className="skeleton h-7 w-36 rounded-full" />
        <div className="space-y-3">
          <div className="skeleton h-10 w-full rounded" />
          <div className="skeleton h-10 w-4/5 rounded" />
        </div>
        <div className="space-y-2 border-l-2 border-border pl-4">
          <div className="skeleton h-5 w-full rounded" />
          <div className="skeleton h-5 w-2/3 rounded" />
        </div>
        <div className="flex items-center justify-between gap-4 border-y border-border/70 py-4">
          <div className="flex items-center gap-3">
            <div className="skeleton h-9 w-9 rounded-full" />
            <div className="space-y-2">
              <div className="skeleton h-4 w-28 rounded" />
              <div className="skeleton h-4 w-36 rounded" />
            </div>
          </div>
          <div className="hidden gap-3 sm:flex">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-4 w-20 rounded" />
          </div>
        </div>
      </div>

      <div className={cn(SHELL_WIDTH, "mt-8")}>
        <div className="skeleton aspect-[16/9] w-full rounded-lg" />
      </div>

      <div className={cn(CONTENT_WIDTH, "mt-10 space-y-4")}>
        {STORY_SKELETON_LINES.map((widthClass, index) => (
          <div key={`${widthClass}-${index}`} className={cn("skeleton h-4 rounded", widthClass)} />
        ))}
      </div>
    </div>
  );
}
