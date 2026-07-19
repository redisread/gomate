/**
 * task #163 T5：Team「行动本」通知钩子（合并进 T1）
 *
 * spec：notes/gomate-p0a-team-actionbook-spec.md v1.1 §7
 * - 本 spec 只留 emit 点 + payload 类型定义
 * - 不接入真实推送渠道（Web Push / 小程序订阅消息 P1 单独立项）
 * - 实现层用 logger.info 落审计线索，方便 P1 立项时回读
 * - Cloudflare Workers 冷启动敏感，emit 保持同步纯函数（无 IO）
 */

import { logger } from "./logger";
import type { TeamActionbookEvent } from "@gomate/types";

/**
 * emit 一个 Team「行动本」相关事件。
 *
 * MVP：仅日志落审计，不异步分发。
 * P1：可在此点扩展接入 Web Push / KV 队列 / Durable Object 推送渠道。
 * 调用方保持同步语义（不 await），避免影响主请求延迟。
 */
export function emitTeamActionbookEvent(event: TeamActionbookEvent): void {
  // structured log：字段稳定，方便 P1 立项时按事件类型回填推送逻辑
  logger.info("[actionbook-event]", event);
}
