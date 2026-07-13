import { Hono } from "hono";
import { createAuth } from "../lib/auth";
import { createDb } from "../db";
import * as schema from "../db/schema";
import type { Env } from "../lib/auth";
import { APIErrors } from "../lib/api-errors";
import { generateId } from "../lib/id";

const shares = new Hono<{ Bindings: Env }>();

/**
 * POST /shares/track
 * 记录分享事件
 * Body: { entity_type: string, entity_id: string, share_channel: string }
 */
shares.post("/track", async (c) => {
  try {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
    const db = createDb(c.env.DB);
    const { entity_type, entity_id, share_channel } = await c.req.json();

    if (!entity_type || !entity_id || !share_channel) {
      return c.json(APIErrors.badRequest("Missing required fields"), 400);
    }

    await db.insert(schema.shareEvents).values({
      id: generateId(),
      entityType: entity_type,
      entityId: entity_id,
      shareChannel: share_channel,
      userId: session?.user?.id || null,
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Track share error:", error);
    return c.json(APIErrors.internalError("Internal error"), 500);
  }
});

export { shares as sharesRoute };
