/**
 * Analytics tracking stub.
 * Logs events in dev mode; ready for posthog/gtag integration.
 */
export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[Analytics Event] ${name}:`, properties);
  }
}

