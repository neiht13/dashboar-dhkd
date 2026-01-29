"use client";

import React, { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Map as MapView,
    MapMarker,
    MarkerContent,
    MapPopup,
    MapControls,
} from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import {
    Radio,
    Signal,
    SignalHigh,
    SignalLow,
    SignalMedium,
    Layers,
    AlertTriangle,
    X,
} from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { BTSStation } from "@/lib/mock-telecom-data";
import btsStations from '@/lib/bts-stations.json';
interface NetworkCoverageMapProps {
    stations?: BTSStation[];
    center?: { lat: number; lng: number };
    zoom?: number;
    height?: number | string;
    className?: string;
    enableLayers?: boolean;
    enableClustering?: boolean;
    onStationClick?: (station: BTSStation) => void;
}

type NetworkLayer = "2G" | "3G" | "4G" | "5G";

const LAYER_COLORS: Record<NetworkLayer, string> = {
    "2G": "#94a3b8", // Slate
    "3G": "#f59e0b", // Amber
    "4G": "#3b82f6", // Blue
    "5G": "#8b5cf6", // Purple
};

const LAYER_ICONS: Record<NetworkLayer, React.ReactNode> = {
    "2G": <Radio className="h-4 w-4" />,
    "3G": <SignalLow className="h-4 w-4" />,
    "4G": <SignalMedium className="h-4 w-4" />,
    "5G": <SignalHigh className="h-4 w-4" />,
};

const STATUS_COLORS: Record<BTSStation["status"], string> = {
    active: "#22c55e",
    warning: "#f59e0b",
    critical: "#ef4444",
    offline: "#6b7280",
};

// Signal strength color scale
function getSignalColor(dbm: number): string {
    if (dbm >= -70) return "#22c55e"; // Excellent (Green)
    if (dbm >= -85) return "#84cc16"; // Good (Lime)
    if (dbm >= -95) return "#f59e0b"; // Fair (Amber)
    if (dbm >= -105) return "#ef4444"; // Poor (Red)
    return "#6b7280"; // No signal (Gray)
}

// Signal strength label
function getSignalLabel(dbm: number): string {
    if (dbm >= -70) return "Xuất sắc";
    if (dbm >= -85) return "Tốt";
    if (dbm >= -95) return "Trung bình";
    if (dbm >= -105) return "Yếu";
    return "Không có tín hiệu";
}

// BTS Marker component using MapLibre marker styling
function BTSMarkerIcon({ station }: { station: BTSStation }) {
    const color = LAYER_COLORS[station.type];
    const statusColor = STATUS_COLORS[station.status];

    return (
        <div className="relative">
            {/* Marker body */}
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white text-white"
                style={{ backgroundColor: color }}
            >
                {LAYER_ICONS[station.type]}
            </div>

            {/* Status indicator */}
            <div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
                style={{ backgroundColor: statusColor }}
            />

            {/* Alarm indicator */}
            {station.alarms > 0 && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold border border-white">
                    {station.alarms}
                </div>
            )}
        </div>
    );
}

// Station detail popup content
function StationDetailContent({
    station,
    onClose,
}: {
    station: BTSStation;
    onClose: () => void;
}) {
    return (
        <div className="min-w-[280px]">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-sm">{station.name}</h3>
                    <p className="text-xs text-muted-foreground">{station.id}</p>
                </div>
                <Badge
                    style={{ backgroundColor: LAYER_COLORS[station.type] }}
                    className="text-white"
                >
                    {station.type}
                </Badge>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 mb-3">
                <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[station.status] }}
                />
                <span className="text-sm capitalize">{station.status}</span>
                {station.alarms > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {station.alarms} cảnh báo
                    </Badge>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Cường độ tín hiệu</p>
                    <p className="font-medium" style={{ color: getSignalColor(station.signalStrength) }}>
                        {station.signalStrength} dBm
                        <span className="text-xs ml-1 text-muted-foreground">({getSignalLabel(station.signalStrength)})</span>
                    </p>
                </div>
                <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Traffic</p>
                    <p className="font-medium">{station.traffic} Mbps</p>
                </div>
                <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Thuê bao</p>
                    <p className="font-medium">{station.subscribers.toLocaleString("vi-VN")}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Uptime</p>
                    <p className="font-medium">{station.uptime.toFixed(2)}%</p>
                </div>
                <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Dung lượng</p>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${station.capacity}%`,
                                    backgroundColor:
                                        station.capacity > 80 ? "#ef4444" :
                                            station.capacity > 60 ? "#f59e0b" : "#22c55e",
                                }}
                            />
                        </div>
                        <span className="text-xs">{station.capacity}%</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Vị trí</p>
                    <p className="font-medium text-xs">{station.district}, {station.province}</p>
                </div>
            </div>

            {/* Last update */}
            <p className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                Cập nhật: {new Date(station.lastUpdate).toLocaleString("vi-VN")}
            </p>
        </div>
    );
}

export function NetworkCoverageMap({
    stations = btsStations as BTSStation[],
    center = { lat: 10.45, lng: 105.65 },
    zoom = 9,
    height = 500,
    className,
    enableLayers = true,
    enableClustering = true,
    onStationClick,
}: NetworkCoverageMapProps) {
    const [activeLayers, setActiveLayers] = useState<Set<NetworkLayer>>(
        new Set(["2G", "3G", "4G", "5G"])
    );
    const [showMarkers, setShowMarkers] = useState(true);
    const [selectedStation, setSelectedStation] = useState<BTSStation | null>(null);

    // Filter stations by active layers
    const filteredStations = useMemo(() => {
        return stations.filter((s) => activeLayers.has(s.type));
    }, [stations, activeLayers]);

    // Toggle layer
    const toggleLayer = (layer: NetworkLayer) => {
        setActiveLayers((prev) => {
            const next = new Set(prev);
            if (next.has(layer)) {
                next.delete(layer);
            } else {
                next.add(layer);
            }
            return next;
        });
    };

    // Handle station click
    const handleStationClick = useCallback((station: BTSStation) => {
        setSelectedStation(station);
        onStationClick?.(station);
    }, [onStationClick]);

    // Group stations by proximity for clustering
    const clusteredStations = useMemo(() => {
        if (!enableClustering) return filteredStations.map((s) => ({ ...s, cluster: 1 }));

        // Simple grid-based clustering
        const cellSize = 0.5; // degrees
        const clusters = new globalThis.Map<string, BTSStation[]>();

        filteredStations.forEach((station) => {
            const cellX = Math.floor(station.lng / cellSize);
            const cellY = Math.floor(station.lat / cellSize);
            const key = `${cellX},${cellY}`;

            if (!clusters.has(key)) {
                clusters.set(key, []);
            }
            clusters.get(key)!.push(station);
        });

        return Array.from(clusters.values()).map((group) => ({
            ...group[0],
            cluster: group.length,
            clusteredStations: group,
        }));
    }, [filteredStations, enableClustering]);

    // Statistics
    const stats = useMemo(() => {
        const byType: Record<NetworkLayer, number> = { "2G": 0, "3G": 0, "4G": 0, "5G": 0 };
        const byStatus: Record<BTSStation["status"], number> = {
            active: 0,
            warning: 0,
            critical: 0,
            offline: 0,
        };

        filteredStations.forEach((s) => {
            byType[s.type]++;
            byStatus[s.status]++;
        });

        return { byType, byStatus, total: filteredStations.length };
    }, [filteredStations]);

    return (
        <TooltipProvider>
            <div className={cn("relative rounded-lg overflow-hidden", className)} style={{ height }}>
                {/* MapLibre Map */}
                <MapView
                    center={[center.lng, center.lat]}
                    zoom={zoom}
                    minZoom={4}
                    maxZoom={18}
                >
                    {/* Map Controls */}
                    <MapControls
                        position="bottom-right"
                        showZoom
                        showLocate
                        showFullscreen
                        show3D
                    />

                    {/* Station Markers */}
                    {showMarkers && clusteredStations.map((station) => (
                        <MapMarker
                            key={station.id}
                            longitude={station.lng}
                            latitude={station.lat}
                            onClick={() => handleStationClick(station)}
                        >
                            <MarkerContent>
                                {station.cluster > 1 ? (
                                    // Cluster marker
                                    <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg border-2 border-white">
                                        {station.cluster}
                                    </div>
                                ) : (
                                    <BTSMarkerIcon station={station} />
                                )}
                            </MarkerContent>
                        </MapMarker>
                    ))}

                    {/* Selected Station Popup */}
                    {selectedStation && (
                        <MapPopup
                            longitude={selectedStation.lng}
                            latitude={selectedStation.lat}
                            closeButton
                            onClose={() => setSelectedStation(null)}
                            offset={20}
                        >
                            <StationDetailContent
                                station={selectedStation}
                                onClose={() => setSelectedStation(null)}
                            />
                        </MapPopup>
                    )}
                </MapView>

                {/* Layer controls */}
                {enableLayers && (
                    <div className="absolute top-3 right-3 z-10">
                        <Popover>
                            <PopoverTrigger>
                                <Button variant="secondary" size="sm" className="shadow-lg">
                                    <Layers className="h-4 w-4 mr-2" />
                                    Layers
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56" align="end">
                                <div className="space-y-4">
                                    <h4 className="font-medium text-sm">Loại mạng</h4>
                                    <div className="space-y-2">
                                        {(["2G", "3G", "4G", "5G"] as NetworkLayer[]).map((layer) => (
                                            <div key={layer} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: LAYER_COLORS[layer] }}
                                                    />
                                                    <span className="text-sm">{layer}</span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {stats.byType[layer]}
                                                    </Badge>
                                                </div>
                                                <Switch
                                                    checked={activeLayers.has(layer)}
                                                    onCheckedChange={() => toggleLayer(layer)}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t pt-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm">Hiển thị markers</Label>
                                            <Switch
                                                checked={showMarkers}
                                                onCheckedChange={setShowMarkers}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                )}

                {/* Stats bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm border-t p-2">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                                Tổng: <strong>{stats.total}</strong> trạm
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-xs">{stats.byStatus.active}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    <span className="text-xs">{stats.byStatus.warning}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-xs">{stats.byStatus.critical}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                                    <span className="text-xs">{stats.byStatus.offline}</span>
                                </div>
                            </div>
                        </div>

                        {/* Signal legend */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Tín hiệu:</span>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#22c55e" }} />
                                <span>XS</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#84cc16" }} />
                                <span>Tốt</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#f59e0b" }} />
                                <span>TB</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef4444" }} />
                                <span>Yếu</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

export default NetworkCoverageMap;
