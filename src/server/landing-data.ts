import { listModels, getModelBySlug } from "@/server/repositories/models";
import { listUsedCars, getUsedCarByStockId } from "@/server/repositories/used-cars";
import { listShowrooms, listWorkshops } from "@/server/repositories/showrooms";
import { listSlots } from "@/server/repositories/slots";
import { getPriceRule } from "@/server/repositories/pricing";
import { computeOnRoad } from "@/lib/price-engine";
import { calculateEmi } from "@/lib/emi";
import { DEFAULT_CITY, COMPANY_FACTS, EMI_DEFAULTS } from "@/lib/constants";
import { Model, UsedCar } from "@/types/domain";

export const revalidate = 60;

export interface FeaturedModelTeaser {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  bodyType: string;
  heroImage: string;
  exShowroom: number;
  teaserOnRoad: number | null;
  validUntil: string | null;
}

export interface HeroModelData {
  id: string;
  name: string;
  slug: string;
  variantId: string;
  variantName: string;
  exShowroom: number;
  teaserOnRoad: number | null;
  validUntil: string | null;
}

export interface NextSlotData {
  slotId: string;
  timeFormatted: string;
  startsAt: string;
  showroomName: string;
}

export interface LocationChipData {
  id: string;
  name: string;
  type: "showroom" | "workshop" | "yard";
  city: string;
  slug: string;
  address: string;
}

export interface LandingStatsData {
  showrooms: number;
  workshops: number;
  usedCars: number;
  staff: number;
  newCarsYear: number;
  usedCarsYear: number;
}

export type PublicUsedCarSample = Omit<UsedCar, "reg_no_private">;

export interface EmiDefaultsData {
  principal: number;
  ratePct: number;
  tenureMonths: number;
  monthlyEmi: number;
  label: "indicative";
}

export interface BookNowShowroomPreview {
  id: string;
  name: string;
  area: string;
  openNow: boolean;
  label: string;
}

export interface BookNowSlotPreview {
  id: string;
  timeFormatted: string;
}

export interface BookNowPreviewData {
  showrooms: BookNowShowroomPreview[];
  slots: BookNowSlotPreview[];
  nextDayLabel?: string | null;
}

export interface LandingData {
  featuredModels: FeaturedModelTeaser[];
  heroModel: HeroModelData;
  nextSlot: NextSlotData | null;
  locations: LocationChipData[];
  stats: LandingStatsData;
  usedSample: PublicUsedCarSample | null;
  emiDefaults: EmiDefaultsData;
  bookNowPreview: BookNowPreviewData;
}

export async function getLandingData(locale: string = "en"): Promise<LandingData> {
  // 1. Fetch repositories concurrently
  const [allModels, allUsedCars, showrooms, workshops, allSlots] = await Promise.all([
    listModels(),
    listUsedCars(),
    listShowrooms(),
    listWorkshops(),
    listSlots({ kind: "test_drive" }),
  ]);

  // 2. Featured models with teaser on-road in Lucknow
  const topModels = allModels.slice(0, 4);
  const featuredModels: FeaturedModelTeaser[] = await Promise.all(
    topModels.map(async (m) => {
      const baseVariant = m.variants?.[0];
      let teaserOnRoad: number | null = null;
      let validUntil: string | null = null;

      if (baseVariant) {
        const rule = await getPriceRule({
          cityId: DEFAULT_CITY.id,
          variantId: baseVariant.id,
          modelId: m.id,
        });

        if (rule) {
          const breakup = computeOnRoad({
            variant: {
              id: baseVariant.id,
              name: baseVariant.name,
              ex_showroom: baseVariant.ex_showroom,
            },
            rule,
          });
          if (breakup) {
            teaserOnRoad = breakup.total;
            validUntil = breakup.validUntil;
          }
        }
      }

      return {
        id: m.id,
        name: m.name,
        slug: m.slug,
        tagline: m.tagline,
        bodyType: m.body_type,
        heroImage: m.hero_image,
        exShowroom: m.min_price ?? 0,
        teaserOnRoad,
        validUntil,
      };
    })
  );

  // 3. Hero Model (Model H, variant NEW-H-02 / ZX automatic)
  const modelH = await getModelBySlug("model-h");
  const heroVariant =
    modelH?.variants?.find((v) => v.id === "var-h-zx-at" || v.name.includes("ZX")) ||
    modelH?.variants?.[0];

  let heroOnRoad: number | null = null;
  let heroValidUntil: string | null = null;
  const heroExShowroom = heroVariant?.ex_showroom ?? 1245000;

  if (heroVariant) {
    const heroRule = await getPriceRule({
      cityId: DEFAULT_CITY.id,
      variantId: heroVariant.id,
      modelId: modelH?.id,
    });
    if (heroRule) {
      const breakup = computeOnRoad({
        variant: {
          id: heroVariant.id,
          name: heroVariant.name,
          ex_showroom: heroVariant.ex_showroom,
        },
        rule: heroRule,
      });
      if (breakup) {
        heroOnRoad = breakup.total;
        heroValidUntil = breakup.validUntil;
      }
    }
  }

  const heroModel: HeroModelData = {
    id: modelH?.id ?? "model-h",
    name: modelH?.name ?? "Model H",
    slug: modelH?.slug ?? "model-h",
    variantId: heroVariant?.id ?? "var-h-zx-at",
    variantName: heroVariant?.name ?? "ZX Automatic",
    exShowroom: heroExShowroom,
    teaserOnRoad: heroOnRoad,
    validUntil: heroValidUntil,
  };

  // 4. Next free test-drive slot
  const now = new Date();
  const availableSlots = allSlots
    .filter((s) => s.booked_count < s.capacity && new Date(s.starts_at) > now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  let nextSlot: NextSlotData | null = null;
  if (availableSlots.length > 0) {
    const earliest = availableSlots[0];
    const showroom = showrooms.find((sr) => sr.id === earliest.showroom_id);
    const dateObj = new Date(earliest.starts_at);
    const timeFormatted = dateObj.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const dayFormatted = dateObj.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    nextSlot = {
      slotId: earliest.id,
      timeFormatted: `${dayFormatted}, ${timeFormatted}`,
      startsAt: earliest.starts_at,
      showroomName: showroom?.name ?? "Lucknow Flagship",
    };
  }

  // 5. Locations: 3 showrooms, 2 workshops, 1 used-car yard
  const locations: LocationChipData[] = [
    ...showrooms.map((s) => ({
      id: s.id,
      name: s.name,
      type: "showroom" as const,
      city: s.city_id.includes("kanpur") ? "Kanpur" : "Lucknow",
      slug: s.id,
      address: s.address,
    })),
    ...workshops.map((w) => ({
      id: w.id,
      name: w.name,
      type: "workshop" as const,
      city: "Lucknow",
      slug: w.id,
      address: w.address,
    })),
    {
      id: "yard-shaheed-path",
      name: "Certified Used Hub Shaheed Path",
      type: "yard" as const,
      city: "Lucknow",
      slug: "shaheed-path-yard",
      address: "Amar Shaheed Path, Sector 7, Gomti Nagar Extension, Lucknow 226010",
    },
  ];

  // 6. Stats counts
  const availableUsedCount = allUsedCars.filter((c) => c.status === "available").length;
  const stats: LandingStatsData = {
    showrooms: showrooms.length,
    workshops: workshops.length,
    usedCars: availableUsedCount,
    staff: COMPANY_FACTS.staff,
    newCarsYear: COMPANY_FACTS.newCarsYear,
    usedCarsYear: COMPANY_FACTS.usedCarsYear,
  };

  // 7. Used sample: UC-1182 (strictly public, no reg_no_private)
  const rawUsedSample = await getUsedCarByStockId("UC-1182");
  let usedSample: PublicUsedCarSample | null = null;
  if (rawUsedSample) {
    const { ...safeCar } = rawUsedSample;
    delete (safeCar as any).reg_no_private;
    usedSample = safeCar;
  }

  // 8. EMI Defaults (80% principal of hero ex-showroom)
  const principal = Math.round(heroExShowroom * (1 - EMI_DEFAULTS.downPaymentPct / 100));
  const ratePct = EMI_DEFAULTS.annualRatePct;
  const tenureMonths = EMI_DEFAULTS.tenureMonths;
  const monthlyEmi = calculateEmi(principal, ratePct, tenureMonths);

  const emiDefaults: EmiDefaultsData = {
    principal,
    ratePct,
    tenureMonths,
    monthlyEmi,
    label: "indicative",
  };

  // 9. Book Now Preview for FinalCta phone screen (computed in Asia/Kolkata)
  const computeShowroomHoursStatus = (hours: Record<string, string>): { openNow: boolean; label: string } => {
    const kolkataFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = kolkataFormatter.formatToParts(now);
    const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "12", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    const currentMinutes = hour * 60 + minute;

    const isSunday = weekday === "Sun";
    let timeRangeStr = isSunday ? hours["Sunday"] : hours["Mon - Sat"];
    if (!timeRangeStr) {
      timeRangeStr = Object.values(hours)[0] || "09:30 AM - 08:00 PM";
    }

    const [openPart, closePart] = timeRangeStr.split("-").map((s) => s.trim());

    const parse12HourTime = (t?: string): number => {
      if (!t) return 9 * 60 + 30;
      const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 9 * 60 + 30;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const meridiem = match[3].toUpperCase();
      if (meridiem === "PM" && h < 12) h += 12;
      if (meridiem === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };

    const openMinutes = parse12HourTime(openPart);
    const closeMinutes = parse12HourTime(closePart);

    const formatMinutesTo12Hour = (min: number) => {
      let h = Math.floor(min / 60);
      const m = min % 60;
      const ampm = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      const minuteStr = m === 0 ? ":00" : `:${m.toString().padStart(2, "0")}`;
      return `${h}${minuteStr} ${ampm}`;
    };

    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      return {
        openNow: true,
        label: `Open now - closes ${formatMinutesTo12Hour(closeMinutes)}`,
      };
    } else {
      return {
        openNow: false,
        label: `Opens ${formatMinutesTo12Hour(openMinutes)}`,
      };
    }
  };

  const previewShowrooms: BookNowShowroomPreview[] = showrooms.slice(0, 2).map((s) => {
    const status = computeShowroomHoursStatus(s.hours || {});
    const addressParts = s.address.split(",").map((p) => p.trim());
    const area = addressParts.length >= 3
      ? `${addressParts[2]}, ${addressParts[1]}`
      : addressParts[0] || "Lucknow";

    const shortName = s.name.replace(/^Vrooma\s+/, "");

    return {
      id: s.id,
      name: shortName,
      area,
      openNow: status.openNow,
      label: status.label,
    };
  });

  const kolkataDay = (date: Date) => {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
  };
  const todayKolkata = kolkataDay(now);

  const todayAvailableSlots = availableSlots.filter(
    (s) => kolkataDay(new Date(s.starts_at)) === todayKolkata
  );

  let previewSlots: BookNowSlotPreview[] = [];
  let nextDayLabel: string | null = null;

  if (todayAvailableSlots.length > 0) {
    previewSlots = todayAvailableSlots.slice(0, 3).map((s) => {
      const d = new Date(s.starts_at);
      return {
        id: s.id,
        timeFormatted: d
          .toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
          .toUpperCase(),
      };
    });
  } else {
    const futureSlots = availableSlots.filter(
      (s) => kolkataDay(new Date(s.starts_at)) > todayKolkata
    );
    if (futureSlots.length > 0) {
      const firstFutureDate = new Date(futureSlots[0].starts_at);
      const dayName = firstFutureDate.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      nextDayLabel = `No slots today - see ${dayName}`;
      previewSlots = futureSlots.slice(0, 3).map((s) => {
        const d = new Date(s.starts_at);
        return {
          id: s.id,
          timeFormatted: d
            .toLocaleTimeString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
            .toUpperCase(),
        };
      });
    } else {
      nextDayLabel = "No slots today - see tomorrow";
    }
  }

  const bookNowPreview: BookNowPreviewData = {
    showrooms: previewShowrooms,
    slots: previewSlots,
    nextDayLabel,
  };

  return {
    featuredModels,
    heroModel,
    nextSlot,
    locations,
    stats,
    usedSample,
    emiDefaults,
    bookNowPreview,
  };
}
