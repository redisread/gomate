import * as React from "react";
import { useI18n } from "@/hooks/useI18n";

interface TermsSection {
  title: string;
  content?: string;
  items?: string[];
  footer?: string;
  isDisclaimer?: boolean;
}

export function TermsClient() {
  const { t, getNsData } = useI18n(["nav", "content"]);

  const sections = React.useMemo<TermsSection[]>(() => {
    const data = getNsData();
    const content = data?.content as Record<string, unknown> | undefined;
    const terms = content?.terms as Record<string, unknown> | undefined;
    const secs = terms?.sections as TermsSection[] | undefined;
    return Array.isArray(secs) && secs.length > 0 ? secs : [];
  }, [getNsData]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
      {/* Hero 区域 */}
      <div className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700">
        <div className="max-w-3xl mx-auto px-6 py-12">
          {/* 面包屑 */}
          <nav className="text-sm text-stone-400 dark:text-stone-500 mb-6">
            <a href="/" className="hover:text-amber-600 transition-colors">{t("nav.home")}</a>
            <span className="mx-2">/</span>
            <span className="text-stone-600 dark:text-stone-400">{t("content.terms.pageTitle")}</span>
          </nav>
          <h1 className="text-3xl font-bold text-foreground mb-3">{t("content.terms.pageTitle")}</h1>
          <p className="text-stone-500 dark:text-stone-400 mb-2">{t("content.terms.pageSubtitle")}</p>
          <p className="text-sm text-stone-400 dark:text-stone-500">{t("content.terms.lastUpdated")}</p>
        </div>
      </div>

      {/* 正文内容区 */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-400 mb-3 mt-8">
              {section.title}
            </h2>
            {section.isDisclaimer ? (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4">
                {section.content && (
                  <p className="text-stone-600 dark:text-stone-400 leading-relaxed font-medium mb-3">
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
              </div>
            ) : (
              <>
                {section.content && (
                  <p className="text-stone-600 dark:text-stone-400 leading-relaxed mb-3">
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
                  <p className="text-stone-600 dark:text-stone-400 leading-relaxed mt-3">
                    {section.footer}
                  </p>
                )}
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
