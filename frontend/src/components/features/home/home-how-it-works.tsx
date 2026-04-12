import { Search, Users, Compass } from "lucide-react";

import type { RefObject } from "react";

export function HomeHowItWorksSection({ sectionRef, isInView }: { sectionRef: RefObject<HTMLDivElement>; isInView: boolean }) {
  const steps = [
    { step: "01", icon: <Search className="h-7 w-7" />, emoji: "🗺️", title: "发现心仪地点", desc: "浏览精选目的地，咖啡馆、公园、山野、海岸一网打尽。查看路线信息和最佳季节，找到下一个想去的地方", color: "#D97706", bg: "rgba(217,119,6,0.08)", href: "/locations", cta: "浏览地点 →" },
    { step: "02", icon: <Users className="h-7 w-7" />, emoji: "👥", title: "找到同行伙伴", desc: "按地点筛选招募中的队伍，看看谁在等你。查看领队信息和成员构成，申请加入志同道合的小队", color: "#ff7a65", bg: "rgba(255,122,101,0.08)", href: "/teams", cta: "找队伍 →" },
    { step: "03", icon: <Compass className="h-7 w-7" />, emoji: "🎒", title: "一起出发", desc: "加入审批通过后，与队友约定集合时间，背起背包出发。或者自己发起一支，带领伙伴去你想去的地方", color: "#92400E", bg: "rgba(146,64,14,0.08)", href: "/teams/create", cta: "发起队伍 →" },
  ];

  return (
    <section ref={sectionRef} className={`py-20 section-hidden bg-muted/30 dark:bg-muted/10 ${isInView ? "section-visible" : ""}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block mb-4 px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-widest bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">使用流程</span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">三步开启户外之旅</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">极简流程，从发现到出发，最快 5 分钟</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((item) => (
            <div key={item.step} className="rounded-2xl p-7 bg-card flex flex-col"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)", transition: "transform 0.25s ease, box-shadow 0.25s ease" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-5px)"; el.style.boxShadow = `0 14px 36px rgba(30,24,18,0.10), 0 0 0 2px ${item.color}22`; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}>
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ background: item.bg }}>{item.emoji}</div>
                <span className="text-5xl font-black leading-none select-none" style={{ color: item.bg.replace("0.08", "0.18") }}>{item.step}</span>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: item.color }}>{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5">{item.desc}</p>
              <a href={item.href}>
                <button className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                  style={{ background: item.bg, color: item.color }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = item.color; el.style.color = "#fff"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = item.bg; el.style.color = item.color; }}>
                  {item.cta} →
                </button>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
