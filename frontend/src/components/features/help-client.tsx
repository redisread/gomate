"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Home, ChevronRight, Mail } from "lucide-react";
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
    <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="font-medium text-stone-800 dark:text-stone-200">{item.question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-stone-400 dark:text-stone-500 flex-shrink-0" />
        )}
      </button>

      {/* 展开区域，使用 max-height 过渡实现动画 */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? "300px" : "0px" }}
      >
        <p className="px-6 pb-5 pt-1 text-stone-600 dark:text-stone-400 leading-relaxed border-t border-stone-100 dark:border-stone-800">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

/** 帮助中心页主组件 */
export function HelpClient() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

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
              <span className="text-stone-700 dark:text-stone-300 font-medium">帮助中心</span>
            </nav>

            <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">帮助中心</h1>
            <p className="mt-2 text-stone-500 dark:text-stone-400 text-base">找到你需要的答案</p>
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
          <div className="mt-12 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm px-8 py-10">
            <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">还有其他问题？</h2>
            <p className="mt-2 text-stone-500 dark:text-stone-400">
              发送邮件给我们，我们会在 24 小时内回复
            </p>
            <a
              href="mailto:hello@gomate.live"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
            >
              <Mail className="w-4 h-4" />
              发送邮件
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
