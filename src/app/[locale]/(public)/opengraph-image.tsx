import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vrooma Lucknow — Authorised Brand X Dealership";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#121A24",
          padding: "60px 80px",
          color: "#FFFFFF",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              height: 48,
              width: 48,
              borderRadius: 12,
              backgroundColor: "#1FBF75",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: 24,
              color: "#121A24",
            }}
          >
            V
          </div>
          <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>
            VROOMA
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span
            style={{
              fontSize: 20,
              color: "#1FBF75",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Authorised Brand X Dealership · Lucknow & Kanpur
          </span>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.1,
              margin: 0,
              color: "#FFFFFF",
            }}
          >
            Drive home your next car, booked in minutes.
          </h1>
          <p style={{ fontSize: 24, color: "#94A3B8", margin: 0 }}>
            Real on-road prices, instant test-drive slots, 140-point certified used cars.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(255,255,255,0.15)",
            paddingTop: 24,
          }}
        >
          <span style={{ fontSize: 18, color: "#CBD5E1" }}>
            3 Showrooms · 2 Workshops · Hazratganj & Gomti Nagar
          </span>
          <span style={{ fontSize: 18, color: "#1FBF75", fontWeight: 600 }}>
            vrooma.in
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
