import * as React from "react";
import { MapPin, Navigation, Check, Copy } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { openExternalLink } from "@/lib/open-external";
import { cn } from "@/lib/utils";

interface AddressRowProps {
  address: string;
  coordinates?: { lat: number; lng: number };
  locationName?: string;
  className?: string;
}

export function AddressRow({ address, coordinates, locationName, className }: AddressRowProps) {
  const { t } = useI18n(["locations", "common"]);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 静默失败
    }
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dest = encodeURIComponent(locationName || address);
    const url = `https://uri.amap.com/navigation?to=${coordinates!.lng},${coordinates!.lat},${dest}&callnative=0`;
    openExternalLink(url);
  };

  return (
    <div
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl bg-card px-5 py-4 shadow-warm-sm",
        className
      )}
    >
      <MapPin className="h-4 w-4 text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0" />
      <span className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed flex-1">{address}</span>
      <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
        {coordinates && (
          <button
            type="button"
            onClick={handleNavigate}
            title={t('locations.navigateTooltip')}
            aria-label={t('locations.navigateTooltip')}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-amber-700 transition-[background-color,color,transform] duration-150 hover:bg-amber-50 hover:text-amber-800 active:scale-[0.96] dark:text-amber-400 dark:hover:bg-amber-950/30 dark:hover:text-amber-300"
          >
            <Navigation className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          title={t("common.copyAddress")}
          aria-label={t("common.copyAddress")}
          className="flex h-10 w-10 items-center justify-center rounded-xl opacity-60 transition-[background-color,opacity,transform] duration-150 hover:bg-stone-100 hover:opacity-100 active:scale-[0.96] dark:hover:bg-stone-800"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          )}
        </button>
      </div>
    </div>
  );
}
