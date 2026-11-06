import { Spinner } from "@/components/ui/spinner";
import { Container } from "@/components/ui/container";

export default function RootLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Container className="flex flex-col items-center justify-center space-y-4 text-center">
        <Spinner size="lg" />
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-mute animate-pulse">
          Loading Vrooma Showroom...
        </p>
      </Container>
    </div>
  );
}

