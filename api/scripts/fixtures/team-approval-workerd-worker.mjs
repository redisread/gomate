import { mapDatabaseError } from "../../src/lib/database-errors.ts";
import { createStoryTagUpdateBatch } from "../../src/lib/story-tag-write.ts";
import { createTeamApprovalBatch } from "../../src/lib/team-approval.ts";
import { createTeamTagUpdateBatch } from "../../src/lib/team-tag-write.ts";
import { authPassword } from "../../src/lib/auth-password.ts";
import {
  InvalidPasswordResetTokenError,
  issuePasswordResetChallenge,
  resetPasswordWithChallenge,
} from "../../src/lib/password-reset.ts";

function response(body, status = 200) {
  return globalThis.Response.json(body, { status });
}

async function seed(db) {
  const startAt = 4_102_444_800_000;
  const endAt = startAt + 3_600_000;
  await db.batch([
    db.prepare(`
      INSERT INTO region (
        id, country_code, name, slug, level, timezone,
        center_latitude, center_longitude, service_enabled
      ) VALUES ('region-test', 'CN', '测试市', 'test-city', 'city',
        'Asia/Shanghai', 22.5, 114.0, 1)
    `),
    db.prepare(`
      INSERT INTO users (id, name, email) VALUES
        ('leader', 'Leader', 'leader@example.com'),
        ('success-user', 'Success', 'success@example.com'),
        ('full-holder', 'Holder', 'holder@example.com'),
        ('full-candidate', 'Full Candidate', 'full-candidate@example.com'),
        ('race-a', 'Race A', 'race-a@example.com'),
        ('race-b', 'Race B', 'race-b@example.com'),
        ('reset-user', 'Reset User', 'reset-user@example.com'),
        ('reset-suspension-user', 'Reset Suspension', 'reset-suspension@example.com'),
        ('session-status-user', 'Session Status', 'session-status@example.com'),
        ('session-deleted-user', 'Session Deleted', 'session-deleted@example.com')
    `),
    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at) VALUES
        ('session-status-a', 'session-status-user', 'session-status-token-a', 4102444800000),
        ('session-status-b', 'session-status-user', 'session-status-token-b', 4102444800000),
        ('session-deleted-a', 'session-deleted-user', 'session-deleted-token-a', 4102444800000),
        ('session-deleted-b', 'session-deleted-user', 'session-deleted-token-b', 4102444800000),
        ('session-reset-a', 'reset-user', 'session-reset-token-a', 4102444800000),
        ('session-reset-b', 'reset-user', 'session-reset-token-b', 4102444800000),
        ('session-reset-suspension', 'reset-suspension-user', 'session-reset-suspension-token', 4102444800000)
    `),
    db.prepare(`
      INSERT INTO locations (
        id, region_id, name, slug, supported_activity_types, description,
        latitude, longitude, cover_image_url
      ) VALUES
        (
          'location-test', 'region-test', '测试地点', 'test-location',
          '["hiking"]', '测试地点', 22.5, 114.0,
          'https://gomate.example/location.jpg'
        ),
        (
          'location-team-tag-success', 'region-test', '标签成功地点',
          'team-tag-success-location', '["hiking"]', '标签成功地点',
          22.5, 114.0, 'https://gomate.example/team-tag-success.jpg'
        ),
        (
          'location-team-tag-conflict', 'region-test', '标签竞态地点',
          'team-tag-conflict-location', '["hiking"]', '标签竞态地点',
          22.5, 114.0, 'https://gomate.example/team-tag-conflict.jpg'
        )
    `),
    db
      .prepare(
        `
      INSERT INTO teams (
        id, location_id, leader_id, activity_type, title, start_at, end_at,
        max_participants
      ) VALUES
        ('team-success', 'location-test', 'leader', 'hiking', 'Success', ?, ?, 2),
        ('team-full', 'location-test', 'leader', 'hiking', 'Full', ?, ?, 1),
        ('team-race', 'location-test', 'leader', 'hiking', 'Race', ?, ?, 1),
        ('team-tag-success', 'location-team-tag-success', 'leader', 'hiking',
          'Team Tag Success', ?, ?, 2),
        ('team-tag-conflict', 'location-team-tag-conflict', 'leader', 'hiking',
          'Team Tag Conflict', ?, ?, 2)
    `,
      )
      .bind(
        startAt,
        endAt,
        startAt,
        endAt,
        startAt,
        endAt,
        startAt,
        endAt,
        startAt,
        endAt,
      ),
    db.prepare(`
      INSERT INTO team_members (team_id, user_id, joined_at, left_at)
      VALUES ('team-full', 'full-holder', 1900000000000, NULL)
    `),
    db.prepare(`
      INSERT INTO team_join_requests (id, team_id, user_id) VALUES
        ('request-success', 'team-success', 'success-user'),
        ('request-full', 'team-full', 'full-candidate'),
        ('request-race-a', 'team-race', 'race-a'),
        ('request-race-b', 'team-race', 'race-b')
    `),
    db.prepare(`
      INSERT INTO stories (id, author_id, title, content) VALUES
        ('story-tag-success', 'leader', 'story-tag-success', 'success'),
        ('story-tag-conflict', 'leader', 'story-tag-conflict', 'conflict')
    `),
    db.prepare(`
      INSERT INTO tags (id, name, slug) VALUES
        ('story-tag-success-old', '成功旧标签', 'story-tag-success-old'),
        ('story-tag-conflict-old', '竞态旧标签', 'story-tag-conflict-old'),
        ('team-tag-success-old', '队伍成功旧标签', 'team-tag-success-old'),
        ('team-tag-success-new', '队伍成功新标签', 'team-tag-success-new'),
        ('team-tag-conflict-old', '队伍竞态旧标签', 'team-tag-conflict-old'),
        ('team-tag-conflict-new', '队伍竞态新标签', 'team-tag-conflict-new')
    `),
    db.prepare(`
      INSERT INTO story_tags (story_id, tag_id) VALUES
        ('story-tag-success', 'story-tag-success-old'),
        ('story-tag-conflict', 'story-tag-conflict-old')
    `),
    db.prepare(`
      INSERT INTO team_tags (team_id, tag_id) VALUES
        ('team-tag-success', 'team-tag-success-old'),
        ('team-tag-conflict', 'team-tag-conflict-old')
    `),
  ]);
  const password = await authPassword.hash("old-reset-password");
  await db.prepare(`
    INSERT INTO accounts (
      id, user_id, account_id, provider_id, password, created_at, updated_at
    ) VALUES
      ('account-reset-user', 'reset-user', 'reset-user', 'credential', ?, 1, 1),
      ('account-reset-suspension-user', 'reset-suspension-user',
       'reset-suspension-user', 'credential', ?, 1, 1)
  `).bind(password, password).run();
}

async function issuePasswordReset(db, body) {
  const challenge = await issuePasswordResetChallenge(
    db,
    body.email,
    body.now,
  );
  return response({ token: challenge?.token ?? null });
}

async function commitPasswordReset(db, body) {
  try {
    await resetPasswordWithChallenge(db, body.token, body.password, body.now);
    return response({ success: true });
  } catch (error) {
    if (error instanceof InvalidPasswordResetTokenError) {
      return response({ success: false, code: "INVALID_TOKEN" }, 400);
    }
    return response({ success: false, code: "RESET_FAILED" }, 500);
  }
}

async function passwordResetState(db, password, userId = "reset-user") {
  const identifier = `password-reset:${userId}`;
  const [account, sessions, challenges] = await db.batch([
    db.prepare(`
      SELECT password FROM accounts
      WHERE user_id = ? AND provider_id = 'credential'
    `).bind(userId),
    db.prepare(`
      SELECT count(*) AS count FROM sessions WHERE user_id = ?
    `).bind(userId),
    db.prepare(`
      SELECT count(*) AS count FROM verifications
      WHERE identifier = ?
    `).bind(identifier),
  ]);
  const hash = account.results[0]?.password;
  return response({
    passwordMatches: typeof hash === "string"
      ? await authPassword.verify({ hash, password })
      : false,
    sessions: Number(sessions.results[0]?.count ?? -1),
    challenges: Number(challenges.results[0]?.count ?? -1),
  });
}

async function suspendPasswordReset(db, body) {
  const userId = "reset-suspension-user";
  const identifier = `password-reset:${userId}`;
  const countChallenges = () => db.prepare(`
    SELECT count(*) AS count FROM verifications WHERE identifier = ?
  `).bind(identifier).first();
  const before = await countChallenges();
  await db.prepare(
    "UPDATE users SET status = 'suspended' WHERE id = ?",
  ).bind(userId).run();
  const revoked = await countChallenges();

  let resetAccepted = true;
  try {
    await resetPasswordWithChallenge(db, body.token, body.password, body.now);
  } catch (error) {
    if (!(error instanceof InvalidPasswordResetTokenError)) {
      return response({ code: "RESET_FAILED" }, 500);
    }
    resetAccepted = false;
  }
  await db.prepare(
    "UPDATE users SET status = 'active' WHERE id = ?",
  ).bind(userId).run();
  const state = await passwordResetState(db, body.password, userId);
  return response({
    before: Number(before?.count ?? -1),
    revoked: Number(revoked?.count ?? -1),
    resetAccepted,
    ...await state.json(),
  });
}

async function approve(db, requestId, now) {
  const request = await db
    .prepare("SELECT team_id AS teamId FROM team_join_requests WHERE id = ?")
    .bind(requestId)
    .first();
  if (!request) return response({ error: "REQUEST_NOT_FOUND" }, 404);

  try {
    const results = await db.batch(
      createTeamApprovalBatch(db, {
        requestId,
        teamId: request.teamId,
        leaderId: "leader",
        now,
      }),
    );
    const changes = results.map((result) => Number(result.meta.changes ?? 0));
    return response(
      { changes },
      changes.every((value) => value === 1) ? 200 : 409,
    );
  } catch (error) {
    return response(
      { error: error instanceof Error ? error.message : String(error) },
      409,
    );
  }
}

async function triggerFailure(db, kind) {
  const statement =
    kind === "story-like"
      ? db
          .prepare("INSERT INTO story_likes (user_id, story_id) VALUES (?, ?)")
          .bind("success-user", "missing-story")
      : db
          .prepare(
            "INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)",
          )
          .bind(
            "missing-message",
            "missing-conversation",
            "success-user",
            "hello",
          );
  try {
    await statement.run();
    return response({ error: "TRIGGER_DID_NOT_FAIL" }, 500);
  } catch (error) {
    const mapped = mapDatabaseError(error);
    return response(mapped.body, mapped.status);
  }
}

async function updateStoryTags(db, body) {
  const now = 2_000_000_001_000;
  const updateStory = db
    .prepare(
      `
      UPDATE stories
      SET title = ?, updated_at = ?
      WHERE id = ? AND ? = 1
    `,
    )
    .bind(
      `updated-${body.storyId}`,
      now,
      body.storyId,
      body.shouldUpdate ? 1 : 0,
    );
  const results = await db.batch(
    createStoryTagUpdateBatch(db, updateStory, {
      storyId: body.storyId,
      tags: body.tags,
      now,
    }),
  );
  const changes = Number(results[0].meta.changes ?? 0);
  return response({ changes }, changes === 1 ? 200 : 409);
}

async function storyTagState(db, storyId) {
  const [story, linkedTags, dictionary, writeGates] = await db.batch([
    db
      .prepare(
        "SELECT id, title, updated_at AS updatedAt FROM stories WHERE id = ?",
      )
      .bind(storyId),
    db
      .prepare(
        `
        SELECT tag.name
        FROM story_tags AS story_tag
        INNER JOIN tags AS tag ON tag.id = story_tag.tag_id
        WHERE story_tag.story_id = ?
        ORDER BY tag.name
      `,
      )
      .bind(storyId),
    db.prepare("SELECT name FROM tags ORDER BY name"),
    db.prepare(`
      SELECT id FROM tags
      WHERE name LIKE 'story-tag-write-gate:%'
      ORDER BY id
    `),
  ]);
  return response({
    story: story.results[0] ?? null,
    linkedTags: linkedTags.results.map(({ name }) => name),
    dictionary: dictionary.results.map(({ name }) => name),
    writeGates: writeGates.results.map(({ id }) => id),
  });
}

async function updateTeamTags(db, body) {
  const now = 2_000_000_002_000;
  if (body.disableLocation) {
    await db
      .prepare(
        `
      UPDATE locations SET status = 'draft'
      WHERE id = (SELECT location_id FROM teams WHERE id = ?)
    `,
      )
      .bind(body.teamId)
      .run();
  }
  const updateTeam = db
    .prepare(
      `
    UPDATE teams
    SET title = ?, updated_at = ?
    WHERE id = ?
      AND EXISTS (
        SELECT 1 FROM locations AS location
        WHERE location.id = teams.location_id
          AND location.status = 'published'
          AND EXISTS (
            SELECT 1 FROM json_each(location.supported_activity_types)
            WHERE json_each.value = teams.activity_type
          )
      )
  `,
    )
    .bind(`updated-${body.teamId}`, now, body.teamId);
  const results = await db.batch(
    createTeamTagUpdateBatch(db, updateTeam, {
      teamId: body.teamId,
      tagIds: body.tagIds,
      now,
    }),
  );
  const changes = Number(results[0].meta.changes ?? 0);
  return response({ changes }, changes === 1 ? 200 : 409);
}

async function teamTagState(db, teamId) {
  const [team, linkedTags, dictionary, writeGates] = await db.batch([
    db
      .prepare(
        `
      SELECT id, title, updated_at AS updatedAt
      FROM teams WHERE id = ?
    `,
      )
      .bind(teamId),
    db
      .prepare(
        `
      SELECT tag.id
      FROM team_tags AS team_tag
      INNER JOIN tags AS tag ON tag.id = team_tag.tag_id
      WHERE team_tag.team_id = ?
      ORDER BY tag.id
    `,
      )
      .bind(teamId),
    db.prepare("SELECT id, name, slug FROM tags ORDER BY id"),
    db.prepare(`
      SELECT id FROM tags
      WHERE name LIKE 'team-tag-write-gate:%'
      ORDER BY id
    `),
  ]);
  return response({
    team: team.results[0] ?? null,
    linkedTags: linkedTags.results.map(({ id }) => id),
    dictionary: dictionary.results,
    writeGates: writeGates.results.map(({ id }) => id),
  });
}

async function state(db, teamId) {
  const [members, requests] = await db.batch([
    db
      .prepare(
        `
      SELECT user_id AS userId, left_at AS leftAt
      FROM team_members
      WHERE team_id = ? AND left_at IS NULL
      ORDER BY user_id
    `,
      )
      .bind(teamId),
    db
      .prepare(
        `
      SELECT id, user_id AS userId, status
      FROM team_join_requests
      WHERE team_id = ?
      ORDER BY id
    `,
      )
      .bind(teamId),
  ]);
  return response({ members: members.results, requests: requests.results });
}

async function sessionRevocation(db, kind) {
  const userId =
    kind === "deleted-at" ? "session-deleted-user" : "session-status-user";
  const countSessions = () =>
    db
      .prepare("SELECT COUNT(*) AS count FROM sessions WHERE user_id = ?")
      .bind(userId)
      .first();

  const before = await countSessions();
  if (kind === "deleted-at") {
    await db
      .prepare("UPDATE users SET status = 'deleted', deleted_at = ? WHERE id = ?")
      .bind(2_000_000_003_000, userId)
      .run();
  } else {
    await db
      .prepare("UPDATE users SET status = 'suspended' WHERE id = ?")
      .bind(userId)
      .run();
  }
  const revoked = await countSessions();
  let insertBlocked = false;
  try {
    await db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, 4102444800000)
    `).bind(
      `post-inactive-${kind}`,
      userId,
      `post-inactive-token-${kind}`,
    ).run();
  } catch (error) {
    insertBlocked = error instanceof Error &&
      error.message.includes("SESSION_USER_INACTIVE");
  }

  if (kind === "deleted-at") {
    await db
      .prepare("UPDATE users SET status = 'active', deleted_at = NULL WHERE id = ?")
      .bind(userId)
      .run();
  } else {
    await db
      .prepare("UPDATE users SET status = 'active' WHERE id = ?")
      .bind(userId)
      .run();
  }
  const restored = await countSessions();

  return response({
    before: Number(before?.count ?? -1),
    revoked: Number(revoked?.count ?? -1),
    insertBlocked,
    restored: Number(restored?.count ?? -1),
  });
}

export default {
  async fetch(request, env) {
    const url = new globalThis.URL(request.url);
    if (url.pathname === "/health") return response({ ok: true });
    if (url.pathname === "/seed" && request.method === "POST") {
      try {
        await seed(env.DB);
        return response({ ok: true });
      } catch (error) {
        return response(
          { error: error instanceof Error ? error.message : String(error) },
          500,
        );
      }
    }
    if (url.pathname === "/approve" && request.method === "POST") {
      const body = await request.json();
      return approve(env.DB, body.requestId, body.now);
    }
    if (
      url.pathname.startsWith("/trigger-failure/") &&
      request.method === "POST"
    ) {
      return triggerFailure(
        env.DB,
        url.pathname.slice("/trigger-failure/".length),
      );
    }
    if (url.pathname === "/story-tags" && request.method === "PUT") {
      return updateStoryTags(env.DB, await request.json());
    }
    if (url.pathname === "/story-tag-state") {
      return storyTagState(env.DB, url.searchParams.get("storyId"));
    }
    if (url.pathname === "/team-tags" && request.method === "PUT") {
      return updateTeamTags(env.DB, await request.json());
    }
    if (url.pathname === "/team-tag-state") {
      return teamTagState(env.DB, url.searchParams.get("teamId"));
    }
    if (url.pathname === "/password-reset/issue" && request.method === "POST") {
      return issuePasswordReset(env.DB, await request.json());
    }
    if (url.pathname === "/password-reset/commit" && request.method === "POST") {
      return commitPasswordReset(env.DB, await request.json());
    }
    if (url.pathname === "/password-reset/state") {
      return passwordResetState(
        env.DB,
        url.searchParams.get("password") ?? "",
        url.searchParams.get("userId") ?? "reset-user",
      );
    }
    if (url.pathname === "/password-reset/suspend" && request.method === "POST") {
      return suspendPasswordReset(env.DB, await request.json());
    }
    if (url.pathname === "/state") {
      return state(env.DB, url.searchParams.get("teamId"));
    }
    if (
      url.pathname.startsWith("/session-revocation/") &&
      request.method === "POST"
    ) {
      return sessionRevocation(
        env.DB,
        url.pathname.slice("/session-revocation/".length),
      );
    }
    return response({ error: "NOT_FOUND" }, 404);
  },
};
