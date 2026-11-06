import React from "react";
import { listBanners } from "@/server/repositories/offers";
import { BannersClient } from "./BannersClient";

export default async function AdminBannersPage() {
  const banners = await listBanners();
  return <BannersClient initialBanners={banners} />;
}
