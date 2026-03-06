"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Location, Route } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RouteGuideProps {
  location?: Location; // 兼容旧用法
  route?: Route; // 新用法
  locationName?: string; // 可选的地点名称
  className?: string;
}

function RouteGuide({ location, route, locationName, className }: RouteGuideProps) {
  // 优先使用 route，否则使用 location（兼容层）
  const routeData = route || location;

  if (!routeData?.routeGuide) {
    return null;
  }

  const { warnings = [] } = routeData.routeGuide;

  if (warnings.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={cn("space-y-6", className)}
    >
      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              安全须知
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {warnings.map((warning, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-red-700"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                  {warning}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

export { RouteGuide };
