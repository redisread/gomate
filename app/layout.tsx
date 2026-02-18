import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { TeamsProvider } from "@/lib/teams-context";

export const metadata: Metadata = {
  title: "GoMate - 发现山野，组队同行",
  description:
    "GoMate 是一个极简的地点组队平台，探索深圳最美徒步路线，找到志同道合的户外伙伴。",
  keywords: ["徒步", "深圳", "户外", "组队", "搭子", "hiking", "shenzhen"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AuthProvider>
          <TeamsProvider>
            {children}
          </TeamsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

