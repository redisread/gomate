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
  const { t, getNsData } = useI18n(["nav", "content"]);

  // 从 i18n 加载后的 FAQ 数据
  const faqItems = React.useMemo<FaqItem[]>(() => {
    const data = getNsData();
    const content = data?.content as Record<string, unknown> | undefined;
    const help = content?.help as Record<string, unknown> | undefined;
    const faq = help?.faq as FaqItem[] | undefined;
    return Array.isArray(faq) && faq.length > 0 ? faq : [];
  }, [getNsData]);

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
              <span className="text-foreground font-medium">{t("content.help.pageTitle")}</span>
            </nav>

            <h1 className="text-3xl font-bold text-foreground">{t("content.help.pageTitle")}</h1>
            <p className="mt-2 text-muted-foreground text-base">{t("content.help.pageSubtitle")}</p>
          </div>
        </div>

        {/* FAQ 列表 */}
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="flex flex-col gap-3">
            {faqItems.map((item, index) => (
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
            <h2 className="text-xl font-semibold text-foreground">{t("content.help.contactTitle")}</h2>
            <p className="mt-2 text-muted-foreground">
              {t("content.help.contactDesc")}
            </p>
            <a
              href="mailto:hello@gomate.live"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
            >
              <Mail className="w-4 h-4" />
              {t("content.help.contactBtn")}
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
