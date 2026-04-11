"use client";

import * as React from "react";
import { Mountain, Mail, Heart, Users, MapPin, Home, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

/** 关于我们页主组件 */
export function AboutClient() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero 区域 */}
        <div className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700">
          <div className="max-w-3xl mx-auto px-6 py-10">
            {/* 面包屑 */}
            <nav className="flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400 mb-4">
              <a
                href="/"
                className="flex items-center gap-1 hover:text-amber-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>首页</span>
              </a>
              <ChevronRight className="w-4 h-4" />
              <span className="text-stone-700 dark:text-stone-300 font-medium">关于我们</span>
            </nav>

            <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">关于 GoMate</h1>
            <p className="mt-2 text-stone-500 dark:text-stone-400 text-base">
              发现有趣的地方，找到同行的人
            </p>
          </div>
        </div>

        {/* 正文内容 */}
        <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">

          {/* 品牌介绍 */}
          <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm px-8 py-8">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)" }}
              >
                <Mountain className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">我们是谁</h2>
            </div>
            <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
              GoMate 是一个极简的「地点组队」平台，专注于深圳徒步场景。
              我们相信，最好的旅途需要最合适的同伴。无论你是想征服梧桐山、
              漫步七娘山，还是探索深圳周边的无名小径，GoMate 都能帮你找到
              志同道合的徒步伙伴。
            </p>
          </section>

          {/* 核心特色 */}
          <section>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">我们在做什么</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
                  title: "发现地点",
                  desc: "精选深圳及周边徒步路线，附带难度、距离、最佳季节等实用信息",
                },
                {
                  icon: <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
                  title: "组建队伍",
                  desc: "发布或加入队伍，按时间、难度筛选，找到节奏相符的同行者",
                },
                {
                  icon: <Heart className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
                  title: "收藏路线",
                  desc: "收藏心仪地点，随时回顾，规划下一次出行",
                },
              ].map(({ icon, title, desc }) => (
                <div
                  key={title}
                  className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm px-5 py-5"
                >
                  <div className="mb-3">{icon}</div>
                  <h3 className="font-medium text-stone-900 dark:text-stone-100 mb-1">{title}</h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 联系我们 */}
          <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm px-8 py-8 text-center">
            <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">联系我们</h2>
            <p className="mt-2 text-stone-500 dark:text-stone-400">
              有任何建议、合作意向或问题，欢迎发邮件给我们
            </p>
            <a
              href="mailto:hi@gomate.live"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
            >
              <Mail className="w-4 h-4" />
              hi@gomate.live
            </a>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
