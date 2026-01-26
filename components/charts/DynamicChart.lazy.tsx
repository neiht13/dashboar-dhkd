"use client";

import dynamic from 'next/dynamic';
import { ChartSkeleton } from './ChartSkeleton';

/**
 * Lazy-loaded DynamicChart component
 * Reduces initial bundle size by code-splitting Recharts
 */
const DynamicChartLazy = dynamic(
    () => import('./DynamicChart').then(mod => ({ default: mod.DynamicChart })),
    {
        loading: () => <ChartSkeleton />,
        ssr: false, // Recharts doesn't support SSR
    }
);

export { DynamicChartLazy as DynamicChart };
