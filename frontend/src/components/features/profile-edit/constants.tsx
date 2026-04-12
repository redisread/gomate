import * as React from "react";
import { User, FileText, MapPin, MessageCircle, Mail, Loader2, Camera, X, Check, ArrowLeft } from "lucide-react";
import { copy } from "@/lib/copy";

export const LEVEL_OPTIONS = [
  { value: "beginner", emoji: "🌱", label: copy.enums.level.beginner, description: copy.enums.levelDesc.beginner },
  { value: "intermediate", emoji: "⛰️", label: copy.enums.level.intermediate, description: copy.enums.levelDesc.intermediate },
  { value: "advanced", emoji: "🏔️", label: copy.enums.level.advanced, description: copy.enums.levelDesc.advanced },
  { value: "expert", emoji: "🦅", label: copy.enums.level.expert, description: copy.enums.levelDesc.expert },
] as const;

export const PRESET_EQUIPMENT = [
  "登山杖", "冲锋衣", "登山包", "徒步鞋", "护膝",
  "头灯", "睡袋", "帐篷", "防潮垫", "水壶",
  "防晒霜", "墨镜", "雨衣", "帽子", "手套",
] as const;

export const inputCls =
  "w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-600 " +
  "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all";

export const SECTION_ICONS = {
  basic: FileText,
  outdoor: MapPin,
  contact: MessageCircle,
  account: Mail,
  avatar: User,
} as const;

export type MessageState = { type: "success" | "error"; text: string } | null;
