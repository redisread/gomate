import { useRef, useState } from "react";
import { Input } from "@/components/starwind-react/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI, getApiErrorMessage } from "@/lib/api";
import type { ApiResult } from "@/contracts/http-responses";
import type { SelfUserResponse } from "@/contracts/public-responses";

export function TeamContactSetup({ onSaved }: { onSaved: () => void }) {
  const { t } = useI18n(["teams", "common"]);
  const [wechat, setWechat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  async function saveContact(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || !wechat.trim()) return;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await fetchAPI("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ extra: { wechat: wechat.trim() } }),
      });
      const result = await response.json<ApiResult<SelfUserResponse>>();
      if (response.ok && result.success && result.user.extra.wechat) {
        onSaved();
      } else {
        setError(getApiErrorMessage(result, t("teams.contactSaveFailed")));
      }
    } catch {
      setError(t("teams.contactSaveFailed"));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={saveContact}
      className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4"
    >
      <label
        htmlFor="team-contact-wechat"
        className="block text-sm font-semibold"
      >
        {t("teams.contactWechatLabel")}
      </label>
      <p id="team-contact-hint" className="text-sm text-muted-foreground">
        {t("teams.wechatRequiredDesc")}
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <Input
          id="team-contact-wechat"
          value={wechat}
          onChange={(event) => setWechat(event.target.value)}
          maxLength={100}
          required
          disabled={saving}
          aria-describedby="team-contact-hint"
          className="min-h-11 min-w-0 flex-1 text-base"
        />
        <SubmitButton
          loading={saving}
          disabled={!wechat.trim()}
          className="min-h-11 px-4"
        >
          {t("teams.saveContact")}
        </SubmitButton>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
