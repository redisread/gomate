/**
 * 首次引导流 gating 与数据 hook。
 *
 * 触发条件（全满足才弹）：
 *   1. 已登录（匿名不触发）
 *   2. localStorage.onboardingDismissed !== "true"（未永久跳过）
 *   3. localStorage.onboardingSeen !== "true"（本设备未看过）
 *   4. hasAnyMembership === false（T1 端点返回；同时挡住老用户）
 *
 * 与首页引导卡共存：modal 一次性激活（注册时刻），引导卡常住兜底，
 * 两者不叠加 —— modal 关闭后首页引导卡判断照常（modal 不阻塞 local-circle 渲染，
 * 视觉上是 modal 遮罩盖在上面，关闭后引导卡自然可见）。
 */

import * as React from "react";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import type { SessionUser } from "@/lib/types";
import type { RecommendOnboardingResponse, PreferenceType } from "./types";

const LS_SEEN = "onboardingSeen";
const LS_DISMISSED = "onboardingDismissed";
const LS_PREFERENCE = "onboardingPreference";

export type OnboardingState =
  | { status: "checking" }
  | { status: "closed" }
  | { status: "open"; user: SessionUser; initial: RecommendOnboardingResponse };

export function markOnboardingSeen() {
  try {
    localStorage.setItem(LS_SEEN, "true");
  } catch {
    // 隐私模式等写失败静默（下次还会弹，可接受）
  }
}

export function markOnboardingDismissed() {
  try {
    localStorage.setItem(LS_DISMISSED, "true");
  } catch {
    // 同上
  }
}

export function saveOnboardingPreference(pref: PreferenceType | "") {
  try {
    localStorage.setItem(LS_PREFERENCE, pref);
  } catch {
    // 同上
  }
}

export async function fetchRecommend(type?: PreferenceType | ""): Promise<RecommendOnboardingResponse | null> {
  const url = type ? `/teams/recommend-onboarding?activityType=${encodeURIComponent(type)}` : "/teams/recommend-onboarding";
  const res = await fetchAPI(url);
  if (!res.ok) return null;
  return (await res.json()) as RecommendOnboardingResponse;
}

export function useOnboardingGate(): OnboardingState {
  const [state, setState] = React.useState<OnboardingState>({ status: "checking" });

  React.useEffect(() => {
    let cancelled = false;

    // 本地门禁先行（不打扰已看过/永久关闭的用户，零请求）
    try {
      if (localStorage.getItem(LS_DISMISSED) === "true" || localStorage.getItem(LS_SEEN) === "true") {
        setState({ status: "closed" });
        return;
      }
    } catch {
      // localStorage 不可读 → 当作未看过继续（fetch 失败也会 closed 兜底）
    }

    (async () => {
      // 1. 登录态（匿名不触发）
      const user = await fetchCurrentUser(); // 静默失败，不跳转
      if (cancelled) return;
      if (!user) return setState({ status: "closed" });

      // 2. hasAnyMembership gating（spec §3.1 条件 4；顺带拿到无 type 候选池供「都可以」用）
      const initial = await fetchRecommend();
      if (cancelled) return;
      if (!initial || initial.hasAnyMembership) return setState({ status: "closed" });

      setState({ status: "open", user, initial });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
