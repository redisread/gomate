import { useState, useCallback, useMemo } from "react";

type RuleMap = Record<string, (v: string) => string | undefined>;
type ErrorMap = Record<string, string | undefined>;

/**
 * 表单字段校验 Hook
 *
 * @param rules - 校验规则对象，key 为字段名，value 为校验函数
 *                校验函数接收字段当前值，返回错误字符串或 undefined（无错）
 *
 * @example
 * const { errors, touch, validate, isValid, reset } = useFormValidation({
 *   name: (v) => (!v.trim() ? "请填写姓名" : undefined),
 *   email: (v) => (!/\S+@\S+/.test(v) ? "邮箱格式不正确" : undefined),
 * });
 */
export function useFormValidation(rules: RuleMap) {
  // 已触碰（失焦过）的字段集合
  const [_touched, setTouched] = useState<Record<string, boolean>>({});
  // 字段错误映射
  const [errors, setErrors] = useState<ErrorMap>({});

  /**
   * 失焦时调用：校验单个字段并更新错误状态
   */
  const touch = useCallback(
    (field: string, value: string) => {
      const rule = rules[field];
      const error = rule ? rule(value) : undefined;
      setTouched((prev) => ({ ...prev, [field]: true }));
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    [rules]
  );

  /**
   * 提交时全量校验所有字段
   * @returns 是否全部通过
   */
  const validate = useCallback(
    (data: Record<string, string>): boolean => {
      const nextErrors: ErrorMap = {};
      const nextTouched: Record<string, boolean> = {};

      for (const field of Object.keys(rules)) {
        nextTouched[field] = true;
        nextErrors[field] = rules[field](data[field] ?? "");
      }

      setTouched(nextTouched);
      setErrors(nextErrors);

      return Object.values(nextErrors).every((e) => e === undefined);
    },
    [rules]
  );

  /**
   * 当前是否无错误（所有已触碰字段均通过）
   */
  const isValid = useMemo(
    () => Object.values(errors).every((e) => e === undefined),
    [errors]
  );

  /**
   * 重置所有校验状态
   */
  const reset = useCallback(() => {
    setTouched({});
    setErrors({});
  }, []);

  return { errors, touch, validate, isValid, reset };
}
