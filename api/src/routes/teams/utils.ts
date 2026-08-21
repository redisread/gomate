import type {
  Difficulty,
  LocationExtra as LocationExtraDto,
  Team as TeamDto,
  TeamParticipant,
} from "@gomate/types";
import type * as schema from "../../db/schema";
import { getTeamLifecycle } from "../../lib/team-lifecycle";
import { parseChecklist } from "../../lib/team-checklist-utils";
import { parseUserExtra } from "../../lib/user-extra";

type ParticipantRow = schema.TeamMember & { user?: schema.User };

export interface TeamResponseInput {
  team: schema.Team;
  activeParticipantCount: number;
  leader?: schema.User;
  location?: schema.Location;
  region?: schema.Region;
  participants?: ParticipantRow[];
  tags?: schema.Tag[];
  checklistVisible?: boolean;
  contactVisible?: boolean;
  now?: Date | number;
}

function asIso(value: Date | number): string {
  return new Date(value).toISOString();
}

export function parseStringArray(value: unknown): string[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : [];
}

function parseObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function mapLocationExtra(value: unknown): LocationExtraDto {
  const stored = parseObject(value);
  const hiking = parseObject(stored.hiking);
  const mapped: LocationExtraDto = {};

  if (Object.keys(hiking).length > 0) {
    const difficulty = typeof hiking.difficulty === "string" &&
      ["easy", "moderate", "hard", "expert"].includes(hiking.difficulty)
      ? hiking.difficulty as Difficulty
      : undefined;
    mapped.hiking = {
      difficulty,
      durationMin: typeof hiking.duration_min === "number" ? hiking.duration_min : undefined,
      durationMax: typeof hiking.duration_max === "number" ? hiking.duration_max : undefined,
      distanceKm: typeof hiking.distance_km === "number" ? hiking.distance_km : undefined,
      elevationGainM: typeof hiking.elevation_gain_m === "number" ? hiking.elevation_gain_m : undefined,
      bestSeasons: parseStringArray(hiking.best_seasons),
      gearEssential: parseStringArray(hiking.gear_essential),
      gearOptional: parseStringArray(hiking.gear_optional),
      overview: typeof hiking.overview === "string" || hiking.overview === null
        ? hiking.overview
        : undefined,
      tips: parseStringArray(hiking.tips),
      warnings: parseStringArray(hiking.warnings),
    };
  }

  mapped.facilities = parseStringArray(stored.facilities);
  return mapped;
}

function mapUserExtra(value: unknown, contactVisible = false) {
  try {
    const extra = parseUserExtra(value);
    return { ...extra, wechat: contactVisible ? extra.wechat : null };
  } catch {
    return { level: "beginner" as const, completedHikes: 0, wechat: null, city: null };
  }
}

function mapParticipant(row: ParticipantRow, contactVisible: boolean): TeamParticipant {
  return {
    userId: row.userId,
    joinedAt: asIso(row.joinedAt),
    leftAt: row.leftAt ? asIso(row.leftAt) : null,
    ...(row.user ? {
      user: {
        id: row.user.id,
        name: row.user.name,
        nickname: row.user.nickname,
        image: row.user.image,
        bio: row.user.bio,
        gender: row.user.gender,
        birthday: row.user.birthday ? asIso(row.user.birthday) : null,
        extra: mapUserExtra(row.user.extra, contactVisible),
      },
    } : {}),
  };
}

/** Canonical Team V2 response mapper. Users routes may reuse this projection. */
export function toTeamResponse(input: TeamResponseInput): TeamDto {
  const { team } = input;
  const activeParticipantCount = Number(input.activeParticipantCount);

  return {
    id: team.id,
    locationId: team.locationId,
    leaderId: team.leaderId,
    activityType: team.activityType,
    title: team.title,
    description: team.description,
    startAt: asIso(team.startAt),
    endAt: asIso(team.endAt),
    maxParticipants: team.maxParticipants,
    activeParticipantCount,
    requirements: parseStringArray(team.requirements),
    recruitmentStatus: team.recruitmentStatus,
    formedAt: team.formedAt ? asIso(team.formedAt) : null,
    cancelledAt: team.cancelledAt ? asIso(team.cancelledAt) : null,
    lifecycle: getTeamLifecycle(team, input.now),
    isFull: activeParticipantCount >= team.maxParticipants,
    checklist: input.checklistVisible ? parseChecklist(team.checklist) : null,
    createdAt: asIso(team.createdAt),
    updatedAt: asIso(team.updatedAt),
    ...(input.leader ? {
      leader: {
        id: input.leader.id,
        name: input.leader.name,
        nickname: input.leader.nickname,
        image: input.leader.image,
        bio: input.leader.bio,
        extra: mapUserExtra(input.leader.extra, input.contactVisible),
      },
    } : {}),
    ...(input.participants ? {
      participants: input.participants.map((participant) =>
        mapParticipant(participant, input.contactVisible ?? false)),
    } : {}),
    ...(input.location ? {
      location: {
        id: input.location.id,
        regionId: input.location.regionId,
        name: input.location.name,
        slug: input.location.slug,
        supportedActivityTypes: parseStringArray(input.location.supportedActivityTypes) as schema.ActivityType[],
        status: input.location.status,
        subtitle: input.location.subtitle,
        description: input.location.description,
        address: input.location.address,
        latitude: input.location.latitude,
        longitude: input.location.longitude,
        coverImageUrl: input.location.coverImageUrl,
        images: parseStringArray(input.location.images),
        extra: mapLocationExtra(input.location.extra),
        createdByUserId: input.location.createdByUserId,
        createdAt: asIso(input.location.createdAt),
        updatedAt: asIso(input.location.updatedAt),
        ...(input.region ? {
          region: {
            id: input.region.id,
            countryCode: input.region.countryCode,
            parentId: input.region.parentId,
            name: input.region.name,
            nameEn: input.region.nameEn,
            slug: input.region.slug,
            code: input.region.code,
            level: input.region.level,
            timezone: input.region.timezone,
            centerLatitude: input.region.centerLatitude,
            centerLongitude: input.region.centerLongitude,
            serviceEnabled: input.region.serviceEnabled,
            isHot: input.region.isHot,
            sortOrder: input.region.sortOrder,
          },
        } : {}),
      },
    } : {}),
    ...(input.tags ? {
      tags: input.tags.map(({ id, name, slug }) => ({ id, name, slug })),
    } : {}),
  };
}
