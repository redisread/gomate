import type { ReactNode } from "react";
import { Button as SwButton } from "@/components/starwind-react/button";

export function AuthSubmitButton({ isLoading, disabled, testId, children }: {
  isLoading: boolean;
  disabled: boolean;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <SwButton variant="plain" size="inherit"
      type="submit"
      data-testid={testId}
      disabled={disabled}
      className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: isLoading ? "var(--primary)" : "linear-gradient(135deg, var(--primary) 0%, var(--primary-400) 100%)",
        boxShadow: isLoading ? "none" : "0 4px 18px color-mix(in oklab, var(--primary) 35%, transparent)",
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.transform = "translateY(-1px)";
          el.style.boxShadow = "0 6px 24px color-mix(in oklab, var(--primary) 45%, transparent)";
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "0 4px 18px color-mix(in oklab, var(--primary) 35%, transparent)";
      }}
    >
      {children}
    </SwButton>
  );
}

export function AuthActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-block w-full py-3 rounded-xl text-sm font-semibold text-white text-center transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200"
      style={{
        background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-400) 100%)",
        boxShadow: "0 4px 18px color-mix(in oklab, var(--primary) 35%, transparent)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "translateY(-1px)";
        el.style.boxShadow = "0 6px 24px color-mix(in oklab, var(--primary) 45%, transparent)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "0 4px 18px color-mix(in oklab, var(--primary) 35%, transparent)";
      }}
    >
      {children}
    </a>
  );
}

export function AuthMountains() {
  return (
    <svg
      className="absolute bottom-0 left-0 right-0 w-full pointer-events-none"
      viewBox="0 0 560 120"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 120L80 80L160 100L240 55L320 75L400 30L480 55L560 20V120H0Z"
        fill="color-mix(in oklab, white 6%, transparent)"
      />
      <path
        d="M0 120L100 90L200 110L300 65L420 85L520 45L560 60V120H0Z"
        fill="color-mix(in oklab, white 4%, transparent)"
      />
    </svg>
  );
}
