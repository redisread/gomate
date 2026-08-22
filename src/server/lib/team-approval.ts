export interface TeamApprovalCommand {
  requestId: string;
  teamId: string;
  leaderId: string;
  now: number;
}

export function createTeamApprovalBatch(
  db: D1Database,
  command: TeamApprovalCommand,
): [D1PreparedStatement, D1PreparedStatement] {
  const { requestId, teamId, leaderId, now } = command;
  const activateMember = db
    .prepare(
      `
        INSERT INTO team_members (team_id, user_id, joined_at, left_at)
        SELECT r.team_id, r.user_id, ?, NULL
        FROM team_join_requests AS r
        INNER JOIN teams AS t ON t.id = r.team_id
        WHERE r.id = ?
          AND r.team_id = ?
          AND r.status = 'pending'
          AND t.leader_id = ?
          AND r.user_id <> t.leader_id
          AND t.recruitment_status = 'open'
          AND t.cancelled_at IS NULL
          AND t.start_at > ?
        ON CONFLICT(team_id, user_id) DO UPDATE SET
          joined_at = excluded.joined_at,
          left_at = NULL
        WHERE team_members.left_at IS NOT NULL
      `,
    )
    .bind(now, requestId, teamId, leaderId, now);

  const decideRequest = db
    .prepare(
      `
        UPDATE team_join_requests
        SET status = 'approved',
            decided_by_user_id = ?,
            decided_at = ?,
            updated_at = ?
        WHERE id = ?
          AND team_id = ?
          AND status = 'pending'
          AND EXISTS (
            SELECT 1 FROM teams AS t
            WHERE t.id = team_join_requests.team_id
              AND t.leader_id = ?
              AND team_join_requests.user_id <> t.leader_id
          )
          AND EXISTS (
            SELECT 1 FROM team_members AS active
            WHERE active.team_id = team_join_requests.team_id
              AND active.user_id = team_join_requests.user_id
              AND active.left_at IS NULL
              AND active.joined_at = ?
          )
      `,
    )
    .bind(leaderId, now, now, requestId, teamId, leaderId, now);

  return [activateMember, decideRequest];
}
