"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LabelList, ReferenceLine
} from 'recharts';
import { useTheme } from 'next-themes';
import {
    LayoutDashboard, TrendingUp, TrendingDown, Tv, Wifi, Search, Grid,
    ChevronDown, ChevronUp, AlertCircle, BarChart2, Map as MapIcon, Target,
    Maximize, Minimize, Calendar, Clock, Sun, Moon, CheckCircle, XCircle,
    Activity, PauseCircle, RefreshCcw
} from 'lucide-react';
import { MapChart } from '../charts/MapChart.lazy';
import { toast } from 'sonner';

// --- METADATA ---
const REPORT_META = {
    title: "DASHBOARD RỜI MẠNG & SUY GIẢM",
};

const REFRESH_INTERVALS = [
    { label: "Không tự động", value: 0 },
    { label: "30 giây", value: 30 },
    { label: "1 phút", value: 60 },
    { label: "5 phút", value: 300 },
];
const UNIT_DB = [
    { madv: "385", donvi: "VNPT Mỹ Tho", tentat: "MTO" },
    { madv: "386", donvi: "VNPT Cái Bè", tentat: "CBE" },
    { madv: "387", donvi: "VNPT Cai Lậy", tentat: "CLY" },
    { madv: "388", donvi: "VNPT Châu Thành", tentat: "CTH" },
    { madv: "389", donvi: "VNPT Chợ Gạo", tentat: "CGO" },
    { madv: "390", donvi: "VNPT Gò Công Tây", tentat: "GCT" },
    { madv: "391", donvi: "VNPT Gò Công", tentat: "GCG" },
    { madv: "393", donvi: "VNPT Tân Phước", tentat: "TPC" },
    { madv: "395", donvi: "VNPT Sa Đéc", tentat: "SDC" },
    { madv: "396", donvi: "VNPT Lai Vung", tentat: "LVG" },
    { madv: "397", donvi: "VNPT Cao Lãnh", tentat: "CLH" },
    { madv: "398", donvi: "VNPT Thanh Bình", tentat: "TBH" },
    { madv: "399", donvi: "VNPT Tam Nông", tentat: "TNG" },
    { madv: "400", donvi: "VNPT Hồng Ngự", tentat: "HNU" },
    { madv: "401", donvi: "VNPT Mỹ Thọ", tentat: "MTH" },
    { madv: "402", donvi: "VNPT Tháp Mười", tentat: "TMI" },
];

// --- STAT CARD (compact) ---
const StatCard = ({ title, value, subValue, icon: Icon, color, isNegative = false }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 rounded-none group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[30px] border-l-transparent border-t-[30px]" style={{ borderTopColor: color, opacity: 0.15 }}></div>
        <div className="py-3 px-4 flex justify-between items-center">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-none bg-slate-100 dark:bg-slate-800"><Icon size={14} style={{ color }} /></div>
                    <h3 className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">{title}</h3>
                </div>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight block">{value}</span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mt-0.5">{subValue}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold">
                {isNegative ? (
                    <span className="text-red-600 dark:text-red-400 flex items-center gap-1 bg-red-50 dark:bg-red-950/30 px-2 py-0.5"><TrendingDown size={10} /></span>
                ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5"><CheckCircle size={10} /></span>
                )}
            </div>
        </div>
    </div>
);

// --- UNIT TILE ---
const UnitTile = ({ unit, onClick, isSelected }) => {
    const hasRM = unit.totalRM > 0;
    return (
        <div onClick={onClick}
            className={`relative p-3 border-2 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between h-28 group
                ${isSelected ? 'border-red-600 dark:border-red-500 bg-red-50/10 z-10' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-red-300 dark:hover:border-red-700'}`}>
            <div className="flex justify-between items-start">
                <span className={`font-black text-sm uppercase ${isSelected ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>{unit.code}</span>
                {hasRM && <div className="w-2 h-2 bg-red-500 rotate-45"></div>}
            </div>
            <div className="mt-2">
                <div className="flex justify-between items-end">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Rời Mạng</span>
                    <span className={`text-xl font-light ${hasRM ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {hasRM ? `-${unit.totalRM}` : '0'}
                    </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 mt-1 overflow-hidden flex">
                    <div className="bg-red-500 h-full" style={{ width: `${Math.min((unit.Fiber_RM / 30) * 100, 100)}%` }}></div>
                    <div className="bg-purple-500 h-full" style={{ width: `${Math.min((unit.MyTV_RM / 30) * 100, 100)}%` }}></div>
                </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>Fiber: <b className="text-red-600">{unit.Fiber_RM}</b></span>
                <span>MyTV: <b className="text-purple-600">{unit.MyTV_RM}</b></span>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD ---
export default function ChurnDashboard() {
    const { theme, setTheme } = useTheme();

    // Fix hydration mismatch
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && theme === 'dark';

    const [selectedUnit, setSelectedUnit] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [filterText, setFilterText] = useState('');
    const [sortKey, setSortKey] = useState('totalRM');
    const [sortDir, setSortDir] = useState('desc');
    const [filterStatus, setFilterStatus] = useState('all');

    // Data states
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [refreshInterval, setRefreshInterval] = useState(0);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/database/chart-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customQuery: `EXEC sp_rpt_ThongKe_SLTB_PSC_PTM_RM_Theo_C2 ${month}, ${year}`,
                    connectionId: "696995af8b327930665802d3"
                })
            });
            const result = await res.json();
            if (result.success) {
                setData(result.data);
                setLastUpdated(new Date());
            } else {
                toast.error("Không thể tải dữ liệu: " + (result.error || "Lỗi không xác định"));
            }
        } catch (err) {
            console.error(err);
            toast.error("Lỗi kết nối máy chủ");
        } finally {
            setIsLoading(false);
        }
    }, [month, year]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (refreshInterval > 0) {
            const interval = setInterval(fetchData, refreshInterval * 1000);
            return () => clearInterval(interval);
        }
    }, [refreshInterval, fetchData]);

    // --- DATA PROCESSING ---
    const processedData = useMemo(() => {
        let processed = data.map(item => ({
            ...item,
            code: item.TenTat,
            name: item.TenDV,
            totalRM: item.Fiber_RM + item.MyTV_RM,
            totalHuy: item.Fiber_Huy + item.MyTV_Huy + item.Fiber_HuyTuDong + item.MyTV_HuyTuDong,
            totalTN: item.Fiber_TNNC + item.MyTV_TNNC + item.Fiber_TNYC + item.MyTV_TNYC,
            totalPTM: item.Fiber_PTM + item.MyTV_PTM + item.Mesh_PTM + item.Cam_PTM,
            rateFiber: item.Fiber_PSC > 0 ? (item.Fiber_RM / item.Fiber_PSC) * 10000 : 0,
            rateMyTV: item.MyTV_PSC > 0 ? (item.MyTV_RM / item.MyTV_PSC) * 10000 : 0,
        }));
        if (filterText) {
            const lower = filterText.toLowerCase();
            processed = processed.filter(d => d.name.toLowerCase().includes(lower) || d.code.toLowerCase().includes(lower));
        }
        if (filterStatus === 'risk') processed = processed.filter(d => d.totalRM > 0);
        if (filterStatus === 'safe') processed = processed.filter(d => d.totalRM === 0);
        return processed.sort((a, b) => {
            const valA = a[sortKey] ?? 0;
            const valB = b[sortKey] ?? 0;
            return sortDir === 'desc' ? valB - valA : valA - valB;
        });
    }, [data, filterText, sortKey, sortDir, filterStatus]);

    // --- GLOBAL STATS (Calculated from ORIGINAL DATA) ---
    const globalStats = useMemo(() => {
        const rawData = data.map(item => ({
            ...item,
            totalRM: item.Fiber_RM + item.MyTV_RM,
        }));

        const fiber = { rm: 0, huy: 0, huyTD: 0, tnnc: 0, tnyc: 0, ptm: 0, psc: 0 };
        const mytv = { rm: 0, huy: 0, huyTD: 0, tnnc: 0, tnyc: 0, ptm: 0, psc: 0 };

        rawData.forEach(d => {
            fiber.rm += (d.Fiber_RM || 0); fiber.huy += (d.Fiber_Huy || 0); fiber.huyTD += (d.Fiber_HuyTuDong || 0);
            fiber.tnnc += (d.Fiber_TNNC || 0); fiber.tnyc += (d.Fiber_TNYC || 0); fiber.ptm += (d.Fiber_PTM || 0); fiber.psc += (d.Fiber_PSC || 0);
            mytv.rm += (d.MyTV_RM || 0); mytv.huy += (d.MyTV_Huy || 0); mytv.huyTD += (d.MyTV_HuyTuDong || 0);
            mytv.tnnc += (d.MyTV_TNNC || 0); mytv.tnyc += (d.MyTV_TNYC || 0); mytv.ptm += (d.MyTV_PTM || 0); mytv.psc += (d.MyTV_PSC || 0);
        });
        return { fiber, mytv, totalRM: fiber.rm + mytv.rm, totalHuy: fiber.huy + fiber.huyTD + mytv.huy + mytv.huyTD };
    }, [data]);

    // --- AVERAGE STATS ---
    const avgStats = useMemo(() => ({
        fiberRM: data.length > 0 ? globalStats.fiber.rm / data.length : 1,
        mytvRM: data.length > 0 ? globalStats.mytv.rm / data.length : 1,
        huyTotal: data.length > 0 ? (globalStats.fiber.huy + globalStats.mytv.huy) / data.length : 1,
        huyTDTotal: data.length > 0 ? (globalStats.fiber.huyTD + globalStats.mytv.huyTD) / data.length : 1,
        tnTotal: data.length > 0 ? (globalStats.fiber.tnnc + globalStats.fiber.tnyc + globalStats.mytv.tnnc + globalStats.mytv.tnyc) / data.length : 1,
    }), [globalStats, data.length]);

    // --- RADAR DATA ---
    const radarData = useMemo(() => {
        if (!selectedUnit) return [];

        const normalize = (val, avg) => {
            if (!avg || avg === 0) return 0;
            const res = (val / avg) * 100;
            return isFinite(res) && !isNaN(res) ? res : 0;
        };

        return [
            { subject: 'Fiber RM', A: normalize(selectedUnit.Fiber_RM, avgStats.fiberRM), B: 100 },
            { subject: 'MyTV RM', A: normalize(selectedUnit.MyTV_RM, avgStats.mytvRM), B: 100 },
            { subject: 'Hủy YC', A: normalize(selectedUnit.Fiber_Huy + selectedUnit.MyTV_Huy, avgStats.huyTotal), B: 100 },
            { subject: 'Hủy T.Động', A: normalize(selectedUnit.Fiber_HuyTuDong + selectedUnit.MyTV_HuyTuDong, avgStats.huyTDTotal), B: 100 },
            { subject: 'Tạm Ngưng', A: normalize(selectedUnit.totalTN, avgStats.tnTotal), B: 100 },
        ];
    }, [selectedUnit, avgStats]);

    // --- SERVICE PIE ---
    const servicePieData = useMemo(() => {
        if (!selectedUnit) return [];
        return [
            { name: 'Fiber RM', value: selectedUnit.Fiber_RM, color: '#ef4444' },
            { name: 'MyTV RM', value: selectedUnit.MyTV_RM, color: '#a855f7' },
        ].filter(d => d.value > 0);
    }, [selectedUnit]);

    // Prevent hydration mismatch
    if (!mounted) return <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400">Loading Dashboard...</div>;

    return (
        <div className={`h-screen w-full p-8 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 ${isFullScreen ? 'fixed inset-0 z-[100]' : ''}`}>

            {/* HEADER */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-sm">
                <div className="w-full px-2">
                    <div className="flex justify-between h-14 items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-600 text-white p-1.5 rounded-none shadow-sm"><TrendingDown size={18} /></div>
                            <div>
                                <h1 className="text-base font-black text-slate-900 dark:text-slate-50 tracking-tighter uppercase">{REPORT_META.title}</h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                        <Calendar size={10} className="text-slate-400" /><span>Tháng</span>
                                        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="bg-transparent outline-none text-blue-700 dark:text-blue-400 font-extrabold cursor-pointer">
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m} className="bg-white dark:bg-slate-900">{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                        <span>Năm</span>
                                        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="bg-transparent outline-none text-blue-700 dark:text-blue-400 font-extrabold cursor-pointer">
                                            <option value={2025} className="bg-white dark:bg-slate-900">2025</option>
                                            <option value={2026} className="bg-white dark:bg-slate-900">2026</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                        <Clock size={10} className="text-slate-400" />
                                        <select
                                            value={refreshInterval}
                                            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                                            className="bg-transparent outline-none text-blue-700 dark:text-blue-400 font-extrabold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded px-1"
                                        >
                                            {REFRESH_INTERVALS.map(interval => (
                                                <option key={interval.value} value={interval.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{interval.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button onClick={fetchData} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 transition-colors" title="Làm mới dữ liệu">
                                        <RefreshCcw size={12} className={isLoading ? "animate-spin" : ""} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-none">
                            <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-3 py-1 text-[11px] font-bold uppercase transition-all rounded-none ${activeTab === 'overview' ? 'bg-white dark:bg-slate-950 text-red-700 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><LayoutDashboard size={14} /> Toàn cảnh</button>
                            <button onClick={() => setActiveTab('analysis')} className={`flex items-center gap-2 px-3 py-1 text-[11px] font-bold uppercase transition-all rounded-none ${activeTab === 'analysis' ? 'bg-white dark:bg-slate-950 text-red-700 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><BarChart2 size={14} /> Phân tích</button>
                            <button onClick={() => setActiveTab('map')} className={`flex items-center gap-2 px-3 py-1 text-[11px] font-bold uppercase transition-all rounded-none ${activeTab === 'map' ? 'bg-white dark:bg-slate-950 text-red-700 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><MapIcon size={14} /> Bản đồ</button>
                            <button onClick={() => setIsFullScreen(!isFullScreen)} className="flex items-center justify-center w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border-l border-white dark:border-slate-700">{isFullScreen ? <Minimize size={14} /> : <Maximize size={14} />}</button>
                            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="flex items-center justify-center w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border-l border-white dark:border-slate-700">{isDark ? <Sun size={14} /> : <Moon size={14} />}</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 w-full">

                {/* SECTION 1: FIBER INTERNET KPIs */}
                <div>
                    <h3 className="font-bold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2 uppercase tracking-wide text-sm"><Wifi size={14} className="text-blue-600" /> Dịch vụ Fiber Internet</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                        <StatCard title="Rời Mạng" value={globalStats.fiber.rm.toLocaleString()} subValue={`Rate: ${globalStats.fiber.psc > 0 ? ((globalStats.fiber.rm / globalStats.fiber.psc) * 10000).toFixed(2) : 0}‱`} icon={TrendingDown} color="#ef4444" isNegative={globalStats.fiber.rm > 0} />
                        <StatCard title="PTM FIBER" value={globalStats.fiber.ptm.toLocaleString()} subValue="Phát triển mới" icon={TrendingUp} color="#3b82f6" />
                        <StatCard title="Hủy Yêu Cầu" value={globalStats.fiber.huy.toLocaleString()} subValue="Khách yêu cầu" icon={XCircle} color="#f59e0b" isNegative={globalStats.fiber.huy > 0} />
                        <StatCard title="Hủy Tự Động" value={globalStats.fiber.huyTD.toLocaleString()} subValue="Hệ thống hủy" icon={Activity} color="#ef4444" isNegative={globalStats.fiber.huyTD > 0} />
                        <StatCard title="TN Nợ Cước" value={globalStats.fiber.tnnc.toLocaleString()} subValue="Tạm ngưng nợ cước" icon={PauseCircle} color="#f59e0b" isNegative={globalStats.fiber.tnnc > 0} />
                        <StatCard title="TN Yêu Cầu" value={globalStats.fiber.tnyc.toLocaleString()} subValue="Tạm ngưng yêu cầu" icon={PauseCircle} color="#8b5cf6" isNegative={globalStats.fiber.tnyc > 0} />
                        <StatCard title="PSC Hiện Tại" value={globalStats.fiber.psc.toLocaleString()} subValue="Thuê bao sử dụng" icon={Wifi} color="#10b981" />
                    </div>
                </div>

                {/* SECTION 2: MYTV KPIs */}
                <div className="mt-4">
                    <h3 className="font-bold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2 uppercase tracking-wide text-sm"><Tv size={14} className="text-purple-600" /> Dịch vụ Truyền hình MyTV</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                        <StatCard title="Rời Mạng" value={globalStats.mytv.rm.toLocaleString()} subValue={`Rate: ${globalStats.mytv.psc > 0 ? ((globalStats.mytv.rm / globalStats.mytv.psc) * 10000).toFixed(2) : 0}‱`} icon={TrendingDown} color="#a855f7" isNegative={globalStats.mytv.rm > 0} />
                        <StatCard title="PTM MYTV" value={globalStats.mytv.ptm.toLocaleString()} subValue="Phát triển mới" icon={TrendingUp} color="#8b5cf6" />
                        <StatCard title="Hủy Yêu Cầu" value={globalStats.mytv.huy.toLocaleString()} subValue="Khách yêu cầu" icon={XCircle} color="#f59e0b" isNegative={globalStats.mytv.huy > 0} />
                        <StatCard title="Hủy Tự Động" value={globalStats.mytv.huyTD.toLocaleString()} subValue="Hệ thống hủy" icon={Activity} color="#ef4444" isNegative={globalStats.mytv.huyTD > 0} />
                        <StatCard title="TN Nợ Cước" value={globalStats.mytv.tnnc.toLocaleString()} subValue="Tạm ngưng nợ cước" icon={PauseCircle} color="#f59e0b" isNegative={globalStats.mytv.tnnc > 0} />
                        <StatCard title="TN Yêu Cầu" value={globalStats.mytv.tnyc.toLocaleString()} subValue="Tạm ngưng yêu cầu" icon={PauseCircle} color="#8b5cf6" isNegative={globalStats.mytv.tnyc > 0} />
                        <StatCard title="PSC Hiện Tại" value={globalStats.mytv.psc.toLocaleString()} subValue="Thuê bao sử dụng" icon={Tv} color="#10b981" />
                    </div>
                </div>

                {/* TOOLBAR */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 shadow-sm flex flex-col md:flex-row justify-between items-center gap-2 sticky top-0 z-20">
                    <div className="relative w-full md:w-64">
                        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                        <input type="text" placeholder="Tìm đơn vị..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 focus:border-red-500 focus:ring-0 rounded-none bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 transition-colors outline-none dark:text-slate-200" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-none">
                            <button onClick={() => setFilterStatus('all')} className={`px-3 py-1.5 text-xs font-bold ${filterStatus === 'all' ? 'bg-white dark:bg-slate-950 shadow text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>Tất cả</button>
                            <button onClick={() => setFilterStatus('risk')} className={`px-3 py-1.5 text-xs font-bold ${filterStatus === 'risk' ? 'bg-white dark:bg-slate-950 shadow text-red-700 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>Có Rời Mạng</button>
                            <button onClick={() => setFilterStatus('safe')} className={`px-3 py-1.5 text-xs font-bold ${filterStatus === 'safe' ? 'bg-white dark:bg-slate-950 shadow text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>An Toàn</button>
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase mr-1">Sắp xếp:</span>
                            <select className="text-sm border border-slate-300 dark:border-slate-700 py-1.5 px-3 bg-white dark:bg-slate-900 outline-none focus:border-red-500 dark:text-slate-200" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                                <option value="totalRM">Tổng Rời Mạng</option>
                                <option value="Fiber_RM">Fiber RM</option>
                                <option value="MyTV_RM">MyTV RM</option>
                                <option value="totalHuy">Tổng Hủy</option>
                                <option value="rateFiber">Tỷ lệ RM Fiber</option>
                            </select>
                            <button onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')} className="p-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {sortDir === 'desc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* DYNAMIC CONTENT */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* LEFT: RANKING CHART */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm h-[450px] flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><TrendingDown size={18} className="text-red-500" /> Xếp hạng Rời Mạng theo Đơn vị</h2>
                                <div className="flex gap-2 text-xs font-bold">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500"></div> Fiber</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500"></div> MyTV</span>
                                </div>
                            </div>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
                                        <XAxis dataKey="code" tick={{ fontSize: 10, fontWeight: 'bold', fill: isDark ? "#94a3b8" : "#666" }} interval={0} />
                                        <YAxis tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#666" }} />
                                        <Tooltip contentStyle={{ borderRadius: 0, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#f1f5f9' : '#1e293b' }} cursor={{ fill: isDark ? '#334155' : '#f1f5f9' }} />
                                        <ReferenceLine y={0} stroke="#000" />
                                        <Bar dataKey="Fiber_RM" name="Fiber RM" fill="#ef4444" barSize={14} radius={[2, 2, 0, 0]} onClick={(data) => setSelectedUnit(data)}><LabelList dataKey="Fiber_RM" position="top" style={{ fontSize: '9px', fill: '#64748b' }} /></Bar>
                                        <Bar dataKey="MyTV_RM" name="MyTV RM" fill="#a855f7" barSize={14} radius={[2, 2, 0, 0]} onClick={(data) => setSelectedUnit(data)}><LabelList dataKey="MyTV_RM" position="top" style={{ fontSize: '9px', fill: '#64748b' }} /></Bar>
                                        <Line type="monotone" dataKey="totalPTM" stroke="#22c55e" strokeWidth={2} dot={false} strokeDasharray="3 3" name="PTM Tổng" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        {/* RIGHT: UNIT DETAIL */}
                        <div className="bg-white dark:bg-slate-900 p-5 shadow-lg border-t-4 border-red-500 flex flex-col border border-slate-200 dark:border-slate-800">
                            {selectedUnit ? (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <div><h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">{selectedUnit.name}</h2><span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700">{selectedUnit.code}</span></div>
                                        <div className="text-right"><div className="text-3xl font-black text-red-600 dark:text-red-500">{selectedUnit.totalRM}</div><div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">Tổng RM</div></div>
                                    </div>
                                    <div className="space-y-3 mt-4">
                                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700">
                                            <h4 className="text-xs font-bold text-blue-600 uppercase mb-2 flex justify-between"><span>Fiber Internet</span><span className="text-red-600">RM: {selectedUnit.Fiber_RM}</span></h4>
                                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                                <div><div className="font-bold text-slate-700 dark:text-slate-300">{selectedUnit.Fiber_PTM}</div><div className="text-slate-500">PTM</div></div>
                                                <div><div className="font-bold text-red-500">{selectedUnit.Fiber_Huy}</div><div className="text-slate-500">Hủy YC</div></div>
                                                <div><div className="font-bold text-amber-500">{selectedUnit.Fiber_HuyTuDong}</div><div className="text-slate-500">Hủy TĐ</div></div>
                                                <div><div className="font-bold text-purple-500">{selectedUnit.Fiber_TNNC + selectedUnit.Fiber_TNYC}</div><div className="text-slate-500">TN</div></div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700">
                                            <h4 className="text-xs font-bold text-purple-600 uppercase mb-2 flex justify-between"><span>MyTV Truyền hình</span><span className="text-red-600">RM: {selectedUnit.MyTV_RM}</span></h4>
                                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                                <div><div className="font-bold text-slate-700 dark:text-slate-300">{selectedUnit.MyTV_PTM}</div><div className="text-slate-500">PTM</div></div>
                                                <div><div className="font-bold text-red-500">{selectedUnit.MyTV_Huy}</div><div className="text-slate-500">Hủy YC</div></div>
                                                <div><div className="font-bold text-amber-500">{selectedUnit.MyTV_HuyTuDong}</div><div className="text-slate-500">Hủy TĐ</div></div>
                                                <div><div className="font-bold text-purple-500">{selectedUnit.MyTV_TNNC + selectedUnit.MyTV_TNYC}</div><div className="text-slate-500">TN</div></div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">Chọn một đơn vị để xem chi tiết</div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'analysis' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* SCATTER CHART */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Target size={18} className="text-red-500" /> Phân tích Tương quan PTM và Rời Mạng</h2>
                            <div className="h-[450px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#ccc"} />
                                        <XAxis type="number" dataKey="totalPTM" name="Tổng PTM" label={{ value: 'Tổng PTM', position: 'bottom', fill: isDark ? "#94a3b8" : "#666" }} tick={{ fill: isDark ? "#94a3b8" : "#666" }} />
                                        <YAxis type="number" dataKey="totalRM" name="Tổng RM" label={{ value: 'Tổng RM', angle: -90, position: 'insideLeft', fill: isDark ? "#94a3b8" : "#666" }} tick={{ fill: isDark ? "#94a3b8" : "#666" }} />
                                        <ZAxis type="number" dataKey="Fiber_PSC" range={[60, 400]} name="PSC" />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                                            if (payload && payload.length) {
                                                const { name, totalPTM, totalRM, Fiber_PSC } = payload[0].payload;
                                                return (<div className="bg-slate-800 text-white p-2 text-xs rounded shadow-lg"><p className="font-bold">{name}</p><p className="text-emerald-300">PTM: {totalPTM}</p><p className="text-red-300">RM: {totalRM}</p><p>PSC: {Fiber_PSC?.toLocaleString()}</p></div>);
                                            }
                                            return null;
                                        }} />
                                        <Scatter name="Units" data={processedData} fill="#3b82f6" onClick={(data) => setSelectedUnit(data)}>
                                            <LabelList dataKey="code" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b' }} />
                                            {processedData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.totalRM > 0 ? '#ef4444' : '#10b981'} />))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        {/* RADAR & PIE */}
                        <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                            {selectedUnit ? (
                                <>
                                    <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800"><h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">{selectedUnit.name}</h2><div className="flex gap-4 mt-2 text-sm"><div className="text-emerald-600 dark:text-emerald-400 font-bold">PTM: {selectedUnit.totalPTM}</div><div className="text-red-600 dark:text-red-400 font-bold">RM: {selectedUnit.totalRM}</div></div></div>
                                    <div className="h-[300px]">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase text-center mb-2">So sánh với TRUNG BÌNH</h4>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                                <PolarGrid stroke={isDark ? "#334155" : "#e2e8f0"} />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                                <Radar name={selectedUnit.name} dataKey="A" stroke="#ef4444" strokeWidth={2} fill="#ef4444" fillOpacity={0.3} />
                                                <Radar name="Trung bình" dataKey="B" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" fill="transparent" />
                                                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f1f5f9' : '#1e293b' }} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {servicePieData.length > 0 && (
                                        <div className="h-32 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center">
                                            <div className="w-1/2 h-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={servicePieData} innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">{servicePieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="none" />))}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                                            <div className="w-1/2 text-[10px] space-y-1">{servicePieData.map((item, idx) => (<div key={idx} className="flex justify-between"><div className="flex items-center gap-1"><div className="w-2 h-2" style={{ backgroundColor: item.color }}></div><span className="text-slate-500">{item.name}</span></div><span className="font-bold">{item.value}</span></div>))}</div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 italic text-sm">Chọn đơn vị từ biểu đồ bên trái</div>
                            )}
                        </div>
                    </div>
                )}

                {/* TILE GRID (Always visible) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Grid size={18} className="text-slate-500" /> Danh sách Đơn vị ({processedData.length})</h2>
                    </div>
                    {processedData.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                            {processedData.map(unit => (<UnitTile key={unit.MaDV} unit={unit} isSelected={selectedUnit?.MaDV === unit.MaDV} onClick={() => setSelectedUnit(unit)} />))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-400 italic bg-slate-50 dark:bg-slate-950">Không tìm thấy dữ liệu phù hợp với bộ lọc.</div>
                    )}
                </div>

            </div>
        </div>
    );
}
