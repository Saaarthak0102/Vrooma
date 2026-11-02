import { DemoCar, Slot } from "@/types/domain";

export const mockDemoCars: DemoCar[] = [
  {
    id: "demo-h-hazratganj",
    showroom_id: "sr-hazratganj",
    variant_id: "var-h-zx-at",
    variant_name: "Model H ZX Automatic (Petrol)",
    reg_label: "UP32 DEMO 01",
    active: true,
  },
  {
    id: "demo-c-hazratganj",
    showroom_id: "sr-hazratganj",
    variant_id: "var-c-vx-at",
    variant_name: "Model C VX Automatic (Diesel)",
    reg_label: "UP32 DEMO 02",
    active: true,
  },
  {
    id: "demo-h-gomtinagar",
    showroom_id: "sr-gomtinagar",
    variant_id: "var-h-zx-at",
    variant_name: "Model H ZX Automatic (Petrol)",
    reg_label: "UP32 DEMO 03",
    active: true,
  },
  {
    id: "demo-x-gomtinagar",
    showroom_id: "sr-gomtinagar",
    variant_id: "var-x-long-range",
    variant_name: "Model X Ultra Long Range EV",
    reg_label: "UP32 DEMO 04",
    active: true,
  },
];

export function generateMockSlots(): Slot[] {
  const slots: Slot[] = [];
  const times = [
    { start: "10:00", end: "11:00" },
    { start: "11:30", end: "12:30" },
    { start: "14:00", end: "15:00" },
    { start: "15:30", end: "16:30" },
    { start: "17:00", end: "18:00" },
  ];

  const today = new Date();

  // Generate for the next 7 days
  for (let d = 0; d < 7; d++) {
    const slotDate = new Date(today);
    slotDate.setDate(today.getDate() + d);
    const dateStr = slotDate.toISOString().slice(0, 10);

    // Test drive slots for Hazratganj demo cars
    for (const demoCar of mockDemoCars) {
      times.forEach((t, i) => {
        // Mark some slots as taken for realistic UI
        const isBooked = (d === 0 && i < 2) || (d === 1 && i === 2);
        slots.push({
          id: `slot-td-${demoCar.id}-${dateStr}-${t.start.replace(":", "")}`,
          kind: "test_drive",
          showroom_id: demoCar.showroom_id,
          demo_car_id: demoCar.id,
          starts_at: `${dateStr}T${t.start}:00.000Z`,
          ends_at: `${dateStr}T${t.end}:00.000Z`,
          capacity: 1,
          booked_count: isBooked ? 1 : 0,
        });
      });
    }

    // Workshop service slots for Transport Nagar
    times.forEach((t, i) => {
      const bookedBays = i === 1 ? 16 : i === 3 ? 14 : 6;
      slots.push({
        id: `slot-ws-tn-${dateStr}-${t.start.replace(":", "")}`,
        kind: "service",
        workshop_id: "ws-transportnagar",
        starts_at: `${dateStr}T${t.start}:00.000Z`,
        ends_at: `${dateStr}T${t.end}:00.000Z`,
        capacity: 16,
        booked_count: bookedBays,
      });
    });
  }

  return slots;
}

export const mockSlots = generateMockSlots();
