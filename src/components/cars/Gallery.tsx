"use client";

import React, { useState } from "react";
import Image from "next/image";

export interface GalleryProps {
  images: string[];
  modelName: string;
}

export function Gallery({ images, modelName }: GalleryProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const currentImage = images[selectedIdx] || "/images/placeholders/car-1.svg";

  return (
    <div className="space-y-4">
      {/* Main Large Studio View */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-ink/5 border border-border shadow-sm">
        <Image
          src={currentImage}
          alt={`${modelName} - Studio View ${selectedIdx + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 60vw"
          className="object-contain p-4 transition-all duration-300"
        />
        <div className="absolute bottom-3 right-3 rounded-pill bg-dark/80 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {selectedIdx + 1} / {images.length || 1}
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                i === selectedIdx
                  ? "border-accent shadow-sm"
                  : "border-border opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={img}
                alt={`${modelName} thumbnail ${i + 1}`}
                fill
                sizes="96px"
                className="object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

