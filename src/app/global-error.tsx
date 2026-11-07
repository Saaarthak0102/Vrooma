"use client";

/**
 * Last-resort boundary: renders when the root layout itself fails, so it must provide its own <html> and <body>.
 * Plain markup only (no app components or styles that could be the thing that broke).
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, Helvetica, sans-serif", background: "#FAFAF9", color: "#1C1917" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: "#78716C", margin: "0 0 16px" }}>
              The page could not be shown. Please try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{ background: "#E11D48", color: "#fff", border: 0, borderRadius: 999, padding: "10px 20px", fontSize: 14, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
