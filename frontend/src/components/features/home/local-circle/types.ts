/**
 * P0-D T2 (task #176) — 本地圈子模块类型
 *
 * spec: notes/gomate-p0d-local-circle-spec-v1.2.md §3.5 / §4
 * 与后端 api/src/services/local-circle.ts 的 interface 对齐（前端只读）。
 */

export interface TopLocation {
  locationId: string;
  locationName: string;
  locationCoverImage: string;
  visitScore: number;
  uniqueVisitors: number;
  avatarStack: string[];
}

export interface NeighborTeam {
  teamId: string;
  teamTitle: string;
  locationName: string;
  startTime: number;
  neighborCount: number;
  neighborAvatars: string[];
}

export interface LocalCircle {
  cityId: string;
  cityName: string;
  activePeopleCount: number;
  topLocations: TopLocation[];
  neighborTeams: NeighborTeam[];
}
