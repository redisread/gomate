"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Navigation,
  Mountain,
  ParkingCircle,
  Camera,
  MapPin,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// POI 角色类型
interface RoutePoi {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  coordinates: { lat: number; lng: number };
  images?: string[];
  extra?: Record<string, any> | null;
  order?: number | null;
  roleType: "waypoint" | "checkpoint" | "viewpoint" | "facility" | "poi";
  roleSpecificData?: Record<string, any> | null;
}

interface RoutePoiListProps {
  pois: RoutePoi[];
  className?: string;
}

// 类别图标映射
const categoryIconMap: Record<string, React.ElementType> = {
  mountain_peak: Mountain,
  waterfall: Navigation,
  viewpoint: Mountain,
  parking: ParkingCircle,
  restroom: ParkingCircle,
  restaurant: ParkingCircle,
  store: ParkingCircle,
  checkpoint: Camera,
  trail_marker: Navigation,
  rest_area: ParkingCircle,
  other: MapPin,
};

// 类别中文名称
const categoryNameMap: Record<string, string> = {
  mountain_peak: "山峰",
  waterfall: "瀑布",
  viewpoint: "观景台",
  parking: "停车场",
  restroom: "洗手间",
  restaurant: "餐厅",
  store: "商店",
  checkpoint: "打卡点",
  trail_marker: "路标",
  rest_area: "休息区",
  other: "其他",
};

export function RoutePoiList({ pois, className }: RoutePoiListProps) {
  // 按角色类型分组
  const groupedPois = React.useMemo(() => {
    const groups: Record<string, RoutePoi[]> = {
      waypoint: [],
      viewpoint: [],
      facility: [],
      checkpoint: [],
      poi: [],
    };

    pois.forEach((poi) => {
      if (groups[poi.roleType]) {
        groups[poi.roleType].push(poi);
      } else {
        groups.poi.push(poi);
      }
    });

    // 对途径点按 order 排序
    groups.waypoint.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return groups;
  }, [pois]);

  // 计算总 POI 数
  const totalPois = pois.length;

  if (totalPois === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 text-muted-foreground">
            <Info className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">暂无 POI 信息</p>
              <p className="text-xs mt-1">该路线尚未添加途径点或兴趣点</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={cn("space-y-6", className)}
    >
      {/* 途径点（有序）- 暂不展示，等待数据完善 */}
      {/* {groupedPois.waypoint.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              途径点
              <Badge variant="secondary" className="ml-2">
                {groupedPois.waypoint.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="relative pl-4">
              <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" />
              <ul className="space-y-4">
                {groupedPois.waypoint.map((poi, index) => (
                  <li key={poi.id} className="relative flex items-start gap-3">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-medium border-2 border-background">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="font-medium text-sm">{poi.name}</p>
                      {poi.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {poi.description}
                        </p>
                      )}
                      {poi.roleSpecificData?.instructions && (
                        <p className="text-xs text-blue-600 mt-1">
                          {poi.roleSpecificData.instructions}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* 观景点 */}
      {groupedPois.viewpoint.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Mountain className="h-5 w-5 text-emerald-600" />
              观景点
              <Badge variant="secondary" className="ml-2">
                {groupedPois.viewpoint.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3">
              {groupedPois.viewpoint.map((poi) => (
                <li key={poi.id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Mountain className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{poi.name}</p>
                    {poi.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {poi.description}
                      </p>
                    )}
                    {poi.roleSpecificData?.viewDescription && (
                      <p className="text-xs text-emerald-600 mt-1">
                        {poi.roleSpecificData.viewDescription}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 设施点 */}
      {groupedPois.facility.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ParkingCircle className="h-5 w-5 text-amber-600" />
              沿途设施
              <Badge variant="secondary" className="ml-2">
                {groupedPois.facility.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3">
              {groupedPois.facility.map((poi) => (
                <li key={poi.id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    {poi.category && categoryIconMap[poi.category] ? (
                      React.createElement(categoryIconMap[poi.category], {
                        className: "h-4 w-4",
                      })
                    ) : (
                      <ParkingCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{poi.name}</p>
                      {poi.category && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {categoryNameMap[poi.category] || poi.category}
                        </Badge>
                      )}
                    </div>
                    {poi.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {poi.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 打卡点 */}
      {groupedPois.checkpoint.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Camera className="h-5 w-5 text-purple-600" />
              打卡点
              <Badge variant="secondary" className="ml-2">
                {groupedPois.checkpoint.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3">
              {groupedPois.checkpoint.map((poi) => (
                <li key={poi.id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{poi.name}</p>
                    {poi.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {poi.description}
                      </p>
                    )}
                    {poi.roleSpecificData?.isPopular && (
                      <Badge className="mt-1 bg-purple-100 text-purple-700 hover:bg-purple-100">
                        热门打卡点
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 其他兴趣点 */}
      {groupedPois.poi.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-600" />
              其他兴趣点
              <Badge variant="secondary" className="ml-2">
                {groupedPois.poi.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3">
              {groupedPois.poi.map((poi) => (
                <li key={poi.id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{poi.name}</p>
                    {poi.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {poi.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
