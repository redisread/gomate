/**
 * 建队时长下拉选项与推荐值 snap（task #160）
 *
 * Steven 口径：推荐值 snap 到时间上最接近的选项，并列时取较长一档（徒步宁多勿少）。
 * 否则受控 select 无匹配项——DOM 显示第一项「1 hour」但 state 是推荐值，
 * 用户看到 1 小时、实际提交推荐值，且「（推荐）」标记永不出现。
 */

/**
 * [分钟, labelKey] 元组——选项渲染与 snap 目标集的唯一出处。
 * 加档只改一行，不会出现 values/labelKeys 位置错位（task #157，Martin CR 建议）。
 */
export const DURATION_OPTION_DEFS: ReadonlyArray<readonly [number, string]> = [
  [60, "teams.duration1h"],
  [90, "teams.duration1_5h"],
  [120, "teams.duration2h"],
  [180, "teams.duration3h"],
  [240, "teams.duration4h"],
  [300, "teams.duration5h"],
  [360, "teams.duration6h"],
  [420, "teams.duration7h"],
  [480, "teams.duration8h"],
  [540, "teams.duration9h"],
  [600, "teams.duration10h"],
  [720, "teams.duration12h"],
  [900, "teams.duration15h"],
  [1200, "teams.duration20h"],
];

/** 下拉选项值（分钟）——推荐值 snap 的目标集，由 DURATION_OPTION_DEFS 派生 */
const DURATION_OPTION_VALUES = DURATION_OPTION_DEFS.map(([v]) => v);

/** snap 到时间上最接近的选项，并列时取较长一档 */
export function snapToDurationOption(minutes: number): number {
  let best = DURATION_OPTION_VALUES[0];
  for (const v of DURATION_OPTION_VALUES) {
    const d = Math.abs(v - minutes);
    const bd = Math.abs(best - minutes);
    if (d < bd || (d === bd && v > best)) best = v;
  }
  return best;
}
