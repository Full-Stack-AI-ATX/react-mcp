'use client';

import type React               from 'react';
import { useEffect, useRef }    from 'react';
import styles                   from './styles.module.css';

interface UsageCounterProps {
  currentUsage: number;
  totalUsage: number;
  className?: string;
}

const UsageCounter: React.FC<UsageCounterProps> = ({ currentUsage, totalUsage, className }) => {
  const currentCounterRef = useRef<HTMLDivElement>(null);
  const totalCounterRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // AIDEV-NOTE: This effect updates the CSS custom property for the current usage.
    // This triggers the animation for only the current usage counter.
    if (currentCounterRef.current) {
      currentCounterRef.current.style.setProperty('--current-num', String(currentUsage));
    }
  }, [currentUsage]);

  useEffect(() => {
    // AIDEV-NOTE: This effect updates the CSS custom property for the total usage.
    // This triggers the animation for only the total usage counter.
    if (totalCounterRef.current) {
      totalCounterRef.current.style.setProperty('--total-num', String(totalUsage));
    }
  }, [totalUsage]);

  return (
    <div className={`${styles.counterWrapper} ${className || ''}`}>
      <div className={styles.usageSection}>
        <span className={styles.label}>Current:</span>
        <div ref={currentCounterRef} className={`${styles.counter} ${styles.currentCounter}`} />
      </div>
      <div className={styles.separator}>|</div>
      <div className={styles.usageSection}>
        <span className={styles.label}>Total:</span>
        <div ref={totalCounterRef} className={`${styles.counter} ${styles.totalCounter}`} />
      </div>
    </div>
  );
};

export default UsageCounter;
