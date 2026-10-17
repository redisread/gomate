import type { ActivityType, Team } from "@/lib/types";

export interface TeamFormFields {
  title: string;
  activityType: ActivityType | "";
  startDateInput: string;
  startClockInput: string;
  durationMinutes: string;
  maxParticipants: string;
  description: string;
  meetingPoint: string;
}

export interface CreateTeamFormData extends TeamFormFields {
  locationId: string;
  requirementsInput: string;
}

export interface EditTeamFormData extends TeamFormFields {
  requirements: string[];
}

function cleanRequirements(requirements: string[]) {
  return requirements.map((value) => value.trim()).filter(Boolean);
}

function schedulePayload(fields: TeamFormFields, durationMinutes: number) {
  const startAt = new Date(
    `${fields.startDateInput}T${fields.startClockInput}:00`,
  );
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
  return { startAt: startAt.toISOString(), endAt: endAt.toISOString() };
}

export function createTeamPayload(
  fields: CreateTeamFormData,
  activityType: ActivityType,
) {
  return {
    title: fields.title,
    locationId: fields.locationId,
    activityType,
    ...schedulePayload(fields, parseInt(fields.durationMinutes, 10)),
    maxParticipants: parseInt(fields.maxParticipants, 10),
    meetingPoint: fields.meetingPoint.trim() || null,
    description: fields.description || null,
    requirements: cleanRequirements(fields.requirementsInput.split(/\r?\n/u)),
    recruitmentStatus: "open" as const,
  };
}

export function editTeamPayload(
  fields: EditTeamFormData,
  originalActivityType: ActivityType,
) {
  return {
    title: fields.title.trim(),
    meetingPoint: fields.meetingPoint.trim() || null,
    description: fields.description.trim() || null,
    maxParticipants: parseInt(fields.maxParticipants, 10),
    ...schedulePayload(fields, parseInt(fields.durationMinutes, 10) || 240),
    requirements: cleanRequirements(fields.requirements),
    ...(fields.activityType !== originalActivityType
      ? { activityType: fields.activityType }
      : {}),
  };
}

export function teamToFormData(team: Team): EditTeamFormData {
  const start = new Date(team.startAt);
  const duration = Math.max(
    0,
    Math.round((Date.parse(team.endAt) - Date.parse(team.startAt)) / 60_000),
  );
  return {
    title: team.title || "",
    startDateInput: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
    startClockInput: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
    durationMinutes: String(duration || 240),
    maxParticipants: String(team.maxParticipants),
    description: team.description || "",
    meetingPoint: team.meetingPoint || "",
    requirements: Array.isArray(team.requirements) ? team.requirements : [],
    activityType: team.activityType,
  };
}
