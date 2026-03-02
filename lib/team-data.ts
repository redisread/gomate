/**
 * 服务端数据获取函数
 * 用于 generateMetadata 和 SSR
 */

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext({ async: true });
};

export interface TeamMetadata {
  id: string;
  title: string;
  description: string | null;
  locationId: string;
  location?: {
    name: string;
    coverImage: string;
    difficulty: string;
  };
  leader?: {
    name: string;
  };
}

/**
 * 获取队伍数据用于 metadata 生成
 * 在服务端调用，用于 generateMetadata
 */
export async function getTeamForMetadata(id: string): Promise<TeamMetadata | null> {
  try {
    const { env } = await getCloudflareContext();

    if (!env.DB) {
      console.error("Database not configured");
      return null;
    }

    const db = env.DB as D1Database;

    // 使用 Drizzle ORM 查询
    const { drizzle } = await import("drizzle-orm/d1");
    const schema = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const ormDb = drizzle(db, { schema });

    const teams = await ormDb.query.teams.findMany({
      where: eq(schema.teams.id, id),
      with: {
        location: true,
        leader: true,
      },
      limit: 1,
    });

    const team = teams[0];

    if (!team) {
      return null;
    }

    return {
      id: team.id,
      title: team.title,
      description: team.description,
      locationId: team.locationId,
      location: team.location
        ? {
            name: team.location.name,
            coverImage: team.location.coverImage,
            difficulty: team.location.difficulty,
          }
        : undefined,
      leader: team.leader
        ? {
            name: team.leader.name,
          }
        : undefined,
    };
  } catch (error) {
    console.error("Error fetching team for metadata:", error);
    return null;
  }
}