"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, MapPin, ArrowLeft, Trash2 } from "lucide-react";
import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useFavorites } from "@/lib/hooks/use-favorite";
import { cn } from "@/lib/utils";

export default function FavoritesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { favorites, isLoading, refresh } = useFavorites("location");

  // 取消收藏
  const handleRemoveFavorite = async (entityType: string, entityId: string) => {
    try {
      const response = await fetch(
        `/api/favorites?entityType=${entityType}&entityId=${entityId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        refresh();
      }
    } catch (error) {
      console.error("取消收藏失败:", error);
    }
  };

  // 未登录状态
  if (!authLoading && !isAuthenticated) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-16">
              <Heart className="h-16 w-16 text-stone-300 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-stone-900 mb-2">
                请先登录
              </h1>
              <p className="text-stone-600 mb-6">
                登录后可以收藏感兴趣的徒步地点
              </p>
              <Button asChild className="bg-stone-800 hover:bg-stone-700">
                <Link href="/login">立即登录</Link>
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
            <h1 className="text-3xl font-bold text-stone-900">我的收藏</h1>
            <p className="text-stone-600 mt-2">收藏感兴趣的徒步地点，方便下次查看</p>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="border-stone-200">
                  <div className="h-48 bg-stone-200 animate-pulse" />
                  <CardContent className="p-5">
                    <div className="h-6 bg-stone-200 rounded animate-pulse mb-2" />
                    <div className="h-4 bg-stone-200 rounded animate-pulse w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && favorites.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-16 bg-white rounded-2xl border border-stone-200"
            >
              <Heart className="h-16 w-16 text-stone-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-stone-900 mb-2">
                还没有收藏任何地点
              </h2>
              <p className="text-stone-600 mb-6">
                去浏览徒步地点，收藏感兴趣的路线吧
              </p>
              <Button asChild className="bg-stone-800 hover:bg-stone-700">
                <Link href="/locations">浏览地点</Link>
              </Button>
            </motion.div>
          )}

          {/* Favorites Grid */}
          {!isLoading && favorites.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((favorite, index) => (
                <motion.div
                  key={favorite.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-stone-200 h-full">
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden">
                      {favorite.location?.coverImage ? (
                        <Image
                          src={favorite.location.coverImage}
                          alt={favorite.location.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="h-full bg-stone-200 flex items-center justify-center">
                          <MapPin className="h-8 w-8 text-stone-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                      {/* Remove Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveFavorite(favorite.entityType, favorite.entityId);
                        }}
                        className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-stone-600 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      {/* Title Overlay */}
                      {favorite.location && (
                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="text-lg font-bold text-white">
                            {favorite.location.name}
                          </h3>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <CardContent className="p-4">
                      {favorite.location?.address && (
                        <div className="flex items-center gap-1 text-sm text-stone-500 mb-3">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{favorite.location.address}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-400">
                          收藏于{" "}
                          {new Date(favorite.createdAt).toLocaleDateString("zh-CN")}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-stone-600 hover:text-stone-900"
                          asChild
                        >
                          <Link href={`/locations/${favorite.entityId}`}>
                            查看详情
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
