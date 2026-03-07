"use client";

import * as React from "react";
import type { Location } from "@/lib/types";

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface LocationsContextType {
  locations: Location[];
  isLoading: boolean;
  pagination: PaginationInfo;
  getLocationById: (id: string) => Location | undefined;
  fetchLocations: (params?: FetchLocationsParams) => Promise<void>;
  refreshLocations: () => Promise<void>;
}

interface FetchLocationsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  cityId?: string;
  tagIds?: string[];
}

const LocationsContext = React.createContext<LocationsContextType | undefined>(undefined);

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [pagination, setPagination] = React.useState<PaginationInfo>({
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0,
  });

  // 当前查询参数缓存（用于刷新）
  const currentParamsRef = React.useRef<FetchLocationsParams>({});

  // 加载地点列表（支持分页）
  const fetchLocations = React.useCallback(async (params: FetchLocationsParams = {}) => {
    // 保存当前参数用于刷新
    currentParamsRef.current = { ...currentParamsRef.current, ...params };

    const {
      page = 1,
      pageSize = 12,
      search = "",
      cityId = "",
      tagIds = [],
    } = currentParamsRef.current;

    setIsLoading(true);

    try {
      // 构建查询参数
      const queryParams = new URLSearchParams();
      queryParams.set("page", page.toString());
      queryParams.set("pageSize", pageSize.toString());
      if (search) queryParams.set("search", search);
      if (cityId) queryParams.set("cityId", cityId);
      if (tagIds.length > 0) queryParams.set("tagIds", tagIds.join(","));

      const response = await fetch(`/api/locations?${queryParams.toString()}`);

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLocations(result.locations || []);
          if (result.pagination) {
            setPagination(result.pagination);
          }
        }
      } else {
        console.error("[LocationsProvider] Failed to fetch locations:", response.status);
      }
    } catch (err) {
      console.error("[LocationsProvider] Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  React.useEffect(() => {
    fetchLocations({ page: 1, pageSize: 200 });
  }, [fetchLocations]);

  const getLocationById = React.useCallback((id: string) => {
    return locations.find((loc) => loc.id === id);
  }, [locations]);

  const refreshLocations = React.useCallback(async () => {
    await fetchLocations(currentParamsRef.current);
  }, [fetchLocations]);

  return (
    <LocationsContext.Provider
      value={{
        locations,
        isLoading,
        pagination,
        getLocationById,
        fetchLocations,
        refreshLocations,
      }}
    >
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
