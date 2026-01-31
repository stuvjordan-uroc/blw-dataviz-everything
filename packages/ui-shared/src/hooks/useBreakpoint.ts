import { useState, useEffect } from 'react';
import { breakpoints, type Breakpoint } from '../theme/breakpoints';

/**
 * Hook that returns the current breakpoint based on window width.
 * Updates when window is resized across breakpoint boundaries.
 * 
 * @returns Current breakpoint ('mobile' | 'tablet' | 'desktop' | 'wide')
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    // SSR-safe initialization
    if (typeof window === 'undefined') return 'desktop';
    return getBreakpoint(window.innerWidth);
  });

  useEffect(() => {
    function handleResize() {
      const newBreakpoint = getBreakpoint(window.innerWidth);
      setBreakpoint(newBreakpoint);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

/**
 * Determines the appropriate breakpoint for a given window width
 */
function getBreakpoint(width: number): Breakpoint {
  if (width < breakpoints.tablet) return 'mobile';
  if (width < breakpoints.desktop) return 'tablet';
  if (width < breakpoints.wide) return 'desktop';
  return 'wide';
}
