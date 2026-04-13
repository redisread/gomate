"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Home, ChevronRight, Mail } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

/** FAQ 条目类型 */
interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "如何加入一支队伍？",
    answer:
      "在队伍详情页点击「申请加入」，等待队长审核通过后即可加入。",
  },
  {
    question: "如何创建自己的队伍？",
    answer:
      "登录后点击导航栏「创建队伍」，填写队伍信息、出发时间、人数限制等，发布后其他用户即可申请加入。",
  },
  {
    question: "如何与队长取得联系？",
    answer:
      "目前可在队伍详情页查看队长信息，通过站外方式联系。我们正在开发站内消息功能，敬请期待。",
  },
  {
    question: "队伍状态分别代表什么？",
    answer:
      "招募中（正在接受申请）、已满员（人数已达上限）、已成行（队伍确认出发）、已取消（活动取消）、已完成（活动结束）。",
  },
  {
    question: "如何修改个人资料？",
    answer:
      "登录后点击右上角头像，进入「个人中心」，点击「编辑资料」即可修改昵称、简介、徒步等级等信息。",
  },
  {
    question: "忘记密码怎么办？",
    answer:
      "在登录页点击「忘记密码」，输入注册邮箱，系统会发送重置密码邮件。",
  },
];

/** 单个 accordion 条目 */
function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-accent transition-colors"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="font-medium text-foreground">{item.question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* 展开区域，使用 max-height 过渡实现动画 */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? "300px" : "0px" }}
      >
        <p className="px-6 pb-5 pt-1 text-muted-foreground leading-relaxed border-t border-border">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

/** 帮助中心页主组件 */
export function HelpClient() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const { t } = useI18n();

  const handleToggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero 区域 */}
        <div className="bg-background border-b border-border">
          <div className="max-w-3xl mx-auto px-6 py-10">
            {/* 面包屑 */}
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
              <a
                href="/"
                className="flex items-center gap-1 hover:text-amber-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>{t("nav.home")}</span>
              </a>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium">{t("help.pageTitle")}</span>
            </nav>

            <h1 className="text-3xl font-bold text-foreground">{t("help.pageTitle")}</h1>
            <p className="mt-2 text-muted-foreground text-base">{t("help.pageSubtitle")}</p>
          </div>
        </div>

        {/* FAQ 列表 */}
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="flex flex-col gap-3">
            {FAQ_ITEMS.map((item, index) => (
              <FaqAccordionItem
                key={index}
                item={item}
                isOpen={openIndex === index}
                onToggle={() => handleToggle(index)}
              />
            ))}
          </div>

          {/* 底部 CTA */}
          <div className="mt-12 text-center bg-card rounded-2xl border border-border shadow-sm px-8 py-10">
            <h2 className="text-xl font-semibold text-foreground">{t("help.contactTitle")}</h2>
            <p className="mt-2 text-muted-foreground">
              {t("help.contactDesc")}
            </p>
            <a
              href="mailto:hello@gomate.live"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
            >
              <Mail className="w-4 h-4" />
              {t("help.contactBtn")}
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
