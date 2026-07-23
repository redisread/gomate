/**
 * 邮件模板国际化加载器
 *
 * 从内嵌 JSON 文件加载多语言邮件模板，支持 locale 回退到 zh-CN。
 */

import emailZhCn from "./locales/email.zh-CN.json";
import emailEn from "./locales/email.en.json";
import emailJa from "./locales/email.ja.json";

export type EmailLocale = "zh-CN" | "en" | "ja";
export type EmailType = "passwordReset" | "welcome" | "contactForm" | "feedback" | "teamJoinApplication" | "applicationApproved";

const EMAIL_TEMPLATES: Record<EmailLocale, Record<string, unknown>> = {
  "zh-CN": emailZhCn as unknown as Record<string, unknown>,
  en: emailEn as unknown as Record<string, unknown>,
  ja: emailJa as unknown as Record<string, unknown>,
};

/**
 * 替换模板字符串中的 {variable} 占位符
 */
function interpolate(template: string, vars?: Record<string, string>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return key in vars ? vars[key]! : match;
  });
}

/**
 * 从嵌套对象中通过点号路径获取值
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}

/**
 * 获取指定 locale 的邮件模板数据
 * 如果 locale 无效，回退到 zh-CN
 */
function getTemplateData(locale: EmailLocale): Record<string, unknown> {
  if (!EMAIL_TEMPLATES[locale]) {
    console.warn(`[Email i18n] Invalid locale "${locale}", falling back to zh-CN`);
  }
  return EMAIL_TEMPLATES[locale] ?? EMAIL_TEMPLATES["zh-CN"];
}

/**
 * 获取邮件模板中的某个字段值
 *
 * @param locale 用户语言
 * @param type 邮件类型
 * @param field 字段路径（如 "subject"、"greeting"）
 * @param vars 变量替换
 * @returns 翻译后的字符串
 */
export function getEmailField(
  locale: EmailLocale,
  type: EmailType,
  field: string,
  vars?: Record<string, string>,
): string {
  const data = getTemplateData(locale);
  const typeData = (data[type] as Record<string, unknown>) ?? {};
  const rawValue = getNestedValue(typeData, field);
  const fallbackValue = rawValue ?? `{{${type}.${field}}}`;
  return interpolate(rawValue ?? fallbackValue, vars);
}

/**
 * 获取完整的邮件模板内容
 *
 * @param locale 用户语言
 * @param type 邮件类型
 * @returns 包含 subject 和模板字段的对象
 */
export function getEmailTemplate(locale: EmailLocale, type: EmailType): Record<string, unknown> {
  const data = getTemplateData(locale);
  return ((data[type] as Record<string, unknown>) ?? {});
}
