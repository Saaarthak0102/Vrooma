import fs from "node:fs";
import path from "node:path";

const targetDir = path.resolve(process.cwd(), "public/images/placeholders");
fs.mkdirSync(targetDir, { recursive: true });

const cars = [
  { name: "car-1.svg", label: "Model H - Premium Sedan", color: "#1FBF75" },
  { name: "car-2.svg", label: "Model C - Compact SUV", color: "#2563EB" },
  { name: "car-3.svg", label: "Model S - Urban Hatchback", color: "#D97706" },
  { name: "car-4.svg", label: "Model X - Luxury EV", color: "#7C3AED" },
  { name: "car-5.svg", label: "Model T - Rugged Offroader", color: "#059669" },
  { name: "car-6.svg", label: "Model V - Executive MPV", color: "#475569" },
];

for (const car of cars) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
  <defs>
    <linearGradient id="g_${car.name.replace(".", "_")}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#121A24" />
      <stop offset="100%" stop-color="#1E293B" />
    </linearGradient>
  </defs>
  <rect width="800" height="450" rx="16" fill="url(#g_${car.name.replace(".", "_")})" />
  <!-- Studio lighting sheen -->
  <ellipse cx="400" cy="380" rx="340" ry="40" fill="#0F1720" opacity="0.6" />
  <!-- Car Silhouette -->
  <path d="M 120 310 C 130 310 160 300 200 270 C 230 250 290 200 370 195 C 460 190 550 200 600 240 C 650 280 670 300 680 310 L 660 320 C 650 320 635 300 610 300 C 585 300 570 320 560 320 L 260 320 C 250 320 235 300 210 300 C 185 300 170 320 160 320 Z" fill="${car.color}" opacity="0.85" />
  <!-- Roofline and Glass -->
  <path d="M 280 235 C 330 205 400 200 510 205 C 550 225 570 245 575 250 L 290 250 Z" fill="#F8FAFC" opacity="0.25" />
  <!-- Wheels -->
  <circle cx="210" cy="315" r="32" fill="#0A0F14" stroke="#475569" stroke-width="4" />
  <circle cx="210" cy="315" r="16" fill="#1E293B" />
  <circle cx="610" cy="315" r="32" fill="#0A0F14" stroke="#475569" stroke-width="4" />
  <circle cx="610" cy="315" r="16" fill="#1E293B" />
  <!-- Details & Badge -->
  <text x="400" y="80" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="24" font-weight="600" letter-spacing="1.5">${car.label}</text>
  <text x="400" y="110" text-anchor="middle" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="14">VROOMA AUTHORISED SHOWROOM</text>
</svg>`;
  fs.writeFileSync(path.join(targetDir, car.name), svg, "utf-8");
}

// Logo Mark
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
  <rect width="120" height="120" rx="28" fill="#121A24" />
  <path d="M 30 35 L 55 90 L 65 90 L 90 35 L 75 35 L 60 72 L 45 35 Z" fill="#1FBF75" />
  <circle cx="60" cy="42" r="5" fill="#FFFFFF" />
</svg>`;
fs.writeFileSync(path.join(targetDir, "logo-mark.svg"), logoSvg, "utf-8");

// Avatar
const avatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <circle cx="50" cy="50" r="50" fill="#E2E8F0" />
  <circle cx="50" cy="40" r="20" fill="#94A3B8" />
  <path d="M 20 85 C 20 68 35 65 50 65 C 65 65 80 68 80 85 Z" fill="#94A3B8" />
</svg>`;
fs.writeFileSync(path.join(targetDir, "avatar.svg"), avatarSvg, "utf-8");

console.log("Successfully generated all placeholder SVGs in public/images/placeholders");

