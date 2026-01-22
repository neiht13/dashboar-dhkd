"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ChartConfig, Filter } from '@/types';
import { Map as MapComponent, MapControls, useMap, MapMarker, MarkerContent, MarkerLabel, MarkerPopup } from '@/components/ui/map';
import { FilterBuilder } from '@/components/ui/FilterBuilder';
import maplibregl, { LngLatBounds } from 'maplibre-gl';
import { Star, Navigation, Clock, ExternalLink, Building, MapPin, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import 'maplibre-gl/dist/maplibre-gl.css';

// Use require or import to load JSON.
import geoData from '@/lib/TTVT_polygon.json';

interface MapChartProps {
    data: any[];
    config: ChartConfig;
    width?: number | string;
    height?: number | string;
}

// Filter Panel Component - Left sidebar for map filters
const FilterPanel = ({
    xAxisOptions,
    yAxisOptions,
    selectedXAxis,
    selectedYAxisLayers,
    onXAxisChange,
    onYAxisChange
}: {
    xAxisOptions: { value: string; label: string }[];
    yAxisOptions: { value: string; label: string }[];
    selectedXAxis: string;
    selectedYAxisLayers: string[];
    onXAxisChange: (value: string) => void;
    onYAxisChange: (layers: string[]) => void;
}) => {
    const handleSelectAll = () => {
        if (selectedYAxisLayers.length === yAxisOptions.length) {
            onYAxisChange([]); // Deselect all
        } else {
            onYAxisChange(yAxisOptions.map(o => o.value)); // Select all
        }
    };

    const handleLayerToggle = (value: string) => {
        if (selectedYAxisLayers.includes(value)) {
            onYAxisChange(selectedYAxisLayers.filter(v => v !== value));
        } else {
            onYAxisChange([...selectedYAxisLayers, value]);
        }
    };

    return (
        <div className="absolute left-2 top-2 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 w-56 max-h-[calc(100%-16px)] overflow-hidden flex flex-col">
            {/* X-Axis Filter - Region Type */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">LOẠI KHU VỰC</span>
                </div>
                <div className="space-y-2">
                    {xAxisOptions.map((option) => (
                        <label
                            key={option.value}
                            className="flex items-center gap-2 cursor-pointer group"
                        >
                            <input
                                type="radio"
                                name="xAxisFilter"
                                value={option.value}
                                checked={selectedXAxis === option.value}
                                onChange={() => onXAxisChange(option.value)}
                                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 dark:bg-slate-700 dark:border-slate-600"
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {option.label}
                            </span>
                        </label>
                    ))}
                </div>
                <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-2 italic">
                    (Nhấn chuột phải vào bản đồ để xem gộp)
                </p>
            </div>

            {/* Y-Axis Filter - Layer Types */}
            <div className="p-3 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                    <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">LOẠI THUÊ BAO</span>
                </div>
                <ScrollArea className="flex-1 -mx-1 px-1">
                    <div className="space-y-2">
                        {/* Select All Option */}
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <Checkbox
                                checked={selectedYAxisLayers.length === yAxisOptions.length && yAxisOptions.length > 0}
                                onCheckedChange={handleSelectAll}
                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-purple-500 text-white text-[10px] font-bold">
                                    ⚡
                                </span>
                                Tất cả
                            </span>
                        </label>

                        {/* Individual Layer Options */}
                        {yAxisOptions.map((option, index) => {
                            // Generate unique colors/icons for each layer type
                            const layerColors = [
                                { bg: 'bg-green-500', icon: 'F', label: 'Fiber' },
                                { bg: 'bg-orange-500', icon: 'M', label: 'Mega' },
                                { bg: 'bg-red-500', icon: 'M', label: 'MyTV' },
                                { bg: 'bg-blue-500', icon: 'C', label: 'Cố định' },
                                { bg: 'bg-yellow-500', icon: 'G', label: 'GPhone' },
                                { bg: 'bg-pink-500', icon: 'S', label: 'DD trả sau' },
                            ];
                            const colorConfig = layerColors[index % layerColors.length];
                            const iconLetter = option.label.charAt(0).toUpperCase();

                            return (
                                <label
                                    key={option.value}
                                    className="flex items-center gap-2 cursor-pointer group"
                                >
                                    <Checkbox
                                        checked={selectedYAxisLayers.includes(option.value)}
                                        onCheckedChange={() => handleLayerToggle(option.value)}
                                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                    <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${colorConfig.bg} text-white text-[10px] font-bold`}>
                                            {iconLetter}
                                        </span>
                                        {option.label}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>

            {/* Data Layer Section */}
            {yAxisOptions.length > 0 && (
                <div className="p-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-xs text-slate-500 dark:text-slate-400">LỚP DỮ LIỆU</span>
                    </div>
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox defaultChecked className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-3.5 w-3.5" />
                            <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                <span className="inline-block w-4 h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded"></span>
                                Thuê bao phát sinh cước
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox className="h-3.5 w-3.5" />
                            <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                <span className="inline-block w-4 h-2 border-2 border-dashed border-red-400 rounded"></span>
                                Kết cuối
                            </span>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};

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
        <div className="absolute top-2 right-2 bg-white/95 dark:bg-slate-900/95 px-3 py-2 rounded shadow text-xs z-10 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
                {items.map((item) => (
                    <div key={item.code} className="flex items-center gap-1.5">
                        <div 
                            className="w-3 h-3 rounded-full flex-shrink-0 border border-white shadow-sm" 
                            style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-slate-600 dark:text-slate-300 whitespace-nowrap text-[11px] font-medium">
                            {item.name}
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

            // Create Point Features for Labels (Centroids) - show TTVT codes only
            const labelFeatures = (geoData as any).features.map((f: any) => {
                const code = f.attributes.ma_ttvt;

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
                        description: f.attributes.ma_ttvt
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

            // Create a popup with custom styling
            const popup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: 'map-hover-popup'
            });

            map.on('mousemove', 'ttvt-fill', (e) => {
                map.getCanvas().style.cursor = 'pointer';

                const feature = e.features?.[0];
                if (feature) {
                    const name = feature.properties?.ten_ttvt || feature.properties?.ma_ttvt;
                    const code = feature.properties?.ma_ttvt;

                    // Find data values for selected yAxis fields only
                    const xAxisKey = dataSource?.xAxis;
                    const yAxisFields = dataSource?.yAxis || [];
                    let valueDisplay = '';
                    let totalValue = 0;

                    if (xAxisKey && yAxisFields.length > 0 && code) {
                        const item = data.find(d => String(d[xAxisKey]).trim() === String(code).trim());
                        if (item) {
                            // Calculate total for selected layers
                            yAxisFields.forEach(field => {
                                totalValue += Number(item[field] || 0);
                            });

                            // Show total first
                            valueDisplay = `<div style="margin-top:4px; font-size: 12px; font-weight: 600; color: #2563eb; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; margin-bottom: 4px;">Tổng: ${totalValue.toLocaleString()}</div>`;

                            // Show each selected yAxis field
                            valueDisplay += yAxisFields.map(field => {
                                const value = Number(item[field] || 0);
                                const fieldName = config.style?.yAxisFieldLabels?.[field] || field;
                                const percent = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : '0';
                                return `<div style="margin-top:2px; font-size: 11px; display: flex; justify-content: space-between;">
                                    <span>${fieldName}:</span>
                                    <span style="font-weight:600;">${value.toLocaleString()} <span style="color: #64748b; font-size: 10px;">(${percent}%)</span></span>
                                </div>`;
                            }).join('');
                        } else {
                            valueDisplay = `<div style="margin-top:2px; font-size: 12px; opacity: 0.7;">Không có dữ liệu</div>`;
                        }
                    }

                    if (name) {
                        popup.setLngLat(e.lngLat)
                            .setHTML(`<div style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(8px); border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; color: #0f172a; min-width: 180px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
                                 <div style="font-weight: bold; font-size: 13px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 4px;">${name}</div>
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

    // Assign colors based on yAxis data and update legend
    useEffect(() => {
        if (!map || !isLoaded || !map.getLayer('ttvt-fill')) return;

        const yAxisFields = dataSource?.yAxis || [];
        const xAxisField = dataSource?.xAxis;

        if (!xAxisField || yAxisFields.length === 0) return;

        // Calculate total values for each region to determine color intensity
        const regionTotals: { [key: string]: number } = {};
        let maxTotal = 0;
        let minTotal = Infinity;

        data.forEach(item => {
            const code = String(item[xAxisField]).trim();
            let total = 0;
            yAxisFields.forEach(field => {
                total += Number(item[field] || 0);
            });
            regionTotals[code] = total;
            if (total > maxTotal) maxTotal = total;
            if (total < minTotal && total > 0) minTotal = total;
        });

        // Define color thresholds for heatmap-style coloring
        // Low (orange/red) -> Medium (yellow) -> High (green)
        const getColorByValue = (value: number): string => {
            if (maxTotal === 0) return '#e2e8f0';
            const ratio = (value - minTotal) / (maxTotal - minTotal || 1);
            
            if (ratio < 0.33) {
                return '#f97316'; // Orange - Low (Vùng tỉ lệ thấp)
            } else if (ratio < 0.66) {
                return '#facc15'; // Yellow - Medium (Vùng tỉ lệ trung bình)
            } else {
                return '#22c55e'; // Green - High (Vùng tỉ lệ cao)
            }
        };

        // Create legend items for value ranges (like the reference image)
        const legendItems: { code: string; name: string; color: string }[] = [
            { code: 'low', name: 'Vùng tỉ lệ thấp', color: '#f97316' },
            { code: 'medium', name: 'Vùng tỉ lệ trung bình', color: '#facc15' },
            { code: 'high', name: 'Vùng tỉ lệ cao', color: '#22c55e' }
        ];

        // Create color mapping for TTVT units based on their total values
        const matchExpression: any[] = ['match', ['get', 'ma_ttvt']];

        // Assign colors to each TTVT unit based on their data values
        (geoData as any).features.forEach((f: any) => {
            const code = f.attributes.ma_ttvt;
            const total = regionTotals[code] || 0;
            const color = getColorByValue(total);

            matchExpression.push(code, color);
        });

        matchExpression.push('#e2e8f0'); // Default fallback

        // Apply colors to map
        map.setPaintProperty('ttvt-fill', 'fill-color', matchExpression);

        // Update legend
        setLegendItems(legendItems);

    }, [map, isLoaded, dataSource, data, config.style?.mapColorScheme, config.style?.mapDisplayMode, setLegendItems]);

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

                // Update selected code for highlight
                setSelectedCode(clickedCode);

                // Update fill color for highlight effect
                if (!map.getLayer('ttvt-highlight-fill')) {
                    map.addLayer({
                        id: 'ttvt-highlight-fill',
                        type: 'fill',
                        source: 'ttvt-source',
                        paint: {
                            'fill-color': 'tomato',
                            'fill-opacity': 0.7,
                            'fill-outline-color': '#ff6347'
                        },
                        filter: ['==', ['get', 'ma_ttvt'], clickedCode]
                    });

                    // Add 3D extrusion effect (simulated with line width)
                    map.addLayer({
                        id: 'ttvt-highlight-3d',
                        type: 'line',
                        source: 'ttvt-source',
                        paint: {
                            'line-color': '#ff6347',
                            'line-width': 3,
                            'line-opacity': 0.8
                        },
                        filter: ['==', ['get', 'ma_ttvt'], clickedCode]
                    });
                } else {
                    // Update existing highlight layers
                    map.setFilter('ttvt-highlight-fill', ['==', ['get', 'ma_ttvt'], clickedCode]);
                    map.setFilter('ttvt-highlight-3d', ['==', ['get', 'ma_ttvt'], clickedCode]);
                }

                // Add click popup
                const name = feature.properties?.ten_ttvt || feature.properties?.ma_ttvt;
                const xAxisKey = dataSource?.xAxis;
                const yAxisFields = dataSource?.yAxis || [];
                let valueDisplay = '';
                let totalValue = 0;

                if (xAxisKey && yAxisFields.length > 0) {
                    const item = data.find(d => String(d[xAxisKey]).trim() === String(clickedCode).trim());
                    if (item) {
                        // Calculate total for selected layers
                        yAxisFields.forEach(field => {
                            totalValue += Number(item[field] || 0);
                        });

                        // Show total first
                        valueDisplay = `<div style="margin-top:4px; font-size: 13px; font-weight: 700; color: tomato; border-bottom: 2px dashed #fecaca; padding-bottom: 6px; margin-bottom: 6px;">
                            Tổng cộng: ${totalValue.toLocaleString()}
                        </div>`;

                        // Show detailed breakdown of each selected service type
                        valueDisplay += yAxisFields.map(field => {
                            const value = Number(item[field] || 0);
                            const fieldName = config.style?.yAxisFieldLabels?.[field] || field;
                            const percent = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : '0';
                            return `<div style="margin-top:4px; font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
                                <span>${fieldName}:</span>
                                <span style="font-weight:600; color: tomato;">${value.toLocaleString()} <span style="color: #94a3b8; font-size: 10px;">(${percent}%)</span></span>
                            </div>`;
                        }).join('');
                    }
                }

                const clickPopup = new maplibregl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(`<div style="background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(10px); border: 2px solid tomato; border-radius: 8px; padding: 12px; color: #0f172a; min-width: 200px; box-shadow: 0 6px 20px rgba(255, 99, 71, 0.3);">
                             <div style="font-weight: bold; font-size: 14px; border-bottom: 2px solid tomato; padding-bottom: 4px; margin-bottom: 4px; color: tomato;">${name}</div>
                             ${valueDisplay}
                             <div style="margin-top: 8px; font-size: 10px; color: #94a3b8; text-align: center;">Đã chọn khu vực này</div>
                         </div>`)
                    .addTo(map);

                // Remove popup after 3 seconds
                setTimeout(() => clickPopup.remove(), 3000);
            }
        };

        map.on('click', 'ttvt-fill', handleClick);

        return () => {
            map.off('click', 'ttvt-fill', handleClick);
        };
    }, [map, isLoaded]);

    return null;
};


export function MapChart({ data, config, width, height }: MapChartProps) {
    const { style, dataSource } = config;
    const [legendItems, setLegendItems] = useState<{ code: string; name: string; color: string }[]>([]);

    // Filter states
    const [selectedXAxis, setSelectedXAxis] = useState<string>(dataSource?.xAxis || '');
    const [selectedYAxisLayers, setSelectedYAxisLayers] = useState<string[]>(dataSource?.yAxis || []);

    // Generate X-axis options (region types)
    const xAxisOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [];
        
        // Default TTVT option
        if (dataSource?.xAxis) {
            options.push({
                value: dataSource.xAxis,
                label: 'Khu vực TTVT'
            });
        }
        
        // Add Xa-Phuong option if available (can be extended based on data)
        // For now, we simulate with the same xAxis but different label
        options.push({
            value: 'xa_phuong',
            label: 'Khu vực Xã - Phường'
        });
        
        return options;
    }, [dataSource?.xAxis]);

    // Generate Y-axis options (layer types) with friendly labels
    const yAxisOptions = useMemo(() => {
        const yAxisFields = dataSource?.yAxis || [];
        return yAxisFields.map(field => ({
            value: field,
            label: style?.yAxisFieldLabels?.[field] || field
        }));
    }, [dataSource?.yAxis, style?.yAxisFieldLabels]);

    // Initialize selected layers when config changes
    useEffect(() => {
        if (dataSource?.xAxis && selectedXAxis === '') {
            setSelectedXAxis(dataSource.xAxis);
        }
        if (dataSource?.yAxis && selectedYAxisLayers.length === 0) {
            setSelectedYAxisLayers(dataSource.yAxis);
        }
    }, [dataSource?.xAxis, dataSource?.yAxis]);

    // Create filtered config based on selected layers
    const filteredConfig = useMemo(() => {
        return {
            ...config,
            dataSource: {
                ...config.dataSource,
                xAxis: selectedXAxis === 'xa_phuong' ? config.dataSource?.xAxis : selectedXAxis,
                yAxis: selectedYAxisLayers.length > 0 ? selectedYAxisLayers : config.dataSource?.yAxis
            }
        };
    }, [config, selectedXAxis, selectedYAxisLayers]);

    // Center coordinates for region (Dong Thap / Mekong Delta approx)
    const center: [number, number] = [106.35, 10.45];

    return (
        <div style={{ width: width || '100%', height: height || 400, borderRadius: style?.borderRadius || 8, overflow: 'hidden', position: 'relative' }}>
            <MapComponent
                theme={style?.tooltipTheme === 'dark' ? 'dark' : 'light'}
                center={center}
                zoom={9}
            >
                {/* Filter Panel - Left Side */}
                {yAxisOptions.length > 0 && (
                    <FilterPanel
                        xAxisOptions={xAxisOptions}
                        yAxisOptions={yAxisOptions}
                        selectedXAxis={selectedXAxis || xAxisOptions[0]?.value || ''}
                        selectedYAxisLayers={selectedYAxisLayers}
                        onXAxisChange={setSelectedXAxis}
                        onYAxisChange={setSelectedYAxisLayers}
                    />
                )}

                <MapControls
                    position="bottom-right"
                    showZoom={true}
                    showCompass={true}
                    showLocate={true}
                    showFullscreen={true}
                    show3D={true}
                />
                <MapLayers data={data} config={filteredConfig} setLegendItems={setLegendItems} />
                <MapMarkers data={data} config={filteredConfig} />
                {legendItems.length > 0 && (
                    <Legend items={legendItems} />
                )}
            </MapComponent>
        </div>
    );
}
