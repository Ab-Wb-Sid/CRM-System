// ═══════════════════════════════════════════════════════
//  AnimatedNumber — Count-up animation for KPI values
// ═══════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  format?: 'number' | 'currency' | 'percent';
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function formatValue(val: number, format: AnimatedNumberProps['format'], decimals: number, prefix: string, suffix: string) {
  if (format === 'currency') {
    return val >= 1_000_000
      ? `${prefix}${(val / 1_000_000).toFixed(decimals)}M`
      : val >= 1_000
      ? `${prefix}${(val / 1_000).toFixed(decimals)}K`
      : `${prefix}${val.toFixed(decimals)}`;
  }
  if (format === 'percent') {
    return `${val.toFixed(decimals)}${suffix}`;
  }
  return `${prefix}${val.toLocaleString(undefined, { maximumFractionDigits: decimals })}${suffix}`;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value, duration = 1200, prefix = '', suffix = '',
  decimals = 0, format = 'number',
}) => {
  const [display, setDisplay] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = null;
    const animate = (ts: number) => {
      if (!startTimeRef.current) startTimeRef.current = ts;
      const elapsed = ts - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(easeOut(progress) * value);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span>
      {formatValue(display, format, decimals, prefix, suffix)}
    </span>
  );
};
