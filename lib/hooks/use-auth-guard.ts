"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/**
 * 未登录自动重定向守卫
 * 在需要登录的页面顶层调用，未登录时自动跳转到 redirectTo
 */
export function useAuthGuard(redirectTo = "/login") {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);
}
