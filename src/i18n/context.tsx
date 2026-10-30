import { createContext, useContext, type ReactNode, type ComponentType } from "react";
import type { Locale } from "../contracts/locale";

/** Per-island, request-owned translations; never put request locale in a global. */
export interface I18nSnapshot {
  locale: Locale;
  namespaces: Record<string, Record<string, unknown>>;
}

export const I18nContext = createContext<I18nSnapshot | undefined>(undefined);

export function I18nProvider({ snapshot, children }: { snapshot?: I18nSnapshot; children: ReactNode }) {
  const inherited = useContext(I18nContext);
  return <I18nContext.Provider value={snapshot ?? inherited}>{children}</I18nContext.Provider>;
}

export function withI18n<P extends object>(Component: ComponentType<P>) {
  return function TranslatedIsland({ initialI18n, ...props }: P & { initialI18n?: I18nSnapshot }) {
    return <I18nProvider snapshot={initialI18n}><Component {...props as P} /></I18nProvider>;
  };
}
