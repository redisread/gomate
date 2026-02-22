"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";
import { useLocations } from "@/lib/locations-context";

// 难度标签映射
const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: "简单", color: "bg-emerald-100 text-emerald-700" },
  moderate: { label: "中等", color: "bg-amber-100 text-amber-700" },
  hard: { label: "困难", color: "bg-orange-100 text-orange-700" },
  extreme: { label: "极难", color: "bg-red-100 text-red-700" },
};

export default function LocationsPage() {
  const { locations } = useLocations();

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-stone-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              探索徒步地点
            </h1>
            <p className="text-stone-400 text-lg max-w-2xl mx-auto">
              深圳及周边精选徒步路线，从城市公园到山野海岸，找到适合你的户外目的地
            </p>
          </motion.div>
        </div>
      </section>

      {/* Locations Grid */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {locations.map((location, index) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Link href={`/locations/${location.id}`}>
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group">
                    {/* Cover Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={location.coverImage}
                        alt={location.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-4 left-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            difficultyLabels[location.difficulty]?.color ||
                            "bg-stone-100 text-stone-700"
                          }`}
                        >
                          {difficultyLabels[location.difficulty]?.label ||
                            location.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="flex items-start gap-3 mb-3">
                        <MapPin className="h-5 w-5 text-stone-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="text-xl font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">
                            {location.name}
                          </h3>
                          <p className="text-sm text-stone-500">
                            {location.location?.address || "深圳"}
                          </p>
                        </div>
                      </div>

                      <p className="text-stone-600 text-sm line-clamp-2 mb-4">
                        {location.description}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 text-sm text-stone-500 mb-4">
                        <span>{location.duration}</span>
                        <span className="text-stone-300">|</span>
                        <span>{location.distance}</span>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {location.tags?.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* CTA */}
                      <div className="mt-6 pt-4 border-t border-stone-100">
                        <div className="flex items-center text-stone-900 font-medium group-hover:text-stone-700 transition-colors">
                          查看详情
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-stone-900 mb-4">
              没找到心仪的地点？
            </h2>
            <p className="text-stone-600 mb-8">
              联系我们推荐新的徒步路线，或者创建自己的队伍
            </p>
            <Button size="lg" className="bg-stone-800 hover:bg-stone-700">
              联系我们
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
