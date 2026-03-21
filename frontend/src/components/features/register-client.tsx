"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { copy } from "@/lib/copy";
import { signUp } from "@/lib/auth-client";

/**
 * 注册页客户端组件 - React Island
 */
export function RegisterClient() {
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

  const t = copy.auth;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError(t.passwordMismatch);
      setIsLoading(false);
      return;
    }

    if (formData.name.length < 2) {
      setError(t.nicknameTooShort);
      setIsLoading(false);
      return;
    }

    try {
      const result = await signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      if (result.error) {
        if (result.error.message?.includes("already")) {
          setError(t.emailTaken);
        } else {
          setError(t.registerErrorRetry);
        }
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch {
      setError(t.registerErrorRetry);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">{t.registerSuccess}</h2>
          <p className="text-stone-500">{t.registerSuccessRedirect}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <a
          href="/"
          className="inline-flex items-center text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {copy.common.backHome}
        </a>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-stone-200 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-stone-900">{t.registerTitle}</h1>
              <p className="text-sm text-stone-500 mt-2">{t.registerSubtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 昵称 */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-stone-700">
                  {t.nickname}
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder={t.nicknamePlaceholder}
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-900"
                />
              </div>

              {/* 邮箱 */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-stone-700">
                  {t.email}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-900"
                />
              </div>

              {/* 密码 */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-stone-700">
                  {t.password}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t.passwordTooShort}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-2.5 pr-10 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* 确认密码 */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-stone-700">
                  {t.confirmPassword}
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder={t.reenterPassword}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-900"
                />
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* 注册按钮 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.registerBtnLoading}
                  </>
                ) : (
                  t.registerBtn
                )}
              </button>

              {/* 登录链接 */}
              <p className="text-center text-sm text-stone-500">
                {t.hasAccount}{" "}
                <a href="/login" className="text-stone-900 font-medium hover:underline">
                  {t.loginNow}
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
