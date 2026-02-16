"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Award,
  Mountain,
  Star,
  MessageCircle,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Team, leaderLevelLabels } from "@/lib/data/mock";
import { cn } from "@/lib/utils";

interface LeaderCardProps {
  team: Team;
  className?: string;
}

const levelColors: Record<string, string> = {
  beginner: "bg-stone-100 text-stone-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-purple-100 text-purple-700",
  expert: "bg-amber-100 text-amber-700",
};

const levelStars: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

function LeaderCard({ team, className }: LeaderCardProps) {
  const { leader } = team;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={cn("border-stone-200", className)}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-stone-600" />
            领队信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Leader Profile */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-stone-100">
              <AvatarImage src={leader.avatar} />
              <AvatarFallback className="text-lg">
                {leader.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-stone-900">
                  {leader.name}
                </h3>
                <Badge
                  className={cn(
                    "text-xs",
                    levelColors[leader.level]
                  )}
                >
                  {leaderLevelLabels[leader.level]}
                </Badge>
              </div>

              {/* Level Stars */}
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < levelStars[leader.level]
                        ? "text-amber-400 fill-amber-400"
                        : "text-stone-200"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl text-center">
              <div className="flex items-center justify-center gap-1 text-stone-500 mb-1">
                <Mountain className="h-4 w-4" />
                <span className="text-xs">带队次数</span>
              </div>
              <p className="text-xl font-bold text-stone-900">
                {leader.completedHikes}
              </p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl text-center">
              <div className="flex items-center justify-center gap-1 text-stone-500 mb-1">
                <Award className="h-4 w-4" />
                <span className="text-xs">好评率</span>
              </div>
              <p className="text-xl font-bold text-stone-900">98%</p>
            </div>
          </div>

          {/* Bio */}
          <div className="p-4 bg-stone-50 rounded-xl">
            <p className="text-sm text-stone-600 leading-relaxed">
              {leader.bio}
            </p>
          </div>

          {/* Contact Button */}
          <Button
            variant="outline"
            className="w-full border-stone-300 hover:bg-stone-50"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            联系领队
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export { LeaderCard };
