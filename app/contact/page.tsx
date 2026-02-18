"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Mountain, Send, Mail, MessageSquare, CheckCircle } from "lucide-react";
import Link from "next/link";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const contactMethods = [
  {
    icon: Mail,
    title: "邮箱联系",
    description: "wujiahong2013@gmail.com",
    href: "mailto:wujiahong2013@gmail.com",
  },
  {
    icon: MessageSquare,
    title: "微信咨询",
    description: "扫码添加客服微信",
    href: "/wechat.jpg",
  },
];

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 这里可以添加实际的提交逻辑
    console.log("Form submitted:", formData);
    setIsSubmitted(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

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
              <span>联系我们</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 mb-6 tracking-tight">
              与我们取得联系
            </h1>
            <p className="text-lg text-stone-600 leading-relaxed">
              无论是产品建议、商务合作，还是加入我们的团队，都欢迎随时联系。
              我们期待听到您的声音。
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {contactMethods.map((method, index) => (
              <motion.a
                key={method.title}
                href={method.href}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-center gap-4 p-6 bg-white rounded-2xl border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all"
              >
                <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center">
                  <method.icon className="h-6 w-6 text-stone-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">{method.title}</h3>
                  <p className="text-sm text-stone-600">{method.description}</p>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-stone-900 mb-4">
                发送您的建议
              </h2>
              <p className="text-stone-600">
                您的反馈是我们改进产品的动力
              </p>
            </div>

            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12 bg-stone-50 rounded-2xl"
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-2">
                  感谢您的反馈！
                </h3>
                <p className="text-stone-600 mb-6">
                  我们已经收到您的建议，会尽快查看并回复。
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData({ name: "", email: "", subject: "", message: "" });
                  }}
                >
                  继续提交
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">您的姓名</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="请输入姓名"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">联系邮箱</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">主题</Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="请简述您的建议主题"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">详细建议</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="请详细描述您的建议或反馈..."
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-stone-800 hover:bg-stone-700 text-white px-8"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    提交建议
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="border-stone-300 hover:bg-stone-50 px-8"
                    asChild
                  >
                    <Link href="/">返回首页</Link>
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
