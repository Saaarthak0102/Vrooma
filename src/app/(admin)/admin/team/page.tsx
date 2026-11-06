import React from "react";
import { requireRole } from "@/server/auth/viewer";
import { TabLinks, pickTab, type TabLinkItem } from "@/components/layout/TabLinks";
import { listUsers } from "@/server/repositories/users";
import { listShowrooms, listWorkshops } from "@/server/repositories/showrooms";
import { listDemoCars, listSlots } from "@/server/repositories/slots";
import { listModels } from "@/server/repositories/models";
import { listRoutingRules, listStaffPool } from "@/server/repositories/admin-team";
import { UsersPanel } from "@/components/admin/team/UsersPanel";
import { NetworkPanel } from "@/components/admin/team/NetworkPanel";
import { RoutingPanel } from "@/components/admin/team/RoutingPanel";
import { SlotsPanel, type SlotGridRow } from "@/components/admin/team/SlotsPanel";

export const dynamic = "force-dynamic";

const TABS: TabLinkItem[] = [
  { id: "users", label: "People & roles" },
  { id: "network", label: "Showrooms & bays" },
  { id: "routing", label: "Lead routing" },
  { id: "slots", label: "Slot calendar" },
];

/** Screen 3 for the Dealer Principal: who works here, where, how leads are routed, and what can be booked. */
export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { profile } = await requireRole("admin");
  const tab = pickTab((await searchParams).tab, TABS);

  let body: React.ReactNode;

  if (tab === "users") {
    const [users, showrooms] = await Promise.all([listUsers(), listShowrooms()]);
    body = <UsersPanel users={users} showrooms={showrooms} currentUserId={profile.id} />;
  } else if (tab === "network") {
    const [showrooms, workshops, demoCars] = await Promise.all([listShowrooms(), listWorkshops(), listDemoCars()]);
    body = <NetworkPanel showrooms={showrooms} workshops={workshops} demoCars={demoCars} />;
  } else if (tab === "routing") {
    const [rules, pool, showrooms, models] = await Promise.all([
      listRoutingRules(),
      listStaffPool(),
      listShowrooms(),
      listModels({ limit: 100 }),
    ]);
    body = (
      <RoutingPanel
        rules={rules}
        pool={pool}
        showrooms={showrooms.map((s) => ({ id: s.id, name: s.name }))}
        models={models.map((m) => ({ id: m.id, name: m.name }))}
      />
    );
  } else {
    const [slots, showrooms, workshops, demoCars] = await Promise.all([
      listSlots({ limit: 200 }),
      listShowrooms(),
      listWorkshops(),
      listDemoCars(),
    ]);
    const showroomName = new Map(showrooms.map((s) => [s.id, s.name]));
    const workshopName = new Map(workshops.map((w) => [w.id, w.name]));
    const demoName = new Map(demoCars.map((d) => [d.id, `${d.variant_name} (${d.reg_label})`]));

    const rows: SlotGridRow[] = slots.map((s) => ({
      id: s.id,
      kind: s.kind,
      where:
        (s.workshop_id && workshopName.get(s.workshop_id)) ||
        (s.demo_car_id && demoName.get(s.demo_car_id)) ||
        (s.showroom_id && showroomName.get(s.showroom_id)) ||
        "-",
      starts_at: s.starts_at,
      capacity: s.capacity,
      booked: s.booked_count,
    }));
    body = <SlotsPanel slots={rows} />;
  }

  return (
    <div className="space-y-4">
      <TabLinks base="/admin/team" tabs={TABS} active={tab} />
      {body}
    </div>
  );
}
