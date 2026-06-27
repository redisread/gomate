import { nanoid } from "nanoid";

/** 生成 21 字符的 NanoID */
export function generateId(): string {
  return nanoid();
}
