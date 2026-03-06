import { getLocationPois } from "@/app/actions/pois";
import type { PoiRoleType } from "@/db/schema";

// GET /api/locations/[id]/pois?roleType=checkpoint
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const roleType = searchParams.get("roleType") ?? undefined;

  const results = await getLocationPois(
    id,
    roleType as PoiRoleType | undefined
  );

  const pois = results.map(({ poi, role }) => ({
    id: poi.id,
    name: poi.name,
    description: poi.description,
    category: poi.category,
    coordinates: JSON.parse(poi.coordinates),
    images: poi.images ? JSON.parse(poi.images) : [],
    extra: poi.extra ? JSON.parse(poi.extra) : null,
    order: role.order,
    roleType: role.roleType,
  }));

  return Response.json({ success: true, pois });
}
