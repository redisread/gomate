/**
 * 本地圈子模块类型。
 *
 * 与后端 api/src/services/local-circle.ts 的 interface 对齐（前端只读）。
 */

export interface TopLocation {
  locationId: string;
  locationName: string;
  coverImageUrl: string;
  visitScore: number;
  uniqueVisitors: number;
}

export interface NeighborTeam {
  teamId: string;
  title: string;
  activityType: "hiking" | "explore" | "leisure" | "travel";
  locationName: string;
  startAt: string;
  neighborCount: number;
  neighborAvatars: string[];
}

export interface LocalCircle {
  regionId: string;
  regionName: string;
  activePeopleCount: number;
  topLocations: TopLocation[];
  neighborTeams: NeighborTeam[];
}
