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
import geoDataTTVT from '@/lib/TTVT_polygon.json';
import geoDataPhuongXa from '@/lib/DongThap_PhuongXa.json';

// Region types
type RegionType = 'ttvt' | 'phuong_xa';

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

            {/* Y-Axis Filter - Data Layers */}
            <div className="p-3 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                    <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">LỚP DỮ LIỆU</span>
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
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </span>
                                Tất cả
                            </span>
                        </label>

                        {/* Individual Layer Options - Y-axis columns */}
                        {yAxisOptions.map((option, index) => {
                            // Generate unique colors for each data layer
                            const layerColors = [
                                'bg-blue-500',
                                'bg-green-500',
                                'bg-orange-500',
                                'bg-red-500',
                                'bg-purple-500',
                                'bg-pink-500',
                                'bg-yellow-500',
                                'bg-cyan-500',
                            ];
                            const bgColor = layerColors[index % layerColors.length];
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
                                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${bgColor} text-white text-[10px] font-bold`}>
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
        (geoDataTTVT as any).features.forEach((f: any) => {
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
                    const item = data.find(d => String(d[xAxisKey]).trim().toLowerCase() === String(ttvt.ma_ttvt).trim().toLowerCase());
                    if (item) {
                        rawValue = Number(item[yAxisKey]);
                        valueDisplay = rawValue.toLocaleString();
                    }
                }

                return (
                    <MapMarker
                        key={ttvt.ma_ttvt}
                        longitude={ttvt.lng}
                        latitude={ttvt.lat}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MarkerContent>
                            <div
                                className="size-4 rounded-full bg-rose-500 border-1 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                                onClick={(e) => e.stopPropagation()}
                            >
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

const MapLayers = ({ data, config, setLegendItems, regionType }: { data: any[], config: ChartConfig, setLegendItems: (items: { code: string; name: string; color: string }[]) => void, regionType: RegionType }) => {
    const { map, isLoaded } = useMap();
    const { dataSource } = config;
    const [selectedCode, setSelectedCode] = useState<string | null>(null);

    // Get the appropriate GeoJSON and field names based on regionType
    const geoConfig = useMemo(() => {
        if (regionType === 'phuong_xa') {
            return {
                geoData: geoDataPhuongXa,
                codeField: 'ma_xa',
                nameField: 'ten_xa',
                groupField: 'tru_so', // Field linking to TTVT (khu vực)
                sourceId: 'phuongxa-source',
                labelsId: 'phuongxa-labels',
                fillLayerId: 'phuongxa-fill',
                lineLayerId: 'phuongxa-line',
                symbolLayerId: 'phuongxa-symbol',
                highlightFillId: 'phuongxa-highlight-fill',
                highlight3dId: 'phuongxa-highlight-3d',
                isGeoJSON: true // Already in GeoJSON format
            };
        }
        return {
            geoData: geoDataTTVT,
            codeField: 'ma_ttvt',
            nameField: 'ten_ttvt',
            groupField: undefined, // TTVT doesn't have parent group
            sourceId: 'ttvt-source',
            labelsId: 'ttvt-labels',
            fillLayerId: 'ttvt-fill',
            lineLayerId: 'ttvt-line',
            symbolLayerId: 'ttvt-symbol',
            highlightFillId: 'ttvt-highlight-fill',
            highlight3dId: 'ttvt-highlight-3d',
            isGeoJSON: false // ESRI JSON format
        };
    }, [regionType]);

    // Clean up layers when regionType changes
    useEffect(() => {
        if (!map || !isLoaded) return;

        // Remove old layers and sources
        const layersToRemove = [
            'ttvt-fill', 'ttvt-line', 'ttvt-symbol', 'ttvt-highlight', 'ttvt-highlight-fill', 'ttvt-highlight-3d',
            'phuongxa-fill', 'phuongxa-line', 'phuongxa-symbol', 'phuongxa-highlight', 'phuongxa-highlight-fill', 'phuongxa-highlight-3d'
        ];
        const sourcesToRemove = ['ttvt-source', 'ttvt-labels', 'phuongxa-source', 'phuongxa-labels'];

        layersToRemove.forEach(layerId => {
            if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
            }
        });

        sourcesToRemove.forEach(sourceId => {
            if (map.getSource(sourceId)) {
                map.removeSource(sourceId);
            }
        });
    }, [map, isLoaded, regionType]);

    useEffect(() => {
        if (!map || !isLoaded) return;

        const { geoData, codeField, nameField, sourceId, labelsId, fillLayerId, lineLayerId, symbolLayerId, isGeoJSON } = geoConfig;

        // Add Source if not exists
        if (!map.getSource(sourceId)) {
            let geoJsonData: any;
            let labelGeoJsonData: any;

            if (isGeoJSON) {
                // Already in GeoJSON format (Phường/Xã)
                geoJsonData = geoData;

                // Create label features from GeoJSON
                const labelFeatures = (geoData as any).features.map((f: any) => {
                    // Calculate centroid from polygon
                    const coords = f.geometry.type === 'Polygon'
                        ? f.geometry.coordinates[0]
                        : f.geometry.coordinates[0][0];
                    const centroid = calculateCentroid(coords);

                    return {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: centroid
                        },
                        properties: {
                            ...f.properties,
                            description: f.properties[nameField] || f.properties[codeField]
                        }
                    };
                });

                labelGeoJsonData = {
                    type: 'FeatureCollection',
                    features: labelFeatures
                };
            } else {
                // Transform ESRI JSON to GeoJSON (TTVT)
                const features = (geoData as any).features.map((f: any) => {
                    const rings = f.geometry.rings;
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

                const labelFeatures = (geoData as any).features.map((f: any) => {
                    const rings = f.geometry.rings;
                    let largestRing = rings[0];
                    let maxLen = 0;
                    rings.forEach((r: any[]) => {
                        if (r.length > maxLen) {
                            maxLen = r.length;
                            largestRing = r;
                        }
                    });

                    const centroid = calculateCentroid(largestRing);

                    return {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: centroid
                        },
                        properties: {
                            ...f.attributes,
                            description: f.attributes[codeField]
                        }
                    };
                });

                geoJsonData = {
                    type: 'FeatureCollection',
                    features: features
                };

                labelGeoJsonData = {
                    type: 'FeatureCollection',
                    features: labelFeatures
                };
            }

            map.addSource(sourceId, {
                type: 'geojson',
                data: geoJsonData as any
            });

            map.addSource(labelsId, {
                type: 'geojson',
                data: labelGeoJsonData as any
            });
        }

        // Add Layers
        if (!map.getLayer(fillLayerId)) {
            map.addLayer({
                id: fillLayerId,
                type: 'fill',
                source: sourceId,
                paint: {
                    'fill-color': '#e2e8f0',
                    'fill-opacity': 0.8,
                    'fill-outline-color': '#fff'
                }
            });

            map.addLayer({
                id: lineLayerId,
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': '#fff',
                    'line-width': regionType === 'phuong_xa' ? 0.5 : 1.5
                }
            });

            map.addLayer({
                id: symbolLayerId,
                type: 'symbol',
                source: labelsId,
                layout: {
                    'text-field': ['get', 'description'],
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': regionType === 'phuong_xa' ? 9 : 11,
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

            map.on('mousemove', fillLayerId, (e) => {
                map.getCanvas().style.cursor = 'pointer';

                const feature = e.features?.[0];
                if (feature) {
                    const name = feature.properties?.[nameField] || feature.properties?.[codeField];
                    const code = feature.properties?.[codeField];
                    const groupValue = geoConfig.groupField ? feature.properties?.[geoConfig.groupField] : null;

                    // Find data values for selected yAxis fields only
                    const xAxisKey = dataSource?.xAxis;
                    const yAxisFields = dataSource?.yAxis || [];
                    let valueDisplay = '';
                    let totalValue = 0;

                    // Show group (TTVT) if available (for Phường/Xã)
                    if (groupValue) {
                        valueDisplay = `<div style="font-size: 10px; color: #64748b; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;"><svg style="width: 12px; height: 12px;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> Khu vực: <strong>${groupValue}</strong></div>`;
                    }

                    if (xAxisKey && yAxisFields.length > 0 && code) {
                        const item = data.find(d => String(d[xAxisKey]).trim().toLowerCase() === String(code).trim().toLowerCase());
                        if (item) {
                            // Calculate total for selected layers
                            yAxisFields.forEach(field => {
                                totalValue += Number(item[field] || 0);
                            });

                            // Show total first
                            valueDisplay += `<div style="margin-top:4px; font-size: 12px; font-weight: 600; color: #2563eb; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; margin-bottom: 4px;">Tổng: ${totalValue.toLocaleString()}</div>`;

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
                            valueDisplay += `<div style="margin-top:2px; font-size: 12px; opacity: 0.7;">Không có dữ liệu</div>`;
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

            map.on('mouseleave', fillLayerId, () => {
                map.getCanvas().style.cursor = '';
                popup.remove();
            });
        }

    }, [map, isLoaded, dataSource, data, config.style?.yAxisLabel, geoConfig, regionType]);

    // Assign colors based on yAxis data and update legend
    useEffect(() => {
        const { geoData, codeField, fillLayerId, isGeoJSON, groupField } = geoConfig;

        if (!map || !isLoaded || !map.getLayer(fillLayerId)) return;

        const yAxisFields = dataSource?.yAxis || [];
        const xAxisField = dataSource?.xAxis;

        // Create color mapping based on region type
        const matchExpression: any[] = ['match', ['get', codeField]];
        let legendItems: { code: string; name: string; color: string }[] = [];

        // For Phường/Xã: Color by TTVT region (tru_so) to distinguish areas
        if (isGeoJSON && groupField) {
            // Get unique TTVT regions
            const ttvtRegions = new Set<string>();
            (geoData as any).features.forEach((f: any) => {
                const ttvt = f.properties[groupField];
                if (ttvt) ttvtRegions.add(String(ttvt));
            });

            // Create color mapping for each TTVT region
            const ttvtColorMap: { [key: string]: string } = {};
            const sortedTTVTs = Array.from(ttvtRegions).sort();
            sortedTTVTs.forEach((ttvt, index) => {
                ttvtColorMap[ttvt.toLowerCase()] = COLORS[index % COLORS.length];
            });

            // Assign colors to each Phường/Xã based on their TTVT region
            (geoData as any).features.forEach((f: any) => {
                const code = f.properties[codeField];
                const ttvt = f.properties[groupField];
                const color = ttvtColorMap[String(ttvt).toLowerCase()] || '#e2e8f0';
                matchExpression.push(code, color);
            });

            // Create legend items for TTVT regions
            legendItems = sortedTTVTs.map((ttvt, index) => ({
                code: ttvt,
                name: ttvt,
                color: COLORS[index % COLORS.length]
            }));
        } else {
            // For TTVT: Color by data value (heatmap style)
            if (!xAxisField || yAxisFields.length === 0) return;

            // Calculate total values for each region to determine color intensity
            const regionTotals: { [key: string]: number } = {};
            let maxTotal = 0;
            let minTotal = Infinity;

            data.forEach(item => {
                // Use lowercase for case-insensitive matching
                const code = String(item[xAxisField]).trim().toLowerCase();
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

            // Assign colors to each TTVT based on their data values
            (geoData as any).features.forEach((f: any) => {
                const code = f.attributes[codeField];
                // Use lowercase for case-insensitive lookup
                const total = regionTotals[String(code).toLowerCase()] || 0;
                const color = getColorByValue(total);
                matchExpression.push(code, color);
            });

            // Create legend items for value ranges (like the reference image)
            legendItems = [
                { code: 'low', name: 'Vùng tỉ lệ thấp', color: '#f97316' },
                { code: 'medium', name: 'Vùng tỉ lệ trung bình', color: '#facc15' },
                { code: 'high', name: 'Vùng tỉ lệ cao', color: '#22c55e' }
            ];
        }

        matchExpression.push('#e2e8f0'); // Default fallback

        // Apply colors to map
        map.setPaintProperty(fillLayerId, 'fill-color', matchExpression);

        // Update legend
        setLegendItems(legendItems);

    }, [map, isLoaded, dataSource, data, config.style?.mapColorScheme, config.style?.mapDisplayMode, setLegendItems, geoConfig, regionType]);

    // Add highlight layer and click handler
    useEffect(() => {
        if (!map || !isLoaded) return;

        const { codeField, nameField, sourceId, fillLayerId, highlightFillId, highlight3dId } = geoConfig;

        // Click handler - highlight all polygons with same code
        const handleClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
            const feature = e.features?.[0];
            const clickedCode = feature?.properties?.[codeField];

            if (clickedCode) {
                // Update selected code for highlight
                setSelectedCode(clickedCode);

                // Update fill color for highlight effect
                // Get the symbol layer ID to insert highlight layers BEFORE it (so labels stay on top)
                const { symbolLayerId } = geoConfig;

                if (!map.getLayer(highlightFillId)) {
                    // Add highlight fill layer BEFORE the symbol layer so labels are not covered
                    map.addLayer({
                        id: highlightFillId,
                        type: 'fill',
                        source: sourceId,
                        paint: {
                            'fill-color': 'tomato',
                            'fill-opacity': 0.7,
                            'fill-outline-color': '#ff6347'
                        },
                        filter: ['==', ['get', codeField], clickedCode]
                    }, symbolLayerId); // Insert BEFORE symbol layer

                    // Add 3D extrusion effect (simulated with line width) - also before symbol layer
                    map.addLayer({
                        id: highlight3dId,
                        type: 'line',
                        source: sourceId,
                        paint: {
                            'line-color': '#ff6347',
                            'line-width': 3,
                            'line-opacity': 0.8
                        },
                        filter: ['==', ['get', codeField], clickedCode]
                    }, symbolLayerId); // Insert BEFORE symbol layer
                } else {
                    // Update existing highlight layers
                    map.setFilter(highlightFillId, ['==', ['get', codeField], clickedCode]);
                    map.setFilter(highlight3dId, ['==', ['get', codeField], clickedCode]);
                }

                // Add click popup
                const name = feature?.properties?.[nameField] || feature?.properties?.[codeField];
                const groupValue = geoConfig.groupField ? feature?.properties?.[geoConfig.groupField] : null;
                const xAxisKey = dataSource?.xAxis;
                const yAxisFields = dataSource?.yAxis || [];
                let valueDisplay = '';
                let totalValue = 0;

                // Show group (TTVT) if available (for Phường/Xã)
                if (groupValue) {
                    valueDisplay = `<div style="font-size: 11px; color: #64748b; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed #e2e8f0; display: flex; align-items: center; gap: 4px;"><svg style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> Thuộc khu vực: <strong style="color: #0f172a;">${groupValue}</strong></div>`;
                }

                if (xAxisKey && yAxisFields.length > 0) {
                    const item = data.find(d => String(d[xAxisKey]).trim().toLowerCase() === String(clickedCode).trim().toLowerCase());
                    if (item) {
                        // Calculate total for selected layers
                        yAxisFields.forEach(field => {
                            totalValue += Number(item[field] || 0);
                        });

                        // Show total first
                        valueDisplay += `<div style="margin-top:4px; font-size: 13px; font-weight: 700; color: tomato; border-bottom: 2px dashed #fecaca; padding-bottom: 6px; margin-bottom: 6px;">
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

                // Show click popup for both region types with appropriate styling
                if (regionType === 'ttvt') {
                    // For TTVT: Show styled popup similar to marker popup (trụ sở style)
                    const clickPopup = new maplibregl.Popup({
                        closeButton: true,
                        closeOnClick: true,
                        maxWidth: '280px'
                    })
                        .setLngLat(e.lngLat)
                        .setHTML(`<div style="background: white; border-radius: 8px; overflow: hidden; min-width: 240px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);">
                            <div style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); padding: 16px; display: flex; align-items: center; justify-content: center;">
                                <svg style="width: 40px; height: 40px; color: #94a3b8;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            </div>
                            <div style="padding: 12px;">
                                <div style="font-size: 10px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Đơn vị</div>
                                <div style="font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px;">${name}</div>
                                ${valueDisplay ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">${valueDisplay}</div>` : ''}
                                <div style="display: flex; gap: 8px; margin-top: 12px;">
                                    <div style="flex: 1; background: #3b82f6; color: white; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; text-align: center; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                        <svg style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> Chỉ đường
                                    </div>
                                    <div style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                        <svg style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                    </div>
                                </div>
                            </div>
                        </div>`)
                        .addTo(map);
                } else {
                    // For phuong_xa: Show highlight style popup
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
            }
        };

        map.on('click', fillLayerId, handleClick);

        return () => {
            map.off('click', fillLayerId, handleClick);
        };
    }, [map, isLoaded, geoConfig, dataSource, data, config.style?.yAxisFieldLabels, regionType]);

    return null;
};


export function MapChart({ data, config, width, height }: MapChartProps) {
    const { style, dataSource } = config;
    const [legendItems, setLegendItems] = useState<{ code: string; name: string; color: string }[]>([]);

    // Region type state (ttvt or phuong_xa)
    const [regionType, setRegionType] = useState<RegionType>('ttvt');

    // Filter states
    const [selectedYAxisLayers, setSelectedYAxisLayers] = useState<string[]>(dataSource?.yAxis || []);

    // Generate X-axis options (region types) - now controls which GeoJSON to use
    const xAxisOptions = useMemo(() => {
        return [
            { value: 'ttvt', label: 'Khu vực TTVT' },
            { value: 'phuong_xa', label: 'Khu vực Xã - Phường' }
        ];
    }, []);

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
        if (dataSource?.yAxis && selectedYAxisLayers.length === 0) {
            setSelectedYAxisLayers(dataSource.yAxis);
        }
    }, [dataSource?.yAxis]);

    // Handle region type change
    const handleRegionTypeChange = useCallback((value: string) => {
        setRegionType(value as RegionType);
    }, []);

    // Create filtered config based on selected layers
    const filteredConfig = useMemo(() => {
        return {
            ...config,
            dataSource: {
                ...config.dataSource,
                yAxis: selectedYAxisLayers.length > 0 ? selectedYAxisLayers : config.dataSource?.yAxis
            }
        };
    }, [config, selectedYAxisLayers]);

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
                        selectedXAxis={regionType}
                        selectedYAxisLayers={selectedYAxisLayers}
                        onXAxisChange={handleRegionTypeChange}
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
                <MapLayers data={data} config={filteredConfig} setLegendItems={setLegendItems} regionType={regionType} />
                {regionType === 'ttvt' && <MapMarkers data={data} config={filteredConfig} />}
                {legendItems.length > 0 && (
                    <Legend items={legendItems} />
                )}
            </MapComponent>
        </div>
    );
}
