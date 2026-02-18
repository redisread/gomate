"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Mountain } from "lucide-react";
import Link from "next/link";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";

const sections = [
  {
    title: "1. 引言",
    content:
      "GoMate 非常重视您的隐私保护。本隐私政策说明了我们如何收集、使用和保护您在使用 GoMate 户外组队平台服务时的信息。",
  },
  {
    title: "2. 信息收集",
    content: "我们收集的信息包括：",
    list: [
      "账户信息：当您注册时提供的用户名、邮箱地址",
      "个人资料：头像、个人简介等您选择填写的信息",
      "活动数据：您发布的组队信息、参与的徒步活动",
      "设备信息：IP 地址、浏览器类型、设备标识符",
      "位置信息：用于推荐附近的徒步地点（需授权）",
    ],
  },
  {
    title: "3. 信息使用",
    content: "我们使用收集的信息用于：",
    list: [
      "提供、维护和改进我们的服务",
      "匹配适合的徒步伙伴和队伍",
      "发送服务通知和活动提醒",
      "保障用户安全，防止欺诈行为",
      "分析使用趋势，优化用户体验",
    ],
  },
  {
    title: "4. 信息共享",
    content:
      "我们不会将您的个人信息出售给第三方。仅在以下情况下可能共享信息：",
    list: [
      "经您同意的其他用户（如组队时显示联系方式）",
      "服务提供商（如云服务、数据分析）",
      "法律要求或保护我们的合法权益",
    ],
  },
  {
    title: "5. 数据安全",
    content:
      "我们采用行业标准的安全措施保护您的数据，包括加密传输、访问控制、定期安全审计等。但请注意，互联网传输无法保证 100% 安全。",
  },
  {
    title: "6. 数据保留",
    content:
      "我们仅在提供服务所需的期限内保留您的信息。您可以随时删除账户，我们将在合理期限内删除您的个人数据。",
  },
  {
    title: "7. 您的权利",
    content: "您拥有以下权利：",
    list: [
      "访问、更正或删除您的个人信息",
      "撤回对数据处理的同意",
      "导出您的数据副本",
      "注销账户",
    ],
  },
  {
    title: "8. Cookie 使用",
    content:
      "我们使用 Cookie 和类似技术来改善用户体验、分析网站流量。您可以通过浏览器设置管理 Cookie 偏好。",
  },
  {
    title: "9. 儿童隐私",
    content:
      "我们的服务不面向 13 岁以下儿童。我们不会故意收集儿童的个人信息。如发现此类情况，请立即联系我们删除。",
  },
  {
    title: "10. 政策更新",
    content:
      "我们可能会不时更新本隐私政策。重大变更时，我们会通过网站公告或邮件通知您。",
  },
  {
    title: "11. 联系我们",
    content: "如果您对本隐私政策有任何疑问，请通过以下方式联系我们：",
    list: [
      "邮箱：hello@gomate.app",
      "微信公众号：GoMate户外",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24 bg-stone-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm text-stone-600 mb-6">
              <Mountain className="h-4 w-4" />
              <span>GoMate</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 mb-6 tracking-tight">
              隐私政策
            </h1>
            <p className="text-lg text-stone-600">
              最后更新：2025年2月
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <h2 className="text-2xl font-bold text-stone-900 mb-4">
                  {section.title}
                </h2>
                <p className="text-stone-600 leading-relaxed mb-4">
                  {section.content}
                </p>
                {section.list && (
                  <ul className="list-disc list-inside space-y-2 text-stone-600 ml-4">
                    {section.list.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </motion.div>
            ))}
          </div>

          {/* Back to Home */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-16 pt-8 border-t border-stone-200 text-center"
          >
            <Link
              href="/"
              className="text-stone-600 hover:text-stone-900 transition-colors"
            >
              ← 返回首页
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
