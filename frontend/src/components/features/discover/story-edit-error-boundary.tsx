"use client";

import * as React from "react";

interface StoryEditErrorBoundaryProps {
  /** i18n 文案由调用方（函数组件可 useI18n）注入 */
  title: string;
  description: string;
  reloadLabel: string;
  children: React.ReactNode;
}

interface StoryEditErrorBoundaryState {
  hasError: boolean;
}

/**
 * task #149 ②：编辑页 island 崩溃兜底。
 * 任何渲染期异常（如 #147 期间 saveMessage.includes 的 TypeError）不再白屏，
 * 展示恢复 UI 引导重载——草稿自动保存（30s 间隔）通常能挽回未保存修改。
 */
export class StoryEditErrorBoundary extends React.Component<
  StoryEditErrorBoundaryProps,
  StoryEditErrorBoundaryState
> {
  state: StoryEditErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): StoryEditErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("StoryEditClient crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center space-y-4">
            <h2 className="font-semibold text-foreground">{this.props.title}</h2>
            <p className="text-sm text-muted-foreground">{this.props.description}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary px-4 py-2 text-sm"
            >
              {this.props.reloadLabel}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
