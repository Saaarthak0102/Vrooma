"use client";

import React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trash2, Bookmark } from "lucide-react";
import { SavedVehicleRecord } from "@/server/repositories/saved";
import { Model, UsedCar } from "@/types/domain";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getVehicleAsset } from "@/constants/vehicle-assets";

export interface SavedVehiclesCardProps {
  records: SavedVehicleRecord[];
  onViewAll: (triggerElement: HTMLElement) => void;
  onRemove?: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function SavedVehiclesCard({
  records,
  onViewAll,
  onRemove,
  className,
  style,
}: SavedVehiclesCardProps) {
  const t = useTranslations("dashboard");
  const displayItems = records.slice(0, 2);

  return (
    <article
      data-bento-origin="saved"
      style={style}
      className={cn(
        "@container bento-block bento-saved rounded-[16px] border border-border bg-white p-4 sm:p-5 flex flex-col justify-between shadow-sm transition-colors hover:border-black/20 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 pb-2 border-b border-border">
        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-mute">
          {t("savedVehicles")}
        </span>
        <Button
          variant="link"
          size="sm"
          onClick={(e) => onViewAll(e.currentTarget)}
          className="h-auto p-0 text-xs font-semibold text-accent-ink hover:underline"
        >
          {t("viewAll")}
        </Button>
      </div>

      {displayItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4 space-y-2">
          <Bookmark className="h-6 w-6 text-ink-mute" />
          <p className="text-xs font-medium text-ink-soft">{t("noSavedTitle")}</p>
          <Button asChild variant="secondary" size="sm" className="text-xs h-8">
            <Link href="/cars">{t("browseCars")}</Link>
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-around divide-y divide-border">
          {displayItems.map((record) => {
            const isUsed = record.type === "used";
            const car = record.item as UsedCar;
            const model = record.item as Model;

            const title = isUsed ? car.model_name : model.name;
            const subtitle = isUsed ? car.variant_name : model.tagline || "";
            const image = isUsed ? car.images[0] : model.hero_image;
            const price = isUsed ? car.price : model.min_price;
            const priceLabel = isUsed ? "Price" : "Ex-showroom";
            const linkHref = isUsed ? `/used-cars/${car.stock_id}` : `/cars/${model.slug}`;

            return (
              <div
                key={record.id}
                className="saved-item-row flex items-center justify-between gap-3 py-2"
              >
                {/* Thumbnail & Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="saved-thumb relative rounded-md bg-stone-100 overflow-hidden shrink-0 border border-border">
                    <Image
                      src={getVehicleAsset(image || record.item)}
                      alt={title}
                      fill
                      sizes="64px"
                      className="object-contain p-0.5"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-ink truncate leading-tight">
                      <Link href={linkHref as any} className="hover:underline">
                        {title}
                      </Link>
                    </h4>
                    {subtitle && (
                      <p className="text-[11px] text-ink-soft truncate leading-none mt-0.5">
                        {subtitle}
                      </p>
                    )}
                    <p className="text-xs font-bold text-ink mt-0.5 tabular-nums">
                      <span className="text-[10px] font-normal text-ink-mute mr-1">
                        {priceLabel}:
                      </span>
                      {formatINR(price)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    asChild
                    variant="secondary"
                    shape="soft"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                  >
                    <Link href={linkHref as any}>
                      <span className="@max-[340px]:hidden">{t("view")}</span>
                      <ArrowRight className="h-3.5 w-3.5 @min-[341px]:ml-1" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    shape="soft"
                    className="h-8 w-8 text-ink-mute hover:text-danger rounded-lg"
                    onClick={() => {
                      if (onRemove) {
                        onRemove(record.id);
                      } else {
                        toast.info("Vehicle removed from saved list.");
                      }
                    }}
                    aria-label={`${t("remove")} ${title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
