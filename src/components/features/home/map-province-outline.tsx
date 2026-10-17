import * as React from "react";
import { animate as animateValue, motion, useMotionValue } from "motion/react";

const layoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/** Mounted per province; once settled, changing motion preferences never replays it. */
export function MapProvinceOutline({
  d,
  animate,
  reduced,
}: {
  d: string;
  animate: boolean;
  reduced: boolean;
}) {
  const progress = useMotionValue(animate && !reduced ? 0 : 1);
  layoutEffect(() => {
    if (!animate || reduced) {
      progress.jump(1);
      return;
    }
    if (progress.get() === 1) return;
    const animation = animateValue(progress, 1, {
      duration: 0.6,
      ease: "easeOut",
    });
    return () => animation.stop();
  }, [animate, reduced, progress]);

  return (
    <motion.path
      d={d}
      fill="none"
      stroke="var(--primary)"
      strokeWidth={2}
      vectorEffect="non-scaling-stroke"
      aria-hidden="true"
      className="pointer-events-none"
      style={{ pathLength: progress }}
    />
  );
}
