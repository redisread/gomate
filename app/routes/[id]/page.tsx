import { notFound } from "next/navigation";
import { getRouteById } from "@/app/actions/routes";
import { RoutePageClient } from "./route-page-client";
import type { Metadata } from "next";

interface RoutePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RoutePageProps): Promise<Metadata> {
  const { id } = await params;
  const route = await getRouteById(id);

  if (!route) {
    return {
      title: "路线未找到 - GoMate",
    };
  }

  return {
    title: `${route.name} - ${route.location?.name || "路线详情"} - GoMate`,
    description: route.description || `${route.name}的详细信息，包括路线难度、距离、时长等。`,
  };
}

export default async function RoutePage({ params }: RoutePageProps) {
  const { id } = await params;
  const routeData = await getRouteById(id);

  if (!routeData) {
    notFound();
  }

  // 格式化路线数据
  const route = {
    ...routeData,
    routeGuide: routeData.routeGuide ? JSON.parse(routeData.routeGuide as string) : undefined,
    waypoints: routeData.waypoints ? JSON.parse(routeData.waypoints as string) : [],
    equipmentNeeded: routeData.equipmentNeeded ? JSON.parse(routeData.equipmentNeeded as string) : [],
    warnings: routeData.warnings ? JSON.parse(routeData.warnings as string) : [],
  };

  return <RoutePageClient route={route} />;
}
