import * as React from "react";
import { Check, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/starwind-react/button";
import { Modal } from "@/components/ui/modal";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

const chipClass =
  "relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none";

function InterestChip({
  name,
  selected,
  disabled,
  onClick,
}: {
  name: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="plain"
      size="inherit"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        chipClass,
        selected
          ? "border-primary/40 bg-accent text-accent-foreground"
          : "border-transparent bg-muted text-foreground/80 hover:bg-accent",
        "disabled:opacity-50",
      )}
    >
      <Check
        aria-hidden="true"
        className={cn("absolute left-1.5 size-3", !selected && "invisible")}
      />
      <span className="min-w-0 break-words text-center">{name}</span>
    </Button>
  );
}

export function InterestPicker({
  tags,
  selectedTags,
  onToggle,
  onApply,
}: {
  tags: { id: string; name: string }[];
  selectedTags: string[];
  onToggle: (id: string) => void;
  onApply: (ids: string[]) => void;
}) {
  const { t } = useI18n(["locations", "common"]);
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<string[]>([]);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const closeButton = React.useRef<HTMLButtonElement>(null);
  const id = React.useId();
  const quick = tags.slice(0, 6);
  const additional = tags.filter(
    (tag) =>
      selectedTags.includes(tag.id) &&
      !quick.some((item) => item.id === tag.id),
  );
  const close = () => setOpen(false);
  const toggleDraft = (tagId: string) =>
    setDraft((current) =>
      current.includes(tagId)
        ? current.filter((value) => value !== tagId)
        : [...current, tagId],
    );
  return (
    <>
      <div
        role="group"
        aria-label={t("locations.tagsLabel")}
        className="mt-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2"
      >
        <span className="text-sm font-medium text-muted-foreground">
          {t("locations.tagsLabel")} · {t("locations.multipleInterests")}
        </span>
        <Button
          ref={trigger}
          type="button"
          variant="plain"
          size="inherit"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={`${id}-dialog`}
          onClick={() => {
            setDraft([...selectedTags]);
            setOpen(true);
          }}
          className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:order-last sm:ml-0"
        >
          {t("locations.allInterests")}
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Button>
        <div
          data-testid="locations-tag-options"
          className="grid w-full min-w-0 grid-cols-2 gap-2 min-[380px]:grid-cols-3 sm:flex sm:w-auto sm:flex-wrap"
        >
          {[...quick, ...additional].map((tag) => (
            <InterestChip
              key={tag.id}
              name={tag.name}
              selected={selectedTags.includes(tag.id)}
              disabled={
                selectedTags.length >= 20 && !selectedTags.includes(tag.id)
              }
              onClick={() => onToggle(tag.id)}
            />
          ))}
        </div>
      </div>
      <Modal
        open={open}
        onClose={close}
        labelledBy={`${id}-title`}
        describedBy={`${id}-hint`}
        initialFocusRef={closeButton}
        returnFocusRef={trigger}
        overlayClassName="flex items-end justify-center sm:items-center sm:p-4"
        panelClassName="flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-popover text-popover-foreground shadow-warm-lg sm:max-w-lg sm:rounded-2xl"
        data-testid="locations-interest-picker"
      >
        <div id={`${id}-dialog`} className="flex min-h-0 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-2 px-5 pt-3">
            <h2 id={`${id}-title`} className="text-lg font-semibold">
              {t("locations.allInterests")}
            </h2>
            <Button
              ref={closeButton}
              type="button"
              variant="plain"
              size="inherit"
              aria-label={t("common.close")}
              onClick={close}
              className="flex size-11 items-center justify-center rounded-full hover:bg-muted"
            >
              <X className="size-4" />
            </Button>
          </header>
          <p
            id={`${id}-hint`}
            className="px-5 pb-4 text-sm text-muted-foreground"
          >
            {t("locations.interestHint")}
          </p>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <InterestChip
                  key={tag.id}
                  name={tag.name}
                  selected={draft.includes(tag.id)}
                  disabled={draft.length >= 20 && !draft.includes(tag.id)}
                  onClick={() => toggleDraft(tag.id)}
                />
              ))}
            </div>
            <p role="status" className="mt-4 text-xs text-muted-foreground">
              {t("locations.interestSelectionCount", { count: draft.length })}
            </p>
          </div>
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="plain"
              size="inherit"
              disabled={!draft.length}
              onClick={() => setDraft([])}
              className="min-h-11 rounded-lg px-2 text-sm disabled:opacity-40"
            >
              {t("locations.clearInterests")}
            </Button>
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="plain"
                size="inherit"
                onClick={close}
                className="min-h-11 rounded-xl px-3 text-sm"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                variant="plain"
                size="inherit"
                onClick={() => {
                  onApply(draft);
                  close();
                }}
                className="min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                {t("locations.applyInterests")}
              </Button>
            </div>
          </footer>
        </div>
      </Modal>
    </>
  );
}
