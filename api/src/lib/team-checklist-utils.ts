/**
 * task #163：Team「行动本」checklist 工具函数（api 内共享）
 *
 * spec：notes/gomate-p0a-team-actionbook-spec.md v1.1 §2
 *
 * 目前只放 parseChecklist：checklist.ts / queries.ts 都要读 DB checklist，
 * driver 层 JSON 兜底逻辑只需一处，未来若 D1 driver 行为变化只改这里。
 */

import type { TeamChecklist } from "@gomate/types";

/**
 * DB 里 checklist 可能是 JSON 字符串（driver 不同表现不同）；统一 parse 成对象。
 * null / undefined / 空串 / 无效 JSON → 一律返回 null（视为「未填」）。
 */
export function parseChecklist(raw: unknown): TeamChecklist | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TeamChecklist;
    } catch {
      return null;
    }
  }
  return raw as TeamChecklist;
}
