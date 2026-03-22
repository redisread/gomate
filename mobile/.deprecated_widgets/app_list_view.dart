import 'package:flutter/material.dart';
import '../core/theme/app_tokens.dart';
import 'shimmer_loading.dart';
import 'app_button.dart';

/// 高性能列表组件（封装 ListView.builder）
///
/// 支持：
/// - 骨架屏加载状态（Shimmer）
/// - 空状态（EmptyState）
/// - 错误状态（ErrorState + 重试）
/// - 下拉刷新（RefreshIndicator）
/// - 上拉加载更多（LoadMore）
/// - 自定义 Shimmer 骨架构建器
class AppListView<T> extends StatelessWidget {
  const AppListView({
    super.key,
    required this.items,
    required this.itemBuilder,
    this.isLoading = false,
    this.hasError = false,
    this.errorMessage,
    this.isEmpty = false,
    this.emptyTitle,
    this.emptySubtitle,
    this.emptyIcon,
    this.onRefresh,
    this.onLoadMore,
    this.hasMore = false,
    this.isLoadingMore = false,
    this.shimmerCount = 4,
    this.shimmerItemBuilder,
    this.onRetry,
    this.padding,
    this.separatorBuilder,
    this.physics,
    this.shrinkWrap = false,
    this.header,
  });

  /// 数据列表
  final List<T> items;

  /// 列表项构建器
  final Widget Function(BuildContext context, T item, int index) itemBuilder;

  /// 初始加载中
  final bool isLoading;

  /// 是否有错误
  final bool hasError;

  /// 错误信息
  final String? errorMessage;

  /// 数据为空（且不在加载中）
  final bool isEmpty;

  /// 空状态标题
  final String? emptyTitle;

  /// 空状态副标题
  final String? emptySubtitle;

  /// 空状态图标
  final IconData? emptyIcon;

  /// 下拉刷新回调（null 则禁用）
  final Future<void> Function()? onRefresh;

  /// 加载更多回调
  final VoidCallback? onLoadMore;

  /// 是否还有更多数据
  final bool hasMore;

  /// 加载更多中
  final bool isLoadingMore;

  /// Shimmer 骨架数量
  final int shimmerCount;

  /// 自定义骨架构建器（null 时使用默认 ShimmerCard）
  final Widget Function(BuildContext context, int index)? shimmerItemBuilder;

  /// 重试回调
  final VoidCallback? onRetry;

  /// 列表内边距
  final EdgeInsetsGeometry? padding;

  /// 分隔符构建器
  final Widget Function(BuildContext context, int index)? separatorBuilder;

  /// 滚动物理效果
  final ScrollPhysics? physics;

  final bool shrinkWrap;

  /// 列表头部 Widget（可选）
  final Widget? header;

  @override
  Widget build(BuildContext context) {
    // ── 错误状态 ────────────────────────────────────
    if (hasError) {
      return _buildError(context);
    }

    // ── 初始加载骨架屏 ───────────────────────────────
    if (isLoading && items.isEmpty) {
      return _buildShimmer(context);
    }

    // ── 空状态 ───────────────────────────────────────
    if (isEmpty && !isLoading) {
      return _buildEmpty(context);
    }

    // ── 数据列表 ─────────────────────────────────────
    final listView = _buildList(context);

    if (onRefresh != null) {
      return RefreshIndicator(
        onRefresh: onRefresh!,
        color: AppTokens.colorPrimary,
        backgroundColor: AppTokens.colorBgSurface,
        strokeWidth: 2.5,
        child: listView,
      );
    }

    return listView;
  }

  Widget _buildList(BuildContext context) {
    // 计算总 item 数：数据 + 可能的底部加载更多
    final totalCount = items.length + (hasMore ? 1 : 0);

    Widget list;

    if (separatorBuilder != null) {
      list = ListView.separated(
        padding: padding ??
            const EdgeInsets.symmetric(
              horizontal: AppTokens.space16,
              vertical: AppTokens.space8,
            ),
        physics: physics ?? const AlwaysScrollableScrollPhysics(),
        shrinkWrap: shrinkWrap,
        itemCount: totalCount,
        separatorBuilder: separatorBuilder!,
        itemBuilder: (context, index) {
          if (index == items.length) {
            return _buildLoadMoreIndicator(context);
          }
          return itemBuilder(context, items[index], index);
        },
      );
    } else {
      list = ListView.builder(
        padding: padding ??
            const EdgeInsets.symmetric(
              horizontal: AppTokens.space16,
              vertical: AppTokens.space8,
            ),
        physics: physics ?? const AlwaysScrollableScrollPhysics(),
        shrinkWrap: shrinkWrap,
        itemCount: totalCount + (header != null ? 1 : 0),
        itemBuilder: (context, index) {
          if (header != null) {
            if (index == 0) return header!;
            index -= 1;
          }
          if (index == items.length) {
            return _buildLoadMoreIndicator(context);
          }
          return itemBuilder(context, items[index], index);
        },
      );
    }

    // 添加滚动到底部触发加载更多
    if (hasMore && onLoadMore != null) {
      return NotificationListener<ScrollNotification>(
        onNotification: (notification) {
          if (notification is ScrollEndNotification &&
              notification.metrics.extentAfter < 200 &&
              !isLoadingMore) {
            onLoadMore!();
          }
          return false;
        },
        child: list,
      );
    }

    return list;
  }

  Widget _buildLoadMoreIndicator(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppTokens.space24),
      child: Center(
        child: isLoadingMore
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    AppTokens.colorPrimary,
                  ),
                ),
              )
            : TextButton(
                onPressed: onLoadMore,
                child: const Text('加载更多'),
              ),
      ),
    );
  }

  Widget _buildShimmer(BuildContext context) {
    return ShimmerLoading(
      child: ListView.separated(
        padding: padding ??
            const EdgeInsets.symmetric(
              horizontal: AppTokens.space16,
              vertical: AppTokens.space8,
            ),
        physics: const NeverScrollableScrollPhysics(),
        itemCount: shimmerCount,
        separatorBuilder: (_, __) =>
            const SizedBox(height: AppTokens.space12),
        itemBuilder: shimmerItemBuilder ??
            (context, index) => const ShimmerCard(),
      ),
    );
  }

  Widget _buildEmpty(BuildContext context) {
    return Center(
      child: EmptyState(
        title: emptyTitle ?? '暂无内容',
        subtitle: emptySubtitle,
        icon: emptyIcon ?? Icons.inbox_outlined,
      ),
    );
  }

  Widget _buildError(BuildContext context) {
    return Center(
      child: ErrorStateWidget(
        message: errorMessage ?? '加载失败，请重试',
        onRetry: onRetry,
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────
//  空状态组件
// ──────────────────────────────────────────────────────────────────

/// 通用空状态展示组件
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.action,
  });

  final String title;
  final String? subtitle;
  final IconData? icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppTokens.space32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          // 图标容器
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppTokens.colorPrimaryContainer,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon ?? Icons.inbox_outlined,
              size: 36,
              color: AppTokens.colorPrimary,
            ),
          ),
          const SizedBox(height: AppTokens.space20),
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
            textAlign: TextAlign.center,
          ),
          if (subtitle != null) ...[
            const SizedBox(height: AppTokens.space8),
            Text(
              subtitle!,
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
          if (action != null) ...[
            const SizedBox(height: AppTokens.space24),
            action!,
          ],
        ],
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────
//  错误状态组件
// ──────────────────────────────────────────────────────────────────

/// 通用错误状态展示组件（含重试按钮）
class ErrorStateWidget extends StatelessWidget {
  const ErrorStateWidget({
    super.key,
    required this.message,
    this.onRetry,
    this.title,
  });

  final String message;
  final VoidCallback? onRetry;
  final String? title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppTokens.space32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppTokens.colorError.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.error_outline_rounded,
              size: 36,
              color: AppTokens.colorError,
            ),
          ),
          const SizedBox(height: AppTokens.space20),
          Text(
            title ?? '出错了',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppTokens.space8),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          if (onRetry != null) ...[
            const SizedBox(height: AppTokens.space24),
            AppButton(
              label: '重新加载',
              onPressed: onRetry,
              variant: AppButtonVariant.secondary,
              size: AppButtonSize.small,
              icon: Icons.refresh_rounded,
            ),
          ],
        ],
      ),
    );
  }
}
