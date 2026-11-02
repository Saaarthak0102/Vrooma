import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vrooma - Premium Dealership Lucknow",
    short_name: "Vrooma",
    description: "Browse new and certified used cars with transparent on-road prices in Lucknow.",
    start_url: "/",
    display: "standalone",
    background_color: "#EEF0F3",
    theme_color: "#121A24",
    icons: [
      {
        src: "/images/placeholders/logo-mark.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
    ],
  };
}

