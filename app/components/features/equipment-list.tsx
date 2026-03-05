"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Backpack } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EquipmentListProps {
  equipment: string[];
  className?: string;
}

// 装备分类关键词
const essentialKeywords = ['登山鞋', '背包', '水壶', '头灯', '急救'];
const recommendedKeywords = ['登山杖', '帽子', '防晒', '雨具', '手套'];

// 装备图标映射
const equipmentIcons: Record<string, string> = {
  '登山鞋': '🥾',
  '背包': '🎒',
  '水壶': '💧',
  '头灯': '💡',
  '急救包': '🏥',
  '急救': '🏥',
  '登山杖': '🥢',
  '帽子': '🧢',
  '防晒霜': '🧴',
  '防晒': '🧴',
  '雨具': '☂️',
  '手套': '🧤',
  '相机': '📷',
  '望远镜': '🔭',
  'GPS': '🧭',
  '食物': '🍱',
  '零食': '🍫',
  '手机': '📱',
  '充电宝': '🔋',
  '防风衣': '🧥',
  '冲锋衣': '🧥',
  '保暖衣': '🧥',
  '太阳镜': '🕶️',
  '墨镜': '🕶️',
  '防虫喷雾': '🦟',
  '毛巾': '🧻',
  '纸巾': '🧻',
  '口哨': '📣',
  '绳索': '🪢',
  '刀具': '🔪',
  '打火机': '🔥',
  '地图': '🗺️',
  '指南针': '🧭',
};

// 根据装备名称获取图标
function getEquipmentIcon(name: string): string {
  for (const [key, icon] of Object.entries(equipmentIcons)) {
    if (name.includes(key)) {
      return icon;
    }
  }
  return '📦'; // 默认图标
}

// 装备分类函数
function categorizeEquipment(items: string[]) {
  const essential: string[] = [];
  const recommended: string[] = [];
  const optional: string[] = [];

  items.forEach(item => {
    if (essentialKeywords.some(kw => item.includes(kw))) {
      essential.push(item);
    } else if (recommendedKeywords.some(kw => item.includes(kw))) {
      recommended.push(item);
    } else {
      optional.push(item);
    }
  });

  return { essential, recommended, optional };
}

export function EquipmentList({ equipment, className }: EquipmentListProps) {
  const { essential, recommended, optional } = React.useMemo(
    () => categorizeEquipment(equipment),
    [equipment]
  );

  // 如果没有装备数据，不显示
  if (equipment.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className={cn("space-y-6", className)}
    >
      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Backpack className="h-5 w-5 text-stone-600" />
            装备建议
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 必备装备 */}
          {essential.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-700 mb-3">必备装备</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {essential.map((item, index) => (
                  <motion.div
                    key={`essential-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 hover:border-red-200 transition-colors"
                  >
                    <span className="text-2xl">{getEquipmentIcon(item)}</span>
                    <span className="text-xs text-center text-red-800 font-medium">
                      {item}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* 推荐装备 */}
          {recommended.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-blue-700 mb-3">推荐装备</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recommended.map((item, index) => (
                  <motion.div
                    key={`recommended-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 hover:border-blue-200 transition-colors"
                  >
                    <span className="text-2xl">{getEquipmentIcon(item)}</span>
                    <span className="text-xs text-center text-blue-800 font-medium">
                      {item}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* 可选装备 */}
          {optional.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-3">可选装备</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {optional.map((item, index) => (
                  <motion.div
                    key={`optional-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200 hover:border-stone-300 transition-colors"
                  >
                    <span className="text-2xl">{getEquipmentIcon(item)}</span>
                    <span className="text-xs text-center text-stone-700 font-medium">
                      {item}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
