import React from "react";
import Image from "next/image";
import { getVehicleAsset } from "@/constants/vehicle-assets";

export interface NotchMediaProps {
  src: string;
  alt: string;
  priority?: boolean;
  tag?: React.ReactNode;
  className?: string;
  blurDataURL?: string;
}

export function NotchMedia({
  src,
  alt,
  priority = false,
  tag,
  className = "",
  blurDataURL,
}: NotchMediaProps) {
  const resolvedSrc = getVehicleAsset(src);

  return (
    <div className={`notch-media ${className}`}>
      <Image
        src={resolvedSrc}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        priority={priority}
        placeholder={blurDataURL ? "blur" : "empty"}
        blurDataURL={blurDataURL}
        className="notch-media-img"
      />

      {/* Diagonal light sweep layer on fine-pointer hover */}
      <span className="notch-media-sweep" aria-hidden="true" />

      {/* Bottom-left cutout tag */}
      {tag}
    </div>
  );
}
