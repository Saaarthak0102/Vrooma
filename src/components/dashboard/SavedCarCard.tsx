import React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Model, UsedCar } from "@/types/domain";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trash2 } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";
import { getVehicleAsset } from "@/constants/vehicle-assets";

export function SavedCarCard({
  item,
  type,
}: {
  item: Model | UsedCar;
  type: "model" | "used";
}) {
  const isUsed = type === "used";
  const car = item as UsedCar;
  const model = item as Model;

  const title = isUsed ? `${car.model_name} ${car.variant_name}` : model.name;
  const image = isUsed ? car.images[0] : model.hero_image;
  const price = isUsed ? car.price : model.min_price;
  const linkHref = isUsed ? `/used-cars/${car.stock_id}` : `/cars/${model.slug}`;

  const formattedPriceNumber = formatINR(price).replace("₹", "").trim();

  return (
    <article className="notch-card !p-4 flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative h-16 w-24 rounded-[12px] bg-stone-100 overflow-hidden shrink-0">
          <Image
            src={getVehicleAsset(image || item)}
            alt={title}
            fill
            sizes="96px"
            className="object-contain p-1 transition-transform duration-300 hover:scale-105"
          />
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-sm sm:text-base text-ink line-clamp-1">
            <Link href={linkHref as any} className="notch-card-title-link">
              {title}
            </Link>
          </h4>
          <p className="text-xs font-semibold text-accent-ink mt-0.5 tabular-nums">
            <span className="text-[0.8em] font-normal opacity-75 mr-0.5">₹</span>
            {formattedPriceNumber}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 notch-interactive">
        <Button
          href={linkHref as any}
          variant="secondary"
          shape="soft"
          size="sm"
          className="!min-h-[38px] !h-[38px] !px-3 text-xs"
          rightIcon={<ArrowRight className="h-3.5 w-3.5 ml-1" />}
        >
          View
        </Button>
        <Button
          variant="ghost"
          size="icon"
          shape="soft"
          className="h-[38px] w-[38px] text-ink-mute hover:text-danger rounded-xl"
          onClick={notWired("Remove Saved Car", 4)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
