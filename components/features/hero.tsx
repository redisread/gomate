"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-stone-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,113,108,0.1)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(120,113,108,0.08)_0%,transparent_50%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-100 text-stone-600 text-sm font-medium mb-8"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            探索自然 · 连接伙伴
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-stone-900 tracking-tight mb-6"
          >
            发现山野
            <br />
            <span className="text-stone-500">组队同行</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-stone-600 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            极简「地点组队」平台，探索深圳最美徒步路线，
            <br className="hidden sm:block" />
            找到志同道合的户外伙伴。
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <Button
              size="lg"
              className="bg-stone-900 hover:bg-stone-800 text-white px-8 h-12 text-base group"
              asChild
            >
              <Link href="#locations">
                探索地点
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 h-12 text-base border-stone-300 hover:bg-stone-100"
            >
              发布队伍
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-3 gap-8 max-w-lg mx-auto"
          >
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <MapPin className="h-5 w-5 text-stone-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-stone-900">50+</div>
              <div className="text-sm text-stone-500">精选路线</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-stone-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-stone-900">2k+</div>
              <div className="text-sm text-stone-500">活跃玩家</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Shield className="h-5 w-5 text-stone-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-stone-900">100%</div>
              <div className="text-sm text-stone-500">安全出行</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-10 rounded-full border-2 border-stone-300 flex justify-center pt-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-stone-400" />
        </motion.div>
      </motion.div>
    </section>
  );
}

export { Hero };
