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
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadLocations = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/locations");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.locations) {
          setLocations(result.locations);
        }
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

  const getLocationById = React.useCallback((id: string) => {
    return locations.find((loc) => loc.id === id);
  }, [locations]);

  const refreshLocations = React.useCallback(async () => {
    await loadLocations();
  }, [loadLocations]);

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
