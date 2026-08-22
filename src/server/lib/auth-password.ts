import { hashPassword, verifyPassword } from "better-auth/crypto";

/**
 * The single password codec shared by Better Auth sign-in and GoMate's
 * application-owned reset flow. Keeping both consumers on this object makes a
 * future Better Auth upgrade unable to silently change only one side.
 */
export const authPassword = {
  hash: hashPassword,
  verify: verifyPassword,
};
