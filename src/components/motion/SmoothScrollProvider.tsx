"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { registerMotion } from "@/lib/motion/register";

let activeLenis: any = null;

export function stopLenis() {
  if (activeLenis) {
    activeLenis.stop();
  }
}

export function startLenis() {
  if (activeLenis) {
    activeLenis.start();
  }
}

export function refreshScroll() {
  if (typeof window !== "undefined") {
    ScrollTrigger.refresh();
  }
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<LenisRef>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pathname = usePathname();
  const lastPathRef = useRef(pathname);

  // A page change must open at the top. Lenis keeps its own scroll target across client-side navigations,
  // which undoes Next's scroll-to-top and made new pages open at the old offset (bottom of the page).
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    if (window.location.hash) return; // anchor links (e.g. #price-breakup) scroll to their own target
    const lenis = ref.current?.lenis;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    ScrollTrigger.refresh();
  }, [pathname]);

  useEffect(() => {
    registerMotion();

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setReducedMotion(true);
      return;
    }

    const lenis = ref.current?.lenis;
    activeLenis = lenis;

    const raf = (t: number) => {
      ref.current?.lenis?.raf(t * 1000);
    };

    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    lenis?.on("scroll", ScrollTrigger.update);

    // Refresh triggers once fonts are loaded
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh();
      });
    }

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    media.addEventListener("change", handleMediaChange);

    return () => {
      gsap.ticker.remove(raf);
      media.removeEventListener("change", handleMediaChange);
      activeLenis = null;
    };
  }, []);

  // The staff and admin consoles are working tools full of inner scroll areas (tables, side panels, dialogs).
  // Smooth-scroll hijacking the wheel there made those areas scroll the page behind them, so they scroll natively.
  const isConsole = /^\/(staff|admin)(\/|$)/.test(pathname ?? "");

  if (reducedMotion || isConsole) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      ref={ref}
      options={{
        autoRaf: false,
        lerp: 0.1,
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
