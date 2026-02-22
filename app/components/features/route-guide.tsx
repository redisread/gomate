"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Flag,
  AlertTriangle,
  Lightbulb,
  Footprints,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { Location } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RouteGuideProps {
  location: Location;
  className?: string;
}

function RouteGuide({ location, className }: RouteGuideProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={cn("space-y-6", className)}
    >
      {/* Overview */}
      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Footprints className="h-5 w-5 text-stone-600" />
            路线概览
          </CardTitle>
          <CardDescription>{location.routeGuide.overview}</CardDescription>
        </CardHeader>
      </Card>

      {/* Waypoints */}
      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-stone-600" />
            途经点
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-stone-200" />

            {/* Waypoints */}
            <div className="space-y-6">
              {location.routeGuide.waypoints.map((waypoint, index) => (
                <motion.div
                  key={waypoint.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                  className="relative pl-10"
                >
                  {/* Timeline Dot */}
                  <div
                    className={cn(
                      "absolute left-2 top-1 w-4 h-4 rounded-full border-2 -translate-x-1/2",
                      index === 0
                        ? "bg-emerald-500 border-emerald-500"
                        : index === location.routeGuide.waypoints.length - 1
                        ? "bg-red-500 border-red-500"
                        : "bg-white border-stone-300"
                    )}
                  >
                    {index === 0 && (
                      <Flag className="h-2.5 w-2.5 text-white absolute inset-0 m-auto" />
                    )}
                    {index === location.routeGuide.waypoints.length - 1 && (
                      <Flag className="h-2.5 w-2.5 text-white absolute inset-0 m-auto" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-stone-900">
                        {waypoint.name}
                      </h4>
                      <p className="text-sm text-stone-500 mt-0.5">
                        {waypoint.description}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                      {waypoint.distance}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            温馨提示
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {location.routeGuide.tips.map((tip, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-stone-600"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Warnings */}
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-red-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            安全须知
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {location.routeGuide.warnings.map((warning, index) => (
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
    </motion.div>
  );
}

export { RouteGuide };
