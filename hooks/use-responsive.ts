"use client";

import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpoints = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
};

export function useBreakpoint(): Breakpoint {
    const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');

    useEffect(() => {
        const getBreakpoint = (): Breakpoint => {
            const width = window.innerWidth;
            if (width < breakpoints.sm) return 'xs';
            if (width < breakpoints.md) return 'sm';
            if (width < breakpoints.lg) return 'md';
            if (width < breakpoints.xl) return 'lg';
            if (width < breakpoints['2xl']) return 'xl';
            return '2xl';
        };

        const handleResize = () => {
            setBreakpoint(getBreakpoint());
        };

        // Set initial breakpoint
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return breakpoint;
}

export function useIsMobile(): boolean {
    const breakpoint = useBreakpoint();
    return breakpoint === 'xs' || breakpoint === 'sm';
}

export function useIsTablet(): boolean {
    const breakpoint = useBreakpoint();
    return breakpoint === 'md';
}

export function useIsDesktop(): boolean {
    const breakpoint = useBreakpoint();
    return breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl';
}

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);

        const handleChange = () => {
            setMatches(media.matches);
        };

        handleChange();
        media.addEventListener('change', handleChange);

        return () => media.removeEventListener('change', handleChange);
    }, [query]);

    return matches;
}

export function useWindowSize() {
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const handleResize = () => {
            setSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return size;
}
