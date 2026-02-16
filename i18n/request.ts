import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "./utils";

export default getRequestConfig(async () => {
  // 获取用户语言偏好
  const locale = await getUserLocale();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
