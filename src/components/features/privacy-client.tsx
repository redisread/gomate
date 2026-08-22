/**
 * 隐私政策页面组件
 */

import * as React from "react";
import { useI18n } from "@/hooks/useI18n";

interface PrivacySection {
  title: string;
  content?: string;
  items?: string[];
  footer?: string;
}

export function PrivacyClient() {
  const { t, getNsData } = useI18n(["nav", "content"]);

  const sections = React.useMemo<PrivacySection[]>(() => {
    const data = getNsData();
    const content = data?.content as Record<string, unknown> | undefined;
    const privacy = content?.privacy as Record<string, unknown> | undefined;
    const secs = privacy?.sections as PrivacySection[] | undefined;
    return Array.isArray(secs) && secs.length > 0 ? secs : [];
  }, [getNsData]);

  return (
    <div className="bg-stone-50 dark:bg-stone-900 min-h-screen">
      {/* Hero 区域 */}
      <div className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* 面包屑 */}
          <nav className="text-sm text-stone-400 dark:text-stone-500 mb-4">
            <a href="/" className="hover:text-amber-600 transition-colors">
              {t("nav.home")}
            </a>
            <span className="mx-2">/</span>
            <span className="text-stone-600 dark:text-stone-400">{t("content.privacy.pageTitle")}</span>
          </nav>

          <h1 className="text-3xl font-bold text-stone-800 dark:text-stone-200 mb-2">{t("content.privacy.pageTitle")}</h1>
          <p className="text-stone-500 dark:text-stone-400 mb-1">
            {t("content.privacy.pageSubtitle")}
          </p>
          <p className="text-sm text-stone-400 dark:text-stone-500">{t("content.privacy.lastUpdated")}</p>
        </div>
      </div>

      {/* 正文内容区 */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-400 mb-3 mt-8">
              {section.title}
            </h2>
            {section.content && (
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed mb-2">
                {section.content}
              </p>
            )}
            {section.items && (
              <ul className="list-disc list-inside space-y-1 text-stone-600 dark:text-stone-400">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.footer && (
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed mt-2">
                {section.footer}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
