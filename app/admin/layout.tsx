import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import Link from "next/link";
import { Mountain, MapPin, Users, Settings } from "lucide-react";

const navItems = [
  { href: "/admin/locations", label: "地点管理", icon: MapPin },
  // 未来可扩展其他管理模块
  // { href: "/admin/users", label: "用户管理", icon: Users },
  // { href: "/admin/settings", label: "系统设置", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 权限检查
  let isAuthenticated = false;
  let isAdmin = false;

  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user) {
      isAuthenticated = true;

      // 从数据库直接查询用户角色，因为 session.user 可能不包含自定义字段
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const { env } = await getCloudflareContext({ async: true });
      const db = drizzle(env.DB as D1Database, { schema });

      const users = await db
        .select({ role: schema.users.role })
        .from(schema.users)
        .where(eq(schema.users.id, session.user.id))
        .limit(1);

      isAdmin = users[0]?.role === "admin";
    }
  } catch (error) {
    console.error("[Admin Layout] Auth check failed:", error);
    isAuthenticated = false;
  }

  // 未登录或非管理员重定向到首页
  if (!isAuthenticated || !isAdmin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* 侧边栏 */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-stone-200 shadow-sm">
        <div className="p-4 border-b border-stone-200">
          <Link href="/" className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-stone-800" />
            <span className="text-lg font-bold text-stone-800">GoMate</span>
            <span className="text-xs bg-stone-800 text-white px-2 py-0.5 rounded">管理后台</span>
          </Link>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-stone-200">
          <Link
            href="/"
            className="block text-center text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            返回前台
          </Link>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
}