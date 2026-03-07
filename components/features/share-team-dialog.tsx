"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Copy, Share2, Download, QrCode, Link2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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

function ShareTeamDialog({
  open,
  onOpenChange,
  team,
  location,
}: ShareTeamDialogProps) {
  const { showToast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const qrCodeRef = React.useRef<HTMLDivElement>(null);

  // 生成分享链接
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/teams/${team.id}`
      : "";

  // 复制链接
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(copyText.share.linkCopied);
    } catch {
      // 降级方案：选中输入框内容
      inputRef.current?.select();
      document.execCommand("copy");
      showToast(copyText.share.linkCopied);
    }
  };

  // 原生分享（移动端）
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${team.title} - GoMate`,
          text: `${copyText.share.inviteText}：${team.title}`,
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

    // 创建 canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 获取 SVG 尺寸
    const svgRect = svg.getBoundingClientRect();
    const size = Math.max(svgRect.width, svgRect.height, 200);
    canvas.width = size;
    canvas.height = size;

    // 将 SVG 转换为图片
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      // 填充白色背景
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      // 绘制二维码
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      // 下载图片
      const link = document.createElement("a");
      link.download = `team-${team.id}-qrcode.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
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
            {copyText.share.title}
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link" className="gap-1.5">
                <Link2 className="h-4 w-4" />
                {copyText.share.tabLink}
              </TabsTrigger>
              <TabsTrigger value="qrcode" className="gap-1.5">
                <QrCode className="h-4 w-4" />
                {copyText.share.tabQRCode}
              </TabsTrigger>
            </TabsList>

            {/* 链接分享 */}
            <TabsContent value="link" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm text-stone-600">{copyText.share.shareLinkLabel}</label>
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
                  {copyText.share.copyLink}
                </Button>
                {canNativeShare && (
                  <Button onClick={handleNativeShare} variant="outline" className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    {copyText.share.shareVia}
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
                {copyText.share.scanToJoin}
              </p>
              <Button
                onClick={handleDownloadQRCode}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {copyText.share.downloadQRCode}
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