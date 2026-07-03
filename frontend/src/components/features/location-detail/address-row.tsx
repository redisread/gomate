import * as React from "react";
import { MapPin, Navigation, Check, Copy } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { openExternalUrl } from "@/lib/window-utils";

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
    openExternalUrl(url);
  };

  return (
    <div
      className={cn(
        "w-full bg-card rounded-xl border border-stone-100 dark:border-stone-800 px-5 py-4 flex items-start gap-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      <MapPin className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
      <span className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed flex-1">{address}</span>
      <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
        {coordinates && (
          <button
            type="button"
            onClick={handleNavigate}
            title={t('locations.navigateTooltip')}
            aria-label={t('locations.navigateTooltip')}
            className="text-amber-400 hover:text-amber-600 transition-colors"
          >
            <Navigation className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          title={t("common.copyAddress")}
          aria-label={t("common.copyAddress")}
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4 text-amber-400" />
          )}
        </button>
      </div>
    </div>
  );
}
