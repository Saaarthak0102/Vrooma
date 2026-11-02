import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

let isRegistered = false;

export function registerMotion() {
  if (typeof window === "undefined" || isRegistered) return;
  
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);
  gsap.defaults({ ease: "power3.out" });
  ScrollTrigger.config({ ignoreMobileResize: true });
  isRegistered = true;
}

if (typeof window !== "undefined") {
  registerMotion();
}

export { gsap, ScrollTrigger, DrawSVGPlugin, MotionPathPlugin };
