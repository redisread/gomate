"use client";

import { useState, useEffect } from "react";

interface IPLocation {
  city?: string;
  region?: string;
  country?: string;
  error?: string;
}

/**
 * 通过 IP 获取用户所在城市
 * 使用 ipapi.co 免费服务（无需 API key，有速率限制）
 */
export function useIPLocation(): IPLocation & { isLoading: boolean } {
  const [location, setLocation] = useState<IPLocation>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 优先从 localStorage 读取缓存，避免重复请求
    const cached = localStorage.getItem("user_ip_location");
    const cachedTime = localStorage.getItem("user_ip_location_time");
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时缓存

    if (cached && cachedTime && Date.now() - parseInt(cachedTime) < CACHE_DURATION) {
      try {
        const parsed = JSON.parse(cached);
        setLocation(parsed);
        setIsLoading(false);
        return;
      } catch {
        // 缓存解析失败，继续请求
      }
    }

    // 异步获取 IP 定位
    const fetchLocation = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/", {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`IP location failed: ${response.status}`);
        }

        const data = await response.json();
        const locationData: IPLocation = {
          city: data.city,
          region: data.region,
          country: data.country_name,
        };

        // 缓存结果
        localStorage.setItem("user_ip_location", JSON.stringify(locationData));
        localStorage.setItem("user_ip_location_time", Date.now().toString());

        setLocation(locationData);
      } catch (err) {
        setLocation({ error: err instanceof Error ? err.message : "定位失败" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocation();
  }, []);

  return { ...location, isLoading };
}

/**
 * 获取格式化的城市显示文本
 * 优先显示城市名，如果没有则显示省份，最后降级到"未知"
 */
export function getCityDisplay(location: IPLocation): string | null {
  if (location.city) {
    // 国内城市显示"城市名"
    return location.city.replace(/市$/, ""); // 去掉"市"后缀
  }
  if (location.region) {
    return location.region;
  }
  return null;
}
