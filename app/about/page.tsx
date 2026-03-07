"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Mountain, Users, MapPin, Sprout, Sparkles, ArrowRight, Map, UserPlus, Compass } from "lucide-react";
import Link from "next/link";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";

const values = [
  {
    icon: Users,
    title: "真实连接",
    description: "我们相信面对面的真实社交，让共同的兴趣成为连接彼此的桥梁。",
  },
  {
    icon: MapPin,
    title: "探索发现",
    description: "挖掘城市及周边值得一去的地方，发现更多有意思的角落。",
  },
  {
    icon: Sprout,
    title: "共同成长",
    description: "与志同道合的人同行，每一次出发都是一次新的收获。",
  },
  {
    icon: Sparkles,
    title: "简单纯粹",
    description: "去掉多余的噪音，用简单的设计连接真诚的人。",
  },
];

const steps = [
  {
    number: "1",
    icon: Map,
    title: "选择地点",
    description: "浏览精选地点，找到你感兴趣的目的地",
  },
  {
    number: "2",
    icon: UserPlus,
    title: "创建或加入队伍",
    description: "设置活动时间、人数，或直接加入已有队伍",
  },
  {
    number: "3",
    icon: Compass,
    title: "一起出发",
    description: "和志同道合的伙伴一起，开启这段旅程",
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
              找到同行的人
              <br />
              <span className="text-stone-600">从这里出发</span>
            </h1>
            <p className="text-lg text-stone-600 leading-relaxed">
              GoMate 是一个极简的「地点组队」平台。
              我们用结构化的方式取代混乱的帖子和评论区，
              帮助你快速找到志同道合的同行伙伴。
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
                想去某个地方，却苦于找不到合适的同伴——
                这是很多人的困境。社交媒体的评论区、微信群，信息混乱、效率低下。
              </p>
              <p className="text-stone-400 text-lg leading-relaxed">
                GoMate 想做的事很简单：让「找人一起去」这件事变得清晰、高效、可靠。
                无论你想去哪、玩什么，都能快速找到合适的队伍。
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-semibold text-white mb-6">
                3步找到同行伙伴
              </h3>
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-start gap-4 bg-stone-800 rounded-2xl p-5"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-white text-stone-900 rounded-full flex items-center justify-center font-bold text-lg">
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <step.icon className="h-5 w-5 text-stone-300" />
                      <h4 className="font-semibold text-white">{step.title}</h4>
                    </div>
                    <p className="text-stone-400 text-sm">{step.description}</p>
                  </div>
                </motion.div>
              ))}
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
              无论是寻找同行伙伴，还是有想法想和我们聊聊，都欢迎联系
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
