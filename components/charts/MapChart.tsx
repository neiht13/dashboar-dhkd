"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { ChartConfig } from '@/types';
import { Map as MapComponent, MapControls, useMap, MapMarker, MarkerContent, MarkerLabel, MarkerPopup } from '@/components/ui/map';
import maplibregl, { LngLatBounds } from 'maplibre-gl';
import { Star, Navigation, Clock, ExternalLink, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import 'maplibre-gl/dist/maplibre-gl.css';

// Use require or import to load JSON.
import geoData from '@/lib/TTVT_polygon.json';

interface MapChartProps {
    data: any[];
    config: ChartConfig;
    width?: number | string;
    height?: number | string;
}

// Extended color palette for unique polygon colors
const COLORS = [
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#6366f1",
    "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#06b6d4",
    "#84cc16", "#db2777", "#115e59", "#4338ca", "#b45309",
    "#0ea5e9", "#22c55e", "#eab308", "#a855f7", "#f43f5e",
    "#14532d", "#7c3aed", "#0891b2", "#c026d3", "#d97706",
    "#0d9488", "#7e22ce", "#4f46e5", "#16a34a", "#dc2626",
    "#2563eb", "#059669", "#ca8a04", "#9333ea", "#e11d48"
];

// Helper to calculate polygon centroid
function calculateCentroid(coordinates: number[][]) {
    let x = 0, y = 0, area = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        const [x0, y0] = coordinates[i];
        const [x1, y1] = coordinates[i + 1];
        const a = x0 * y1 - x1 * y0;
        area += a;
        x += (x0 + x1) * a;
        y += (y0 + y1) * a;
    }
    area *= 0.5;
    if (area === 0) return coordinates[0]; // Fallback
    const factor = 1 / (6 * area);
    return [x * factor, y * factor];
}

const Legend = ({ items }: { items: { code: string; name: string; color: string }[] }) => {
    return (
        <div className="absolute bottom-8 left-2 bg-white/95 dark:bg-slate-900/95 p-2 rounded shadow text-xs z-10 border border-slate-200 dark:border-slate-800 max-h-[300px] overflow-y-auto">
            <div className="font-semibold mb-2 text-slate-700 dark:text-slate-200">Chú thích</div>
            <div className="space-y-1">
                {items.map((item) => (
                    <div key={item.code} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                        <span className="text-slate-600 dark:text-slate-300 truncate max-w-[120px]" title={item.code}>
                            {item.code}
                        </span>
                        -
                        <span className="text-slate-600 dark:text-slate-300 truncate max-w-[120px]" title={item.name}>
                            {item.name && item.name.replace('TTVT', '')}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MapMarkers = ({ data, config }: { data: any[], config: ChartConfig }) => {
    const { dataSource } = config;

    // Get unique TTVT locations
    const markers = React.useMemo(() => {
        const unique = new Map();
        (geoData as any).features.forEach((f: any) => {
            const code = f.attributes.ma_ttvt;
            if (!unique.has(code)) {
                unique.set(code, {
                    ...f.attributes,
                    lat: f.attributes.truso_lat,
                    lng: f.attributes.truso_lng
                });
            }
        });
        return Array.from(unique.values());
    }, []);

    return (
        <>
            {markers.map((ttvt: any) => {
                const xAxisKey = dataSource?.xAxis;
                const yAxisKey = dataSource?.yAxis?.[0];
                let valueDisplay = 'No data';
                let rawValue = 0;

                if (xAxisKey && yAxisKey) {
                    const item = data.find(d => String(d[xAxisKey]).trim() === String(ttvt.ma_ttvt).trim());
                    if (item) {
                        rawValue = Number(item[yAxisKey]);
                        valueDisplay = rawValue.toLocaleString();
                    }
                }

                return (
                    <MapMarker key={ttvt.ma_ttvt} longitude={ttvt.lng} latitude={ttvt.lat}>
                        <MarkerContent>
                            <div className="size-4 rounded-full bg-rose-500 border-1 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform flex items-center justify-center">
                                <Star className="size-3 text-white" />
                            </div>
                        </MarkerContent>
                        <MarkerPopup className="p-0 w-64">
                            <div className="relative h-24 bg-slate-100 rounded-t-md overflow-hidden flex items-center justify-center">
                                <Building className="size-10 text-slate-300" />
                            </div>
                            <div className="space-y-2 p-3">
                                <div>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Đơn vị
                                    </span>
                                    <h3 className="font-semibold text-foreground leading-tight">
                                        {ttvt.ten_ttvt}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="flex items-center gap-1">
                                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                                        <span className="font-medium">{config.style?.yAxisLabel || yAxisKey}: </span>
                                        <span className="text-muted-foreground">
                                            {valueDisplay}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Clock className="size-3.5" />
                                    <span>Mã: {ttvt.ma_ttvt}</span>
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <Button size="sm" className="flex-1 h-8">
                                        <Navigation className="size-3.5 mr-1.5" />
                                        Chỉ đường
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-8">
                                        <ExternalLink className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </MarkerPopup>
                    </MapMarker>
                );
            })}
        </>
    );
};

const MapLayers = ({ data, config, setLegendItems }: { data: any[], config: ChartConfig, setLegendItems: (items: { code: string; name: string; color: string }[]) => void }) => {
    const { map, isLoaded } = useMap();
    const { dataSource } = config;
    const [selectedCode, setSelectedCode] = useState<string | null>(null);

    useEffect(() => {
        if (!map || !isLoaded) return;

        // Add Source
        if (!map.getSource('ttvt-source')) {
            // Transform ESRI JSON to GeoJSON
            // ESRI JSON uses "rings" array where each ring can be a separate polygon part
            // For features with multiple rings (e.g., island + mainland), use MultiPolygon
            const features = (geoData as any).features.map((f: any) => {
                const rings = f.geometry.rings;

                // Each ring in ESRI JSON is a separate polygon (not holes in this dataset)
                // Convert each ring to a polygon coordinate array (with reversed winding for GeoJSON)
                const polygons = rings.map((ring: any[]) => [[...ring].reverse()]);

                return {
                    type: 'Feature',
                    geometry: {
                        type: 'MultiPolygon',
                        coordinates: polygons
                    },
                    properties: {
                        ...f.attributes,
                        center_lng: f.attributes.truso_lng,
                        center_lat: f.attributes.truso_lat
                    }
                };
            });

            // Create Point Features for Labels (Centroids)
            const labelFeatures = (geoData as any).features.map((f: any) => {
                const code = f.attributes.ma_ttvt;
                const xAxisKey = dataSource?.xAxis;
                const yAxisKey = dataSource?.yAxis?.[0];
                let valStr = '';
                if (xAxisKey && yAxisKey) {
                    const item = data.find(d => String(d[xAxisKey]).trim() === String(code).trim());
                    if (item) valStr = `\n${Number(item[yAxisKey]).toLocaleString()}`;
                }

                // Calculate centroid
                const rings = f.geometry.rings;
                // Assuming first ring is outer boundary and largest
                // In production, might want to find the largest ring
                let largestRing = rings[0];
                let maxLen = 0;
                rings.forEach((r: any[]) => {
                    if (r.length > maxLen) {
                        maxLen = r.length;
                        largestRing = r;
                    }
                });

                // rings from ESRI are often clockwise? GeoJSON expects CCW for outer.
                // Centroid calc doesn't care about winding for position, only area sign.
                // We just need the coordinates.
                const centroid = calculateCentroid(largestRing);

                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: centroid
                    },
                    properties: {
                        ...f.attributes,
                        description: `${f.attributes.ma_ttvt}${valStr}`
                    }
                };
            });

            const geoJsonData = {
                type: 'FeatureCollection',
                features: features
            };

            const labelGeoJsonData = {
                type: 'FeatureCollection',
                features: labelFeatures
            };

            map.addSource('ttvt-source', {
                type: 'geojson',
                data: geoJsonData as any
            });

            map.addSource('ttvt-labels', {
                type: 'geojson',
                data: labelGeoJsonData as any
            });
        }

        // Add Layer
        if (!map.getLayer('ttvt-fill')) {
            map.addLayer({
                id: 'ttvt-fill',
                type: 'fill',
                source: 'ttvt-source',
                paint: {
                    'fill-color': '#e2e8f0',
                    'fill-opacity': 0.8,
                    'fill-outline-color': '#fff'
                }
            });

            // Add hover effect
            map.addLayer({
                id: 'ttvt-line',
                type: 'line',
                source: 'ttvt-source',
                paint: {
                    'line-color': '#fff',
                    'line-width': 1.5
                }
            });

            // Add Labels Layer
            map.addLayer({
                id: 'ttvt-symbol',
                type: 'symbol',
                source: 'ttvt-labels',
                layout: {
                    'text-field': ['get', 'description'],
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': 11,
                    'text-anchor': 'center',
                    'text-justify': 'center',
                    'text-offset': [0, 0],
                    'text-allow-overlap': false
                },
                paint: {
                    'text-color': '#1e293b',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 1.5
                }
            });

            // Create a popup
            const popup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: 'custom-popup'
            });

            map.on('mousemove', 'ttvt-fill', (e) => {
                map.getCanvas().style.cursor = 'pointer';

                const feature = e.features?.[0];
                if (feature) {
                    const name = feature.properties?.ten_ttvt || feature.properties?.ma_ttvt;
                    const code = feature.properties?.ma_ttvt;

                    // Find data value
                    const xAxisKey = dataSource?.xAxis;
                    const yAxisKey = dataSource?.yAxis?.[0];
                    let valueDisplay = '';

                    if (xAxisKey && yAxisKey && code) {
                        const item = data.find(d => String(d[xAxisKey]).trim() === String(code).trim());
                        if (item) {
                            const val = item[yAxisKey];
                            valueDisplay = `<div style="margin-top:2px; font-size: 12px;">${config.style?.yAxisLabel || yAxisKey}: <span style="font-weight:600;">${Number(val).toLocaleString()}</span></div>`;
                        } else {
                            valueDisplay = `<div style="margin-top:2px; font-size: 12px; opacity: 0.7;">No data</div>`;
                        }
                    }

                    if (name) {
                        popup.setLngLat(e.lngLat)
                            .setHTML(`<div style="padding: 4px; color: #0f172a; min-width: 120px;">
                                 <div style="font-weight: bold; font-size: 13px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 2px;">${name}</div>
                                 ${valueDisplay}
                             </div>`)
                            .addTo(map);
                    }
                }
            });

            map.on('mouseleave', 'ttvt-fill', () => {
                map.getCanvas().style.cursor = '';
                popup.remove();
            });
        }

    }, [map, isLoaded, dataSource, data, config.style?.yAxisLabel]);

    // Assign unique colors to each unit (ma_ttvt) and update legend
    useEffect(() => {
        if (!map || !isLoaded || !map.getLayer('ttvt-fill')) return;

        // Build color map based on ma_ttvt for consistent colors per unit
        const matchExpression: any[] = ['match', ['get', 'ma_ttvt']];
        const codeColorMap = new Map<string, { name: string; color: string }>();
        let colorIndex = 0;

        // Collect unique codes and assign colors
        (geoData as any).features.forEach((f: any) => {
            const code = f.attributes.ma_ttvt;
            const name = f.attributes.ten_ttvt || code;

            if (!codeColorMap.has(code)) {
                const color = COLORS[colorIndex % COLORS.length];
                codeColorMap.set(code, { name, color });
                colorIndex++;
            }
        });

        // Build match expression and legend items
        const legendItems: { code: string; name: string; color: string }[] = [];
        codeColorMap.forEach(({ name, color }, code) => {
            matchExpression.push(code, color);
            legendItems.push({ code, name, color });
        });

        matchExpression.push('#e2e8f0'); // Default fallback

        // Apply colors
        map.setPaintProperty('ttvt-fill', 'fill-color', matchExpression);

        // Update legend (sorted by code)
        legendItems.sort((a, b) => a.code.localeCompare(b.code));
        setLegendItems(legendItems);

    }, [map, isLoaded, setLegendItems]);

    // Add highlight layer and click handler
    useEffect(() => {
        if (!map || !isLoaded) return;

        // Add highlight layer if not exists
        if (!map.getLayer('ttvt-highlight')) {
            map.addLayer({
                id: 'ttvt-highlight',
                type: 'line',
                source: 'ttvt-source',
                paint: {
                    'line-color': '#facc15',
                    'line-width': 4
                },
                filter: ['==', ['get', 'ma_ttvt'], ''] // Initially hide
            });
        }

        // Click handler - highlight all polygons with same ma_ttvt
        const handleClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
            const feature = e.features?.[0];
            if (feature?.properties?.ma_ttvt) {
                const clickedCode = feature.properties.ma_ttvt;

                if (selectedCode === clickedCode) {
                    // Deselect if clicking same code
                    setSelectedCode(null);
                    map.setFilter('ttvt-highlight', ['==', ['get', 'ma_ttvt'], '']);
                } else {
                    // Select new code - highlights ALL polygons with this ma_ttvt
                    setSelectedCode(clickedCode);
                    map.setFilter('ttvt-highlight', ['==', ['get', 'ma_ttvt'], clickedCode]);
                }
            }
        };

        map.on('click', 'ttvt-fill', handleClick);

        return () => {
            map.off('click', 'ttvt-fill', handleClick);
        };
    }, [map, isLoaded, selectedCode]);

    return null;
};

export function MapChart({ data, config, width, height }: MapChartProps) {
    const { style } = config;
    const [legendItems, setLegendItems] = useState<{ code: string; name: string; color: string }[]>([]);

    // Center coordinates for region (Dong Thap / Mekong Delta approx)
    const center: [number, number] = [106.35, 10.45];

    return (
        <div style={{ width: width || '100%', height: height || 400, borderRadius: style?.borderRadius || 8, overflow: 'hidden', position: 'relative' }}>
            <MapComponent
                theme={style?.tooltipTheme === 'dark' ? 'dark' : 'light'}
                center={center}
                zoom={9}
            >
                <MapControls
                    position="bottom-right"
                    showZoom
                    showCompass
                    showLocate
                    showFullscreen
                    show3D
                />
                <MapLayers data={data} config={config} setLegendItems={setLegendItems} />
                <MapMarkers data={data} config={config} />
                {legendItems.length > 0 && (
                    <Legend items={legendItems} />
                )}
            </MapComponent>
        </div>
    );
}
