import React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Model, UsedCar } from "@/types/domain";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trash2 } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

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

  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-card flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-24 rounded-lg bg-ink/5 overflow-hidden shrink-0">
          <Image
            src={image || "/images/placeholders/car-1.svg"}
            alt={title}
            fill
            className="object-contain p-1"
          />
        </div>
        <div>
          <h4 className="font-bold text-sm text-ink">{title}</h4>
          <p className="text-xs font-semibold text-accent-ink mt-0.5">
            {formatINR(price)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild variant="secondary" size="sm" className="text-xs h-9">
          <Link href={linkHref as any}>
            <span>View</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-ink-mute hover:text-danger"
          onClick={notWired("Remove Saved Car", 4)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

