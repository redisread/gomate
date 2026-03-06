"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { LocationPageClient } from "./location-page-client";

export default function LocationPage() {
  const params = useParams();
  const id = params.id as string;
  return <LocationPageClient locationId={id} />;
}
