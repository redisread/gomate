"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Mountain,
  MessageCircle,
  Shield,
  Copy,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/types";
import { leaderLevelLabels } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";
import { getUserDisplayName } from "@/lib/user-utils";

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

function LeaderCard({ team, className }: LeaderCardProps) {
  const { leader } = team;
  const [copied, setCopied] = React.useState(false);

  const handleCopyWechat = async () => {
    if (leader.wechat) {
      await navigator.clipboard.writeText(leader.wechat);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
            {copy.teams.leaderInfoTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Leader Profile */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-stone-100">
              <AvatarImage src={leader.avatar} />
              <AvatarFallback className="text-lg">
                {getUserDisplayName(leader)[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-stone-900">
                  {getUserDisplayName(leader)}
                </h3>
                <Badge
                  className={cn(
                    "text-xs",
                    levelColors[leader.level]
                  )}
                >
                  {leaderLevelLabels[leader.level]}
                </Badge>
                <span className="flex items-center gap-1 text-sm text-stone-500">
                  <Mountain className="h-3.5 w-3.5" />
                  {leader.completedHikes}{copy.teams.leaderTripCountSuffix}
                </span>
              </div>
              {leader.bio && (
                <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                  {leader.bio}
                </p>
              )}
            </div>
          </div>

          {/* Contact Button */}
          {leader.wechat ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-stone-100 rounded-lg">
                <div>
                  <p className="text-xs text-stone-500">{copy.profile.wechat}</p>
                  <p className="font-medium text-stone-900">{leader.wechat}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyWechat}
                  className="h-8 w-8 p-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-stone-600" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-stone-400 text-center">
                {copy.teams.copyWechatHint}
              </p>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full border-stone-300 hover:bg-stone-50"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {copy.teams.contactLeader}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export { LeaderCard };
