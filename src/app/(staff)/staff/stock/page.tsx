import React from "react";
import { requireRole } from "@/server/auth/viewer";
import { listStock, listTradeIns } from "@/server/repositories/stock";
import { StockClient } from "./StockClient";

export const dynamic = "force-dynamic";

/** Screen 3 for the Used-Car Manager (and the Dealer Principal): stock, prices, inspections and trade-ins. */
export default async function UsedStockPage() {
  // Middleware already limits this path; this is the second layer.
  await requireRole("manager", "admin");
  const [stock, tradeIns] = await Promise.all([listStock(), listTradeIns()]);
  return <StockClient stock={stock} tradeIns={tradeIns} />;
}
