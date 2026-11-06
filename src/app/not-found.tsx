import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center font-sans antialiased text-ink">
      <div className="max-w-md text-center p-8 space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink">404</h1>
        <h2 className="text-lg font-bold text-ink">Page Not Found</h2>
        <p className="text-sm text-ink-soft">
          The vehicle listing or page you requested could not be found.
        </p>
        <div className="pt-2">
          <Button asChild variant="primary" shape="pill" size="sm">
            <Link href="/">Return to Showroom</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
