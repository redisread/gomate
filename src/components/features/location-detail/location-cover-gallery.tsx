import { Alert as SwAlert } from "@/components/starwind-react/alert";
import { Button as SwButton } from "@/components/starwind-react/button";
import * as React from "react";
import {
  AnimatePresence,
  animate,
  motion,
  usePresence,
  usePresenceData,
  useMotionValue,
  useTransform,
} from "motion/react";
import { ChevronLeft, ChevronRight, Mountain } from "lucide-react";
import { GalleryImage } from "./gallery-image";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useI18n } from "@/hooks/useI18n";
import "./location-cover-gallery.css";

interface LocationCoverGalleryProps {
  images: string[];
  name: string;
  onOpen: (index: number) => void;
}

function CoverCard({
  src,
  name,
  index,
  decoded,
  multiple,
  reduced: reducePreference,
  restoreFocus,
  onOpen,
  onStep,
}: {
  src: string;
  name: string;
  index: number;
  decoded: boolean;
  multiple: boolean;
  reduced: boolean;
  restoreFocus: boolean;
  onOpen: () => void;
  onStep: (direction: number) => void;
}) {
  const { t } = useI18n(["locationDetail"]);
  const [present, remove] = usePresence();
  const presence = usePresenceData() as
    { direction: number; reduced: boolean } | undefined;
  const reduced = presence?.reduced ?? reducePreference;
  const x = useMotionValue(0);
  const tilt = useTransform(x, [-240, 240], [-14, 14]);
  const exitTilt = useMotionValue(0);
  const card = React.useRef<HTMLDivElement>(null);
  const direction = presence?.direction ?? 1;
  React.useEffect(() => {
    const element = card.current;
    if (!element) return;
    if (present) {
      const reveal = animate(element, { opacity: 1 }, { duration: 0 });
      if (reduced) {
        x.set(0);
        return () => reveal.stop();
      }
      const reset = animate(x, 0, {
        type: "spring",
        stiffness: 340,
        damping: 30,
      });
      return () => {
        reset.stop();
        reveal.stop();
      };
    }
    // An interrupted native animation may never resolve. Reduced motion ends
    // the exit lifecycle directly instead of waiting for that completion.
    if (reduced || typeof element.animate !== "function") {
      remove?.();
      return;
    }
    let active = true;
    exitTilt.set(tilt.get());
    const slide = animate(x, -direction * 460, { duration: 0.26 });
    const turn = animate(exitTilt, -direction * 20, { duration: 0.26 });
    const fade = animate(element, { opacity: 0 }, { duration: 0.26 });
    void Promise.resolve(fade).then(() => {
      if (active) remove?.();
    });
    return () => {
      active = false;
      slide.stop();
      turn.stop();
      fade.stop();
    };
  }, [present, reduced, direction, remove, x, tilt, exitTilt]);
  const dragged = React.useRef(false);
  const button = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (restoreFocus) button.current?.focus({ preventScroll: true });
  }, [restoreFocus]);
  const alt =
    name + " · " + t("locationDetail.imageAlt", { index: String(index + 1) });
  return (
    <motion.div
      ref={card}
      data-cover-card
      data-reduced={reduced}
      className="location-cover-card relative border border-border bg-card text-card-foreground shadow-card"
      style={{
        x,
        rotate: present ? tilt : exitTilt,
        zIndex: present ? 3 : 4,
        touchAction: "pan-y",
        pointerEvents: present ? "auto" : "none",
      }}
      initial={reduced ? false : { scale: 0.94, y: -16 }}
      animate={{ scale: 1, y: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : { type: "spring", stiffness: 340, damping: 30 }
      }
      drag={multiple && present ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={reduced ? 0 : 0.8}
      dragMomentum={false}
      onPointerDownCapture={() => {
        dragged.current = false;
      }}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDragEnd={(_, info) => {
        if (
          Math.abs(info.offset.x) >= 60 ||
          (Math.abs(info.offset.x) >= 25 && Math.abs(info.velocity.x) > 500)
        ) {
          onStep(info.offset.x < 0 ? 1 : -1);
        }
        animate(
          x,
          0,
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 400, damping: 32 },
        );
      }}
      aria-hidden={!present}
    >
      <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-muted">
        {decoded ? (
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <GalleryImage src={src} alt={alt} interactive={present} />
        )}
      </div>
      <SwButton
        variant="plain"
        size="inherit"
        ref={button}
        type="button"
        tabIndex={present ? 0 : -1}
        disabled={!present}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        aria-label={
          t("locationDetail.viewLargeImage") +
          " · " +
          t("locationDetail.imageAlt", { index: String(index + 1) })
        }
        onClick={(event) => {
          if ((event.detail === 0 || !dragged.current) && present) onOpen();
        }}
      />
      <span
        className="flex items-center justify-between gap-3 px-1 pt-2 text-xs"
        aria-hidden="true"
      >
        <span className="truncate">{name}</span>
        <span className="tabular-nums text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>
      </span>
    </motion.div>
  );
}

export function LocationCoverGallery({
  images,
  name,
  onOpen,
}: LocationCoverGalleryProps) {
  const { t } = useI18n(["locationDetail", "common"]);
  const reduced = useReducedMotion();
  const [current, setCurrent] = React.useState({
    index: 0,
    decoded: false,
    restoreFocus: false,
  });
  const [request, setRequest] = React.useState<{
    index: number;
    direction: number;
  } | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [attempt, retry] = React.useReducer((value: number) => value + 1, 0);
  const [direction, setDirection] = React.useState(1);
  const gallery = React.useRef<HTMLDivElement>(null);
  const nextButton = React.useRef<HTMLButtonElement>(null);
  const dismissFailure = () => {
    const focused = document.activeElement;
    if (
      focused &&
      gallery.current?.contains(focused) &&
      focused.closest('[role="alert"]')
    ) {
      nextButton.current?.focus({ preventScroll: true });
    }
    setFailed(false);
  };
  const step = (delta: number) => {
    if (images.length < 2) return;
    dismissFailure();
    setRequest((previous) => ({
      index:
        ((previous?.index ?? current.index) + delta + images.length) %
        images.length,
      direction: delta,
    }));
  };
  const target = request ? images[request.index] : undefined;
  React.useEffect(() => {
    if (!request || !target) return;
    let active = true;
    const image = new Image();
    const fail = () => {
      if (active) {
        active = false;
        setFailed(true);
      }
    };
    const timeout = window.setTimeout(fail, 15000);
    image.onload = async () => {
      try {
        await image.decode();
        if (!active) return;
        window.clearTimeout(timeout);
        const focused = document.activeElement;
        const restoreFocus =
          !!focused &&
          !!gallery.current?.contains(focused) &&
          (!!focused.closest("[data-cover-card]") ||
            !!focused.closest('[role="alert"]'));
        setDirection(request.direction);
        setCurrent({ index: request.index, decoded: true, restoreFocus });
        setRequest(null);
        setFailed(false);
      } catch {
        fail();
      }
    };
    image.onerror = fail;
    image.src = target;
    return () => {
      active = false;
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
    };
  }, [request, target, attempt]);

  return (
    <div
      ref={gallery}
      className="location-cover-gallery relative mx-auto w-full max-w-6xl"
      role="group"
      aria-label={t("locationDetail.photoGallery")}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          step(event.key === "ArrowRight" ? 1 : -1);
        }
      }}
    >
      <div className="location-cover-track">
        {images.length === 0 ? (
          <div className="location-cover-empty flex items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Mountain className="h-20 w-20" aria-hidden="true" />
          </div>
        ) : (
          <>
            {Array.from({ length: Math.min(images.length - 1, 3) }, (_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className="location-cover-card pointer-events-none border border-border bg-card shadow-card"
                style={{
                  transform: `translateY(${-12 * (i + 1)}px) scale(${1 - (i + 1) * 0.045})`,
                  zIndex: 2 - i,
                }}
              >
                <div className="aspect-[3/2] rounded-xl bg-muted" />
                <div className="h-6" />
              </div>
            ))}
            <AnimatePresence initial={false} custom={{ direction, reduced }}>
              <CoverCard
                key={current.index}
                src={images[current.index]}
                name={name}
                index={current.index}
                decoded={current.decoded}
                restoreFocus={current.restoreFocus}
                multiple={images.length > 1}
                reduced={reduced}
                onOpen={() => onOpen(current.index)}
                onStep={step}
              />
            </AnimatePresence>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-6 pb-4">
          <SwButton
            variant="plain"
            size="inherit"
            type="button"
            className="location-cover-control"
            aria-label={t("locationDetail.prevImage")}
            onClick={() => step(-1)}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </SwButton>
          <span
            role="status"
            aria-live="polite"
            className="min-w-16 text-center text-sm tabular-nums text-muted-foreground"
          >
            {current.index + 1} / {images.length}
          </span>
          <SwButton
            variant="plain"
            size="inherit"
            type="button"
            className="location-cover-control"
            ref={nextButton}
            aria-label={t("locationDetail.nextImage")}
            onClick={() => step(1)}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </SwButton>
        </div>
      )}
      {request && !failed && (
        <span role="status" className="sr-only">
          {t("common.loading")}
        </span>
      )}
      {failed && (
        <SwAlert
          as="div"
          variant="plain"
          role="alert"
          className="mx-auto flex max-w-sm flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-sm text-foreground"
        >
          {t("locationDetail.imageLoadFailed")}
          <SwButton
            variant="plain"
            size="inherit"
            type="button"
            className="location-cover-control px-3"
            onClick={() => {
              dismissFailure();
              retry();
            }}
          >
            {t("common.retry")}
          </SwButton>
        </SwAlert>
      )}
    </div>
  );
}
