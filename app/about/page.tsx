"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Mountain, Users, MapPin, Sprout, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";

const values = [
  {
    icon: Users,
    title: "真实连接",
    description: "我们相信面对面的真实社交，让户外成为连接彼此的桥梁。",
  },
  {
    icon: MapPin,
    title: "探索发现",
    description: "挖掘深圳及周边的隐秘角落，发现城市中的自然之美。",
  },
  {
    icon: Sprout,
    title: "共同成长",
    description: "户外不只是徒步，更是遇见更好的自己。",
  },
  {
    icon: Sparkles,
    title: "简单纯粹",
    description: "回归户外本质，用简单设计连接真诚的人。",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 rounded-full text-sm text-stone-600 mb-6">
              <Mountain className="h-4 w-4" />
              <span>GoMate</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 mb-6 tracking-tight">
              让每一次户外探索
              <br />
              <span className="text-stone-600">都有伙伴同行</span>
            </h1>
            <p className="text-lg text-stone-600 leading-relaxed">
              GoMate 是一个极简的「地点组队」平台，专注于深圳徒步场景。
              我们致力于用结构化的方式解决小红书找搭子信息混乱的问题，
              帮助户外爱好者快速找到志同道合的徒步伙伴。
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 lg:py-24 bg-stone-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                我们的使命
              </h2>
              <p className="text-stone-400 text-lg leading-relaxed mb-6">
                在快节奏的都市生活中，越来越多人渴望走进自然，但缺少合适的伙伴。
                我们希望通过技术连接志同道合的户外爱好者，让每一次出发都充满期待。
              </p>
              <p className="text-stone-400 text-lg leading-relaxed">
                无论是周末的轻松徒步，还是挑战自我的长线穿越，
                GoMate 都能帮你找到合适的队伍，安全、便捷、有趣。
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="bg-stone-800 rounded-2xl p-6 text-center">
                <div className="text-3xl font-bold text-white mb-2">20+</div>
                <div className="text-stone-400">精选路线</div>
              </div>
              <div className="bg-stone-800 rounded-2xl p-6 text-center">
                <div className="text-3xl font-bold text-white mb-2">500+</div>
                <div className="text-stone-400">成功组队</div>
              </div>
              <div className="bg-stone-800 rounded-2xl p-6 text-center">
                <div className="text-3xl font-bold text-white mb-2">10000+</div>
                <div className="text-stone-400">活跃用户</div>
              </div>
              <div className="bg-stone-800 rounded-2xl p-6 text-center">
                <div className="text-3xl font-bold text-white mb-2">98%</div>
                <div className="text-stone-400">好评率</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
              我们的价值观
            </h2>
            <p className="text-stone-600 max-w-2xl mx-auto">
              这些原则指导着我们产品的每一个决策
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <value.icon className="h-8 w-8 text-stone-700" />
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
              加入我们
            </h2>
            <p className="text-stone-600 text-lg mb-8 max-w-2xl mx-auto">
              无论是寻找徒步伙伴，还是希望加入我们的团队，都欢迎与我们联系
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-stone-800 hover:bg-stone-700 text-white px-8"
                asChild
              >
                <Link href="/">
                  开始探索
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-stone-300 hover:bg-stone-50 px-8"
                asChild
              >
                <Link href="/contact">联系我们</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
