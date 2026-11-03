import fs from "node:fs";
import path from "node:path";

const targetDir = path.resolve(process.cwd(), "public/images/placeholders");
fs.mkdirSync(targetDir, { recursive: true });

const cars = [
  {
    name: "car-1.svg", // Model H - Premium Sedan
    color: "#2C343F",
    glass: "#94A3B8",
    bodyPath: "M 130 310 C 145 305 180 270 230 250 C 275 230 340 190 420 188 C 510 186 590 205 635 245 C 665 270 675 295 680 310 L 665 318 C 655 318 640 298 610 298 C 580 298 565 318 555 318 L 265 318 C 255 318 240 298 210 298 C 180 298 165 318 155 318 Z",
    glassPath: "M 320 230 C 360 200 420 195 510 198 C 545 212 565 230 575 238 L 330 238 Z",
  },
  {
    name: "car-2.svg", // Model C - Compact SUV
    color: "#1E293B",
    glass: "#64748B",
    bodyPath: "M 130 310 C 140 290 170 240 215 225 C 260 210 320 180 430 180 C 530 180 585 200 630 235 C 660 260 675 285 680 310 L 665 318 C 655 318 640 298 610 298 C 580 298 565 318 555 318 L 265 318 C 255 318 240 298 210 298 C 180 298 165 318 155 318 Z",
    glassPath: "M 290 220 C 340 192 420 188 510 190 C 545 205 565 220 575 230 L 300 230 Z",
  },
  {
    name: "car-3.svg", // Model S - Urban Hatchback
    color: "#334155",
    glass: "#94A3B8",
    bodyPath: "M 140 310 C 150 295 180 260 225 240 C 270 220 330 185 410 185 C 490 185 550 205 595 245 C 640 280 660 298 670 310 L 655 318 C 645 318 630 298 600 298 C 570 298 555 318 545 318 L 265 318 C 255 318 240 298 210 298 C 180 298 165 318 155 318 Z",
    glassPath: "M 310 225 C 350 195 410 192 490 195 C 525 210 545 228 555 235 L 320 235 Z",
  },
  {
    name: "car-4.svg", // Model X - Luxury EV
    color: "#0F172A",
    glass: "#38BDF8",
    bodyPath: "M 130 310 C 145 300 175 260 220 240 C 270 215 340 180 430 180 C 520 180 590 200 640 240 C 670 265 678 290 680 310 L 665 318 C 655 318 640 298 610 298 C 580 298 565 318 555 318 L 265 318 C 255 318 240 298 210 298 C 180 298 165 318 155 318 Z",
    glassPath: "M 310 222 C 355 190 430 186 525 188 C 560 205 575 222 585 230 L 320 230 Z",
  },
  {
    name: "car-5.svg", // Model T - Rugged Offroader
    color: "#3F3F46",
    glass: "#A1A1AA",
    bodyPath: "M 135 310 C 140 280 160 230 200 210 C 235 195 300 170 410 170 C 530 170 600 185 640 215 C 670 245 675 285 680 310 L 665 318 C 655 318 640 298 610 298 C 580 298 565 318 555 318 L 265 318 C 255 318 240 298 210 298 C 180 298 165 318 155 318 Z",
    glassPath: "M 280 210 C 330 180 410 176 520 178 C 555 190 575 205 585 218 L 290 218 Z",
  },
  {
    name: "car-6.svg", // Model V - Executive MPV
    color: "#334155",
    glass: "#CBD5E1",
    bodyPath: "M 130 310 C 140 285 165 235 210 215 C 260 195 330 175 440 175 C 540 175 610 190 645 225 C 670 255 675 285 680 310 L 665 318 C 655 318 640 298 610 298 C 580 298 565 318 555 318 L 265 318 C 255 318 240 298 210 298 C 180 298 165 318 155 318 Z",
    glassPath: "M 290 210 C 340 185 430 182 530 184 C 565 198 580 215 590 225 L 300 225 Z",
  },
];

for (const car of cars) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
  <defs>
    <!-- Light Studio Neutral Gradient -->
    <linearGradient id="studio_${car.name.replace(".", "_")}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FDFDFD" />
      <stop offset="55%" stop-color="#F4F4F5" />
      <stop offset="100%" stop-color="#E4E4E7" />
    </linearGradient>
    <linearGradient id="rim_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E2E8F0" />
      <stop offset="100%" stop-color="#64748B" />
    </linearGradient>
    <radialGradient id="highlight" cx="50%" cy="25%" r="60%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Studio backdrop -->
  <rect width="800" height="450" fill="url(#studio_${car.name.replace(".", "_")})" />
  <rect width="800" height="450" fill="url(#highlight)" />

  <!-- Soft Contact & Floor Shadow -->
  <ellipse cx="400" cy="330" rx="310" ry="24" fill="#18181B" opacity="0.10" />
  <ellipse cx="400" cy="332" rx="240" ry="14" fill="#18181B" opacity="0.16" />

  <!-- Car Silhouette -->
  <path d="${car.bodyPath}" fill="${car.color}" />

  <!-- Glass / Cabin Reflection -->
  <path d="${car.glassPath}" fill="${car.glass}" opacity="0.45" />

  <!-- Wheels (Front & Rear) -->
  <circle cx="210" cy="315" r="32" fill="#18181B" stroke="#52525B" stroke-width="3" />
  <circle cx="210" cy="315" r="20" fill="url(#rim_grad)" />
  <circle cx="210" cy="315" r="8" fill="#18181B" />

  <circle cx="610" cy="315" r="32" fill="#18181B" stroke="#52525B" stroke-width="3" />
  <circle cx="610" cy="315" r="20" fill="url(#rim_grad)" />
  <circle cx="610" cy="315" r="8" fill="#18181B" />
</svg>`;

  fs.writeFileSync(path.join(targetDir, car.name), svg, "utf-8");
}

console.log("Successfully generated light studio-style placeholder SVGs (no text) in public/images/placeholders");
