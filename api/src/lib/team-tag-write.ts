import { generateId } from "./id";

export interface TeamTagWriteCommand {
  teamId: string;
  tagIds: string[];
  now: number;
}

/**
 * Keeps a conditional Team UPDATE and its tag replacement in one D1 batch.
 * The unique sentinel captures changes() immediately after the UPDATE so a
 * zero-row update makes every tag statement a no-op.
 */
export function createTeamTagUpdateBatch(
  db: D1Database,
  updateTeam: D1PreparedStatement,
  command: TeamTagWriteCommand,
): D1PreparedStatement[] {
  const { teamId, tagIds, now } = command;
  const writeGateId = generateId();
  const writeGateValue = `team-tag-write-gate:${writeGateId}`;
  const gateExists = `
    EXISTS (
      SELECT 1 FROM tags AS team_tag_write_gate
      WHERE team_tag_write_gate.id = ?
    )
  `;

  return [
    updateTeam,
    db.prepare(`
      INSERT INTO tags (id, name, slug, created_at)
      SELECT ?, ?, ?, ?
      WHERE changes() = 1
    `).bind(writeGateId, writeGateValue, writeGateValue, now),
    db.prepare(`
      DELETE FROM team_tags
      WHERE team_id = ? AND ${gateExists}
    `).bind(teamId, writeGateId),
    ...tagIds.map((tagId) => db.prepare(`
      INSERT INTO team_tags (team_id, tag_id, created_at)
      SELECT ?, ?, ?
      WHERE ${gateExists}
    `).bind(teamId, tagId, now, writeGateId)),
    db.prepare("DELETE FROM tags WHERE id = ?").bind(writeGateId),
  ];
}
