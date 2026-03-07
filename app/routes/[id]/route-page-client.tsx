"use client";

import { Route } from "@/lib/types";
import { RouteInfoCard } from "@/app/components/features/route-info-card";
import { RouteGuide } from "@/app/components/features/route-guide";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, MapPin } from "lucide-react";
import Link from "next/link";
import { useTeams } from "@/lib/teams-context";
import { TeamCard } from "@/app/components/features/team-card";

interface RoutePageClientProps {
  route: Route;
}

export function RoutePageClient({ route }: RoutePageClientProps) {
  const { teams } = useTeams();
  const routeTeams = teams.filter((team) => team.routeId === route.id && team.status === "recruiting");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/locations/${route.locationId}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{route.name}</h1>
            </div>
          </div>

          {route.description && (
            <p className="text-muted-foreground max-w-3xl">{route.description}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Route Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Route Guide */}
            <RouteGuide route={route} locationName={route.location?.name} />

            {/* Teams using this route */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  该路线的队伍
                  <span className="text-muted-foreground text-lg">({routeTeams.length})</span>
                </h2>
              </div>

              {routeTeams.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">暂无队伍使用此路线</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {routeTeams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Route Info Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              <RouteInfoCard route={route} />

              {/* 关联地点卡片 */}
              {route.location && (
                <Link href={`/locations/${route.locationId}`}>
                  <div className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4" />
                      <span>所属地点</span>
                    </div>
                    <div className="font-semibold text-lg">{route.location.name}</div>
                    {route.location.subtitle && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {route.location.subtitle}
                      </div>
                    )}
                  </div>
                </Link>
              )}

              <Button className="w-full" size="lg" asChild>
                <Link href={`/teams/create?routeId=${route.id}`}>
                  <Users className="h-5 w-5 mr-2" />
                  创建队伍
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
