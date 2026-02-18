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
      "欢迎使用 GoMate。通过访问或使用我们的户外组队平台服务（以下简称「服务」），您同意受本服务条款（以下简称「条款」）的约束。在使用服务前，请仔细阅读本条款。",
  },
  {
    title: "2. 服务描述",
    content:
      "GoMate 是一个专注于户外徒步的组队平台，帮助用户发现徒步地点、组建队伍、分享路线攻略。用户可以发布和加入徒步活动，与其他户外爱好者交流。",
  },
  {
    title: "3. 用户义务",
    content: "使用我们的服务，您同意：",
    list: [
      "遵守所有适用的法律法规",
      "提供真实、准确的个人信息",
      "不参与任何违法或未经授权的活动",
      "不干扰或破坏服务或服务器",
      "尊重其他用户，不进行骚扰或歧视",
    ],
  },
  {
    title: "4. 账户安全",
    content:
      "您负责维护账户密码的机密性，并对账户下的所有活动负责。如发现未经授权的使用，请立即通知我们。",
  },
  {
    title: "5. 内容规范",
    content: "您同意不发布以下内容：",
    list: [
      "违反任何法律法规的内容",
      "仇恨、歧视或攻击性内容",
      "侵犯知识产权的内容",
      "虚假或误导性信息",
      "垃圾信息或恶意软件",
    ],
  },
  {
    title: "6. 活动安全",
    content:
      "户外徒步存在固有风险。您理解并同意：GoMate 仅提供信息交流平台，不对线下活动的安全负责。参与户外活动前，请评估自身能力，做好安全准备。",
  },
  {
    title: "7. 知识产权",
    content:
      "服务中的所有内容（包括但不限于文字、图片、代码）均受知识产权法保护。用户发布的内容，用户保留所有权，但授予我们非独占的使用许可，用于展示和提供服务。",
  },
  {
    title: "8. 隐私保护",
    content:
      "我们的隐私实践在我们的隐私政策中详细说明。我们重视用户隐私，采取合理措施保护您的个人信息。",
  },
  {
    title: "9. 服务变更",
    content:
      "我们保留随时修改、暂停或终止服务的权利，恕不另行通知。对于重大变更，我们会提前通知用户。",
  },
  {
    title: "10. 免责声明",
    content:
      "服务按「现状」提供，不提供任何明示或暗示的担保。我们不对因使用服务而产生的任何直接、间接、附带、惩罚性或后果性损害负责。",
  },
  {
    title: "11. 责任限制",
    content:
      "在法律允许的最大范围内，GoMate 及其团队对任何索赔的总责任不超过您在过去 12 个月内向我们支付的金额（如有）。",
  },
  {
    title: "12. 争议解决",
    content:
      "本条款受中华人民共和国法律管辖。因本条款引起的任何争议，双方应首先通过友好协商解决；协商不成的，任何一方均可向有管辖权的法院提起诉讼。",
  },
  {
    title: "13. 条款变更",
    content:
      "我们保留随时修改本条款的权利。重大变更后继续使用服务，即表示您接受新条款。我们会在本页面发布更新后的条款。",
  },
  {
    title: "14. 联系我们",
    content: "如果您对本条款有任何疑问，请通过以下方式联系我们：",
    list: [
      "邮箱：hello@gomate.app",
      "微信公众号：GoMate户外",
    ],
  },
];

export default function TermsPage() {
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
              服务条款
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
