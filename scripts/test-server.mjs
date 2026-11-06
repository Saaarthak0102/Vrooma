import { spawn } from "node:child_process";

const routes = [
  "/",
  "/cars",
  "/used-cars",
  "/cars/model-h",
  "/used-cars/UC-1182",
];

async function main() {
  console.log("Starting Next.js production server on port 3000...");
  const server = spawn("node", ["./node_modules/next/dist/bin/next", "start", "-p", "3000"], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (data) => {
    const msg = data.toString();
    if (msg.includes("Ready")) {
      console.log("Server is ready! Probing routes...");
    }
  });

  server.stderr.on("data", (data) => {
    console.error("Server stderr:", data.toString());
  });

  // Wait for server to start up
  await new Promise((r) => setTimeout(r, 3000));

  const results = [];
  for (const path of routes) {
    try {
      const res = await fetch(`http://127.0.0.1:3000${path}`);
      results.push({
        Path: path,
        Status: res.status,
        OK: res.ok,
        Type: res.headers.get("content-type")?.split(";")[0],
      });
    } catch (err) {
      results.push({
        Path: path,
        Status: "ERR",
        OK: false,
        Error: err.message,
      });
    }
  }

  server.kill("SIGTERM");

  console.table(results);

  // Clean up any remaining temporary files
  const allOk = results.every((r) => r.OK && r.Status === 200);
  if (!allOk) {
    console.error("❌ Some routes failed to load.");
    process.exit(1);
  } else {
    console.log("✅ All required routes verified with HTTP 200 OK!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

