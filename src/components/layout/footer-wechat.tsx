import { Button as SwButton } from "@/components/starwind-react/button";
import { Input as SwInput } from "@/components/starwind-react/input";
import * as React from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useI18n } from "@/hooks/useI18n";

export function FooterWechat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n(["common"]);
  const titleId = React.useId();
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const account = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => () => clearTimeout(timer.current), []);

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText("VictorHong111");
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Keep the account selectable when clipboard permission is unavailable.
      account.current?.focus();
      account.current?.select();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      overlayClassName="flex items-center justify-center p-4"
      panelStyle={{
        maxHeight:
          "calc(100dvh - 2rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
      }}
      panelClassName="overflow-y-auto w-full max-w-sm rounded-2xl bg-popover text-popover-foreground p-6 shadow-card"
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 id={titleId} className="text-lg font-semibold">
          {t("common.socials.wechat")}
        </h2>
        <SwButton variant="plain" size="inherit"
          type="button"
          onClick={onClose}
          aria-label={t("common.wechat.close")}
          className="flex size-11 items-center justify-center rounded-full hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X aria-hidden="true" className="size-5" />
        </SwButton>
      </div>
      <img
        src="/wechat-qr.png"
        alt={t("common.socials.wechat")}
        width="280"
        height="280"
        className="w-full rounded-lg"
      />
      <SwInput
        ref={account}
        readOnly
        value="VictorHong111"
        aria-label={t("common.socials.wechat")}
        className="my-4 w-full rounded-lg bg-secondary p-3 text-center text-base text-secondary-foreground"
      />
      <div className="grid grid-cols-2 gap-3 text-sm">
        <SwButton variant="plain" size="inherit"
          type="button"
          onClick={copyAccount}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-primary-foreground"
        >
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
          <span role="status">
            {t(
              copied
                ? "common.wechat.wechatCopied"
                : "common.wechat.wechatCopy",
            )}
          </span>
        </SwButton>
        <SwButton as="a" variant="plain" size="inherit"
          href="/wechat-qr.png"
          download="gomate-wechat-qr.png"
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2"
        >
          <Download aria-hidden="true" className="size-4" />
          {t("common.wechat.wechatSaveQR")}
        </SwButton>
      </div>
    </Modal>
  );
}
