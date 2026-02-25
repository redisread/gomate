"use client";

import { AuthProvider } from "@/lib/auth-context";
import { LocationsProvider } from "@/lib/locations-context";
import { TeamsProvider } from "@/lib/teams-context";

console.log("[Providers] Rendering...");

export function AppProviders({ children }: { children: React.ReactNode }) {
  console.log("[AppProviders] Rendering...");
  return (
    <AuthProvider>
      <LocationsProvider>
        <TeamsProvider>
          {children}
        </TeamsProvider>
      </LocationsProvider>
    </AuthProvider>
  );
}
