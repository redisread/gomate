import { beforeEach, describe, expect, it } from "vitest";

import { createTestDb } from "../__tests__/helpers/db";
import { ContentD1Database } from "../__tests__/helpers/content-db";
import { seedUser } from "../__tests__/helpers/seed";
import { authPassword } from "./auth-password";
import {
  InvalidPasswordResetTokenError,
  issuePasswordResetChallenge,
  passwordResetClientUrl,
  resetPasswordWithChallenge,
} from "./password-reset";

describe("password reset challenge", () => {
  let fresh: ReturnType<typeof createTestDb>;
  let d1: D1Database;

  beforeEach(() => {
    fresh = createTestDb();
    d1 = new ContentD1Database(fresh.sqlite) as unknown as D1Database;
  });

  async function seedCredentialUser(email = "member@example.test") {
    const user = await seedUser(fresh.db, { email });
    const oldHash = await authPassword.hash("old-password-123");
    fresh.sqlite.prepare(`
      INSERT INTO accounts (
        id, user_id, account_id, provider_id, password, created_at, updated_at
      ) VALUES (?, ?, ?, 'credential', ?, ?, ?)
    `).run(`account-${user.id}`, user.id, user.id, oldHash, 1, 1);
    fresh.sqlite.prepare(`
      INSERT INTO sessions (
        id, user_id, token, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(`session-${user.id}`, user.id, `session-token-${user.id}`, Date.now() + 60_000, 1, 1);
    return user;
  }

  it("keeps only the latest challenge for a user and stores no raw token", async () => {
    const user = await seedCredentialUser();

    const first = await issuePasswordResetChallenge(d1, user.email, 1_000);
    const second = await issuePasswordResetChallenge(d1, user.email, 2_000);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    const rows = fresh.sqlite.prepare(`
      SELECT identifier, value, expires_at AS expiresAt
      FROM verifications
      WHERE identifier LIKE 'password-reset:%'
    `).all() as Array<{ identifier: string; value: string; expiresAt: number }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.identifier).toBe(`password-reset:${user.id}`);
    expect(rows[0]?.value).toMatch(/^[a-f0-9]{64}$/u);
    expect(rows[0]?.value).not.toContain(second!.token);
    expect(rows[0]?.expiresAt).toBe(2_000 + 60 * 60 * 1_000);

    await expect(
      resetPasswordWithChallenge(d1, first!.token, "first-new-password", 3_000),
    ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);
    await expect(
      resetPasswordWithChallenge(d1, second!.token, "second-new-password", 3_000),
    ).resolves.toBeUndefined();
  });

  it("consumes a token once, changes the compatible credential, and revokes sessions", async () => {
    const user = await seedCredentialUser();
    const issued = await issuePasswordResetChallenge(d1, user.email, 1_000);

    await resetPasswordWithChallenge(
      d1,
      issued!.token,
      "replacement-password-123",
      2_000,
    );

    const account = fresh.sqlite.prepare(
      "SELECT password FROM accounts WHERE user_id = ? AND provider_id = 'credential'",
    ).get(user.id) as { password: string };
    await expect(authPassword.verify({
      hash: account.password,
      password: "replacement-password-123",
    })).resolves.toBe(true);
    expect(fresh.sqlite.prepare(
      "SELECT count(*) AS count FROM sessions WHERE user_id = ?",
    ).get(user.id)).toEqual({ count: 0 });
    expect(fresh.sqlite.prepare(
      "SELECT count(*) AS count FROM verifications WHERE identifier = ?",
    ).get(`password-reset:${user.id}`)).toEqual({ count: 0 });

    await expect(
      resetPasswordWithChallenge(d1, issued!.token, "replay-password-123", 3_000),
    ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);
  });

  it("allows exactly one concurrent consumer", async () => {
    const user = await seedCredentialUser();
    const issued = await issuePasswordResetChallenge(d1, user.email, 1_000);

    const results = await Promise.allSettled([
      resetPasswordWithChallenge(d1, issued!.token, "winner-password-123", 2_000),
      resetPasswordWithChallenge(d1, issued!.token, "loser-password-123", 2_000),
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(results.filter(({ status }) => status === "rejected")).toHaveLength(1);
    expect((results.find(({ status }) => status === "rejected") as PromiseRejectedResult).reason)
      .toBeInstanceOf(InvalidPasswordResetTokenError);
  });

  it("serializes concurrent issuers to one row and one usable token", async () => {
    const user = await seedCredentialUser();
    const issued = await Promise.all([
      issuePasswordResetChallenge(d1, user.email, 1_000),
      issuePasswordResetChallenge(d1, user.email, 1_001),
    ]);

    expect(fresh.sqlite.prepare(`
      SELECT count(*) AS count
      FROM verifications
      WHERE identifier = ?
    `).get(`password-reset:${user.id}`)).toEqual({ count: 1 });
    const results = await Promise.allSettled(
      issued.map((challenge, index) => resetPasswordWithChallenge(
        d1,
        challenge!.token,
        `concurrent-issuer-password-${index}`,
        2_000,
      )),
    );
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(results.filter(({ status }) => status === "rejected")).toHaveLength(1);
  });

  it("rejects expired, tampered, and user-mismatched tokens without mutations", async () => {
    const user = await seedCredentialUser();
    const other = await seedCredentialUser("other@example.test");
    const issued = await issuePasswordResetChallenge(d1, user.email, 1_000);
    const beforePassword = (fresh.sqlite.prepare(
      "SELECT password FROM accounts WHERE user_id = ?",
    ).get(user.id) as { password: string }).password;
    const randomPart = issued!.token.split(".").at(-1)!;
    const tamperedToken = `${issued!.token.slice(0, -1)}${
      issued!.token.endsWith("A") ? "B" : "A"
    }`;

    for (const [token, now] of [
      [tamperedToken, 2_000],
      [`v1.${other.id}.${randomPart}`, 2_000],
      [issued!.token, 1_000 + 60 * 60 * 1_000 + 1],
    ] as const) {
      await expect(
        resetPasswordWithChallenge(d1, token, "must-not-apply-123", now),
      ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);
    }

    expect((fresh.sqlite.prepare(
      "SELECT password FROM accounts WHERE user_id = ?",
    ).get(user.id) as { password: string }).password).toBe(beforePassword);
    expect(fresh.sqlite.prepare(
      "SELECT count(*) AS count FROM sessions WHERE user_id = ?",
    ).get(user.id)).toEqual({ count: 1 });
  });

  it("does not issue challenges for inactive, deleted, or unknown users", async () => {
    await seedUser(fresh.db, { email: "suspended@example.test", status: "suspended" });
    await seedUser(fresh.db, { email: "deleted@example.test", deletedAt: new Date() });

    await expect(issuePasswordResetChallenge(d1, "suspended@example.test"))
      .resolves.toBeNull();
    await expect(issuePasswordResetChallenge(d1, "deleted@example.test"))
      .resolves.toBeNull();
    await expect(issuePasswordResetChallenge(d1, "unknown@example.test"))
      .resolves.toBeNull();
    expect(fresh.sqlite.prepare(
      "SELECT count(*) AS count FROM verifications WHERE identifier LIKE 'password-reset:%'",
    ).get()).toEqual({ count: 0 });
  });

  it("does not commit a challenge when suspension wins after the user lookup", async () => {
    const user = await seedCredentialUser("issue-race@example.test");

    const issuing = issuePasswordResetChallenge(d1, user.email, 1_000);
    fresh.sqlite.prepare(
      "UPDATE users SET status = 'suspended' WHERE id = ?",
    ).run(user.id);

    await expect(issuing).resolves.toBeNull();
    expect(fresh.sqlite.prepare(
      "SELECT count(*) AS count FROM verifications WHERE identifier = ?",
    ).get(`password-reset:${user.id}`)).toEqual({ count: 0 });
  });

  it.each([
    ["suspended", "UPDATE users SET status = 'suspended' WHERE id = ?"],
    ["soft-deleted", "UPDATE users SET deleted_at = 1500 WHERE id = ?"],
  ])("revokes a challenge when the user becomes %s", async (_label, statement) => {
    const user = await seedCredentialUser(`${_label}@example.test`);
    const issued = await issuePasswordResetChallenge(d1, user.email, 1_000);
    const beforePassword = (fresh.sqlite.prepare(
      "SELECT password FROM accounts WHERE user_id = ?",
    ).get(user.id) as { password: string }).password;

    fresh.sqlite.prepare(statement).run(user.id);
    expect(fresh.sqlite.prepare(
      "SELECT count(*) AS count FROM verifications WHERE identifier = ?",
    ).get(`password-reset:${user.id}`)).toEqual({ count: 0 });
    await expect(
      resetPasswordWithChallenge(d1, issued!.token, "must-not-apply-123", 2_000),
    ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);

    fresh.sqlite.prepare(
      "UPDATE users SET status = 'active', deleted_at = NULL WHERE id = ?",
    ).run(user.id);
    expect((fresh.sqlite.prepare(
      "SELECT password FROM accounts WHERE user_id = ?",
    ).get(user.id) as { password: string }).password).toBe(beforePassword);
  });

  it("rejects reset when suspension wins between challenge read and batch", async () => {
    const user = await seedCredentialUser("reset-race@example.test");
    const issued = await issuePasswordResetChallenge(d1, user.email, 1_000);
    const beforePassword = (fresh.sqlite.prepare(
      "SELECT password FROM accounts WHERE user_id = ?",
    ).get(user.id) as { password: string }).password;
    (d1 as unknown as ContentD1Database).beforeNextBatch = () => {
      fresh.sqlite.prepare(
        "UPDATE users SET status = 'suspended' WHERE id = ?",
      ).run(user.id);
    };

    await expect(
      resetPasswordWithChallenge(d1, issued!.token, "must-not-apply-123", 2_000),
    ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);
    fresh.sqlite.prepare(
      "UPDATE users SET status = 'active' WHERE id = ?",
    ).run(user.id);
    expect((fresh.sqlite.prepare(
      "SELECT password FROM accounts WHERE user_id = ?",
    ).get(user.id) as { password: string }).password).toBe(beforePassword);
  });

  it("fails closed and rolls back when the credential row is missing", async () => {
    const user = await seedUser(fresh.db, { email: "missing-account@example.test" });
    const issued = await issuePasswordResetChallenge(d1, user.email, 1_000);

    await expect(
      resetPasswordWithChallenge(d1, issued!.token, "replacement-password-123", 2_000),
    ).rejects.not.toBeInstanceOf(InvalidPasswordResetTokenError);
    expect(fresh.sqlite.prepare(
      "SELECT value FROM verifications WHERE identifier = ?",
    ).get(`password-reset:${user.id}`)).toEqual(
      expect.objectContaining({ value: expect.stringMatching(/^[a-f0-9]{64}$/u) }),
    );
  });

  it("rolls back the claim when D1 rejects the batch", async () => {
    const user = await seedCredentialUser();
    const issued = await issuePasswordResetChallenge(d1, user.email, 1_000);
    const before = fresh.sqlite.prepare(
      "SELECT password FROM accounts WHERE user_id = ?",
    ).get(user.id);
    (d1 as unknown as ContentD1Database).failNextBatch = new Error(
      "simulated batch outage",
    );

    await expect(
      resetPasswordWithChallenge(d1, issued!.token, "must-not-apply-123", 2_000),
    ).rejects.toThrow("simulated batch outage");
    expect(fresh.sqlite.prepare(
      "SELECT password FROM accounts WHERE user_id = ?",
    ).get(user.id)).toEqual(before);
    expect(fresh.sqlite.prepare(
      "SELECT count(*) AS count FROM sessions WHERE user_id = ?",
    ).get(user.id)).toEqual({ count: 1 });
    expect(fresh.sqlite.prepare(
      "SELECT count(*) AS count FROM verifications WHERE identifier = ?",
    ).get(`password-reset:${user.id}`)).toEqual({ count: 1 });
  });

  it("places the bearer only in the client-side fragment", () => {
    const url = new URL(passwordResetClientUrl(
      "https://gomate.test",
      "v1.user_123.abcdefghijklmnopqrstuvwxyzABCDEF",
    ));
    expect(url.pathname).toBe("/reset-password");
    expect(url.search).toBe("");
    expect(url.hash).toBe(
      "#token=v1.user_123.abcdefghijklmnopqrstuvwxyzABCDEF",
    );
  });
});
