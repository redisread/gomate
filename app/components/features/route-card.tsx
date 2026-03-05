"use client";

import Link from "next/link";
import { Route } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, TrendingUp } from "lucide-react";

interface RouteCardProps {
  route: Route;
  locationName?: string;
  variant?: "default" | "compact";
  showCreateTeamButton?: boolean;
  onSelect?: (routeId: string) => void;
}

const difficultyConfig = {
  easy: { label: "简单", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  moderate: { label: "中等", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  hard: { label: "困难", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  expert: { label: "专家", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

export function RouteCard({
  route,
  locationName,
  variant = "default",
  showCreateTeamButton = false,
  onSelect,
}: RouteCardProps) {
  const difficulty = difficultyConfig[route.difficulty];

  const handleSelect = () => {
    if (onSelect) {
      onSelect(route.id);
    }
  };

  if (variant === "compact") {
    return (
      <div
        className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleSelect}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium truncate">
                {locationName && <span className="text-muted-foreground">{locationName} - </span>}
                {route.name}
              </h3>
              <Badge className={difficulty.color}>{difficulty.label}</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {route.duration}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {route.distance}
              </span>
              {route.elevation && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {route.elevation}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-2">
              {locationName && <span className="text-muted-foreground text-base">{locationName} - </span>}
              {route.name}
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <Badge className={difficulty.color}>{difficulty.label}</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {route.duration}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {route.distance}
          </span>
          {route.elevation && (
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              {route.elevation}
            </span>
          )}
        </div>

        {route.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{route.description}</p>
        )}

        {route.tags && route.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {route.tags.slice(0, 5).map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/routes/${route.id}`}>查看详情</Link>
          </Button>
          {showCreateTeamButton && (
            <Button asChild className="flex-1">
              <Link href={`/teams/create?routeId=${route.id}`}>创建队伍</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
