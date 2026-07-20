# gomate P0-B T4: admin form field layout patch spec v1.0

> 触发: Martin msg=b73c46d3 ask - 为 Jeff 起手 P0-B T4 admin 录入 UI 提供字段布局视觉参考
> 依据: notes/gomate-p0b-location-decision-spec.md (现有 4 字段: parkingAvailable / parkingInfo / gearEssential[] / gearOptional[]) + 现有 admin 编辑页 (location-edit-client.tsx + location-form/\*)
> 设计者: @Steven
> 范围: 仅新增 admin 编辑页 4 个字段的输入组件规范; 不改架构、不改现有 3 个 SectionCard
> 交付给: Jeff

---

## 0. 结论先行

**沿用现有 SectionCard/Field/styledInput 模式, 新增第 4 个 SectionCard "决策信息" 放在 "设置" 之后.**

现有 admin 编辑页结构 (location-edit-client.tsx:466-472):

- 基本信息 (Basic Fields)
- 内容 (Content)
- 设置 (Settings)
- **决策信息 (新增, 本 spec)**

**为什么单开而非塞进 Settings**:

- 4 字段 (停车 tri-state + 停车文本 + 装备必备 + 装备可选) 逻辑独立、面向决策场景
- 塞进 Settings 会让 Settings 卡片臃肿 (当前已有 season/tags/facilities 3 组)
- 独立卡片视觉与"地点详情页决策信息块"呼应, 运营心智一致

---

## 1. 视觉规范

### 1.1 SectionCard 头

沿用现有 SectionCard 组件 (location-form-basic-fields.tsx:24-49), props:

```tsx
<SectionCard
  icon={<Backpack className="h-4 w-4" />}
  title={t("admin.decisionInfoTitle")}
  defaultOpen={true}
  collapsible={true}
>
  {/* 4 个 Field 组成 */}
</SectionCard>
```

- Icon 用 lucide-react 的 `Backpack`
- Icon 色: `text-amber-600 dark:text-amber-400` (若 P2 primary token realign 已 merge, 可改 `text-primary`; 本 spec 不阻塞 P2)
- Icon 底色: `background: "rgba(217,119,6,0.1)"` (10% amber-600, 现有约定; P2 merge 后再统一为 `rgba(180,83,9,0.1)` 即可)
- Title: `text-sm font-semibold text-stone-800`

### 1.2 4 字段布局顺序

字段顺序: 停车 (必答) → 停车说明 (条件性) → 必备装备 (必答) → 可选装备 (选答). 用户从"是否能到"过渡到"到了要带什么", 决策路径顺.

---

## 2. 每字段规范

### 2.1 停车情况 (parkingAvailable, tri-state)

**组件**: 三选按钮组 (segmented control), 不用 select/dropdown 因值只有 3 且需一眼看到.

**视觉**:

```tsx
<div className="grid grid-cols-3 gap-2">
  {[
    { value: true, label: "✓ 有", accent: "amber" },
    { value: false, label: "✗ 无", accent: "stone" },
    { value: null, label: "? 未知", accent: "stone" },
  ].map((opt) => (
    <button
      type="button"
      onClick={() => updateField("parkingAvailable", opt.value)}
      className={cn(
        "px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border",
        formData.parkingAvailable === opt.value
          ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
          : "bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-300",
      )}
    >
      {opt.label}
    </button>
  ))}
</div>
```

**规则**:

- 默认值 `null` (未知), 保存时不强制必填 (schema 已允许 null)
- 但 UI 层建议 hint: "请选择一个状态, 有助于用户决策"
- 选择"无"或"未知"时, 下方 `parkingInfo` 字段禁用 (styledInput + `disabled` + opacity-50 + cursor-not-allowed)

### 2.2 停车说明 (parkingInfo, string)

**组件**: 单行输入 (textarea 过重, 一句话就够), 沿用 `styledInput` 样式.

```tsx
<Field
  label={t("admin.parkingInfoLabel")}
  hint={t("admin.parkingInfoHint")} // "例: 景区门口有免费停车场 (50 位)"
>
  <input
    type="text"
    value={formData.parkingInfo}
    onChange={(e) => updateField("parkingInfo", e.target.value)}
    disabled={formData.parkingAvailable !== true}
    maxLength={80}
    placeholder={t("admin.parkingInfoPlaceholder")}
    className={cn(
      styledInput(),
      formData.parkingAvailable !== true && "opacity-50 cursor-not-allowed",
    )}
  />
</Field>
```

**规则**:

- 仅在 `parkingAvailable === true` 时可编辑
- `maxLength=80`, 一句话
- 无 required, 允许空 (用户可能只知道"有"但说不清具体信息)

### 2.3 必备装备 (gearEssential, string[])

**组件**: 沿用现有 `ChipInput` 组件 (frontend/src/components/ui/chip-input.tsx).

```tsx
<Field
  label={t("admin.gearEssentialLabel")}
  required
  hint={t("admin.gearEssentialHint")} // "1-8 项, 例: 登山鞋、2L 水、防晒霜"
  error={errors.gearEssential}
>
  <ChipInput
    value={formData.gearEssential}
    onChange={(v) => updateField("gearEssential", v)}
    placeholder={t("admin.gearEssentialPlaceholder")} // "输入后回车添加"
    maxItems={8}
  />
</Field>
```

**规则**:

- `required: true` (装备清单是决策核心, 不填等于没做录入)
- 前端校验: `gearEssential.length >= 1 && <= 8`
- Chip 视觉沿用 chip-input.tsx:131: `bg-amber-100 dark:bg-amber-900/40 text-amber-800 rounded-full text-xs px-2.5 py-1 font-medium`
- 单项字符限制: 12 字符 (客户端截断 + 提示)

### 2.4 可选装备 (gearOptional, string[])

**组件**: 同 §2.3, 但 `required=false`.

```tsx
<Field
  label={t("admin.gearOptionalLabel")}
  hint={t("admin.gearOptionalHint")} // "0-8 项, 例: 登山杖、护膝、头灯"
>
  <ChipInput
    value={formData.gearOptional}
    onChange={(v) => updateField("gearOptional", v)}
    placeholder={t("admin.gearOptionalPlaceholder")}
    maxItems={8}
  />
</Field>
```

**规则**:

- Chip 视觉与必备装备区分: 用 `bg-stone-100 text-stone-700` (中性色, 表示"次要")
- 允许为空

---

## 3. i18n

**命名约定 (2026-07-21 Jeff commit c5db586 落地时确认)**: i18n key 命名**以仓库现有 `admin.json` 的 flat `form*` 前缀为准** (如 `formDecisionTitle` / `formParkingLabel` / `formGearEssentialLabel` 等), 不拆成 `admin.decisionInfoTitle` / `admin.parkingLabel` 分组式命名. 下方 keys 仅示意**语义与文案**, 命名以现有 pattern 为准.

新增 `admin.*` keys (三语):

```
admin.decisionInfoTitle    = "决策信息" / "Decision Info" / "判断情報"
admin.parkingLabel         = "停车情况" / "Parking" / "駐車場"
admin.parkingYes           = "✓ 有" / "✓ Yes" / "✓ あり"
admin.parkingNo            = "✗ 无" / "✗ No" / "✗ なし"
admin.parkingUnknown       = "? 未知" / "? Unknown" / "? 不明"
admin.parkingHint          = "请选择一个状态, 有助于用户决策" / "..."
admin.parkingInfoLabel     = "停车说明 (可选)" / "Parking notes (optional)" / "駐車場詳細"
admin.parkingInfoPlaceholder = "例: 景区门口免费停车场 (50 位)" / "..." / "..."
admin.parkingInfoHint      = "简短一句话说明, 最多 80 字" / "..." / "..."
admin.gearEssentialLabel   = "必备装备" / "Essential gear" / "必須装備"
admin.gearEssentialHint    = "1-8 项, 例: 登山鞋、2L 水、防晒霜" / "..." / "..."
admin.gearEssentialPlaceholder = "输入后回车添加" / "Enter to add" / "..."
admin.gearOptionalLabel    = "可选装备" / "Optional gear" / "推奨装備"
admin.gearOptionalHint     = "0-8 项, 例: 登山杖、护膝、头灯" / "..." / "..."
admin.gearOptionalPlaceholder = "输入后回车添加" / "Enter to add" / "..."
```

---

## 4. 校验规则 (前端)

- `parkingAvailable`: 允许 null (未知)
- `parkingInfo`: 最多 80 字符; `parkingAvailable !== true` 时忽略
- `gearEssential`: 1-8 项, 每项 1-12 字符; **required, 不填不给保存**
- `gearOptional`: 0-8 项, 每项 1-12 字符

hook 层校验 (`use-location-form.ts`) 加:

```ts
if (formData.gearEssential.length === 0)
  errors.gearEssential = t("admin.gearEssentialErrorEmpty");
if (formData.gearEssential.length > 8)
  errors.gearEssential = t("admin.gearEssentialErrorMax");
```

### 4.1 UI 约束 vs API 约束 (故意分歧, 保留)

API 侧 (`api/src/lib/validation.ts:createLocationSchema`, T2 已实现):

| 字段                              | UI (本 spec)     | API 实际     | 说明                                     |
| --------------------------------- | ---------------- | ------------ | ---------------------------------------- |
| `parkingInfo` max chars           | 80               | 100          | UI 更严, 引导简短; API 100 兜底存量兼容  |
| `gearEssential/Optional` maxItems | 8                | 10           | UI 更严, 让运营专注 top 8; API 10 兜底   |
| 每项字符                          | 12               | 20           | UI 更严, 保持 chip 视觉紧凑; API 20 兜底 |
| `gearEssential` required          | **required 1-8** | **optional** | ⚠️ 决策不一致, 保留                      |

**架构决策 (Martin msg=bd74beb0 拍板)**:

- **UI required + API optional** 是合理设计:
  - **API optional 是为兼容存量数据** — 旧 locations 未填装备清单, DB 不能强推 not-null
  - **UI required 是新建/编辑场景强推** — 新数据必须填 1-8 项装备, 保证决策信息完整
- 本 spec 落地时 **不改** `api/src/lib/validation.ts` — API 校验不变
- 若未来 API 也想强推, 需要先做数据回填 + 迁移, 另开 spec

---

## 5. 预览面板 (PreviewPanel) 联动

`location-edit-client.tsx:341` 的 PreviewPanel 已经显示 bestSeason 等字段. **本 spec 建议**: 决策信息 4 字段**不进预览面板** (预览应保持"用户看到什么"的模拟, 装备清单在地点详情页决策信息块渲染, 预览可以不展示以避免 preview 卡片过高).

若 Jeff 落地时觉得需要预览, 简约版:

```tsx
{
  data.parkingAvailable === true && (
    <span className="text-xs text-stone-500">
      🅿️ {t("admin.previewParkingYes")}
    </span>
  );
}
{
  data.gearEssential.length > 0 && (
    <div className="flex flex-wrap gap-1 pt-1">
      {data.gearEssential.slice(0, 3).map((g) => (
        <span
          key={g}
          className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full"
        >
          🎒 {g}
        </span>
      ))}
      {data.gearEssential.length > 3 && (
        <span className="text-xs text-stone-400">
          +{data.gearEssential.length - 3}
        </span>
      )}
    </div>
  );
}
```

---

## 6. 编辑进度条 (EditProgressBar)

`location-edit-client.tsx:407-412` 已有 4 步进度 (core / location / media / finish). **本 spec 建议**: 不加第 5 步. 决策信息 4 字段视为 "core" 完整性的一部分, 但不强推进度条改造 (进度条只标"关键完成度", 装备清单可以留白).

**替代方案** (可选): 把 `progressStep1` (核心信息) 的 done 判定从 `name && description` 扩展到 `name && description && gearEssential.length >= 1`:

```ts
{ id: "core", label: t("admin.progressStep1"),
  done: !!form.formData.name && !!form.formData.description && form.formData.gearEssential.length >= 1 },
```

Jeff 视工作量决定是否加. 不加也不阻塞.

---

## 7. 交付给 Jeff 的实施要点

**在 `location-form/` 目录**:

1. **新增** `location-form-decision-fields.tsx` (仿 basic/content/settings 3 个兄弟组件)
2. **修改** `location-form/index.ts`, 导出 `LocationFormDecisionFields`
3. **修改** `location-edit-client.tsx:466-472`, 在 4 组之后 (LocationActionBar 之前) 加:
   ```tsx
   <LocationFormDecisionFields
     formData={form.formData}
     errors={form.errors}
     updateField={form.updateField}
   />
   ```
4. **use-location-form.ts** 已有字段 (§4 校验规则加到 validate 里)
5. i18n keys 加进 zh/en/ja 三个 admin namespace

**预计工作量**: XS 2-4 小时 (纯组件组装, 无逻辑变更, 无 API 变更).

---

## 8. 验收标准

QA 用例 (Wen 或 Victor 自测):

1. 打开 admin 编辑页, 决策信息卡片默认展开可见, 可折叠
2. 停车情况三选按钮点击响应, 高亮态正确
3. 选"有"时停车说明可编辑, 选"无"/"未知"时禁用置灰
4. 必备装备 chip-input 添加/删除正常, 1-8 项限制
5. 可选装备 chip-input 独立于必备装备
6. 必备装备为空时保存, 报错 "必备装备至少填 1 项"
7. 保存成功后详情页决策信息块显示正确
8. 三语言 zh/en/ja 全部渲染正确
9. 移动端布局: SectionCard 单列, 停车 3 按钮 grid 保留
10. 深色模式渲染正确

---

## 9. 与其他 spec 关系

| 关联                     | 说明                                              |
| ------------------------ | ------------------------------------------------- |
| P0-B 主 spec             | 本 spec 是 P0-B T4 "admin 录入 UI" 章节的视觉扩展 |
| P2 primary token realign | 独立, 不阻塞; icon 色可跟 P2 一起改               |
| 详情页决策信息块         | 数据源一致, 4 字段直接映射                        |

---

## 10. 一句话总结

**P0-B T4 admin 录入 UI 新增 1 个 SectionCard "决策信息" (Backpack icon), 承载停车 tri-state + 停车说明 + 必备装备 (chip-input, required 1-8 项) + 可选装备 (chip-input, 0-8 项) 4 字段, 沿用现有 SectionCard/Field/styledInput 模式, XS 2-4 小时可上线.**

---

_spec v1.0 完成 (2026-07-20), 等 Martin CR 后交 Jeff 实施._
