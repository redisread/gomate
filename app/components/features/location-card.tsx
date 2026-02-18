"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Clock, Route, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DifficultyBadge } from "@/app/components/ui/difficulty-badge";
import { Tag } from "@/app/components/ui/tag";
import { Location, getTeamsByLocationId } from "@/lib/data/mock";
import { cn } from "@/lib/utils";

interface LocationCardProps {
  location: Location;
  index?: number;
  className?: string;
  variant?: "default" | "compact" | "horizontal";
}

function LocationCard({
  location,
  index = 0,
  className,
  variant = "default",
}: LocationCardProps) {
  const teams = getTeamsByLocationId(location.id);
  const openTeams = teams.filter((t) => t.status === "open").length;

  if (variant === "horizontal") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
      >
        <Link href={`/locations/${location.id}`}>
          <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-stone-200">
            <div className="flex flex-col sm:flex-row">
              {/* Image */}
              <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 overflow-hidden">
                <Image
                  src={location.coverImage}
                  alt={location.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                <div className="absolute top-3 left-3">
                  <DifficultyBadge difficulty={location.difficulty} size="sm" />
                </div>
              </div>

              {/* Content */}
              <CardContent className="flex-1 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">
                      {location.name}
                    </h3>
                    <p className="text-sm text-stone-500 mt-1">
                      {location.subtitle}
                    </p>
                  </div>
                  {openTeams > 0 && (
                    <div className="flex items-center gap-1 text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      <Users className="h-3.5 w-3.5" />
                      {openTeams}个队伍
                    </div>
                  )}
                </div>

                <p className="text-sm text-stone-600 mt-3 line-clamp-2">
                  {location.description}
                </p>

                <div className="flex flex-wrap gap-2 mt-3">
                  {location.tags.slice(0, 3).map((tag) => (
                    <Tag key={tag} variant="subtle" color="default" size="sm">
                      {tag}
                    </Tag>
                  ))}
                </div>

                <div className="flex items-center gap-4 mt-4 text-sm text-stone-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {location.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <Route className="h-4 w-4" />
                    {location.distance}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {location.location.address.split("区")[0]}区
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </Link>
      </motion.div>
    );
  }

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
      >
        <Link href={`/locations/${location.id}`}>
          <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-stone-200">
            <div className="relative h-40 overflow-hidden">
              <Image
                src={location.coverImage}
                alt={location.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute top-3 left-3">
                <DifficultyBadge difficulty={location.difficulty} size="sm" />
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-lg font-semibold text-white">
                  {location.name}
                </h3>
                <p className="text-sm text-white/80">{location.subtitle}</p>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-sm text-stone-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {location.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Route className="h-4 w-4" />
                  {location.distance}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link href={`/locations/${location.id}`}>
        <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-stone-200 h-full">
          {/* Image */}
          <div className="relative h-52 overflow-hidden">
            <Image
              src={location.coverImage}
              alt={location.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized={location.coverImage.includes('gomate.cos.jiahongw.com')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              <DifficultyBadge difficulty={location.difficulty} size="sm" />
            </div>

            {/* Open Teams Badge */}
            {openTeams > 0 && (
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-sm font-medium text-stone-800">
                <Users className="h-3.5 w-3.5 text-emerald-600" />
                {openTeams}个队伍可加入
              </div>
            )}

            {/* Title Overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-xl font-bold text-white mb-1">
                {location.name}
              </h3>
              <p className="text-sm text-white/90">{location.subtitle}</p>
            </div>
          </div>

          {/* Content */}
          <CardContent className="p-5">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {location.tags.slice(0, 4).map((tag) => (
                <Tag key={tag} variant="subtle" color="default" size="sm">
                  {tag}
                </Tag>
              ))}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 text-stone-600">
                <div className="p-1.5 bg-stone-100 rounded-lg">
                  <Clock className="h-4 w-4 text-stone-500" />
                </div>
                <span>{location.duration}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-600">
                <div className="p-1.5 bg-stone-100 rounded-lg">
                  <Route className="h-4 w-4 text-stone-500" />
                </div>
                <span>{location.distance}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-600">
                <div className="p-1.5 bg-stone-100 rounded-lg">
                  <MapPin className="h-4 w-4 text-stone-500" />
                </div>
                <span className="truncate">{location.elevation}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export { LocationCard };
