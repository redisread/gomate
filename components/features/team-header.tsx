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
import { ShareTeamDialog } from "@/components/features/share-team-dialog";
import type { Team, Location } from "@/lib/types";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

interface TeamHeaderProps {
  team: Team;
  location: Location;
  className?: string;
}

function TeamHeader({ team, location, className }: TeamHeaderProps) {
  const [isShareOpen, setIsShareOpen] = React.useState(false);

  const statusConfig = {
    recruiting: { label: copy.enums.teamStatus.recruiting, color: "bg-emerald-100 text-emerald-700" },
    full: { label: copy.enums.teamStatus.full, color: "bg-amber-100 text-amber-700" },
    formed: { label: copy.enums.teamStatus.formed, color: "bg-blue-100 text-blue-700" },
    completed: { label: copy.enums.teamStatus.completed, color: "bg-stone-100 text-stone-500" },
    cancelled: { label: copy.enums.teamStatus.cancelled, color: "bg-stone-100 text-stone-500" },
  };

  const status = statusConfig[team.status] || statusConfig.recruiting;

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
            {copy.teams.backToLocation}
          </Link>
          <button
            onClick={() => setIsShareOpen(true)}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
            aria-label={copy.teams.shareLabel}
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
              <span>{team.time} {copy.teams.departureSuffix}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flag className="h-4 w-4 text-stone-400" />
              <span>{copy.teams.estimatedPrefix}{team.duration}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <ShareTeamDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        team={team}
        location={location}
      />
    </motion.div>
  );
}

export { TeamHeader };
