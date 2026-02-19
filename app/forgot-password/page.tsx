"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail, CheckCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [formData, setFormData] = React.useState({
    email: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "发送失败");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送重置邮件失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 清除速率限制（仅用于开发测试）
  const handleClearRateLimit = async () => {
    if (!formData.email) {
      setError("请先输入邮箱");
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch("/api/admin/clear-rate-limit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: formData.email,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setError("");
        alert("速率限制已清除，请重新发送");
      } else {
        throw new Error(result.message || "清除失败");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "清除失败");
    } finally {
      setIsClearing(false);
    }
  };

  // 检查是否是速率限制错误
  const isRateLimitError = error.includes("过于频繁") || error.includes("后再试");

  return (
    <main className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <Link
          href="/login"
          className="inline-flex items-center text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回登录
        </Link>
      </div>

      {/* Forgot Password Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-stone-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-stone-900">
                忘记密码
              </CardTitle>
              <p className="text-sm text-stone-500 mt-2">
                输入您的邮箱，我们将发送重置密码链接
              </p>
            </CardHeader>
            <CardContent>
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-stone-900 mb-2">
                    邮件已发送
                  </h3>
                  <p className="text-sm text-stone-500 mb-6">
                    请检查您的邮箱，点击邮件中的链接重置密码
                  </p>
                  <Link href="/login">
                    <Button className="bg-stone-900 hover:bg-stone-800">
                      返回登录
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* 邮箱 */}
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="border-stone-200 pl-10"
                      />
                    </div>
                  </div>

                  {/* 错误提示 */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-600">{error}</p>
                      {isRateLimitError && (
                        <button
                          type="button"
                          onClick={handleClearRateLimit}
                          disabled={isClearing}
                          className="mt-2 text-xs text-stone-500 hover:text-stone-700 underline flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          {isClearing ? "清除中..." : "清除限制（开发测试用）"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* 发送按钮 */}
                  <Button
                    type="submit"
                    className="w-full bg-stone-900 hover:bg-stone-800"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        发送中...
                      </>
                    ) : (
                      "发送重置链接"
                    )}
                  </Button>

                  {/* 提示 */}
                  <p className="text-center text-xs text-stone-400">
                    如果没有收到邮件，请检查垃圾邮件文件夹
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
