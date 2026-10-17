import type { RouteConfig } from "../../lib/openapi";
import { z } from "../../lib/openapi";

/** 同名查询参数重复出现时只取第一个值，文档注释不得改变既有解析语义。 */
export const queryString = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.string().optional(),
);
export const TeamQuerySchema = z.object({
  limit: queryString.openapi({
    description: "每页条数，1–100 的整数，默认 12。",
  }),
  cursor: queryString.openapi({
    description: "上一页返回的 nextCursor；原样传回，不自行解析或构造。",
  }),
  regionId: queryString.describe("按地区 ID 筛选。"),
  locationId: queryString.describe("按地点全局 ID 筛选。"),
  activityType: queryString.openapi({
    description: "活动类型枚举值，忽略首尾空白。",
  }),
  recruitmentStatus: queryString.openapi({
    description: "招募状态：open（开放）或 closed（关闭），忽略首尾空白。",
  }),
  lifecycle: queryString.openapi({
    description:
      "生命周期：cancelled（已取消）、pending（待出发）、formed（已成团）、in_progress（进行中）、completed（已完成）、expired_unformed（过期未成团）。",
  }),
  search: queryString.openapi({
    description: "搜索关键词，去除首尾空白并截断至 100 字符。",
  }),
  tagIds: queryString.openapi({
    description:
      "逗号分隔的标签 ID，任一标签匹配即可；去空、去重后只取前 50 个。",
  }),
  startDateFrom: queryString.openapi({
    description:
      "开始日期下界（包含），接受 JavaScript Date 可解析的日期或时间；仅日期时从该日 UTC 零点开始。",
  }),
  startDateTo: queryString.openapi({
    description: "开始日期上界（包含）；仅日期时覆盖该日完整 UTC 日期。",
  }),
});

export const teamCookieSecurity: NonNullable<RouteConfig["security"]> = [
  { cookieAuth: [] },
  { secureCookieAuth: [] },
];
