"use client";

import dynamic from 'next/dynamic';
import { ChartSkeleton } from './ChartSkeleton';

/**
 * Lazy-loaded MapChart component
 * Reduces initial bundle size by code-splitting maplibre-gl
 */
const MapChartLazy = dynamic(
    () => import('./MapChart').then(mod => ({ default: mod.MapChart })),
    {
        loading: () => <ChartSkeleton />,
        ssr: false, // MapLibre doesn't support SSR
    }
);

export { MapChartLazy as MapChart };
