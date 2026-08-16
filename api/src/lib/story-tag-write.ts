import { generateId } from "./id";

export interface StoryTagWriteCommand {
  storyId: string;
  tags: string[];
  now: number;
}

function tagSlug(name: string): string {
  return encodeURIComponent(name.normalize("NFKC").toLocaleLowerCase("en-US"));
}

export function createStoryTagWriteStatements(
  db: D1Database,
  command: StoryTagWriteCommand,
  writeGateId?: string,
): D1PreparedStatement[] {
  const { storyId, tags, now } = command;
  const writeGateClause = writeGateId
    ? `
      AND EXISTS (
        SELECT 1 FROM tags AS story_tag_write_gate
        WHERE story_tag_write_gate.id = ?
      )
    `
    : "";
  const writeGateBindings = writeGateId ? [writeGateId] : [];

  return tags.flatMap((name) => {
    const slug = tagSlug(name);
    const createTag = db
      .prepare(
        `
          INSERT INTO tags (id, name, slug, created_at)
          SELECT ?, ?, ?, ?
          WHERE EXISTS (SELECT 1 FROM stories WHERE id = ?)
          ${writeGateClause}
          ON CONFLICT(slug) DO NOTHING
        `,
      )
      .bind(
        generateId(),
        name,
        slug,
        now,
        storyId,
        ...writeGateBindings,
      );
    const linkTag = db
      .prepare(
        `
          INSERT INTO story_tags (story_id, tag_id, created_at)
          SELECT ?, id, ? FROM tags
          WHERE slug = ? AND EXISTS (SELECT 1 FROM stories WHERE id = ?)
          ${writeGateClause}
          ON CONFLICT(story_id, tag_id) DO NOTHING
        `,
      )
      .bind(storyId, now, slug, storyId, ...writeGateBindings);
    return [createTag, linkTag];
  });
}

/**
 * Keeps a conditional Story UPDATE and its tag replacement in one D1 batch.
 * The first statement after UPDATE materializes SQLite changes() as a unique,
 * transaction-local gate. A zero-row UPDATE therefore makes every tag write a
 * no-op, while any later SQL failure still rolls the entire D1 batch back.
 */
export function createStoryTagUpdateBatch(
  db: D1Database,
  updateStory: D1PreparedStatement,
  command: StoryTagWriteCommand,
): D1PreparedStatement[] {
  const { storyId, now } = command;
  const writeGateId = generateId();
  const writeGateValue = `story-tag-write-gate:${writeGateId}`;

  return [
    updateStory,
    db
      .prepare(
        `
          INSERT INTO tags (id, name, slug, created_at)
          SELECT ?, ?, ?, ?
          WHERE changes() = 1
        `,
      )
      .bind(writeGateId, writeGateValue, writeGateValue, now),
    db
      .prepare(
        `
          DELETE FROM story_tags
          WHERE story_id = ?
            AND EXISTS (
              SELECT 1 FROM tags AS story_tag_write_gate
              WHERE story_tag_write_gate.id = ?
            )
        `,
      )
      .bind(storyId, writeGateId),
    ...createStoryTagWriteStatements(db, command, writeGateId),
    db.prepare("DELETE FROM tags WHERE id = ?").bind(writeGateId),
  ];
}
