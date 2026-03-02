"use client";

import { AuthProvider } from "@/lib/auth-context";
import { LocationsProvider } from "@/lib/locations-context";
import { TeamsProvider } from "@/lib/teams-context";
import { MobileMenuProvider } from "@/lib/mobile-menu-context";
import { ToastProvider } from "@/components/ui/toast";

console.log("[Providers] Rendering...");

export function AppProviders({ children }: { children: React.ReactNode }) {
  console.log("[AppProviders] Rendering...");
  return (
    <AuthProvider>
      <LocationsProvider>
        <TeamsProvider>
          <MobileMenuProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </MobileMenuProvider>
        </TeamsProvider>
      </LocationsProvider>
    </AuthProvider>
  );
}
