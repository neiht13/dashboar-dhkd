"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, ReferenceLine,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    RadialBarChart, RadialBar
} from 'recharts';
import {
    LayoutDashboard, TrendingUp, Users, Tv, Wifi, Router,
    Activity, Grid, MapPin, Target, BarChart2
} from 'lucide-react';
import maplibregl from 'maplibre-gl';

// --- DỮ LIỆU TỪ XML VÀ TỌA ĐỘ ---
const REPORT_META = {
    title: "TRUNG TÂM ĐIỀU HÀNH PTM",
    period: "Tháng 1 năm 2026",
    lastUpdated: "28/01/2026 13:33"
};

const GLOBAL_STATS = {
    fiber: { plan: 3985, actual: 4006, percent: 101.15 },
    mytv: { plan: 1794, actual: 1959, percent: 109.19 },
    meshCam: { plan: 1594, actual: 1295, percent: 81.24 }
};

const RAW_DATA = [
    { id: 1, name: "Cái Bè", code: "CBE", lat: 10.3325, lng: 106.0322, geoX: 10, geoY: 80, planFiber: 281, actFiber: 248, planMyTV: 126, actMyTV: 172, planMC: 112, actMC: 78, channel_kt: 101, channel_kd: 131, channel_gdv: 3 },
    { id: 2, name: "Chợ Gạo", code: "CGO", lat: 10.3556, lng: 106.4636, geoX: 70, geoY: 50, planFiber: 220, actFiber: 195, planMyTV: 99, actMyTV: 123, planMC: 88, actMC: 140, channel_kt: 117, channel_kd: 65, channel_gdv: 8 },
    { id: 3, name: "Cao Lãnh", code: "CLH", lat: 10.4606, lng: 105.6325, geoX: 30, geoY: 60, planFiber: 315, actFiber: 346, planMyTV: 142, actMyTV: 253, planMC: 126, actMC: 137, channel_kt: 167, channel_kd: 146, channel_gdv: 26 },
    { id: 4, name: "Cai Lậy", code: "CLY", lat: 10.4095, lng: 106.1158, geoX: 25, geoY: 70, planFiber: 290, actFiber: 292, planMyTV: 131, actMyTV: 133, planMC: 116, actMC: 27, channel_kt: 196, channel_kd: 87, channel_gdv: 1 },
    { id: 5, name: "Châu Thành", code: "CTH", lat: 10.3844, lng: 106.3242, geoX: 50, geoY: 60, planFiber: 291, actFiber: 284, planMyTV: 131, actMyTV: 156, planMC: 116, actMC: 96, channel_kt: 109, channel_kd: 159, channel_gdv: 6 },
    { id: 6, name: "Gò Công", code: "GCG", lat: 10.3606, lng: 106.6622, geoX: 90, geoY: 60, planFiber: 259, actFiber: 200, planMyTV: 117, actMyTV: 59, planMC: 104, actMC: 96, channel_kt: 114, channel_kd: 79, channel_gdv: 3 },
    { id: 7, name: "Gò Công Tây", code: "GCT", lat: 10.3183, lng: 106.5664, geoX: 80, geoY: 45, planFiber: 192, actFiber: 168, planMyTV: 86, actMyTV: 75, planMC: 77, actMC: 53, channel_kt: 81, channel_kd: 73, channel_gdv: 9 },
    { id: 8, name: "Hồng Ngự", code: "HNU", lat: 10.8033, lng: 105.3517, geoX: 20, geoY: 90, planFiber: 332, actFiber: 428, planMyTV: 149, actMyTV: 91, planMC: 133, actMC: 64, channel_kt: 184, channel_kd: 207, channel_gdv: 30 },
    { id: 9, name: "Lai Vung", code: "LVG", lat: 10.3542, lng: 105.6883, geoX: 35, geoY: 40, planFiber: 348, actFiber: 383, planMyTV: 157, actMyTV: 207, planMC: 139, actMC: 89, channel_kt: 203, channel_kd: 156, channel_gdv: 17 },
    { id: 10, name: "Mỹ Thọ", code: "MTH", lat: 10.4000, lng: 105.7167, geoX: 55, geoY: 55, planFiber: 169, actFiber: 167, planMyTV: 76, actMyTV: 110, planMC: 68, actMC: 62, channel_kt: 64, channel_kd: 91, channel_gdv: 7 },
    { id: 11, name: "Mỹ Tho", code: "MTO", lat: 10.3558, lng: 106.3536, geoX: 60, geoY: 50, planFiber: 313, actFiber: 291, planMyTV: 141, actMyTV: 200, planMC: 125, actMC: 186, channel_kt: 106, channel_kd: 167, channel_gdv: 12 },
    { id: 12, name: "Sa Đéc", code: "SDC", lat: 10.3011, lng: 105.7539, geoX: 40, geoY: 50, planFiber: 312, actFiber: 318, planMyTV: 140, actMyTV: 119, planMC: 125, actMC: 88, channel_kt: 142, channel_kd: 142, channel_gdv: 28 },
    { id: 13, name: "Thanh Bình", code: "TBH", lat: 10.5522, lng: 105.4528, geoX: 25, geoY: 80, planFiber: 250, actFiber: 264, planMyTV: 113, actMyTV: 106, planMC: 100, actMC: 108, channel_kt: 101, channel_kd: 111, channel_gdv: 35 },
    { id: 14, name: "Tháp Mười", code: "TMI", lat: 10.5844, lng: 105.8361, geoX: 35, geoY: 85, planFiber: 154, actFiber: 186, planMyTV: 69, actMyTV: 78, planMC: 62, actMC: 27, channel_kt: 116, channel_kd: 63, channel_gdv: 4 },
    { id: 15, name: "Tam Nông", code: "TNG", lat: 10.6500, lng: 105.5000, geoX: 30, geoY: 85, planFiber: 148, actFiber: 154, planMyTV: 67, actMyTV: 36, planMC: 59, actMC: 15, channel_kt: 81, channel_kd: 67, channel_gdv: 5 },
    { id: 16, name: "Tân Phước", code: "TPC", lat: 10.5333, lng: 106.2000, geoX: 45, geoY: 75, planFiber: 111, actFiber: 107, planMyTV: 50, actMyTV: 41, planMC: 44, actMC: 29, channel_kt: 71, channel_kd: 31, channel_gdv: 2 },
];

interface DetailUnit {
    id: number;
    name: string;
    code: string;
    lat: number;
    lng: number;
    geoX: number;
    geoY: number;
    planFiber: number;
    actFiber: number;
    planMyTV: number;
    actMyTV: number;
    planMC: number;
    actMC: number;
    channel_kt: number;
    channel_kd: number;
    channel_gdv: number;
    pctFiber: number;
    pctMyTV: number;
    pctMC: number;
    totalAct: number;
    contributionScore: number;
}

const DETAIL_DATA: DetailUnit[] = RAW_DATA.map(d => ({
    ...d,
    pctFiber: parseFloat((d.actFiber / d.planFiber * 100).toFixed(1)),
    pctMyTV: parseFloat((d.actMyTV / d.planMyTV * 100).toFixed(1)),
    pctMC: parseFloat((d.actMC / d.planMC * 100).toFixed(1)),
    totalAct: d.actFiber + d.actMyTV + d.actMC,
    contributionScore: d.actFiber + d.actMyTV
}));

const AVG_STATS = {
    pctFiber: DETAIL_DATA.reduce((acc, curr) => acc + curr.pctFiber, 0) / DETAIL_DATA.length,
    pctMyTV: DETAIL_DATA.reduce((acc, curr) => acc + curr.pctMyTV, 0) / DETAIL_DATA.length,
    pctMC: DETAIL_DATA.reduce((acc, curr) => acc + curr.pctMC, 0) / DETAIL_DATA.length,
    totalAct: DETAIL_DATA.reduce((acc, curr) => acc + curr.totalAct, 0) / DETAIL_DATA.length,
};

// --- SEMI GAUGE CHART ---
const SemiGauge = ({ value, color, size = 100 }: { value: number; color: string; size?: number }) => {
    const gaugeValue = Math.min(Number(value) || 0, 100);
    const data = [
        { name: 'val', value: gaugeValue, fill: color },
        { name: 'rest', value: 100 - gaugeValue, fill: '#f1f5f9' },
    ];

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size / 2 }}>
            <ResponsiveContainer width="100%" height="200%">
                <RadialBarChart
                    cx="50%" cy="50%"
                    innerRadius="70%" outerRadius="100%"
                    barSize={15}
                    data={data}
                    startAngle={180} endAngle={0}
                >
                    <RadialBar
                        background
                        dataKey="value"
                        cornerRadius={10}
                    />
                </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-end pb-1">
                <span className="text-xl font-black" style={{ color: color }}>{value}%</span>
            </div>
        </div>
    );
};

// --- STAT CARD ---
const StatCard = ({ title, value, subValue, percent, icon: Icon, color }: {
    title: string;
    value: string | number;
    subValue: number;
    percent: number;
    icon: React.ElementType;
    color: string
}) => (
    <div className="bg-white border-l-4 border-slate-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 rounded-none group flex justify-between items-center" style={{ borderLeftColor: color }}>
        <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 rounded-full bg-slate-50 group-hover:bg-opacity-10 transition-colors" style={{ color: color }}>
                    <Icon size={20} />
                </div>
                <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest text-right">{title}</h3>
            </div>
            <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-800">{value}</span>
                <span className="text-xs font-medium text-slate-400">KH: {subValue}</span>
            </div>
        </div>
        <div className="ml-4 w-28 h-14 flex items-end justify-center">
            <SemiGauge value={percent} color={percent >= 100 ? '#10b981' : color} size={110} />
        </div>
    </div>
);

// --- UNIT TILE ---
const UnitTile = ({ unit, onClick, isSelected }: { unit: DetailUnit; onClick: () => void; isSelected: boolean }) => {
    const isHigh = unit.pctFiber >= 100;
    return (
        <div
            onClick={onClick}
            className={`relative p-3 border cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg flex flex-col justify-between h-24
        ${isSelected ? 'ring-2 ring-blue-500 z-10' : 'border-slate-100'}
        ${isHigh ? 'bg-emerald-50/50' : 'bg-white'}
      `}
        >
            <div className="flex justify-between items-start">
                <span className="font-bold text-sm text-slate-700">{unit.code}</span>
                {isHigh && <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>}
            </div>
            <div>
                <div className="text-2xl font-light text-slate-800">{unit.actFiber}</div>
                <div className={`text-[10px] font-bold ${isHigh ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {unit.pctFiber}% KH
                </div>
            </div>
        </div>
    );
};

// --- MAP COMPONENT ---
const MapLibreMap = ({ units, selectedUnit, onSelect }: {
    units: DetailUnit[];
    selectedUnit: DetailUnit | null;
    onSelect: (unit: DetailUnit) => void
}) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);

    useEffect(() => {
        if (!mapContainer.current) return;
        if (map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                'version': 8,
                'sources': {
                    'osm': {
                        'type': 'raster',
                        'tiles': ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        'tileSize': 256,
                        'attribution': '&copy; OpenStreetMap'
                    }
                },
                'layers': [{
                    'id': 'osm-layer',
                    'type': 'raster',
                    'source': 'osm',
                    'minzoom': 0,
                    'maxzoom': 19
                }]
            },
            center: [106.0, 10.45],
            zoom: 8.5,
            attributionControl: false,
        });

        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!map.current || !units) return;

        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        units.forEach(unit => {
            const el = document.createElement('div');
            const isSelected = selectedUnit?.id === unit.id;
            const isHigh = unit.pctFiber >= 100;

            Object.assign(el.style, {
                width: isSelected ? '30px' : '20px',
                height: isSelected ? '30px' : '20px',
                backgroundColor: isHigh ? '#10b981' : (unit.pctFiber >= 90 ? '#3b82f6' : '#f59e0b'),
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s',
            });

            el.addEventListener('click', () => {
                onSelect(unit);
                map.current?.flyTo({ center: [unit.lng, unit.lat], zoom: 10 });
            });

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([unit.lng, unit.lat])
                .addTo(map.current!);

            markersRef.current.push(marker);
        });
    }, [units, selectedUnit, onSelect]);

    return <div ref={mapContainer} className="w-full h-full rounded-lg bg-slate-100" />;
};

// --- MAIN DASHBOARD ---
export default function UltimateDashboard() {
    const [selectedUnit, setSelectedUnit] = useState<DetailUnit>(DETAIL_DATA[0]);
    const [showTable, setShowTable] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const radarData = useMemo(() => {
        if (!selectedUnit) return [];
        return [
            { subject: 'Fiber %', A: selectedUnit.pctFiber, B: AVG_STATS.pctFiber, fullMark: 150 },
            { subject: 'MyTV %', A: selectedUnit.pctMyTV, B: AVG_STATS.pctMyTV, fullMark: 150 },
            { subject: 'Mesh/Cam %', A: selectedUnit.pctMC, B: AVG_STATS.pctMC, fullMark: 150 },
            { subject: 'Thị phần', A: (selectedUnit.totalAct / AVG_STATS.totalAct) * 100, B: 100, fullMark: 200 },
            { subject: 'Năng suất', A: (selectedUnit.channel_kd + selectedUnit.channel_kt > 0) ? (selectedUnit.totalAct / (selectedUnit.channel_kd + selectedUnit.channel_kt) * 20) : 0, B: 50, fullMark: 100 },
        ];
    }, [selectedUnit]);

    const serviceMixData = useMemo(() => {
        if (!selectedUnit) return [];
        return [
            { name: 'Fiber', value: selectedUnit.actFiber, color: '#3b82f6' },
            { name: 'MyTV', value: selectedUnit.actMyTV, color: '#8b5cf6' },
            { name: 'Mesh/Cam', value: selectedUnit.actMC, color: '#10b981' },
        ];
    }, [selectedUnit]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">

            {/* HEADER */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-600 text-white p-2 rounded-none">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">{REPORT_META.title}</h1>
                                <p className="text-xs text-slate-500 font-medium">{REPORT_META.period}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex bg-slate-100 p-1 rounded-none">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-all rounded-none ${activeTab === 'overview' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <LayoutDashboard size={14} /> Toàn cảnh
                                </button>
                                <button
                                    onClick={() => setActiveTab('analysis')}
                                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-all rounded-none ${activeTab === 'analysis' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <BarChart2 size={14} /> Phân tích sâu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                        title="Fiber Internet"
                        value={GLOBAL_STATS.fiber.actual.toLocaleString()}
                        subValue={GLOBAL_STATS.fiber.plan}
                        percent={GLOBAL_STATS.fiber.percent}
                        icon={Wifi} color="#2563eb"
                    />
                    <StatCard
                        title="Truyền hình MyTV"
                        value={GLOBAL_STATS.mytv.actual.toLocaleString()}
                        subValue={GLOBAL_STATS.mytv.plan}
                        percent={GLOBAL_STATS.mytv.percent}
                        icon={Tv} color="#7c3aed"
                    />
                    <StatCard
                        title="Mesh & Camera"
                        value={GLOBAL_STATS.meshCam.actual.toLocaleString()}
                        subValue={GLOBAL_STATS.meshCam.plan}
                        percent={GLOBAL_STATS.meshCam.percent}
                        icon={Router} color="#059669"
                    />
                </div>

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-5 border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-blue-500" />
                                    Xếp hạng Sản lượng Fiber & MyTV
                                </h2>
                            </div>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={[...DETAIL_DATA].sort((a, b) => b.actFiber - a.actFiber)}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="code" tick={{ fontSize: 10, fontWeight: 'bold' }} interval={0} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                        <Bar dataKey="actFiber" name="Fiber" fill="#3b82f6" barSize={12} radius={[2, 2, 0, 0]} onClick={(data) => setSelectedUnit(data as DetailUnit)} />
                                        <Bar dataKey="actMyTV" name="MyTV" fill="#8b5cf6" barSize={12} radius={[2, 2, 0, 0]} />
                                        <Line type="monotone" dataKey="planFiber" stroke="#fbbf24" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-slate-800 text-white p-5 shadow-lg border-t-4 border-blue-500 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h2 className="font-bold text-lg">{selectedUnit.name}</h2>
                                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">{selectedUnit.code}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-blue-400">{selectedUnit.totalAct}</div>
                                    <div className="text-[10px] uppercase opacity-70">Tổng PTM</div>
                                </div>
                            </div>

                            <div className="flex-1 min-h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#475569" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                                        <Radar name={selectedUnit.name} dataKey="A" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.5} />
                                        <Radar name="TB Tỉnh" dataKey="B" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" fill="transparent" fillOpacity={0.1} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="h-32 mt-2 border-t border-slate-700 pt-2 flex items-center">
                                <div className="w-1/2 h-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={serviceMixData} innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">
                                                {serviceMixData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', fontSize: '10px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-1/2 text-[10px] space-y-1">
                                    <p className="text-slate-400 uppercase font-bold mb-1">Cơ cấu PTM</p>
                                    {serviceMixData.map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                            <span style={{ color: item.color }}>{item.name}</span>
                                            <span className="font-bold">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ANALYSIS TAB */}
                {activeTab === 'analysis' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        <div className="lg:col-span-2 h-96 bg-white p-5 border border-slate-200 shadow-sm flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                    <MapPin size={18} className="text-red-500" />
                                    Bản đồ Vị thế Kinh doanh
                                </h2>
                            </div>
                            <div className="flex-1 relative rounded-lg overflow-hidden border border-slate-200">
                                <MapLibreMap
                                    units={DETAIL_DATA}
                                    selectedUnit={selectedUnit}
                                    onSelect={setSelectedUnit}
                                />
                            </div>
                        </div>

                        <div className="bg-white p-5 border border-slate-200 shadow-sm">
                            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Target size={18} className="text-red-500" />
                                Ma trận Hiệu quả (Fiber vs MyTV)
                            </h2>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" dataKey="pctFiber" name="Fiber %" unit="%" domain={[60, 150]} />
                                        <YAxis type="number" dataKey="pctMyTV" name="MyTV %" unit="%" domain={[40, 200]} />
                                        <ZAxis type="number" dataKey="totalAct" range={[50, 400]} name="Tổng PTM" />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                        <ReferenceLine x={100} stroke="#22c55e" strokeDasharray="3 3" />
                                        <ReferenceLine y={100} stroke="#8b5cf6" strokeDasharray="3 3" />
                                        <Scatter name="Units" data={DETAIL_DATA} fill="#3b82f6" onClick={(data) => setSelectedUnit(data as DetailUnit)}>
                                            {DETAIL_DATA.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.id === selectedUnit?.id ? '#ef4444' : (entry.pctFiber >= 100 && entry.pctMyTV >= 100 ? '#22c55e' : '#3b82f6')} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-5 border border-slate-200 shadow-sm">
                            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Users size={18} className="text-orange-500" />
                                Cơ cấu nguồn lực bán hàng
                            </h2>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={DETAIL_DATA} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis type="category" dataKey="code" tick={{ fontSize: 10, fontWeight: 'bold' }} width={30} />
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        <Bar dataKey="channel_kt" name="NVKT" stackId="a" fill="#0ea5e9" />
                                        <Bar dataKey="channel_kd" name="NVKD" stackId="a" fill="#6366f1" />
                                        <Bar dataKey="channel_gdv" name="GDV" stackId="a" fill="#10b981" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* UNIT TILES */}
                <div className="bg-white border border-slate-200 shadow-sm p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <Grid size={18} className="text-slate-500" />
                            Danh sách Đơn vị (Click để xem chi tiết)
                        </h2>
                        <button
                            onClick={() => setShowTable(!showTable)}
                            className="text-xs text-blue-600 font-bold hover:underline"
                        >
                            {showTable ? 'Ẩn bảng chi tiết' : 'Xem bảng chi tiết'}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
                        {DETAIL_DATA.map(unit => (
                            <UnitTile
                                key={unit.id}
                                unit={unit}
                                isSelected={selectedUnit?.id === unit.id}
                                onClick={() => setSelectedUnit(unit)}
                            />
                        ))}
                    </div>

                    {showTable && (
                        <div className="overflow-x-auto border-t border-slate-100 pt-4 mt-4">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-3 py-2">Đơn vị</th>
                                        <th className="px-3 py-2 text-right">Fiber (TH)</th>
                                        <th className="px-3 py-2 text-right">MyTV (TH)</th>
                                        <th className="px-3 py-2 text-right">Tổng PTM</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {DETAIL_DATA.map(unit => (
                                        <tr key={unit.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedUnit(unit)}>
                                            <td className="px-3 py-2 font-bold">{unit.name}</td>
                                            <td className="px-3 py-2 text-right">{unit.actFiber}</td>
                                            <td className="px-3 py-2 text-right">{unit.actMyTV}</td>
                                            <td className="px-3 py-2 text-right font-bold text-blue-600">{unit.totalAct}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}