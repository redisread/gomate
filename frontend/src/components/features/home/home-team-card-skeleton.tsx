export function TeamCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-card animate-pulse">
      {/* 封面图骨架 */}
      <div className="relative h-36 bg-muted" />

      {/* 内容区域骨架 */}
      <div className="p-4 pb-10 sm:pb-4">
        {/* 地点名称骨架 */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <div className="w-3 h-3 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="ml-auto w-16 h-5 rounded-full bg-muted" />
        </div>

        {/* 标题骨架 */}
        <div className="h-4 w-3/4 rounded bg-muted mb-2" />

        {/* 日期和时间骨架 */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-muted" />
            <div className="h-3 w-12 rounded bg-muted" />
          </div>
        </div>

        {/* 分隔线 */}
        <div className="h-px mb-3 bg-border/30" />

        {/* 队长和成员骨架 */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="ml-auto flex items-center gap-2">
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-muted border-2 border-card" />
              <div className="w-7 h-7 rounded-full bg-muted border-2 border-card" />
              <div className="w-7 h-7 rounded-full bg-muted border-2 border-card" />
            </div>
          </div>
        </div>
      </div>

      {/* 底部按钮骨架 */}
      <div className="sm:absolute bottom-0 left-0 right-0 h-10 bg-muted/50" />
    </div>
  );
}
