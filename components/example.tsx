import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, ReferenceLine,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  LayoutDashboard, TrendingUp, Users, Tv, Wifi, Router,
  Activity, Grid, Search, Filter,
  ArrowUpDown, ChevronDown, ChevronUp, Target, AlertCircle,
  BarChart2, List, CheckCircle, XCircle, Map as MapIcon, Maximize, Minimize, Calendar
} from 'lucide-react';
import { MapChart } from './charts/MapChart.lazy';
import { LabelList } from 'recharts';

// --- DỮ LIỆU TỪ XML (Metadata still static for now mostly) ---
const REPORT_META = {
  title: "DASHBOARD PHÁT TRIỂN MỚI BĂNG RỘNG",
  lastUpdated: new Date().toLocaleString('vi-VN')
};

// --- CHART COMPONENTS ---

// ANGULAR GAUGE CHART (SVG)
// Vẽ đồng hồ bán nguyệt nhưng với style vuông vức, đầu kim nhọn
const AngularGauge = ({ value, color, size = 120 }) => {
  // Giới hạn giá trị hiển thị từ 0-100 trên đồng hồ, nhưng số liệu text vẫn hiển thị thực tế
  const percent = Math.min(Math.max(value, 0), 100);
  const radius = size / 2;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth;
  const circumference = normalizedRadius * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  // Tính toán góc cho kim chỉ (Needle)
  // 0% = -90deg (9h), 100% = 90deg (3h) -> nhưng trong SVG start từ 3h là 0deg
  // Ta cần mapping: 0% -> 180deg (left), 100% -> 0deg (right) theo chiều kim đồng hồ là ngược lại
  const rotation = -180 + (percent / 100) * 180;

  return (
    <div className="relative flex flex-col items-center justify-end" style={{ width: size, height: size / 1.8 }}>
      <svg height={size / 2} width={size} viewBox={`0 0 ${size} ${size / 2}`} className="overflow-visible">
        {/* Background Arc */}
        <path
          d={`M ${strokeWidth},${radius} A ${normalizedRadius},${normalizedRadius} 0 0 1 ${size - strokeWidth},${radius}`}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          strokeLinecap="butt" // Đầu vuông cho cảm giác góc cạnh
        />
        {/* Progress Arc */}
        <path
          d={`M ${strokeWidth},${radius} A ${normalizedRadius},${normalizedRadius} 0 0 1 ${size - strokeWidth},${radius}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="butt" // Đầu vuông
          className="transition-all duration-1000 ease-out"
        />

        {/* Needle (Triangle Shape) */}
        <g transform={`translate(${radius}, ${radius}) rotate(${rotation})`}>
          {/* Kim hình tam giác nhọn */}
          <polygon points="-4,-10 0,-radius 4,-10" fill="#1e293b" transform={`scale(${size / 100}) translate(0, -${normalizedRadius - 15})`} />
          {/* Tâm kim */}
          <circle cx="0" cy="0" r="4" fill="#1e293b" />
        </g>
      </svg>

      {/* Value Text Overlay */}
      <div className="absolute bottom-0 text-center">
        <span className="text-2xl font-black tracking-tighter" style={{ color: color }}>
          {value}%
        </span>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subValue, percent, icon: Icon, color }) => (
  <div className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-none group relative overflow-hidden">
    {/* Decorative corner accent */}
    <div className="absolute top-0 right-0 w-0 h-0 border-l-[40px] border-l-transparent border-t-[40px]" style={{ borderTopColor: color, opacity: 0.1 }}></div>

    <div className="p-5 flex justify-between items-center h-full">
      <div className="flex-1 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-none bg-slate-100 text-slate-600`}>
              <Icon size={16} />
            </div>
            <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">{title}</h3>
          </div>
          <div className="mt-1">
            <span className="text-3xl font-black text-slate-800 tracking-tight block">{value}</span>
            <span className="text-xs font-bold text-slate-400 block mt-1">KH: {subValue}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1 text-[10px] font-bold">
          {percent >= 100 ? (
            <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5"><CheckCircle size={10} /> Đạt KH</span>
          ) : (
            <span className="text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5"><AlertCircle size={10} /> Cần nỗ lực</span>
          )}
        </div>
      </div>

      {/* Gauge Integration */}
      <div className="ml-2 pt-2">
        <AngularGauge value={percent} color={percent >= 100 ? '#10b981' : color} size={150} />
      </div>
    </div>
  </div>
);

const UnitTile = ({ unit, onClick, isSelected }) => {
  const isHigh = unit.pctFiber >= 100;
  return (
    <div
      onClick={onClick}
      className={`relative p-3 border-2 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between h-28 group
        ${isSelected ? 'border-blue-600 bg-blue-50/10 z-10' : 'border-slate-100 bg-white hover:border-blue-300'}
      `}
    >
      <div className="flex justify-between items-start">
        <span className={`font-black text-sm uppercase ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{unit.code}</span>
        {isHigh && <div className="w-2 h-2 bg-emerald-500 rotate-45"></div>} {/* Diamond shape */}
      </div>

      <div className="mt-2">
        <div className="flex justify-between items-end">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Fiber</span>
          <span className={`text-xl font-light ${isHigh ? 'text-emerald-600 font-bold' : 'text-slate-800'}`}>{unit.pctFiber}%</span>
        </div>
        {/* Progress Bar Mini */}
        <div className="w-full bg-slate-100 h-1.5 mt-1 overflow-hidden">
          <div className={`h-full ${isHigh ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(unit.pctFiber, 100)}%` }}></div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
        <span>TH: <b>{unit.actFiber}</b></span>
        <span>KH: {unit.planFiber}</span>
      </div>
    </div>
  );
};

// --- MAIN DASHBOARD ---

export default function UltimateDashboard() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'analysis'
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Filter & Sort State
  const [filterText, setFilterText] = useState('');
  const [sortKey, setSortKey] = useState('pctFiber'); // 'pctFiber', 'totalAct', 'name'
  const [sortDir, setSortDir] = useState('desc'); // 'asc', 'desc'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'achieved', 'not_reached'

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/database/chart-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customQuery: `EXEC sp_rpt_ThongKe_PTM_Theo_C2 ${month}, ${year}`,
            connectionId: "696995af8b327930665802d3"
          })
        });
        const json = await res.json();
        if (json.success) {
          // Transform API data to internal format
          const transformedData = json.data.map((d: any) => ({
            id: d.Ma_DV,
            name: d.Ten_DV,
            code: d.TenTat,
            planFiber: d.KeHoach_Fiber,
            actFiber: d.Fiber_PTM,
            planMyTV: d.KeHoach_MyTV,
            actMyTV: d.MyTV_PTM,
            planMC: d.KeHoach_MeshCam,
            actMC: d.MeshCam_PTM,
            channel_kt: d.CTV_NVKT,
            channel_kd: d.CTV_NVKD,
            channel_gdv: d.CTV_GDV,

            // Calculated metrics
            pctFiber: parseFloat((d.Fiber_PTM / (d.KeHoach_Fiber || 1) * 100).toFixed(1)),
            pctMyTV: parseFloat((d.MyTV_PTM / (d.KeHoach_MyTV || 1) * 100).toFixed(1)),
            pctMC: parseFloat((d.MeshCam_PTM / (d.KeHoach_MeshCam || 1) * 100).toFixed(1)),
            totalAct: d.Fiber_PTM + d.MyTV_PTM + d.MeshCam_PTM,
            contributionScore: d.Fiber_PTM + d.MyTV_PTM
          }));
          setRawData(transformedData);
          if (transformedData.length > 0 && !selectedUnit) {
            setSelectedUnit(transformedData[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    fetchData();
  }, [month, year]);

  // --- LOGIC LỌC & SẮP XẾP ---
  const processedData = useMemo(() => {
    let data = [...rawData];

    // 1. Filter Text
    if (filterText) {
      const lower = filterText.toLowerCase();
      data = data.filter((d: any) => d.name.toLowerCase().includes(lower) || d.code.toLowerCase().includes(lower));
    }

    // 2. Filter Status (theo Fiber)
    if (filterStatus === 'achieved') {
      data = data.filter((d: any) => d.pctFiber >= 100);
    } else if (filterStatus === 'not_reached') {
      data = data.filter((d: any) => d.pctFiber < 100);
    }

    // 3. Sorting
    data.sort((a: any, b: any) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      // Handle string sort
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

  // --- GLOBAL STATS CALCULATION ---
  const globalStats = useMemo(() => {
    if (rawData.length === 0) return {
      fiber: { plan: 0, actual: 0, percent: 0 },
      mytv: { plan: 0, actual: 0, percent: 0 },
      meshCam: { plan: 0, actual: 0, percent: 0 }
    };

    const fiberPlan = rawData.reduce((acc, curr: any) => acc + curr.planFiber, 0);
    const fiberAct = rawData.reduce((acc, curr: any) => acc + curr.actFiber, 0);

    const mytvPlan = rawData.reduce((acc, curr: any) => acc + curr.planMyTV, 0);
    const mytvAct = rawData.reduce((acc, curr: any) => acc + curr.actMyTV, 0);

    const mcPlan = rawData.reduce((acc, curr: any) => acc + curr.planMC, 0);
    const mcAct = rawData.reduce((acc, curr: any) => acc + curr.actMC, 0);

    return {
      fiber: { plan: fiberPlan, actual: fiberAct, percent: parseFloat(((fiberAct / fiberPlan) * 100).toFixed(2)) },
      mytv: { plan: mytvPlan, actual: mytvAct, percent: parseFloat(((mytvAct / mytvPlan) * 100).toFixed(2)) },
      meshCam: { plan: mcPlan, actual: mcAct, percent: parseFloat(((mcAct / mcPlan) * 100).toFixed(2)) }
    };
  }, [rawData]);

  const avgStats = useMemo(() => {
    if (rawData.length === 0) return { pctFiber: 0, pctMyTV: 0, pctMC: 0, totalAct: 0 };
    return {
      pctFiber: rawData.reduce((acc, curr: any) => acc + curr.pctFiber, 0) / rawData.length,
      pctMyTV: rawData.reduce((acc, curr: any) => acc + curr.pctMyTV, 0) / rawData.length,
      pctMC: rawData.reduce((acc, curr: any) => acc + curr.pctMC, 0) / rawData.length,
      totalAct: rawData.reduce((acc, curr: any) => acc + curr.totalAct, 0) / rawData.length,
    };
  }, [rawData]);

  // Chart Data Preparation
  const radarData = useMemo(() => {
    if (!selectedUnit) return [];
    return [
      { subject: 'Fiber %', A: selectedUnit.pctFiber, B: avgStats.pctFiber, fullMark: 150 },
      { subject: 'MyTV %', A: selectedUnit.pctMyTV, B: avgStats.pctMyTV, fullMark: 150 },
      { subject: 'Mesh/Cam %', A: selectedUnit.pctMC, B: avgStats.pctMC, fullMark: 150 },
      { subject: 'Thị phần', A: (selectedUnit.totalAct / avgStats.totalAct || 1) * 100, B: 100, fullMark: 200 }, // Mock thị phần using relative volume
      { subject: 'Năng suất', A: (selectedUnit.channel_kd + selectedUnit.channel_kt > 0) ? (selectedUnit.totalAct / (selectedUnit.channel_kd + selectedUnit.channel_kt) * 20) : 0, B: 50, fullMark: 100 },
    ];
  }, [selectedUnit, avgStats]);

  const serviceMixData = useMemo(() => {
    if (!selectedUnit) return [];
    return [
      { name: 'Fiber', value: selectedUnit.actFiber, color: '#3b82f6' },
      { name: 'MyTV', value: selectedUnit.actMyTV, color: '#8b5cf6' },
      { name: 'Mesh/Cam', value: selectedUnit.actMC, color: '#10b981' },
    ];
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
    <div className={`min-h-screen bg-slate-50 font-sans text-slate-800 pb-10 ${isFullScreen ? 'fixed inset-0 z-50 overflow-auto' : ''}`}>

      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-700 text-white p-2 rounded-none shadow-sm">
                <Activity size={20} />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase">{REPORT_META.title}</h1>
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
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-none">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase transition-all rounded-none ${activeTab === 'overview' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutDashboard size={14} /> Toàn cảnh
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase transition-all rounded-none ${activeTab === 'analysis' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <BarChart2 size={14} /> Phân tích
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase transition-all rounded-none ${activeTab === 'map' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <MapIcon size={14} /> Bản đồ
              </button>
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                className={`flex items-center justify-center w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border-l border-white`}
              >
                {isFullScreen ? <Minimize size={14} /> : <Maximize size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* 1. GLOBAL KPI CARDS (ANGULAR GAUGE) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Fiber Internet"
            value={globalStats.fiber.actual.toLocaleString()}
            subValue={globalStats.fiber.plan.toLocaleString()}
            percent={globalStats.fiber.percent}
            icon={Wifi} color="#2563eb"
          />
          <StatCard
            title="Truyền hình MyTV"
            value={globalStats.mytv.actual.toLocaleString()}
            subValue={globalStats.mytv.plan.toLocaleString()}
            percent={globalStats.mytv.percent}
            icon={Tv} color="#7c3aed"
          />
          <StatCard
            title="Mesh & Camera"
            value={globalStats.meshCam.actual.toLocaleString()}
            subValue={globalStats.meshCam.plan.toLocaleString()}
            percent={globalStats.meshCam.percent}
            icon={Router} color="#059669"
          />
        </div>

        {/* 2. TOOLBAR (FILTER & SORT) */}
        <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 sticky top-16 z-20">
          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm đơn vị..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 focus:border-blue-500 focus:ring-0 rounded-none bg-slate-50 focus:bg-white transition-colors outline-none"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            {/* Status Filter */}
            <div className="flex bg-slate-100 p-1 rounded-none">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 text-xs font-bold ${filterStatus === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
              >Tất cả</button>
              <button
                onClick={() => setFilterStatus('achieved')}
                className={`px-3 py-1.5 text-xs font-bold ${filterStatus === 'achieved' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}
              >Đạt KH</button>
              <button
                onClick={() => setFilterStatus('not_reached')}
                className={`px-3 py-1.5 text-xs font-bold ${filterStatus === 'not_reached' ? 'bg-white shadow text-amber-700' : 'text-slate-500'}`}
              >Chưa đạt</button>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase mr-1">Sắp xếp:</span>
              <select
                className="text-sm border border-slate-300 py-1.5 px-3 bg-white outline-none focus:border-blue-500"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
              >
                <option value="pctFiber">% Fiber</option>
                <option value="actFiber">Sản lượng Fiber</option>
                <option value="totalAct">Tổng PTM</option>
                <option value="name">Tên đơn vị</option>
              </select>
              <button
                onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600"
              >
                {sortDir === 'desc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* 3. DYNAMIC CONTENT */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT: RANKING CHART (Updated with processed data) */}
            <div className="lg:col-span-2 bg-white p-5 border border-slate-200 shadow-sm h-[500px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-500" />
                  Xếp hạng Hiệu quả (Fiber & MyTV)
                </h2>
                <div className="flex gap-2 text-xs font-bold">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500"></div> Fiber</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500"></div> MyTV</span>
                </div>
              </div>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={(() => {
                      if (processedData.length <= 10) return processedData;
                      const top5 = processedData.slice(0, 5);
                      const bottom5 = processedData.slice(-5);
                      // Add a separator object if needed, or just combine. 
                      // For a clean chart, we can just combine.
                      return [...top5, ...bottom5];
                    })()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="code" tick={{ fontSize: 10, fontWeight: 'bold' }} interval={0} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 0, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: '#f1f5f9' }}
                    />
                    <Bar dataKey="actFiber" name="Fiber" fill="#3b82f6" barSize={12} radius={[2, 2, 0, 0]} onClick={(data) => setSelectedUnit(data)}>
                      <LabelList dataKey="actFiber" position="top" style={{ fontSize: '9px', fill: '#64748b' }} />
                    </Bar>
                    <Bar dataKey="actMyTV" name="MyTV" fill="#8b5cf6" barSize={12} radius={[2, 2, 0, 0]} onClick={(data) => setSelectedUnit(data)}>
                      <LabelList dataKey="actMyTV" position="top" style={{ fontSize: '9px', fill: '#64748b' }} />
                    </Bar>
                    <Line type="monotone" dataKey="planFiber" stroke="#fbbf24" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                  </ComposedChart>
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
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono border border-slate-200">{selectedUnit.code}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-blue-600">{selectedUnit.totalAct}</div>
                      <div className="text-[10px] uppercase text-slate-500">Tổng PTM</div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[250px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                        <Radar
                          name={selectedUnit.name}
                          dataKey="A"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="#3b82f6"
                          fillOpacity={0.6}
                        />
                        <Radar
                          name="TB Tỉnh"
                          dataKey="B"
                          stroke="#94a3b8"
                          strokeWidth={1}
                          strokeDasharray="4 4"
                          fill="#94a3b8"
                          fillOpacity={0.1}
                        />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#1e293b' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Service Mix Donut */}
                  <div className="h-32 mt-4 border-t border-slate-100 pt-3 flex items-center">
                    <div className="w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={serviceMixData}
                            innerRadius={25}
                            outerRadius={40}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {serviceMixData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', fontSize: '10px', color: '#1e293b' }} itemStyle={{ color: '#1e293b' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 text-[10px] space-y-1.5">
                      <p className="text-slate-400 uppercase font-bold mb-1 border-b border-slate-700 pb-1">Cơ cấu dịch vụ</p>
                      {serviceMixData.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2" style={{ backgroundColor: item.color }}></div>
                            <span className="text-slate-300">{item.name}</span>
                          </div>
                          <span className="font-bold">{item.value}</span>
                        </div>
                      ))}
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

        {/* 4. ANALYSIS TAB CONTENT (Alternative View) */}
        {activeTab === 'analysis' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 border border-slate-200 shadow-sm">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Target size={18} className="text-red-500" />
                Ma trận Hiệu quả
              </h2>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="pctFiber" name="Fiber %" unit="%" domain={['auto', 'auto']} label={{ value: 'Fiber %', position: 'bottom', offset: 0 }} />
                    <YAxis type="number" dataKey="pctMyTV" name="MyTV %" unit="%" domain={['auto', 'auto']} label={{ value: 'MyTV %', angle: -90, position: 'insideLeft' }} />
                    <ZAxis type="number" dataKey="totalAct" range={[60, 600]} name="Tổng PTM" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }}
                      content={({ payload }) => {
                        if (payload && payload.length) {
                          const { name, pctFiber, pctMyTV, totalAct } = payload[0].payload;
                          return (
                            <div className="bg-slate-800 text-white p-2 text-xs rounded shadow-lg">
                              <p className="font-bold">{name}</p>
                              <p>Fiber: {pctFiber}%</p>
                              <p>MyTV: {pctMyTV}%</p>
                              <p>Vol: {totalAct}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine x={100} stroke="#22c55e" strokeDasharray="3 3" />
                    <ReferenceLine y={100} stroke="#8b5cf6" strokeDasharray="3 3" />
                    <Scatter name="Units" data={processedData} fill="#3b82f6" onClick={(data) => {
                      setSelectedUnit(data);
                      setActiveTab('overview'); // Switch back to see detail
                    }}>
                      {processedData.map((entry, index) => (
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
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="code" tick={{ fontSize: 10, fontWeight: 'bold' }} width={30} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="channel_kt" name="NVKT" stackId="a" fill="#0ea5e9">
                      <LabelList dataKey="channel_kt" position="center" style={{ fontSize: '9px', fill: '#fff' }} />
                    </Bar>
                    <Bar dataKey="channel_kd" name="NVKD" stackId="a" fill="#6366f1">
                      <LabelList dataKey="channel_kd" position="center" style={{ fontSize: '9px', fill: '#fff' }} />
                    </Bar>
                    <Bar dataKey="channel_gdv" name="GDV" stackId="a" fill="#10b981">
                      <LabelList dataKey="channel_gdv" position="center" style={{ fontSize: '9px', fill: '#fff' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 6. MAP TAB CONTENT */}
        {activeTab === 'map' && (
          <div className="bg-white p-5 border border-slate-200 shadow-sm h-[600px] relative">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 absolute top-5 left-5 z-10 bg-white/80 backdrop-blur-sm p-2 rounded shadow-sm">
              <MapIcon size={18} className="text-emerald-500" />
              Bản đồ Phủ sóng & Thị phần
            </h2>
            <MapChart
              data={processedData}
              config={{
                id: 'map-chart', // Add required id
                name: 'Map Chart', // Add required name
                type: 'map', // Add required type
                dataSource: {
                  xAxis: 'code', // Maps to TTVT code (e.g. CBE, CGO)
                  yAxis: ['pctFiber', 'pctMyTV', 'pctMC'],
                  table: '', // Add required prop
                  aggregation: 'sum' // Add required prop
                },
                style: {
                  yAxisFieldLabels: {
                    'pctFiber': 'Tỷ lệ Fiber (%)',
                    'pctMyTV': 'Tỷ lệ MyTV (%)',
                    'pctMC': 'Tỷ lệ Mesh/Cam (%)'
                  },
                  mapColorScheme: 'signal', // Corrected from 'heatmap'
                  mapDisplayMode: 'heatmap', // Corrected from 'choropleth'
                  tooltipTheme: 'light'
                }
              }}
              height="100%"
            />
          </div>
        )}

        {/* 5. TILE GRID (Always visible list) */}
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
    </div>
  );
}