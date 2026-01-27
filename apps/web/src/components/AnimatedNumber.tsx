"use client";

import { useEffect, useState, useRef } from "react";
import { useInView } from "framer-motion";

export function AnimatedNumber({ value, duration = 1 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const end = value;
    const increment = end / (duration * 60);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [value, duration, isInView]);

  return <span ref={ref}>{displayValue.toLocaleString()}</span>;
}
