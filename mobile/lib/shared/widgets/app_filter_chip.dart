import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

// ============================================================
// AppFilterChip — 筛选标签组件
// 用于状态筛选、标签选择等场景
// ============================================================

/// 单个筛选 Chip
class AppFilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final IconData? icon;

  const AppFilterChip({
    super.key,
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: AppTokens.durationFast,
        padding: EdgeInsets.symmetric(
          horizontal: icon != null ? AppTokens.space3 : AppTokens.space4,
          vertical: AppTokens.space1 + 2,
        ),
        decoration: BoxDecoration(
          color: isSelected ? AppTokens.brandPrimaryLight : AppTokens.bgSurface,
          borderRadius: BorderRadius.circular(AppTokens.radiusFull),
          border: Border.all(
            color: isSelected ? AppTokens.brandPrimary : AppTokens.borderDefault,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: AppTokens.iconXS,
                color: isSelected
                    ? AppTokens.brandPrimary
                    : AppTokens.textTertiary,
              ),
              const SizedBox(width: 4),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: AppTokens.fontSizeS,
                fontWeight: isSelected
                    ? AppTokens.weightSemiBold
                    : AppTokens.weightRegular,
                color: isSelected
                    ? AppTokens.brandPrimary
                    : AppTokens.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 筛选 Chip 组（水平可滚动）
class AppFilterChipGroup<T> extends StatelessWidget {
  final List<({T value, String label, IconData? icon})> items;
  final T selectedValue;
  final ValueChanged<T> onChanged;
  final EdgeInsetsGeometry? padding;

  const AppFilterChipGroup({
    super.key,
    required this.items,
    required this.selectedValue,
    required this.onChanged,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: padding ??
          const EdgeInsets.symmetric(
            horizontal: AppTokens.paddingPageH,
            vertical: AppTokens.space2,
          ),
      child: Row(
        children: items.map((item) {
          return Padding(
            padding: const EdgeInsets.only(right: AppTokens.space2),
            child: AppFilterChip(
              label: item.label,
              isSelected: item.value == selectedValue,
              icon: item.icon,
              onTap: () => onChanged(item.value),
            ),
          );
        }).toList(),
      ),
    );
  }
}
