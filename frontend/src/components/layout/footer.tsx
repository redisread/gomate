import * as React from "react";
import { Mountain } from "lucide-react";
import { copy } from "@/lib/copy";

/**
 * 页脚组件
 */
export function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Mountain className="h-6 w-6 text-white" />
              <span className="text-white font-bold text-lg">GoMate</span>
            </div>
            <p className="text-sm leading-relaxed">{copy.footer.tagline}</p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4">{copy.footer.product}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/locations" className="hover:text-white transition-colors">
                  {copy.footer.productLocations}
                </a>
              </li>
              <li>
                <a href="/teams" className="hover:text-white transition-colors">
                  {copy.footer.productTeams}
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">{copy.footer.company}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/about" className="hover:text-white transition-colors">
                  {copy.footer.companyAbout}
                </a>
              </li>
              <li>
                <a href="/contact" className="hover:text-white transition-colors">
                  {copy.footer.companyContact}
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">{copy.footer.support}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/privacy" className="hover:text-white transition-colors">
                  {copy.footer.supportPrivacy}
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-white transition-colors">
                  {copy.footer.terms}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-800 pt-8 text-sm text-center">
          <p>© {new Date().getFullYear()} {copy.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
