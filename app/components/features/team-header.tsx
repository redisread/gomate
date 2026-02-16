"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Share2,
  Flag,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Team, Location } from "@/lib/data/mock";
import { cn } from "@/lib/utils";

interface TeamHeaderProps {
  team: Team;
  location: Location;
  className?: string;
}

function TeamHeader({ team, location, className }: TeamHeaderProps) {
  const [isShareOpen, setIsShareOpen] = React.useState(false);

  const statusConfig = {
    open: { label: "招募中", color: "bg-emerald-100 text-emerald-700" },
    full: { label: "已满员", color: "bg-amber-100 text-amber-700" },
    closed: { label: "已结束", color: "bg-stone-100 text-stone-500" },
  };

  const status = statusConfig[team.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("bg-white border-b border-stone-200", className)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/locations/${location.id}`}
            className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            返回地点
          </Link>
          <button
            onClick={() => setIsShareOpen(!isShareOpen)}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
            aria-label="分享"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        {/* Title Section */}
        <div className="space-y-4">
          {/* Status & Location */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("px-2.5 py-1 rounded-full text-sm font-medium", status.color)}>
              {status.label}
            </span>
            <Link
              href={`/locations/${location.id}`}
              className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 transition-colors"
            >
              <MapPin className="h-4 w-4" />
              {location.name}
            </Link>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
            {team.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-stone-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-stone-400" />
              <span>{team.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-stone-400" />
              <span>{team.time} 出发</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flag className="h-4 w-4 text-stone-400" />
              <span>预计{team.duration}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export { TeamHeader };
