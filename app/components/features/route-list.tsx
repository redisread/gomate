"use client";

import { useState } from "react";
import { Route } from "@/lib/types";
import { RouteCard } from "./route-card";
import { Badge } from "@/components/ui/badge";

interface RouteListProps {
  locationId: string;
  routes: Route[];
  locationName?: string;
  showFilters?: boolean;
  onRouteSelect?: (routeId: string) => void;
}

type DifficultyFilter = "all" | "easy" | "moderate" | "hard" | "expert";

const difficultyFilters: { value: DifficultyFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "easy", label: "简单" },
  { value: "moderate", label: "中等" },
  { value: "hard", label: "困难" },
  { value: "expert", label: "专家" },
];

export function RouteList({
  locationId,
  routes,
  locationName,
  showFilters = true,
  onRouteSelect,
}: RouteListProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>("all");

  const filteredRoutes =
    selectedDifficulty === "all"
      ? routes
      : routes.filter((route) => route.difficulty === selectedDifficulty);

  if (routes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">暂无路线信息</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          路线列表 <span className="text-muted-foreground text-lg">({routes.length})</span>
        </h2>
      </div>

      {showFilters && routes.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">难度筛选:</span>
          {difficultyFilters.map((filter) => (
            <Badge
              key={filter.value}
              variant={selectedDifficulty === filter.value ? "default" : "outline"}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setSelectedDifficulty(filter.value)}
            >
              {filter.label}
            </Badge>
          ))}
        </div>
      )}

      {filteredRoutes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">没有符合条件的路线</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRoutes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              locationName={locationName}
              showCreateTeamButton={true}
              onSelect={onRouteSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
