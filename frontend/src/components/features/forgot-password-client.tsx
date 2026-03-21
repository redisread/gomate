"use client";

import * as React from "react";
import { Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";

/**
 * 忘记密码页客户端组件 - React Island
 */
export function ForgotPasswordClient() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [email, setEmail] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetchAPI("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || result.message || copy.auth.sendEmailFailed);
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.auth.sendEmailFailed);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <a
          href="/login"
          className="inline-flex items-center text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {copy.common.backLogin}
        </a>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-stone-200 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-stone-900">
                {copy.auth.forgotPasswordTitle}
              </h1>
              <p className="text-sm text-stone-500 mt-2">
                {copy.auth.forgotPasswordSubtitle}
              </p>
            </div>

            {success ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-stone-900 mb-2">
                  {copy.success.emailSent}
                </h3>
                <p className="text-sm text-stone-500 mb-6">
                  {copy.email.checkInbox}
                </p>
                <a href="/login">
                  <button className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
                    {copy.common.backLogin}
                  </button>
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-stone-700">
                    {copy.auth.email}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-900"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-stone-900 hover:bg-stone-800 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {copy.common.loading}
                    </>
                  ) : (
                    copy.auth.sendResetLink
                  )}
                </button>

                <p className="text-center text-xs text-stone-400">
                  {copy.email.checkJunkFolder}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
