/**
 * Team「行动本」通知钩子。
 *
 * - 当前只保留 emit 点与 payload 类型定义
 * - 不接入真实推送渠道（Web Push / 小程序订阅消息 P1 单独立项）
 * - 实现层用 logger.info 落审计线索，供未来通知能力消费
 * - Cloudflare Workers 冷启动敏感，emit 保持同步纯函数（无 IO）
 */

import { logger } from "./logger";
import type { TeamActionbookEvent } from "@/contracts";

/**
 * emit 一个 Team「行动本」相关事件。
 *
 * MVP：仅日志落审计，不异步分发。
 * 后续通知能力可在此点接入 Web Push、队列或其他异步渠道。
 * 调用方保持同步语义（不 await），避免影响主请求延迟。
 */
export function emitTeamActionbookEvent(event: TeamActionbookEvent): void {
  // structured log：字段稳定，方便 P1 立项时按事件类型回填推送逻辑
  logger.info("team_actionbook_event_emitted", event);
}
