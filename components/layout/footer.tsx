"use client";

import * as React from "react";
import Link from "next/link";
import { Mountain, Instagram, Twitter, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { copy } from "@/lib/copy";

const footerLinks = {
  product: [
    { label: copy.footer.productLocations, href: "#locations" },
    { label: copy.footer.productTeams, href: "#teams" },
    { label: copy.footer.productGuides, href: "#guides" },
    { label: copy.footer.productSafety, href: "#safety" },
  ],
  company: [
    { label: copy.footer.companyAbout, href: "#about" },
    { label: copy.footer.companyCareers, href: "#careers" },
    { label: copy.footer.companyContact, href: "#contact" },
    { label: copy.footer.companyPartners, href: "#partners" },
  ],
  support: [
    { label: copy.footer.supportHelp, href: "#help" },
    { label: copy.footer.supportSafety, href: "#safety-guide" },
    { label: copy.footer.supportGuidelines, href: "#guidelines" },
    { label: copy.footer.supportPrivacy, href: "#privacy" },
  ],
};

const socialLinks = [
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: MessageCircle, href: "#", label: "WeChat" },
];

function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Mountain className="h-6 w-6 text-stone-100" />
              <span className="text-lg font-bold text-stone-100">GoMate</span>
            </Link>
            <p className="text-sm text-stone-400 mb-6 max-w-xs">
              {copy.footer.tagline}
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-full bg-stone-800 text-stone-400 hover:text-stone-100 hover:bg-stone-700 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-sm font-semibold text-stone-100 mb-4">{copy.footer.product}</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-400 hover:text-stone-100 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-stone-100 mb-4">{copy.footer.company}</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-400 hover:text-stone-100 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-sm font-semibold text-stone-100 mb-4">{copy.footer.support}</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-400 hover:text-stone-100 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-stone-500">
            &copy; {new Date().getFullYear()} GoMate. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="#terms"
              className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
            >
              {copy.footer.terms}
            </Link>
            <Link
              href="#privacy"
              className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
            >
              {copy.footer.privacy}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
