"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SCROLL_THRESHOLD = 8;
const SCROLL_DOWN_HIDE_OFFSET = 60;

/**
 * Returns whether the navbar should be visible based on scroll direction.
 * - Scroll down → hide (after scrolling past initial offset)
 * - Scroll up → show immediately
 * Uses a threshold to avoid flickering on slow/ambiguous scrolls.
 */
export function useScrollDirection(): boolean {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;

    requestAnimationFrame(() => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      if (Math.abs(delta) >= SCROLL_THRESHOLD) {
        if (delta > 0 && currentScrollY > SCROLL_DOWN_HIDE_OFFSET) {
          setIsVisible(false);
        } else if (delta < 0) {
          setIsVisible(true);
        }
        lastScrollY.current = currentScrollY;
      }

      ticking.current = false;
    });
  }, []);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    if (window.scrollY > SCROLL_DOWN_HIDE_OFFSET) {
      setIsVisible(false);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return isVisible;
}
