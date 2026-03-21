"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { copy } from "@/lib/copy";
import { signIn } from "@/lib/auth-client";

/**
 * 登录页客户端组件 - React Island
 */
export function LoginClient() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [formData, setFormData] = React.useState({ email: "", password: "" });

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

    try {
      const result = await signIn.email({
        email: formData.email,
        password: formData.password,
      });

      if (result.error) {
        setError(t.loginError);
        return;
      }

      window.location.href = "/";
    } catch {
      setError(t.loginErrorRetry);
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-stone-200 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-stone-900">{t.loginTitle}</h1>
              <p className="text-sm text-stone-500 mt-2">{t.loginSubtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-stone-700">
                    {t.password}
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-xs text-stone-500 hover:text-stone-900"
                  >
                    {t.forgotPassword}
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t.passwordPlaceholder}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
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

              {/* 错误提示 */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.loginBtnLoading}
                  </>
                ) : (
                  t.loginBtn
                )}
              </button>

              {/* 注册链接 */}
              <p className="text-center text-sm text-stone-500">
                {t.noAccount}{" "}
                <a href="/register" className="text-stone-900 font-medium hover:underline">
                  {t.registerNow}
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
