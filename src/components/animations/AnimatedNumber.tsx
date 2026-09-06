import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';

interface AnimatedNumberProps {
  value: number;
  maxValue?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedNumber({
  value,
  maxValue = 100,
  duration = 0.8,
  className,
  style,
  prefix = '',
  suffix = '',
  decimals = 0,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const clampedValue = Math.min(Math.max(value, 0), maxValue);
    const startTime = performance.now();
    const animationDuration = duration * 1000;

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = easedProgress * clampedValue;
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    if (!hasAnimated || displayValue !== clampedValue) {
      setHasAnimated(true);
      requestAnimationFrame(animate);
    }
  }, [value, maxValue, duration, hasAnimated]);

  return (
    <motion.span
      key={Math.round(displayValue)}
      className={cn('font-mono tabular-nums', className)}
      style={style}
    >
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </motion.span>
  );
}