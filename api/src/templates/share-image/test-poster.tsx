import satori from "satori";
import type { ReactNode } from "react";

interface TestTemplateData {
  title: string;
  subtitle: string;
  date: string;
  location: string;
  description: string;
  leaderName: string;
  membersInfo: string;
  fonts: Array<{
    name: string;
    data: ArrayBuffer;
    weight: number;
    style: string;
  }>;
}

// Satori 兼容的 JSX 元素类型
type SatoriElement = {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: SatoriElement | SatoriElement[] | string | number | null;
  } & Record<string, unknown>;
};

/**
 * Phase 1 测试模板
 * 渲染固定测试数据的 SVG
 * 尺寸：375x1000（与原前端海报一致）
 */
export async function renderTestTemplate(data: TestTemplateData): Promise<string> {
  const { title, subtitle, date, location, description, leaderName, membersInfo, fonts } = data;

  // 构建 Satori 兼容的元素树
  const element = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 375,
        height: 1000,
        background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
        padding: 24,
        boxSizing: "border-box",
        fontFamily: fonts.length > 0 ? "Zpix, Noto Sans SC, system-ui" : "system-ui",
      }}
    >
      {/* 标题区域 */}
      <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#92400e", margin: "0 0 8px 0", lineHeight: 1.3 }}>
          {title}
        </h1>
        <p style={{ fontSize: 16, color: "#b45309", margin: 0 }}>{subtitle}</p>
      </div>

      {/* 日期和地点 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 20,
          padding: 16,
          background: "rgba(255,255,255,0.6)",
          borderRadius: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>📅</span>
          <span style={{ fontSize: 14, color: "#57534e" }}>{date}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>📍</span>
          <span style={{ fontSize: 14, color: "#57534e" }}>{location}</span>
        </div>
      </div>

      {/* 描述 */}
      <div style={{ marginBottom: 20, padding: 16, background: "rgba(255,255,255,0.4)", borderRadius: 12 }}>
        <p style={{ fontSize: 14, color: "#44403c", lineHeight: 1.5, margin: 0 }}>{description}</p>
      </div>

      {/* 队长和成员信息 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: 20,
          padding: 16,
          background: "rgba(217, 119, 6, 0.1)",
          borderRadius: 12,
          border: "1px solid rgba(217, 119, 6, 0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>👤</span>
          <span style={{ fontSize: 14, color: "#92400e" }}>队长: {leaderName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>👥</span>
          <span style={{ fontSize: 14, color: "#92400e" }}>人数: {membersInfo}</span>
        </div>
      </div>

      {/* 二维码占位 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: "auto",
          padding: 20,
          background: "white",
          borderRadius: 16,
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            background: "#e7e5e4",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 12, color: "#78716c" }}>QR Code</span>
        </div>
        <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>扫码加入队伍</p>
      </div>

      {/* GoMate Logo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 }}>
        <span style={{ fontSize: 16 }}>⛰️</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>GoMate</span>
      </div>
    </div>
  );

  const svg = await satori(element, {
    width: 375,
    height: 1000,
    fonts: fonts.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900,
      style: f.style as "normal" | "italic",
    })),
  });

  return svg;
}
