"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Share2,
  Flag,
  Calendar,
  Clock,
  MapPin,
  Edit,
  Trash2,
} from "lucide-react";
import { ShareTeamDialog } from "@/components/features/share-team-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { dissolveTeam } from "@/app/actions/teams";
import type { Team, Location } from "@/lib/types";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

interface TeamHeaderProps {
  team: Team;
  location: Location;
  isLeader?: boolean;
  className?: string;
}

function TeamHeader({ team, location, isLeader = false, className }: TeamHeaderProps) {
  const router = useRouter();
  const [isShareOpen, setIsShareOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const statusConfig = {
    recruiting: { label: "招募中", color: "bg-emerald-100 text-emerald-700" },
    full: { label: "已满员", color: "bg-amber-100 text-amber-700" },
    formed: { label: "已组建", color: "bg-blue-100 text-blue-700" },
    completed: { label: "已完成", color: "bg-stone-100 text-stone-500" },
    cancelled: { label: "已取消", color: "bg-stone-100 text-stone-500" },
  };

  const status = statusConfig[team.status as keyof typeof statusConfig] || statusConfig.recruiting;

  // 处理删除队伍
  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      await dissolveTeam(team.id);
      router.push("/teams");
    } catch (error) {
      console.error("删除队伍失败:", error);
      alert(error instanceof Error ? error.message : copy.teams.deleteTeamFailed);
      setIsDeleting(false);
    }
  };

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
          <div className="flex items-center gap-2">
            {isLeader && team.status !== "cancelled" && (
              <>
                <Link href={`/teams/${team.id}/edit`}>
                  <Button variant="outline" size="sm" className="text-sm">
                    <Edit className="h-4 w-4 mr-1" />
                    {copy.teams.editBtn}
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="text-sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      {copy.teams.deleteTeam}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除队伍？</AlertDialogTitle>
                      <AlertDialogDescription>
                        {copy.teams.deleteTeamConfirm}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isDeleting ? "删除中..." : "确认删除"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            <button
              onClick={() => setIsShareOpen(!isShareOpen)}
              className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              aria-label="分享"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
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
