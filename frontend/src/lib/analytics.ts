/**
 * 数据埋点 SDK
 * 封装事件追踪方法，统一上报到数据分析平台
 */

type EventType =
  // 队伍详情页相关
  | "team_detail_view"
  | "join_button_click"
  | "join_modal_open"
  | "join_form_submit"
  | "join_success"
  | "join_fail"
  | "share_button_click"
  | "view_member_profile"
  | "approve_application"
  | "reject_application"
  // 其他页面事件可在此扩展
  | string;

interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

interface AnalyticsConfig {
  debug?: boolean;
  endpoint?: string;
}

class Analytics {
  private debug: boolean;
  private endpoint: string;
  private queue: Array<{
    event: EventType;
    properties?: EventProperties;
    timestamp: number;
  }> = [];
  private isInitialized = false;

  constructor(config: AnalyticsConfig = {}) {
    this.debug = config.debug ?? process.env.NODE_ENV === "development";
    this.endpoint = config.endpoint ?? "/api/analytics";
    this.isInitialized = true;
  }

  /**
   * 追踪事件
   */
  track(event: EventType, properties?: EventProperties): void {
    const eventData = {
      event,
      properties: {
        ...properties,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    // 添加到队列
    this.queue.push(eventData);

    // 开发环境打印日志
    if (this.debug) {
      console.log(`[Analytics] ${event}`, properties);
    }

    // 批量上报（防抖）
    this.flush();
  }

  /**
   * 批量上报事件
   */
  private flush(): void {
    if (this.queue.length === 0) return;

    // 使用 requestIdleCallback 或 setTimeout 延迟上报
    const flushData = async () => {
      const events = [...this.queue];
      this.queue = [];

      try {
        // 如果有真实的数据分析平台，可以发送到后端
        // await fetch(this.endpoint, {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({ events }),
        // });

        // 暂时只在开发环境打印
        if (this.debug) {
          console.log("[Analytics] Flushed events:", events.length);
        }
      } catch (error) {
        console.error("[Analytics] Failed to flush events:", error);
        // 失败时重新加入队列
        this.queue.unshift(...events);
      }
    };

    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(flushData);
    } else {
      setTimeout(flushData, 1000);
    }
  }

  /**
   * 页面浏览追踪
   */
  pageView(pageName: string, properties?: EventProperties): void {
    this.track("page_view", { pageName, ...properties });
  }

  /**
   * 设置用户属性
   */
  setUserProperties(userId: string, properties: EventProperties): void {
    if (this.debug) {
      console.log(`[Analytics] Set user properties for ${userId}:`, properties);
    }
    // 可以存储到 localStorage 或发送到分析平台
  }

  /**
   * 获取统计信息
   */
  getStats(): { queueLength: number } {
    return {
      queueLength: this.queue.length,
    };
  }
}

// 单例实例
let analyticsInstance: Analytics | null = null;

/**
 * 获取 Analytics 实例
 */
export function getAnalytics(config?: AnalyticsConfig): Analytics {
  if (!analyticsInstance) {
    analyticsInstance = new Analytics(config);
  }
  return analyticsInstance;
}

/**
 * 便捷方法：追踪事件
 */
export function trackEvent(
  event: EventType,
  properties?: EventProperties
): void {
  const analytics = getAnalytics();
  analytics.track(event, properties);
}

/**
 * 便捷方法：页面浏览
 */
export function trackPageView(
  pageName: string,
  properties?: EventProperties
): void {
  const analytics = getAnalytics();
  analytics.pageView(pageName, properties);
}

// 导出预定义的事件追踪函数

export const teamAnalytics = {
  /** 队伍详情页浏览 */
  viewTeam: (teamId: string, teamTitle: string) =>
    trackEvent("team_detail_view", { teamId, teamTitle }),

  /** 点击申请加入按钮 */
  clickJoinButton: (teamId: string) =>
    trackEvent("join_button_click", { teamId }),

  /** 打开申请加入弹窗 */
  openJoinModal: (teamId: string) =>
    trackEvent("join_modal_open", { teamId }),

  /** 提交加入申请 */
  submitJoinForm: (teamId: string, hasMessage: boolean) =>
    trackEvent("join_form_submit", { teamId, hasMessage }),

  /** 加入成功 */
  joinSuccess: (teamId: string) => trackEvent("join_success", { teamId }),

  /** 加入失败 */
  joinFail: (teamId: string, error: string) =>
    trackEvent("join_fail", { teamId, error }),

  /** 点击分享按钮 */
  clickShare: (teamId: string, shareMethod?: string) =>
    trackEvent("share_button_click", { teamId, shareMethod }),

  /** 查看成员资料 */
  viewMember: (teamId: string, memberId: string) =>
    trackEvent("view_member_profile", { teamId, memberId }),

  /** 批准申请 */
  approveApplication: (teamId: string, applicantId: string) =>
    trackEvent("approve_application", { teamId, applicantId }),

  /** 拒绝申请 */
  rejectApplication: (teamId: string, applicantId: string) =>
    trackEvent("reject_application", { teamId, applicantId }),
};