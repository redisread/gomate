import { locations } from "@/lib/data/mock";
import LocationPageContent from "./content";

// 静态导出参数生成
export function generateStaticParams() {
  return locations.map((location) => ({
    id: location.id,
  }));
}

interface LocationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LocationPage({ params }: LocationPageProps) {
  const { id } = await params;
  return <LocationPageContent locationId={id} />;
}
