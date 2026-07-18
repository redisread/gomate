/**
 * 建队时长下拉选项与推荐值 snap（task #160）
 *
 * Steven 口径：推荐值 snap 到时间上最接近的选项，并列时取较长一档（徒步宁多勿少）。
 * 否则受控 select 无匹配项——DOM 显示第一项「1 hour」但 state 是推荐值，
 * 用户看到 1 小时、实际提交推荐值，且「（推荐）」标记永不出现。
 */

/** 下拉选项值（分钟）——推荐值 snap 的目标集 */
export const DURATION_OPTION_VALUES = [60, 90, 120, 180, 240, 300, 360, 420, 480, 540, 600, 720, 900, 1200];

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
