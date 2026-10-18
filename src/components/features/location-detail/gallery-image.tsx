import { Alert as SwAlert } from "@/components/starwind-react/alert";
import { Button as SwButton } from "@/components/starwind-react/button";
import * as React from "react";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useI18n } from "@/hooks/useI18n";

interface Props {
  src: string;
  alt: string;
  contain?: boolean;
  interactive?: boolean;
}

function Picture({
  src,
  alt,
  contain,
  enter,
  zoom,
  reduced,
}: Props & { enter: boolean; zoom: boolean; reduced: boolean }) {
  const present = useIsPresent();
  return (
    <motion.img
      draggable={false}
      src={src}
      alt={present ? alt : ""}
      aria-hidden={!present}
      initial={
        enter && !reduced
          ? { opacity: 0, scale: zoom ? (contain ? 0.98 : 1.025) : 1 }
          : false
      }
      animate={{
        opacity: 1,
        scale: 1,
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.24, ease: [0.2, 0, 0, 1] }}
      className={`absolute inset-0 h-full w-full ${contain ? "object-contain" : "object-cover"}`}
    />
  );
}

/** Keeps the last decoded image visible while a newer request is pending or failed. */
export function GalleryImage({ src, alt, contain, interactive = true }: Props) {
  const { t } = useI18n(["locationDetail", "common"]);
  const reduced = useReducedMotion();
  const [displayed, setDisplayed] = React.useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [attempt, retry] = React.useReducer((value: number) => value + 1, 0);
  const [returning] = React.useState(
    () =>
      typeof performance !== "undefined" &&
      (
        performance.getEntriesByType?.("navigation")[0] as
          | PerformanceNavigationTiming
          | undefined
      )?.type === "back_forward",
  );
  const hasDisplayed = React.useRef(false);
  const [enter, setEnter] = React.useState(!returning);
  const [zoom, setZoom] = React.useState(!returning);

  React.useEffect(() => {
    let active = true;
    const image = new Image();
    setFailed(false);
    const fail = () => {
      if (!active) return;
      active = false;
      setFailed(true);
    };
    const timeout = window.setTimeout(fail, 15000);
    image.onload = async () => {
      try {
        await image.decode();
        if (!active) return;
        window.clearTimeout(timeout);
        setEnter(hasDisplayed.current || !returning);
        setZoom(!hasDisplayed.current && !returning);
        hasDisplayed.current = true;
        setDisplayed({ src, alt });
      } catch {
        fail();
      }
    };
    image.onerror = fail;
    image.src = src;
    return () => {
      active = false;
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
    };
  }, [src, alt, attempt, returning]);

  return (
    <div
      className="absolute inset-0"
      aria-busy={!failed && displayed?.src !== src}
    >
      <AnimatePresence initial={!returning}>
        {displayed && (
          <Picture
            key={displayed.src}
            src={displayed.src}
            alt={displayed.alt}
            contain={contain}
            enter={enter}
            zoom={zoom}
            reduced={reduced}
          />
        )}
      </AnimatePresence>
      {!failed && displayed?.src !== src && (
        <span role="status" className="sr-only">
          {t("common.loading")}
        </span>
      )}
      {failed && (
        <SwAlert as="div" variant="plain"
          role="alert"
          className="absolute inset-x-2 top-2 z-20 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-background/95 p-3 text-sm text-foreground"
          onClick={(event) => event.stopPropagation()}
        >
          <span>{t("locationDetail.imageLoadFailed")}</span>
          <SwButton variant="plain" size="inherit"
            type="button"
            disabled={!interactive}
            tabIndex={interactive ? 0 : -1}
            className="min-h-11 rounded-lg bg-secondary px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={retry}
          >
            {t("common.retry")}
          </SwButton>
        </SwAlert>
      )}
    </div>
  );
}
