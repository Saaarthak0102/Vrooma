import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Car, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16">
      <Container className="max-w-md text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-ink/5 text-ink flex items-center justify-center mx-auto">
          <Car className="h-8 w-8 stroke-[1.5]" />
        </div>
        <h1 className="text-3xl font-black text-ink tracking-tight">404</h1>
        <h2 className="text-lg font-bold text-ink">Vehicle or Page Not Found</h2>
        <p className="text-sm text-ink-soft">
          The vehicle listing, showroom page, or booking route you are looking for does not exist or has been relocated.
        </p>
        <div className="pt-2">
          <Button asChild className="gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Showroom</span>
            </Link>
          </Button>
        </div>
      </Container>
    </div>
  );
}

