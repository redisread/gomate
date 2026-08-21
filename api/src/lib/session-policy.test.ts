import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "../db/schema";
import { createTestDb } from "../__tests__/helpers/db";
import { seedUser } from "../__tests__/helpers/seed";

let testDb: ReturnType<typeof createTestDb>["db"];
let testSqlite: ReturnType<typeof createTestDb>["sqlite"];

vi.mock("../db", () => ({ createDb: () => testDb }));

const { enforceActiveSession, isUserActive } = await import("./session-policy");

describe("session policy", () => {
  beforeEach(() => {
    const fresh = createTestDb();
    testDb = fresh.db;
    testSqlite = fresh.sqlite;
  });

  it("allows only active, non-deleted users to create sessions", async () => {
    const active = await seedUser(testDb, { id: "active-user" });
    const suspended = await seedUser(testDb, {
      id: "suspended-user",
      status: "suspended",
    });
    const deleted = await seedUser(testDb, {
      id: "deleted-user",
      status: "deleted",
      deletedAt: new Date(),
    });

    await expect(isUserActive({ DB: {} } as never, active.id)).resolves.toBe(
      true,
    );
    await expect(isUserActive({ DB: {} } as never, suspended.id)).resolves.toBe(
      false,
    );
    await expect(isUserActive({ DB: {} } as never, deleted.id)).resolves.toBe(
      false,
    );
  });

  it("rejects a session inserted after the active check races with suspension", async () => {
    const user = await seedUser(testDb, { id: "session-insert-race-user" });
    await expect(
      isUserActive({ DB: {} } as never, user.id),
    ).resolves.toBe(true);

    await testDb
      .update(schema.users)
      .set({ status: "suspended" })
      .where(eq(schema.users.id, user.id));

    await expect(
      testDb.insert(schema.sessions).values({
        id: "post-suspension-session",
        userId: user.id,
        token: "post-suspension-token",
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toThrow(/SESSION_USER_INACTIVE/u);

    await testDb
      .update(schema.users)
      .set({ status: "active" })
      .where(eq(schema.users.id, user.id));
    await expect(
      testDb
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, user.id)),
    ).resolves.toEqual([]);
  });

  it("revokes every stored session when an inactive credential is observed", async () => {
    const user = await seedUser(testDb, { id: "blocked-user" });
    await testDb.insert(schema.sessions).values([
      {
        id: "session-a",
        userId: user.id,
        token: "token-a",
        expiresAt: new Date(Date.now() + 60_000),
      },
      {
        id: "session-b",
        userId: user.id,
        token: "token-b",
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    // Synthesize a stale row from a pre-trigger database so the application
    // layer remains a useful defense if production data is ever restored from
    // an older snapshot.
    testSqlite.exec("DROP TRIGGER users_auth_revoke_after_inactive");
    await testDb
      .update(schema.users)
      .set({ status: "banned" })
      .where(eq(schema.users.id, user.id));

    await expect(
      enforceActiveSession({ DB: {} } as never, { user: { id: user.id } }),
    ).resolves.toBe(false);
    await expect(
      testDb
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, user.id)),
    ).resolves.toEqual([]);
  });

  it("immediately revokes every session when an active user becomes inactive and never restores them", async () => {
    const user = await seedUser(testDb, { id: "status-transition-user" });
    await testDb.insert(schema.sessions).values([
      {
        id: "status-session-a",
        userId: user.id,
        token: "status-token-a",
        expiresAt: new Date(Date.now() + 60_000),
      },
      {
        id: "status-session-b",
        userId: user.id,
        token: "status-token-b",
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);

    await testDb
      .update(schema.users)
      .set({ status: "suspended" })
      .where(eq(schema.users.id, user.id));

    await expect(
      testDb
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, user.id)),
    ).resolves.toEqual([]);

    await testDb
      .update(schema.users)
      .set({ status: "active" })
      .where(eq(schema.users.id, user.id));

    await expect(
      testDb
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, user.id)),
    ).resolves.toEqual([]);
  });

  it("immediately revokes every session when a user is soft-deleted and never restores them", async () => {
    const user = await seedUser(testDb, { id: "deleted-transition-user" });
    await testDb.insert(schema.sessions).values([
      {
        id: "deleted-session-a",
        userId: user.id,
        token: "deleted-token-a",
        expiresAt: new Date(Date.now() + 60_000),
      },
      {
        id: "deleted-session-b",
        userId: user.id,
        token: "deleted-token-b",
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);

    await testDb
      .update(schema.users)
      .set({ status: "deleted", deletedAt: new Date() })
      .where(eq(schema.users.id, user.id));

    await expect(
      testDb
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, user.id)),
    ).resolves.toEqual([]);

    await testDb
      .update(schema.users)
      .set({ status: "active", deletedAt: null })
      .where(eq(schema.users.id, user.id));

    await expect(
      testDb
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, user.id)),
    ).resolves.toEqual([]);
  });
});
