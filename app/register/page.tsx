"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { copy } from "@/lib/copy";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // 如果已登录，重定向到首页
  const t = copy.auth;
  const c = copy.common;
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // 验证密码
    if (formData.password !== formData.confirmPassword) {
      setError(t.passwordMismatch);
      setIsLoading(false);
      return;
    }

    // 验证用户名
    if (formData.name.length < 2) {
      setError(t.nicknameTooShort);
      setIsLoading(false);
      return;
    }

    const result = await register(formData.name, formData.email, formData.password);

    if (!result.success) {
      setError(result.error || t.registerFailed);
      setIsLoading(false);
      return;
    }

    // 注册成功
    setIsSuccess(true);
    setTimeout(() => {
      router.push("/");
    }, 1500);
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">{t.registerSuccess}</h2>
          <p className="text-stone-500">{t.registerSuccessRedirect}</p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <Link
          href="/"
          className="inline-flex items-center text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {c.backHome}
        </Link>
      </div>

      {/* Register Form */}
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
                {t.registerTitle}
              </CardTitle>
              <p className="text-sm text-stone-500 mt-2">
                {t.registerSubtitle}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 昵称 */}
                <div className="space-y-2">
                  <Label htmlFor="name">{t.nickname}</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder={t.nicknamePlaceholder}
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="border-stone-200"
                  />
                </div>

                {/* 邮箱 */}
                <div className="space-y-2">
                  <Label htmlFor="email">{t.email}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="border-stone-200"
                  />
                </div>

                {/* 密码 */}
                <div className="space-y-2">
                  <Label htmlFor="password">{t.password}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t.passwordTooShort}
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      minLength={6}
                      className="border-stone-200 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 确认密码 */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder={t.reenterPassword}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="border-stone-200"
                  />
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* 注册按钮 */}
                <Button
                  type="submit"
                  className="w-full bg-stone-900 hover:bg-stone-800"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.registerBtnLoading}
                    </>
                  ) : (
                    t.registerBtn
                  )}
                </Button>

                {/* 登录链接 */}
                <p className="text-center text-sm text-stone-500">
                  {t.hasAccount}{" "}
                  <Link
                    href="/login"
                    className="text-stone-900 font-medium hover:underline"
                  >
                    {t.loginNow}
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
