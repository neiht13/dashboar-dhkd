import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, ReferenceLine,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LabelList
} from 'recharts';
import {
    LayoutDashboard, TrendingUp, Users, Tv, Wifi, Router,
    Activity, Grid, Search, Filter,
    ArrowUpDown, ChevronDown, ChevronUp, Target, AlertCircle,
    BarChart2, List, CheckCircle, XCircle, Map as MapIcon, Maximize, Minimize, Calendar,
    TrendingDown, RefreshCcw, Share2, PauseCircle, Clock, UserCheck
} from 'lucide-react';
import { PermissionManager } from "@/components/dashboard-builder/PermissionManager";
import { MapChart } from './charts/MapChart.lazy';


// --- DỮ LIỆU TỪ XML ---
const REPORT_META = {
    title: "DASHBOARD BIẾN ĐỘNG THUÊ BAO",
    lastUpdated: new Date().toLocaleString('vi-VN')
};

const REFRESH_INTERVALS = [
    { label: "Không tự động", value: 0 },
    { label: "30 giây", value: 30 },
    { label: "1 phút", value: 60 },
    { label: "5 phút", value: 300 },
    { label: "15 phút", value: 900 },
    { label: "30 phút", value: 1800 },
];

// --- CHART COMPONENTS ---

// ANGULAR GAUGE CHART
const AngularGauge = ({ value, color, size = 120 }) => {
    // Value for gauge visual (0-100), but text displays actual value
    const percent = Math.min(Math.max(value, 0), 100);
    const radius = size / 2;
    const strokeWidth = 12;
    const normalizedRadius = radius - strokeWidth;
    const circumference = normalizedRadius * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;
    const rotation = -180 + (percent / 100) * 180;

    return (
        <div className="relative flex flex-col items-center justify-end" style={{ width: size, height: size / 1.8 }}>
            <svg height={size / 2} width={size} viewBox={`0 0 ${size} ${size / 2}`} className="overflow-visible">
                <path
                    d={`M ${strokeWidth},${radius} A ${normalizedRadius},${normalizedRadius} 0 0 1 ${size - strokeWidth},${radius}`}
                    fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} strokeLinecap="butt"
                />
                <path
                    d={`M ${strokeWidth},${radius} A ${normalizedRadius},${normalizedRadius} 0 0 1 ${size - strokeWidth},${radius}`}
                    fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset} strokeLinecap="butt" className="transition-all duration-1000 ease-out"
                />
                <g transform={`translate(${radius}, ${radius}) rotate(${rotation})`}>
                    <polygon points="-4,-10 0,-radius 4,-10" fill="#1e293b" transform={`scale(${size / 100}) translate(0, -${normalizedRadius - 15})`} />
                    <circle cx="0" cy="0" r="4" fill="#1e293b" />
                </g>
            </svg>
            <div className="absolute bottom-0 text-center">
                <span className="text-2xl font-black tracking-tighter" style={{ color: color }}>
                    {value}%
                </span>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, subValue, percent, icon: Icon, color, subLabel = "Kế hoạch" }) => {
    // Determine status based on Net Positive/Negative for Biến Động dashboard
    const isPositive = percent >= 0;

    return (
        <div className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-none group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-0 h-0 border-l-[40px] border-l-transparent border-t-[40px]" style={{ borderTopColor: color, opacity: 0.1 }}></div>

            <div className="py-2 px-4 flex justify-between items-center h-full">
                <div className="flex-1 flex flex-col justify-between h-full">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 rounded-none bg-slate-100 text-slate-600`}>
                                <Icon size={16} />
                            </div>
                            <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">{title}</h3>
                        </div>
                        <div className='grid grid-cols-2'>

                            <div className="mt-1">
                                <span className="text-3xl font-black text-slate-800 tracking-tight block">{value}</span>
                                <span className="text-sm font-bold text-slate-400 block mt-1">{subValue}</span>
                            </div>
                            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold">
                                {/* Logic adapted for Metric Growth vs Decline */}
                                <span className={`${isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'} flex items-center gap-1 px-2 py-0.5`}>
                                    {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                    {isPositive ? 'Tăng' : 'Giảm'}
                                </span>
                            </div>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
};

const UnitTile = ({ unit, onClick, isSelected }) => {
    const isPositive = unit.netTotal > 0;
    return (
        <div
            onClick={onClick}
            className={`relative p-2 border-2 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between h-24 group
        ${isSelected ? 'border-blue-600 bg-blue-50/10 z-10' : 'border-slate-100 bg-white hover:border-blue-300'}
      `}
        >
            <div className="flex justify-between items-start">
                <span className={`font-black text-sm uppercase ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{unit.code}</span>
                {isPositive && <div className="w-2 h-2 bg-emerald-500 rotate-45"></div>}
            </div>

            <div className="">
                <div className="flex justify-between items-end">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Biến Động</span>
                    <span className={`text-xl font-light ${isPositive ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}`}>
                        {unit.netTotal > 0 ? `+${unit.netTotal}` : unit.netTotal}
                    </span>
                </div>
                {/* Progress Bar Mini - Visualizing PTM contribution */}
                <div className="w-full bg-slate-100 h-1.5 mt-1 overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${Math.min((unit.ptmTotal / (unit.ptmTotal + unit.tlTotal || 1)) * 100, 100)}%` }}></div>
                    <div className="bg-red-500 h-full" style={{ width: `${Math.min((unit.tlTotal / (unit.ptmTotal + unit.tlTotal || 1)) * 100, 100)}%` }}></div>
                </div>
            </div>

            <div className="mt-0 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                <span>PTM: <b className="text-emerald-600">{unit.ptmTotal}</b></span>
                <span>Hủy: <b className="text-red-600">{unit.tlTotal}</b></span>
            </div>
        </div>
    );
};

const UNIT_DB = [
    { madv: "385", donvi: "VNPT Mỹ Tho", viettat: "MTO" },
    { madv: "386", donvi: "VNPT Cái Bè", viettat: "CBE" },
    { madv: "387", donvi: "VNPT Cai Lậy", viettat: "CLY" },
    { madv: "388", donvi: "VNPT Châu Thành", viettat: "CTH" },
    { madv: "389", donvi: "VNPT Chợ Gạo", viettat: "CGO" },
    { madv: "390", donvi: "VNPT Gò Công Tây", viettat: "GCT" },
    { madv: "391", donvi: "VNPT Gò Công", viettat: "GCG" },
    { madv: "393", donvi: "VNPT Tân Phước", viettat: "TPC" },
    { madv: "395", donvi: "VNPT Sa Đéc", viettat: "SDC" },
    { madv: "396", donvi: "VNPT Lai Vung", viettat: "LVG" },
    { madv: "397", donvi: "VNPT Cao Lãnh", viettat: "CLH" },
    { madv: "398", donvi: "VNPT Thanh Bình", viettat: "TBH" },
    { madv: "399", donvi: "VNPT Tam Nông", viettat: "TNG" },
    { madv: "400", donvi: "VNPT Hồng Ngự", viettat: "HNU" },
    { madv: "401", donvi: "VNPT Mỹ Thọ", viettat: "MTH" },
    { madv: "402", donvi: "VNPT Tháp Mười", viettat: "TMI" },
];
const getUnitInfo = (code) => {
    const unit = UNIT_DB.find(u => u.madv === String(code));
    return unit ? { name: unit.donvi, short: unit.viettat } : { name: `ĐV ${code}`, short: code };
};


export default function DashboardNetAdd() {
    const [rawData, setRawData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    // Filter & Sort State
    const [filterText, setFilterText] = useState('');
    const [sortKey, setSortKey] = useState('netTotal');
    const [sortDir, setSortDir] = useState('desc');
    const [filterStatus, setFilterStatus] = useState('all');

    // Chart View State
    const [chartView, setChartView] = useState('growth'); // 'growth' | 'decline'

    // Auto-refresh state
    const [refreshInterval, setRefreshInterval] = useState(0);
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

    // --- FETCH DATA ---
    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/database/chart-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // CUSTOM QUERY FOR Biến Động
                    customQuery: `SELECT THANG, NAM, Ma_DV, loaitb_id, SUM(PTM) AS PTM, SUM(KP) AS KHOIPHUC, SUM(HHD + hhd_tnnc + HHD_TNYC) AS THANHLY, SUM(TNYC) AS TAMNGUNG_YC, SUM(TNNC) AS TAMNGUNG_NC, SUM(DichChuyen) AS DICHCHUYEN, SUM(QuaHan) AS QUAHAN, SUM(dungthu) AS DUNGTHU, SUM(dungthu_dungthat) AS DUNGTHAT FROM GiamSat_PTM_TN_Huy_DichChuyen_ThucTang_CT where loaitb_id in (58, 61) AND THANG = ${month} AND NAM = ${year} GROUP BY THANG, NAM, Ma_DV, loaitb_id`,
                    connectionId: "696995af8b327930665802d3"
                })
            });
            const json = await res.json();
            if (json.success) {
                // Aggregating by Unit first
                const maxMap = {};

                json.data.forEach(d => {
                    const code = d.Ma_DV;
                    const unitInfo = getUnitInfo(code);

                    if (!maxMap[code]) {
                        maxMap[code] = {
                            id: code,
                            name: unitInfo.name,
                            code: unitInfo.short,
                            // Fiber
                            ptmFiber: 0, kpFiber: 0, tlFiber: 0, netFiber: 0,
                            tnycFiber: 0, tnncFiber: 0, quahanFiber: 0, dungthuFiber: 0, dungthatFiber: 0,
                            // MyTV
                            ptmMytv: 0, kpMytv: 0, tlMytv: 0, netMytv: 0,
                            tnycMytv: 0, tnncMytv: 0, quahanMytv: 0, dungthuMytv: 0, dungthatMytv: 0,
                            // Totals
                            ptmTotal: 0, kpTotal: 0, tlTotal: 0, netTotal: 0
                        };
                    }

                    const ptm = d.PTM || 0;
                    const kp = d.KHOIPHUC || 0;
                    const tl = d.THANHLY || 0;
                    const net = (ptm + kp) - tl;

                    const tnyc = d.TAMNGUNG_YC || 0;
                    const tnnc = d.TAMNGUNG_NC || 0;
                    const quahan = d.QUAHAN || 0;
                    const dungthu = d.DUNGTHU || 0;
                    const dungthat = d.DUNGTHAT || 0;

                    if (d.loaitb_id === 58) { // Fiber
                        maxMap[code].ptmFiber += ptm;
                        maxMap[code].kpFiber += kp;
                        maxMap[code].tlFiber += tl;
                        maxMap[code].netFiber += net;
                        maxMap[code].tnycFiber += tnyc;
                        maxMap[code].tnncFiber += tnnc;
                        maxMap[code].quahanFiber += quahan;
                        maxMap[code].dungthuFiber += dungthu;
                        maxMap[code].dungthatFiber += dungthat;
                    } else if (d.loaitb_id === 61) { // MyTV
                        maxMap[code].ptmMytv += ptm;
                        maxMap[code].kpMytv += kp;
                        maxMap[code].tlMytv += tl;
                        maxMap[code].netMytv += net;
                        maxMap[code].tnycMytv += tnyc;
                        maxMap[code].tnncMytv += tnnc;
                        maxMap[code].quahanMytv += quahan;
                        maxMap[code].dungthuMytv += dungthu;
                        maxMap[code].dungthatMytv += dungthat;
                    }

                    maxMap[code].ptmTotal += ptm;
                    maxMap[code].kpTotal += kp;
                    maxMap[code].tlTotal += tl;
                    maxMap[code].netTotal += net;
                });

                const transformedData = Object.values(maxMap);
                setRawData(transformedData);
                setSelectedUnit((prev: any) => {
                    if (transformedData.length === 0) return null;
                    if (prev) {
                        const found = transformedData.find((d: any) => d.id === prev.id);
                        return found || prev;
                    }
                    return transformedData[0];
                });
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    // Initial fetch
    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [fetchData]);

    // Auto-refresh timer
    useEffect(() => {
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }

        if (refreshInterval > 0) {
            refreshTimerRef.current = setInterval(() => {
                fetchData();
            }, refreshInterval * 1000);
        }

        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
            }
        };
    }, [refreshInterval, fetchData]);

    // --- LOGIC LỌC & SẮP XẾP ---
    const processedData = useMemo(() => {
        let data = [...rawData];

        // 1. Filter Text
        if (filterText) {
            const lower = filterText.toLowerCase();
            data = data.filter((d) => d.name.toLowerCase().includes(lower) || d.code.toLowerCase().includes(lower));
        }

        // 2. Filter Status (Biến Động Positive/Negative)
        if (filterStatus === 'achieved') { // Positive Growth
            data = data.filter((d) => d.netTotal > 0);
        } else if (filterStatus === 'not_reached') { // Negative Growth
            data = data.filter((d) => d.netTotal <= 0);
        }

        // 3. Sorting
        data.sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return data;
    }, [rawData, filterText, filterStatus, sortKey, sortDir]);

    // --- GLOBAL STATS ---
    const globalStats = useMemo(() => {
        if (rawData.length === 0) return {
            fiber: { ptm: 0, kp: 0, tl: 0, net: 0, tnyc: 0, tnnc: 0, quahan: 0, dungthu: 0, dungthat: 0 },
            mytv: { ptm: 0, kp: 0, tl: 0, net: 0, tnyc: 0, tnnc: 0, quahan: 0, dungthu: 0, dungthat: 0 }
        };
        return rawData.reduce((acc, curr) => ({
            fiber: {
                ptm: acc.fiber.ptm + curr.ptmFiber,
                kp: acc.fiber.kp + curr.kpFiber,
                tl: acc.fiber.tl + curr.tlFiber,
                net: acc.fiber.net + curr.netFiber,
                tnyc: acc.fiber.tnyc + curr.tnycFiber,
                tnnc: acc.fiber.tnnc + curr.tnncFiber,
                quahan: acc.fiber.quahan + curr.quahanFiber,
                dungthu: acc.fiber.dungthu + curr.dungthuFiber,
                dungthat: acc.fiber.dungthat + curr.dungthatFiber,
            },
            mytv: {
                ptm: acc.mytv.ptm + curr.ptmMytv,
                kp: acc.mytv.kp + curr.kpMytv,
                tl: acc.mytv.tl + curr.tlMytv,
                net: acc.mytv.net + curr.netMytv,
                tnyc: acc.mytv.tnyc + curr.tnycMytv,
                tnnc: acc.mytv.tnnc + curr.tnncMytv,
                quahan: acc.mytv.quahan + curr.quahanMytv,
                dungthu: acc.mytv.dungthu + curr.dungthuMytv,
                dungthat: acc.mytv.dungthat + curr.dungthatMytv,
            }
        }), {
            fiber: { ptm: 0, kp: 0, tl: 0, net: 0, tnyc: 0, tnnc: 0, quahan: 0, dungthu: 0, dungthat: 0 },
            mytv: { ptm: 0, kp: 0, tl: 0, net: 0, tnyc: 0, tnnc: 0, quahan: 0, dungthu: 0, dungthat: 0 }
        });
    }, [rawData]);

    // --- AVERAGE STATS FOR RADAR ---
    const avgStats = useMemo(() => {
        if (rawData.length === 0) return { ptmFiber: 0, ptmMytv: 0, kpFiber: 0, kpMytv: 0, tlFiber: 0, tlMytv: 0 };
        const count = rawData.length;
        return {
            ptmFiber: rawData.reduce((acc, curr) => acc + curr.ptmFiber, 0) / count,
            ptmMytv: rawData.reduce((acc, curr) => acc + curr.ptmMytv, 0) / count,
            kpFiber: rawData.reduce((acc, curr) => acc + curr.kpFiber, 0) / count,
            kpMytv: rawData.reduce((acc, curr) => acc + curr.kpMytv, 0) / count,
            tlFiber: rawData.reduce((acc, curr) => acc + curr.tlFiber, 0) / count,
            tlMytv: rawData.reduce((acc, curr) => acc + curr.tlMytv, 0) / count,
        };
    }, [rawData]);

    // --- RADAR DATA ---
    const radarData = useMemo(() => {
        if (!selectedUnit || !avgStats.ptmFiber) return [];

        const normalize = (val, avg) => avg > 0 ? (val / avg) * 100 : 0;

        return [
            { subject: 'PTM Fiber', A: normalize(selectedUnit.ptmFiber, avgStats.ptmFiber), B: 100, fullMark: 150 },
            { subject: 'PTM MyTV', A: normalize(selectedUnit.ptmMytv, avgStats.ptmMytv), B: 100, fullMark: 150 },
            { subject: 'KP Fiber', A: normalize(selectedUnit.kpFiber, avgStats.kpFiber), B: 100, fullMark: 150 },
            { subject: 'KP MyTV', A: normalize(selectedUnit.kpMytv, avgStats.kpMytv), B: 100, fullMark: 150 },
            { subject: 'Hủy Fiber', A: normalize(selectedUnit.tlFiber, avgStats.tlFiber), B: 100, fullMark: 150 },
            { subject: 'Hủy MyTV', A: normalize(selectedUnit.tlMytv, avgStats.tlMytv), B: 100, fullMark: 150 },
        ];
    }, [selectedUnit, avgStats]);

    // --- SERVICE MIX PIE ---
    const servicePieData = useMemo(() => {
        if (!selectedUnit) return [];
        return [
            { name: 'Fiber (PTM)', value: selectedUnit.ptmFiber, color: '#3b82f6' },
            { name: 'MyTV (PTM)', value: selectedUnit.ptmMytv, color: '#a855f7' },
        ].filter(d => d.value > 0);
    }, [selectedUnit]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <div className="text-slate-500 font-medium">Đang tải dữ liệu báo cáo...</div>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-screen w-full p-8 flex flex-col bg-slate-50 font-sans text-slate-800 ${isFullScreen ? 'fixed inset-0 z-[100]' : ''}`}>

            {/* HEADER */}
            <div className="bg-white border-b border-slate-200 shrink-0 shadow-sm">
                <div className="w-full px-2">
                    <div className="flex justify-between h-14 items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-700 text-white p-1.5 rounded-none shadow-sm">
                                <Wifi size={18} />
                            </div>
                            <div>
                                <h1 className="text-base font-black text-slate-900 tracking-tighter uppercase">{REPORT_META.title}</h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-600 border border-slate-200">
                                        <Calendar size={10} className="text-slate-400" />
                                        <span>Tháng</span>
                                        <select
                                            value={month}
                                            onChange={(e) => setMonth(parseInt(e.target.value))}
                                            className="bg-transparent outline-none text-blue-700 font-extrabold cursor-pointer hover:bg-slate-200 rounded px-1"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-600 border border-slate-200">
                                        <span>Năm</span>
                                        <select
                                            value={year}
                                            onChange={(e) => setYear(parseInt(e.target.value))}
                                            className="bg-transparent outline-none text-blue-700 font-extrabold cursor-pointer hover:bg-slate-200 rounded px-1"
                                        >
                                            <option value={2024}>2024</option>
                                            <option value={2025}>2025</option>
                                            <option value={2026}>2026</option>
                                            <option value={2027}>2027</option>
                                            <option value={2028}>2028</option>
                                            <option value={2029}>2029</option>
                                            <option value={2030}>2030</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-600 border border-slate-200">
                                        <Clock size={10} className="text-slate-400" />
                                        <select
                                            value={refreshInterval}
                                            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                                            className="bg-transparent outline-none text-blue-700 font-extrabold cursor-pointer hover:bg-slate-200 rounded px-1"
                                        >
                                            {REFRESH_INTERVALS.map(interval => (
                                                <option key={interval.value} value={interval.value}>{interval.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-none">
                            <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-3 py-1 text-[11px] font-bold uppercase transition-all rounded-none ${activeTab === 'overview' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <LayoutDashboard size={14} /> Toàn cảnh
                            </button>
                            <button onClick={() => setActiveTab('analysis')} className={`flex items-center gap-2 px-3 py-1 text-[11px] font-bold uppercase transition-all rounded-none ${activeTab === 'analysis' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <BarChart2 size={14} /> Phân tích
                            </button>
                            <button onClick={() => setActiveTab('map')} className={`flex items-center gap-2 px-3 py-1 text-[11px] font-bold uppercase transition-all rounded-none ${activeTab === 'map' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <MapIcon size={14} /> Bản đồ
                            </button>
                            <button
                                onClick={() => setIsFullScreen(!isFullScreen)}
                                title={isFullScreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                                className={`flex items-center justify-center w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border-l border-white`}
                            >
                                {isFullScreen ? <Minimize size={14} /> : <Maximize size={14} />}
                            </button>
                            <PermissionManager
                                dashboardId="net-add"
                                dashboardName="Chương trình Net Add"
                                trigger={
                                    <button
                                        className="flex items-center justify-center w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border-l border-white"
                                        title="Chia sẻ"
                                    >
                                        <Share2 size={14} />
                                    </button>
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 w-full">

                {/* 1. SECTION 1: FIBER INTERNET */}
                <div>
                    <h3 className="font-bold text-slate-600 mb-2 flex items-center gap-2 uppercase tracking-wide text-sm">
                        <Wifi size={14} className="text-blue-600" />
                        Dịch vụ Fiber Internet
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-2">
                        <StatCard
                            title="Biến Động FIBER"
                            value={(globalStats.fiber.net > 0 ? "+" : "") + globalStats.fiber.net.toLocaleString()}
                            subValue="Tăng trưởng"
                            percent={globalStats.fiber.net}
                            subLabel="Diễn giải"
                            icon={Activity} color={globalStats.fiber.net >= 0 ? "#10b981" : "#ef4444"}
                        />
                        <StatCard
                            title="PTM FIBER"
                            value={globalStats.fiber.ptm.toLocaleString()}
                            subValue="Thuê bao mới"
                            percent={100}
                            subLabel="Phân loại"
                            icon={TrendingUp} color="#3b82f6"
                        />
                        <StatCard
                            title="KHÔI PHỤC FIBER"
                            value={globalStats.fiber.kp.toLocaleString()}
                            subValue="Quay lại"
                            percent={100}
                            subLabel="Phân loại"
                            icon={RefreshCcw} color="#8b5cf6"
                        />
                        <StatCard
                            title="THANH LÝ FIBER"
                            value={globalStats.fiber.tl.toLocaleString()}
                            subValue="Rời mạng"
                            percent={-100}
                            subLabel="Phân loại"
                            icon={XCircle} color="#ef4444"
                        />
                        <StatCard
                            title="TẠM NGƯNG"
                            value={(globalStats.fiber.tnyc + globalStats.fiber.tnnc).toLocaleString()}
                            subValue={`YC: ${globalStats.fiber.tnyc} - NC: ${globalStats.fiber.tnnc}`}
                            percent={0}
                            subLabel="Chi tiết"
                            icon={PauseCircle} color="#f59e0b"
                        />
                        <StatCard
                            title="LẮP ĐẶT QUÁ HẠN"
                            value={globalStats.fiber.quahan.toLocaleString()}
                            subValue="Lắp đặt quá hạn"
                            percent={-10}
                            subLabel="Trạng thái"
                            icon={Clock} color="#ef4444"
                        />
                        <StatCard
                            title="DÙNG THẬT / DÙNG THỬ"
                            value={`${globalStats.fiber.dungthat.toLocaleString()} / ${globalStats.fiber.dungthu.toLocaleString()}`}
                            subValue={`Tỷ lệ thật: ${globalStats.fiber.dungthat + globalStats.fiber.dungthu > 0 ? Math.round(globalStats.fiber.dungthat * 100 / (globalStats.fiber.dungthat + globalStats.fiber.dungthu)) : 0}%`}
                            percent={100}
                            subLabel="Hiệu quả"
                            icon={UserCheck} color="#10b981"
                        />
                    </div>
                </div>

                {/* 2. SECTION 2: MYTV */}
                <div className="mt-6">
                    <h3 className="font-bold text-slate-600 mb-2 flex items-center gap-2 uppercase tracking-wide text-sm">
                        <Tv size={14} className="text-purple-600" />
                        Dịch vụ Truyền hình MyTV
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4  lg:grid-cols-7 gap-2 mb-2">
                        <StatCard
                            title="Biến Động MYTV"
                            value={(globalStats.mytv.net > 0 ? "+" : "") + globalStats.mytv.net.toLocaleString()}
                            subValue="Tăng trưởng"
                            percent={globalStats.mytv.net}
                            subLabel="Diễn giải"
                            icon={Activity} color={globalStats.mytv.net >= 0 ? "#10b981" : "#ef4444"}
                        />
                        <StatCard
                            title="PTM MYTV"
                            value={globalStats.mytv.ptm.toLocaleString()}
                            subValue="Thuê bao mới"
                            percent={100}
                            subLabel="Phân loại"
                            icon={TrendingUp} color="#8b5cf6"
                        />
                        <StatCard
                            title="KHÔI PHỤC MYTV"
                            value={globalStats.mytv.kp.toLocaleString()}
                            subValue="Quay lại"
                            percent={100}
                            subLabel="Phân loại"
                            icon={RefreshCcw} color="#a855f7"
                        />
                        <StatCard
                            title="THANH LÝ MYTV"
                            value={globalStats.mytv.tl.toLocaleString()}
                            subValue="Rời mạng"
                            percent={-100}
                            subLabel="Phân loại"
                            icon={XCircle} color="#ef4444"
                        />

                        <StatCard
                            title="TẠM NGƯNG"
                            value={(globalStats.mytv.tnyc + globalStats.mytv.tnnc).toLocaleString()}
                            subValue={`YC: ${globalStats.mytv.tnyc} - NC: ${globalStats.mytv.tnnc}`}
                            percent={0}
                            subLabel="Chi tiết"
                            icon={PauseCircle} color="#f59e0b"
                        />
                        <StatCard
                            title="LẮP ĐẶT QUÁ HẠN"
                            value={globalStats.mytv.quahan.toLocaleString()}
                            subValue="Lắp đặt quá hạn"
                            percent={-10}
                            subLabel="Trạng thái"
                            icon={Clock} color="#ef4444"
                        />
                        <StatCard
                            title="DÙNG THẬT / DÙNG THỬ"
                            value={`${globalStats.mytv.dungthat.toLocaleString()} / ${globalStats.mytv.dungthu.toLocaleString()}`}
                            subValue={`Tỷ lệ thật: ${globalStats.mytv.dungthat + globalStats.mytv.dungthu > 0 ? Math.round(globalStats.mytv.dungthat * 100 / (globalStats.mytv.dungthat + globalStats.mytv.dungthu)) : 0}%`}
                            percent={100}
                            subLabel="Hiệu quả"
                            icon={UserCheck} color="#10b981"
                        />
                    </div>
                </div>

                {/* 2. TOOLBAR (FILTER & SORT) */}
                <div className="bg-white border border-slate-200 p-2 shadow-sm flex flex-col md:flex-row justify-between items-center gap-2 sticky top-0 z-20">
                    <div className="relative w-full md:w-64">
                        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text" placeholder="Tìm đơn vị..."
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 focus:border-blue-500 focus:ring-0 rounded-none bg-slate-50 focus:bg-white transition-colors outline-none"
                            value={filterText} onChange={(e) => setFilterText(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                        <div className="flex bg-slate-100 p-1 rounded-none">
                            <button onClick={() => setFilterStatus('all')} className={`px-3 py-1.5 text-sm font-bold ${filterStatus === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Tất cả</button>
                            <button onClick={() => setFilterStatus('achieved')} className={`px-3 py-1.5 text-sm font-bold ${filterStatus === 'achieved' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}>Tăng trưởng (+)</button>
                            <button onClick={() => setFilterStatus('not_reached')} className={`px-3 py-1.5 text-sm font-bold ${filterStatus === 'not_reached' ? 'bg-white shadow text-red-700' : 'text-slate-500'}`}>Suy giảm (-)</button>
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-400 uppercase mr-1">Sắp xếp:</span>
                            <select
                                className="text-sm border border-slate-300 py-1.5 px-3 bg-white outline-none focus:border-blue-500"
                                value={sortKey} onChange={(e) => setSortKey(e.target.value)}
                            >
                                <option value="netTotal">Biến Động Tổng</option>
                                <option value="ptmTotal">Tổng PTM</option>
                                <option value="tlTotal">Tổng Hủy</option>
                                <option value="name">Tên đơn vị</option>
                            </select>
                            <button onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')} className="p-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600">
                                {sortDir === 'desc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. DYNAMIC CONTENT */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* LEFT: RANKING CHART */}
                        <div className="lg:col-span-2 bg-white p-5 border border-slate-200 shadow-sm h-[300px] flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-blue-600" />
                                    Xếp hạng
                                </h2>
                                <div className="flex gap-2 text-sm font-bold">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-indigo-500"></div> Net Fiber</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500"></div> Net MyTV</span>
                                </div>
                            </div>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={processedData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="code" tick={{ fontSize: 10, fontWeight: 'bold' }} interval={0} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip contentStyle={{ borderRadius: 0, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f1f5f9' }} />
                                        <ReferenceLine y={0} stroke="#000" />
                                        <Bar dataKey="netFiber" name="Net Fiber" fill="#3033ffff" barSize={14} radius={[2, 2, 0, 0]} onClick={(data) => setSelectedUnit(data)}>
                                            <LabelList dataKey="netFiber" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#222222' }} />
                                        </Bar>
                                        <Bar dataKey="netMytv" name="Net MyTV" fill="#ff8800ff" barSize={14} radius={[2, 2, 0, 0]} onClick={(data) => setSelectedUnit(data)}>
                                            <LabelList dataKey="netMytv" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#222222' }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* RIGHT: UNIT DETAIL (RADAR) */}
                        <div className="bg-white p-5 shadow-lg border-t-4 border-blue-500 flex flex-col border border-slate-200">
                            {selectedUnit ? (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h2 className="font-bold text-lg text-slate-800">{selectedUnit.name}</h2>
                                            <span className="text-sm bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono border border-slate-200">{selectedUnit.code}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-3xl font-black ${selectedUnit.netTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {selectedUnit.netTotal > 0 ? '+' : ''}{selectedUnit.netTotal}
                                            </div>
                                            <div className="text-[10px] uppercase text-slate-500">Tổng Biến Động</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mt-6">
                                        {/* FIBER STATS */}
                                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                            <h4 className="text-sm font-bold text-blue-600 uppercase mb-2 flex justify-between">
                                                <span>Fiber Internet</span>
                                                <span className={selectedUnit.netFiber >= 0 ? 'text-emerald-600' : 'text-red-600'}>Net: {selectedUnit.netFiber}</span>
                                            </h4>
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div><div className="text-sm font-bold text-slate-700">{selectedUnit.ptmFiber}</div><div className="text-sm text-slate-500">PTM</div></div>
                                                <div><div className="text-sm font-bold text-slate-700">{selectedUnit.kpFiber}</div><div className="text-sm text-slate-500">KP</div></div>
                                                <div><div className="text-sm font-bold text-red-500">{selectedUnit.tlFiber}</div><div className="text-sm text-slate-500">Hủy</div></div>
                                            </div>
                                        </div>

                                        {/* MYTV STATS */}
                                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                            <h4 className="text-sm font-bold text-purple-600 uppercase mb-2 flex justify-between">
                                                <span>MyTV Truyền hình</span>
                                                <span className={selectedUnit.netMytv >= 0 ? 'text-emerald-600' : 'text-red-600'}>Net: {selectedUnit.netMytv}</span>
                                            </h4>
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div><div className="text-sm font-bold text-slate-700">{selectedUnit.ptmMytv}</div><div className="text-sm text-slate-500">PTM</div></div>
                                                <div><div className="text-sm font-bold text-slate-700">{selectedUnit.kpMytv}</div><div className="text-sm text-slate-500">KP</div></div>
                                                <div><div className="text-sm font-bold text-red-500">{selectedUnit.tlMytv}</div><div className="text-sm text-slate-500">Hủy</div></div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">
                                    Chọn một đơn vị để xem chi tiết
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. ANALYSIS TAB CONTENT */}
                {activeTab === 'analysis' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* SCATTER CHART */}
                        <div className="lg:col-span-2 bg-white p-5 border border-slate-200 shadow-sm">
                            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Target size={18} className="text-red-500" />
                                Phân tích Tương quan PTM và Hủy
                            </h2>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" dataKey="ptmTotal" name="Tổng PTM" label={{ value: 'Tổng Phát Triển Mới', position: 'bottom', offset: 0 }} />
                                        <YAxis type="number" dataKey="tlTotal" name="Tổng Hủy" label={{ value: 'Tổng Thanh Lý', angle: -90, position: 'insideLeft' }} />
                                        <ZAxis type="number" dataKey="netTotal" range={[60, 600]} name="Biến Động" />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }}
                                            content={({ payload }) => {
                                                if (payload && payload.length) {
                                                    const { name, ptmTotal, tlTotal, netTotal } = payload[0].payload;
                                                    return (
                                                        <div className="bg-slate-800 text-white p-2 text-sm rounded shadow-lg">
                                                            <p className="font-bold">{name}</p>
                                                            <p className="text-emerald-300">PTM: {ptmTotal}</p>
                                                            <p className="text-red-300">Hủy: {tlTotal}</p>
                                                            <p className="font-bold border-t border-slate-600 mt-1 pt-1">Net: {netTotal}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Scatter name="Units" data={processedData} fill="#3b82f6" onClick={(data) => setSelectedUnit(data)}>
                                            <LabelList dataKey="code" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b' }} />
                                            {processedData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.netTotal >= 0 ? '#10b981' : '#ef4444'} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* RADAR & PIE - UNIT DETAIL */}
                        <div className="bg-white p-5 border border-slate-200 shadow-sm flex flex-col">
                            {selectedUnit ? (
                                <>
                                    <div className="mb-4 pb-4 border-b border-slate-100">
                                        <h2 className="font-bold text-lg text-slate-800">{selectedUnit.name}</h2>
                                        <div className="flex gap-4 mt-2 text-sm">
                                            <div className="text-emerald-600 font-bold">PTM: {selectedUnit.ptmTotal}</div>
                                            <div className="text-red-600 font-bold">Hủy: {selectedUnit.tlTotal}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 overflow-y-auto">
                                        {/* Radar */}
                                        <div className="h-60 relative w-full">
                                            <h4 className="text-sm font-bold text-slate-400 uppercase text-center mb-2">So sánh với TRUNG BÌNH</h4>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                                    <PolarGrid stroke="#e2e8f0" />
                                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                                                    <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                                                    <Radar name={selectedUnit.name} dataKey="A" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.3} />
                                                    <Radar name="Trung bình" dataKey="B" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" fill="transparent" />
                                                    <Tooltip />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Pie */}
                                        <div className="h-40 mt-4 pt-4 border-t border-slate-100">
                                            <h4 className="text-sm font-bold text-slate-400 uppercase text-center mb-2">Tỷ trọng PTM Fiber / MyTV</h4>
                                            <div className="flex items-center h-full">
                                                <div className="w-1/2 h-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie data={servicePieData} innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">
                                                                {servicePieData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                <div className="w-1/2 text-[10px] space-y-1">
                                                    {servicePieData.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between">
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-2 h-2" style={{ backgroundColor: item.color }}></div>
                                                                <span className="text-slate-500">{item.name}</span>
                                                            </div>
                                                            <span className="font-bold">{item.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 italic text-sm">
                                    Chọn đơn vị từ biểu đồ bên trái
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 5. MAP TAB CONTENT */}
                {activeTab === 'map' && (
                    <div className="bg-white p-5 border border-slate-200 shadow-sm h-[400px] relative">
                        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 absolute top-5 left-5 z-10 bg-white/80 backdrop-blur-sm p-2 rounded shadow-sm">
                            <MapIcon size={18} className="text-emerald-500" />
                            Bản đồ Biến Động Thuê Bao
                        </h2>
                        <MapChart
                            data={processedData}
                            config={{
                                id: 'map-chart-net-add',
                                name: 'Bản đồ Net Add',
                                type: 'map',
                                dataSource: {
                                    xAxis: 'code',
                                    yAxis: ['netTotal', 'netFiber', 'netMytv'],
                                    table: '',
                                    aggregation: 'sum'
                                },
                                style: {
                                    yAxisFieldLabels: {
                                        'netTotal': 'Tổng Net Add',
                                        'netFiber': 'Net Add Fiber',
                                        'netMytv': 'Net Add MyTV'
                                    },
                                    mapColorScheme: 'signal',
                                    mapDisplayMode: 'heatmap',
                                    tooltipTheme: 'light'
                                }
                            }}
                            height="100%"
                        />
                    </div>
                )}

                {/* 5. TILE GRID */}
                <div className="bg-white border border-slate-200 shadow-sm p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <Grid size={18} className="text-slate-500" />
                            Danh sách Đơn vị ({processedData.length})
                        </h2>
                    </div>
                    {processedData.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                            {processedData.map(unit => (
                                <UnitTile
                                    key={unit.id}
                                    unit={unit}
                                    isSelected={selectedUnit?.id === unit.id}
                                    onClick={() => setSelectedUnit(unit)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-400 italic bg-slate-50">
                            Không tìm thấy dữ liệu phù hợp với bộ lọc.
                        </div>
                    )}
                </div>

            </div>
        </div >
    );
}