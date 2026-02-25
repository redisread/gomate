"use client";

import * as React from "react";
import type { Location } from "@/lib/types";

interface LocationsContextType {
  locations: Location[];
  isLoading: boolean;
  getLocationById: (id: string) => Location | undefined;
  refreshLocations: () => Promise<void>;
}

const LocationsContext = React.createContext<LocationsContextType | undefined>(undefined);

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  // Default locations data
  const defaultLocations: Location[] = React.useMemo(() => [
    {
      id: "qiniangshan",
      name: "七娘山",
      slug: "qiniangshan",
      subtitle: "深圳第二高峰",
      description: "七娘山位于大鹏半岛南端，是深圳第二高峰，主峰海拔869米。山势险峻、雄伟，山中奇峰异石、岩洞、山泉、密林交相辉映。",
      coverImage: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&h=600&fit=crop",
      images: [
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
      ],
      difficulty: "hard" as const,
      duration: "6-8小时",
      distance: "12公里",
      elevation: "869米",
      bestSeason: ["春季", "秋季", "冬季"],
      tags: ["海景", "山峰", "摄影", "挑战"],
      location: {
        address: "深圳市大鹏新区南澳街道",
        coordinates: { lat: 22.4523, lng: 114.5321 },
      },
      routeGuide: {
        overview: "七娘山环线是经典徒步路线，从地质公园出发，经主峰后从另一侧下山，全程约12公里。",
        waypoints: [
          { name: "地质公园入口", description: "起点，有停车场和洗手间", distance: "0km" },
          { name: "一号观景台", description: "可远眺大鹏湾", distance: "2.5km" },
          { name: "七娘山主峰", description: "深圳第二高峰，360度海景", distance: "5km" },
          { name: "三角山", description: "次高峰，视野开阔", distance: "7km" },
          { name: "杨梅坑方向出口", description: "终点，可乘坐公交返回", distance: "12km" },
        ],
        tips: ["建议携带登山杖", "山顶风大，记得带防风外套", "全程无补给，需自备充足水和食物"],
        warnings: ["雷雨天气严禁登山", "部分路段无手机信号", "不要独自前往，建议组队"],
      },
      facilities: { parking: true, restroom: true, water: false, food: false } as const,
      routeDescription: "七娘山环线是经典徒步路线，从地质公园出发，经主峰后从另一侧下山，全程约12公里。",
      waypoints: [],
      warnings: [],
      tips: "",
    },
  ], []);

  // Use default locations as initial state, then update from API if available
  const [locations, setLocations] = React.useState<Location[]>(defaultLocations);
  const [isLoading, setIsLoading] = React.useState(false);

  // Load locations from API on mount
  React.useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/locations", { signal: controller.signal });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.locations && result.locations.length > 0) {
            setLocations(result.locations);
          }
        }
      } catch (err) {
        console.error("[LocationsProvider] Error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const getLocationById = React.useCallback((id: string) => {
    return locations.find((loc) => loc.id === id);
  }, [locations]);

  const refreshLocations = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/locations");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.locations) {
          setLocations(result.locations);
        }
      }
    } catch (err) {
      console.error("[LocationsProvider] Refresh error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <LocationsContext.Provider value={{ locations, isLoading, getLocationById, refreshLocations }}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  const context = React.useContext(LocationsContext);
  if (context === undefined) {
    throw new Error("useLocations must be used within a LocationsProvider");
  }
  return context;
}
