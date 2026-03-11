"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Copy, Share2, Download, QrCode, Link2, ImageIcon, Mountain, MapPin, Calendar, Clock, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import * as htmlToImage from "html-to-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import type { Team, Location } from "@/lib/types";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface ShareTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
  location: Location;
}

// 难度映射
const difficultyMap: Record<string, string> = {
  easy: "简单",
  moderate: "中等",
  hard: "困难",
  expert: "极难",
};

// 格式化日期
function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function ShareTeamDialog({
  open,
  onOpenChange,
  team,
  location,
}: ShareTeamDialogProps) {
  const { showToast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const qrCodeRef = React.useRef<HTMLDivElement>(null);
  const posterRef = React.useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  // 生成分享链接
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/teams/${team.id}`
      : "";

  // 复制链接
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(copy.share.linkCopied);
    } catch {
      inputRef.current?.select();
      document.execCommand("copy");
      showToast(copy.share.linkCopied);
    }
  };

  // 原生分享（移动端）
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${team.title} - GoMate`,
          text: `${copy.share.inviteText}：${team.title}`,
          url: shareUrl,
        });
      } catch {
        // 用户取消分享或分享失败，不做处理
      }
    }
  };

  // 下载二维码
  const handleDownloadQRCode = () => {
    const svg = qrCodeRef.current?.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgRect = svg.getBoundingClientRect();
    const size = Math.max(svgRect.width, svgRect.height, 200);
    canvas.width = size;
    canvas.height = size;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      const link = document.createElement("a");
      link.download = `team-${team.id}-qrcode.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  };

  // 生成并下载海报
  const handleGeneratePoster = async () => {
    if (!posterRef.current) return;

    setIsGenerating(true);
    try {
      // 等待二维码渲染完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataUrl = await htmlToImage.toPng(posterRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = `team-${team.id}-poster.png`;
      link.href = dataUrl;
      link.click();

      showToast(copy.share.posterDownloaded);
    } catch (error) {
      console.error("生成海报失败:", error);
      showToast(copy.share.generatePosterFailed);
    } finally {
      setIsGenerating(false);
    }
  };

  // 是否支持原生分享
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      onClick={() => onOpenChange(false)}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" />

      {/* 弹窗内容 */}
      <div
        className={cn(
          "relative w-full max-w-md bg-white rounded-xl shadow-xl",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-900">
            {copy.share.title}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-4 py-4 space-y-4">
          {/* 队伍信息 */}
          <div className="space-y-1">
            <p className="font-medium text-stone-900">{team.title}</p>
            <p className="text-sm text-stone-500">{location.name}</p>
          </div>

          {/* 标签页切换 */}
          <Tabs defaultValue="link" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="link" className="gap-1.5">
                <Link2 className="h-4 w-4" />
                {copy.share.tabLink}
              </TabsTrigger>
              <TabsTrigger value="qrcode" className="gap-1.5">
                <QrCode className="h-4 w-4" />
                {copy.share.tabQRCode}
              </TabsTrigger>
              <TabsTrigger value="poster" className="gap-1.5">
                <ImageIcon className="h-4 w-4" />
                海报
              </TabsTrigger>
            </TabsList>

            {/* 链接分享 */}
            <TabsContent value="link" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm text-stone-600">{copy.share.shareLinkLabel}</label>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={shareUrl}
                    readOnly
                    className="flex-1 text-sm"
                    onClick={() => inputRef.current?.select()}
                  />
                  <Button onClick={handleCopyLink} variant="outline" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button onClick={handleCopyLink} className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  {copy.share.copyLink}
                </Button>
                {canNativeShare && (
                  <Button onClick={handleNativeShare} variant="outline" className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    {copy.share.shareVia}
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* 二维码分享 */}
            <TabsContent value="qrcode" className="space-y-4 mt-4">
              <div className="flex justify-center py-4">
                <div
                  ref={qrCodeRef}
                  className="p-4 bg-white rounded-lg border border-stone-200"
                >
                  <QRCodeSVG
                    value={shareUrl}
                    size={180}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#1c1917"
                  />
                </div>
              </div>
              <p className="text-sm text-stone-500 text-center">
                {copy.share.scanToJoin}
              </p>
              <Button
                onClick={handleDownloadQRCode}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {copy.share.downloadQRCode}
              </Button>
            </TabsContent>

            {/* 海报分享 */}
            <TabsContent value="poster" className="space-y-4 mt-4">
              {/* 海报预览 */}
              <div className="flex justify-center">
                <div
                  ref={posterRef}
                  className="w-[280px] bg-gradient-to-b from-stone-50 to-stone-100 rounded-xl overflow-visible shadow-xl"
                  style={{ aspectRatio: "3/4" }}
                >
                  {/* 顶部装饰条 - 品牌色渐变 */}
                  <div className="h-1.5 bg-gradient-to-r from-stone-800 via-stone-600 to-stone-800" />

                  {/* 内容区域 */}
                  <div className="px-4 py-3 flex flex-col h-full">
                    {/* 头部 Logo */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center shadow-sm">
                        <Mountain className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-stone-800">GoMate</span>
                        <p className="text-[9px] text-stone-500">发现深圳最美徒步路线</p>
                      </div>
                    </div>

                    {/* 地点标签 */}
                    <div className="mb-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-200/70 rounded-full text-[11px] text-stone-700 font-medium">
                        <MapPin className="w-3 h-3" />
                        {location.name}
                      </span>
                    </div>

                    {/* 队伍标题 - 突出显示 */}
                    <div className="bg-white/70 rounded-lg p-2 mb-2 shadow-sm border border-stone-100">
                      <p className="text-[9px] text-stone-400 mb-0.5">徒步组队</p>
                      <h3 className="text-base font-bold text-stone-900 line-clamp-2 leading-snug">
                        {team.title}
                      </h3>
                    </div>

                    {/* 信息列表 - 紧凑布局 */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded bg-white flex items-center justify-center shadow-sm">
                          <Calendar className="w-3 h-3 text-stone-500" />
                        </div>
                        <div>
                          <p className="text-[9px] text-stone-400">出发日期</p>
                          <p className="text-xs font-semibold text-stone-800">{formatDate(team.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded bg-white flex items-center justify-center shadow-sm">
                          <Clock className="w-3 h-3 text-stone-500" />
                        </div>
                        <div>
                          <p className="text-[9px] text-stone-400">集合时间</p>
                          <p className="text-xs font-semibold text-stone-800">{team.time || "待定"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded bg-white flex items-center justify-center shadow-sm">
                          <Users className="w-3 h-3 text-stone-500" />
                        </div>
                        <div>
                          <p className="text-[9px] text-stone-400">队伍人数</p>
                          <p className="text-xs font-semibold text-stone-800">{team.currentMembers}/{team.maxMembers}人</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded bg-white flex items-center justify-center shadow-sm">
                          <Mountain className="w-3 h-3 text-stone-500" />
                        </div>
                        <div>
                          <p className="text-[9px] text-stone-400">难度等级</p>
                          <p className="text-xs font-semibold text-stone-800">{difficultyMap[team.difficulty || "moderate"] || "中等"}</p>
                        </div>
                      </div>
                    </div>

                    {/* 分隔线 */}
                    <div className="border-t border-stone-200/80 my-1" />

                    {/* 二维码区域 - 放大并突出 */}
                    <div className="flex flex-col items-center">
                      <div className="p-1 bg-white rounded-lg shadow-md border border-stone-100">
                        <QRCodeSVG
                          value={shareUrl}
                          size={88}
                          level="H"
                          bgColor="#ffffff"
                          fgColor="#1c1917"
                        />
                      </div>
                      <p className="text-xs text-stone-600 font-semibold mt-0.5 leading-none">扫码加入队伍</p>
                      <p className="text-[10px] text-stone-400 leading-none">长按识别二维码</p>
                    </div>

                    {/* 底部品牌 */}
                    <div className="text-center mt-0.5">
                      <p className="text-[10px] text-stone-400 tracking-wide leading-none">gomate.jiahongw.com</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 下载按钮 */}
              <Button
                onClick={handleGeneratePoster}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    下载分享海报
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>,
    document.body
  );
}

export { ShareTeamDialog };
