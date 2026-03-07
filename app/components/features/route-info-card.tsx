"use client";

import { Route } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { difficultyLabels } from "@/lib/constants";

interface RouteInfoCardProps {
  route: Route;
}

export function RouteInfoCard({ route }: RouteInfoCardProps) {
  const difficulty = difficultyLabels[route.difficulty];

  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">路线信息</h3>

        <div className="space-y-4">
          {/* 难度 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-20">难度等级</span>
            <Badge className={difficulty.color}>{difficulty.label}</Badge>
          </div>

          {/* 预计用时 */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground w-16">预计用时</span>
            <span className="text-sm font-medium">{route.duration}</span>
          </div>

          {/* 路线长度 */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground w-16">路线长度</span>
            <span className="text-sm font-medium">{route.distance}</span>
          </div>

          {/* 累计爬升 */}
          {route.elevation && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground w-16">累计爬升</span>
              <span className="text-sm font-medium">{route.elevation}</span>
            </div>
          )}
        </div>
      </div>

      {/* 建议装备 */}
      {route.equipmentNeeded && route.equipmentNeeded.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">建议装备</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {route.equipmentNeeded.map((item, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 警告提示 */}
      {route.warnings && route.warnings.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h4 className="text-sm font-medium text-orange-500">注意事项</h4>
          </div>
          <ul className="space-y-2">
            {route.warnings.map((warning, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-orange-500 mt-0.5">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 路线标签 */}
      {route.tags && route.tags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">路线标签</h4>
          <div className="flex flex-wrap gap-2">
            {route.tags.map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
