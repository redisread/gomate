# 字体子集化优化指南

## 问题

当前字体文件较大：
- `noto-sans-400.woff2`: ~1.2MB
- `noto-sans-700.woff2`: ~1.2MB
- `zpix-400.woff2`: ~0.8MB

总计 ~3.2MB，每次生成分享图都要加载。

## 解决方案

### 方案 1: Google Fonts 动态子集（推荐用于 CDN）

使用 Google Fonts 的 `text` 参数加载指定字符子集：

```
https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap&text=指定字符
```

### 方案 2: 手动子集化（推荐用于 R2）

使用 `glyphhanger` 工具：

```bash
# 安装
npm install -g glyphhanger

# 子集化（常用3500汉字）
glyphhanger \
  --subset=assets/fonts/noto-sans-400.woff2 \
  --characters="常用汉字列表" \
  --output=assets/fonts/noto-sans-400-subset.woff2
```

### 方案 3: 自动按需加载（已实现）

当前已实现字体并行加载和内存缓存（5分钟），可大幅减少重复请求。

## 常用字符范围

分享图使用字符：
- 数字：0-9
- 字母：A-Z, a-z（少量）
- 常用标点：，。！？：；（）【】
- 核心汉字：
  - 地点名称常用字
  - 队伍相关：队、伍、行、程、难、度、时、间
  - 状态词：招、募、满、员、成、行

## 实施建议

1. **短期**：使用当前并行加载 + 内存缓存（已实现）
2. **中期**：分析实际使用字符，生成自定义子集
3. **长期**：接入 Google Fonts 动态子集 API

## 参考

- [glyphhanger](https://github.com/filamentgroup/glyphhanger)
- [Google Fonts 动态子集](https://developers.google.com/fonts/docs/getting_started#optimizing_your_font_requests)
- [Web Font Optimization](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/web-font-optimization)
