import { Button as SwButton } from "@/components/starwind-react/button";
import * as React from "react";
import { ArrowUp, Heart, Mail } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { useI18n } from "@/hooks/useI18n";
import { FooterSocials } from "./footer-socials";
import { FooterWechat } from "./footer-wechat";

export function Footer() {
  const { t } = useI18n(["common"]);
  const [showWechatQR, setShowWechatQR] = React.useState(false);
  const [year, setYear] = React.useState<number | null>(null);
  React.useEffect(() => setYear(new Date().getFullYear()), []);
  const groups = [
    {
      title: "common.explore",
      links: [
        ["/locations", "common.exploreLocations"],
        ["/teams", "common.exploreTeams"],
        ["/teams/create", "common.exploreCreate"],
      ],
    },
    {
      title: "common.support",
      links: [
        ["/about", "common.supportAbout"],
        ["/blog", "common.supportBlog"],
        ["/feedback", "common.supportFeedback"],
        ["/help", "common.supportHelp"],
      ],
    },
  ];

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  return (
    <footer className="postcard-footer">
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-8 sm:gap-12 lg:gap-24">
          <div>
            <div className="flex items-center gap-3">
              <BrandIcon size={44} />
              <span className="text-2xl font-bold tracking-tight">GoMate</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-7 postcard-muted">
              {t("common.tagline")}
            </p>
            <a
              href={`mailto:${t("common.contactEmail")}`}
              className="postcard-link mt-3 inline-flex items-center gap-2 text-sm"
            >
              <Mail aria-hidden="true" className="size-4 shrink-0" />
              {t("common.contactEmail")}
            </a>
            {/* 社交媒体按钮 */}
            <FooterSocials onWechat={() => setShowWechatQR(true)} />
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-x-6 gap-y-6 sm:gap-x-8">
            {groups.map((group) => (
              <nav key={group.title} aria-label={t(group.title)}>
                <p className="mb-2 text-sm font-semibold tracking-wide">
                  {t(group.title)}
                </p>
                <ul>
                  {group.links.map(([href, label]) => (
                    <li key={href}>
                      <a
                        href={href}
                        className="postcard-link flex w-fit max-w-full items-center text-sm"
                      >
                        {t(label)}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="postcard-colophon mt-6 space-y-2 pb-4 text-xs sm:mt-8">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <nav
              aria-label={t("common.legal")}
              className="flex flex-wrap gap-x-6"
            >
              <a
                href="/privacy"
                className="postcard-link inline-flex items-center"
              >
                {t("common.legalPrivacy")}
              </a>
              <a
                href="/terms"
                className="postcard-link inline-flex items-center"
              >
                {t("common.legalTerms")}
              </a>
            </nav>
            <SwButton
              variant="plain"
              size="inherit"
              type="button"
              onClick={scrollToTop}
              className="postcard-link inline-flex items-center gap-2"
            >
              {t("common.backToTop")}
              <ArrowUp aria-hidden="true" className="size-4" />
            </SwButton>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <p>
              © <span className="inline-block min-w-[4ch]">{year}</span>{" "}
              {t("common.copyright")}
            </p>
            <p className="flex items-center gap-1.5">
              <Heart aria-hidden="true" className="size-3" />
              {t("common.madeWithLove")}
            </p>
          </div>
        </div>
      </div>
      <div className="postcard-landscape" aria-hidden="true">
        <img
          src="/images/footer-landscape.webp"
          srcSet="/images/footer-landscape-small.webp 960w, /images/footer-landscape.webp 1920w"
          sizes="(max-width: 639px) 960px, 100vw"
          alt=""
          width="1920"
          height="640"
          loading="lazy"
          decoding="async"
        />
      </div>
      {showWechatQR && <FooterWechat onClose={() => setShowWechatQR(false)} />}
    </footer>
  );
}
