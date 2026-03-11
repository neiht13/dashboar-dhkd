"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
    ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid,
    BarChart, PieChart, Pie, Cell,
} from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    TrendingUp, TrendingDown, Search, Calendar, RefreshCw, ArrowLeft,
    ArrowRight, Loader2, Medal, Building2, ShieldCheck, UserRound, Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// =============================================
// TYPES
// =============================================
interface Rec {
    ThangNam: string; DENNGAY: string; MaDV: number; DonVi: string;
    MaNV: string; HoTen: string;
    KeHoach_DT: number; KeHoach_SL: number; KeHoach_SL_TS: number;
    ThucHien_SL_VNPTT: number; ThucHien_DT_VNPTT: number;
    ThucHien_SL_VNPTS: number; ThucHien_DT_VNPTS: number;
    ThucHien_Tong: number;
    SLTB_CoGoi: number; SLTB_TS_CoGoi: number; TongTB_CoGoi: number;
    MucTieuCL_VNPTT: number;
    TyLe_SL_VNPTT: number; TyLe_SL_VNPTS: number; TyLe_DT_VNPTT: number; TyLe_MuaGoi: number;
}

type DrillLevel = "overall" | "unit" | "employee";

// =============================================
// HELPERS
// =============================================
const C = { blue: "#3B82F6", violet: "#8B5CF6", emerald: "#10B981", amber: "#F59E0B", red: "#EF4444", cyan: "#06B6D4", pink: "#EC4899", teal: "#14B8A6" };
const PALETTE = Object.values(C);

function fVnd(v: number) { return v >= 1e9 ? `${(v / 1e9).toFixed(1)} tỷ` : v >= 1e6 ? `${(v / 1e6).toFixed(1)} tr` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : v.toLocaleString(); }
function fPct(r: number) { return `${(r * 100).toFixed(1)}%`; }
function fNum(n: number) { return n.toLocaleString(); }

function agg(recs: Rec[]) {
    const dt = recs.reduce((s, d) => s + d.ThucHien_Tong, 0);
    const kh = recs.reduce((s, d) => s + d.KeHoach_DT, 0);
    const sl = recs.reduce((s, d) => s + d.ThucHien_SL_VNPTT, 0);
    const khSL = recs.reduce((s, d) => s + d.KeHoach_SL, 0);
    const cg = recs.reduce((s, d) => s + d.TongTB_CoGoi, 0);
    return { dt, kh, sl, khSL, cg, pDT: kh > 0 ? dt / kh : 0, pSL: khSL > 0 ? sl / khSL : 0, mGoi: sl > 0 ? cg / sl : 0, n: recs.length, rem: Math.max(0, kh - dt), remSL: Math.max(0, khSL - sl) };
}

// =============================================
// KPI CARD
// =============================================
function KpiCard({ title, subtitle, value, plan, remain, progress, badgeText, trend, fnL, fnR }: {
    title: string; subtitle: string; value: string; plan: string; remain: string;
    progress: number; badgeText?: string; trend?: number; fnL?: string; fnR?: string;
}) {
    const pv = Math.max(0, Math.min(100, progress * 100));
    return (
        <Card className="relative overflow-hidden border-primary/25 bg-card/95">
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 bg-primary/20 blur-2xl" />
            <CardHeader className="space-y-1 pb-1">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</CardTitle>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/90">{subtitle}</p>
                    </div>
                    {badgeText && <Badge variant="outline" className="rounded-sm px-2 py-0 text-[11px]">{badgeText}</Badge>}
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>
                <div className="space-y-0.5 text-xs text-muted-foreground">
                    <p>Kế hoạch: <span className="font-semibold text-foreground">{plan}</span></p>
                    <p>Còn lại: <span className="font-semibold text-foreground">{remain}</span></p>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Tiến độ</span><span className="font-semibold text-foreground">{pv.toFixed(1)}%</span>
                    </div>
                    <Progress value={pv} className="h-1.5 bg-primary/15" />
                </div>
                {(fnL || fnR) && (
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
                        <div className="border border-border/70 bg-background/60 px-2 py-1">{fnL}</div>
                        <div className="border border-border/70 bg-background/60 px-2 py-1">{fnR}</div>
                    </div>
                )}
                {typeof trend === "number" && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : <TrendingDown className="h-3.5 w-3.5 text-rose-500" />}
                        <span>Biến động: <span className="font-semibold text-foreground">{trend.toFixed(1)}%</span></span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// =============================================
// TOOLTIP STYLE
// =============================================


// =============================================
// MAIN PAGE WITH 3-LEVEL DRILLDOWN
// =============================================
export default function KpiNhanVienPage() {
    const [data, setData] = useState<Rec[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Navigation state
    const [level, setLevel] = useState<DrillLevel>("overall");
    const [selectedUnitCode, setSelectedUnitCode] = useState<string | null>(null);
    const [selectedMaNV, setSelectedMaNV] = useState<string | null>(null);

    // Filters
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const thangNam = `${year}${String(month).padStart(2, "0")}01`;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/database/chart-data", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customQuery: `SELECT * FROM REPORTSERVICE.DBO.VNP_KetQua_ThucHien_NV WHERE ThangNam = '${thangNam}'`, queryMode: "custom" }),
            });
            const r = await res.json();
            if (r.success && r.data) { setData(r.data); toast.success(`${r.data.length} bản ghi`); }
            else toast.error("Lỗi tải dữ liệu");
        } catch { toast.error("Lỗi kết nối"); } finally { setIsLoading(false); }
    }, [thangNam]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Dates
    const allDates = useMemo(() => [...new Set(data.map(d => d.DENNGAY))].sort(), [data]);
    const curDate = selectedDate || allDates[allDates.length - 1] || "";
    const prevDate = useMemo(() => { const i = allDates.indexOf(curDate); return i > 0 ? allDates[i - 1] : null; }, [allDates, curDate]);
    const curRecs = useMemo(() => data.filter(d => d.DENNGAY === curDate), [data, curDate]);
    const prevRecs = useMemo(() => prevDate ? data.filter(d => d.DENNGAY === prevDate) : [], [data, prevDate]);
    const allUnits = useMemo(() => [...new Set(data.map(d => d.DonVi))].sort(), [data]);

    // Drill navigation
    const drillToUnit = (unit: string) => { setSelectedUnitCode(unit); setLevel("unit"); setSearchTerm(""); };
    const drillToEmployee = (maNV: string) => { setSelectedMaNV(maNV); setLevel("employee"); };
    const goBack = () => {
        if (level === "employee") { setLevel("unit"); setSelectedMaNV(null); }
        else if (level === "unit") { setLevel("overall"); setSelectedUnitCode(null); }
    };

    // Breadcrumb title
    const headerTitle = level === "employee"
        ? `NV: ${curRecs.find(d => d.MaNV === selectedMaNV)?.HoTen || selectedMaNV}`
        : level === "unit"
            ? `Đơn vị: ${selectedUnitCode}`
            : "KPI Kết quả Thực hiện";

    return (
        <>
            <Header title={headerTitle} subtitle={`Tháng ${month}/${year} — Ngày ${curDate.slice(5) || "..."}`} showDatePicker={false} showSearch={false} />

            <div className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-gray-950">
                <div className="max-w-[1400px] mx-auto p-4 space-y-4">
                    {/* BREADCRUMB + FILTERS */}
                    <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                        {/* Breadcrumb */}
                        {level !== "overall" && (
                            <div className="flex items-center gap-1 mr-2">
                                <button onClick={() => { setLevel("overall"); setSelectedUnitCode(null); setSelectedMaNV(null); }}
                                    className="text-xs text-primary hover:underline flex items-center gap-1">
                                    <ArrowLeft className="h-3 w-3" /> Tổng quan
                                </button>
                                {level === "employee" && selectedUnitCode && (
                                    <>
                                        <span className="text-gray-400 text-xs">/</span>
                                        <button onClick={() => { setLevel("unit"); setSelectedMaNV(null); }}
                                            className="text-xs text-primary hover:underline flex items-center gap-1">
                                            <Building2 className="h-3 w-3" /> {selectedUnitCode}
                                        </button>
                                    </>
                                )}
                                <span className="text-gray-300 mx-1">|</span>
                            </div>
                        )}

                        {/* Month/Year */}
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="h-8 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2">
                                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>)}
                            </select>
                            <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-8 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2">
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        {/* Date */}
                        {allDates.length > 0 && (
                            <select value={selectedDate || ""} onChange={e => setSelectedDate(e.target.value || null)} className="h-8 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2">
                                <option value="">Mới nhất ({allDates[allDates.length - 1]?.slice(5)})</option>
                                {allDates.map(d => <option key={d} value={d}>{d.slice(5)}</option>)}
                            </select>
                        )}

                        {/* Search (overall + unit) */}
                        {level !== "employee" && (
                            <div className="relative flex-1 min-w-[160px]">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    placeholder={level === "unit" ? "Tìm nhân viên..." : "Tìm nhân viên, đơn vị..."}
                                    className="h-8 pl-8 text-sm" />
                            </div>
                        )}

                        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="gap-1.5 h-8">
                            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} /> Tải lại
                        </Button>
                    </div>

                    {isLoading && data.length === 0 ? (
                        <div className="flex items-center justify-center py-20 text-gray-400">
                            <Loader2 className="h-6 w-6 mr-2 animate-spin" /> Đang tải...
                        </div>
                    ) : level === "overall" ? (
                        <OverallView data={data} curRecs={curRecs} prevRecs={prevRecs} allDates={allDates} curDate={curDate}
                            searchTerm={searchTerm} onDrillUnit={drillToUnit} onDrillEmployee={(m, u) => { setSelectedUnitCode(u); drillToEmployee(m); }} setSelectedDate={setSelectedDate} />
                    ) : level === "unit" ? (
                        <UnitView data={data} curRecs={curRecs} prevRecs={prevRecs} allDates={allDates} curDate={curDate}
                            unitCode={selectedUnitCode!} searchTerm={searchTerm} onDrillEmployee={drillToEmployee} setSelectedDate={setSelectedDate} />
                    ) : (
                        <EmployeeView data={data} curRecs={curRecs} allDates={allDates} curDate={curDate}
                            maNV={selectedMaNV!} unitCode={selectedUnitCode!} onDrillEmployee={drillToEmployee} />
                    )}
                </div>
            </div>
        </>
    );
}

// =============================================
// LEVEL 1: OVERALL (Tổng quan toàn mạng)
// =============================================
function OverallView({ data, curRecs, prevRecs, allDates, curDate, searchTerm, onDrillUnit, onDrillEmployee, setSelectedDate }: {
    data: Rec[]; curRecs: Rec[]; prevRecs: Rec[]; allDates: string[]; curDate: string;
    searchTerm: string; onDrillUnit: (u: string) => void; onDrillEmployee: (m: string, unit: string) => void; setSelectedDate: (d: string | null) => void;
}) {
    const k = agg(curRecs);
    const kp = agg(prevRecs);
    const trend = kp.dt > 0 ? ((k.dt - kp.dt) / kp.dt) * 100 : 0;

    // Unit summary
    const units = useMemo(() => {
        const m = new Map<string, Rec[]>();
        curRecs.forEach(d => m.set(d.DonVi, [...(m.get(d.DonVi) || []), d]));
        return [...m.entries()].map(([u, rs]) => ({ unit: u, ...agg(rs) })).sort((a, b) => b.dt - a.dt);
    }, [curRecs]);

    // Trend chart
    const trendData = useMemo(() => allDates.map(date => {
        const rs = data.filter(d => d.DENNGAY === date);
        return { date: date.slice(5), fullDate: date, revenue: rs.reduce((s, d) => s + d.ThucHien_Tong, 0), volume: rs.reduce((s, d) => s + d.ThucHien_SL_VNPTT, 0), plan: rs.reduce((s, d) => s + d.KeHoach_DT, 0) };
    }), [allDates, data]);

    // Top employees
    const topEmps = useMemo(() => {
        let r = curRecs;
        if (searchTerm) { const t = searchTerm.toLowerCase(); r = r.filter(d => d.HoTen.toLowerCase().includes(t) || d.MaNV.toLowerCase().includes(t) || d.DonVi.toLowerCase().includes(t)); }
        return [...r].sort((a, b) => b.ThucHien_Tong - a.ThucHien_Tong).slice(0, 18);
    }, [curRecs, searchTerm]);

    // Pie
    const pieData = units.slice(0, 8).map(u => ({ name: u.unit, value: u.dt }));

    return (
        <>
            {/* KPI Cards */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                <KpiCard title="Doanh thu toàn mạng" subtitle={`Đến ngày ${curDate.slice(5)}`} value={fVnd(k.dt)} plan={fVnd(k.kh)} remain={fVnd(k.rem)} progress={k.pDT} trend={trend} badgeText={`${k.n} NV`}
                    fnL={`VNPTT: ${fVnd(curRecs.reduce((s, d) => s + d.ThucHien_DT_VNPTT, 0))}`} fnR={`VNPTS: ${fVnd(curRecs.reduce((s, d) => s + d.ThucHien_DT_VNPTS, 0))}`} />
                <KpiCard title="Sản lượng toàn mạng" subtitle="Tổng SL VNPTT" value={`${fNum(k.sl)} SL`} plan={`${fNum(k.khSL)} SL`} remain={`${fNum(k.remSL)} SL`} progress={k.pSL} badgeText="Sản lượng" />
                <KpiCard title="Tỷ lệ mua gói" subtitle="TB có gói / SL VNPTT" value={fPct(k.mGoi)} plan="Mốc 70,0%" remain={`TB có gói: ${fNum(k.cg)}`} progress={k.mGoi} badgeText="Chất lượng" />
            </section>

            {/* Trend + Ranking */}
            <section className="grid grid-cols-1 2xl:grid-cols-12 gap-3">
                <Card className="2xl:col-span-8">
                    <CardHeader><CardTitle className="text-sm">Xu hướng lũy kế toàn mạng</CardTitle><CardDescription className="text-xs">Click vào ngày để chọn thời điểm xem.</CardDescription></CardHeader>
                    <CardContent>
                        <ChartContainer config={{ revenue: { label: 'Doanh thu', color: C.blue }, plan: { label: 'Kế hoạch', color: C.amber }, volume: { label: 'Sản lượng', color: C.emerald } } satisfies ChartConfig} className="h-[300px] w-full">
                            <ComposedChart data={trendData} margin={{ top: 10, right: 10, bottom: 5, left: 10 }} onClick={e => { const d = (e?.activePayload?.[0]?.payload as Record<string, unknown>)?.fullDate as string; if (d) setSelectedDate(d); }} style={{ cursor: "pointer" }}>
                                <defs><linearGradient id="ov-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity={0.3} /><stop offset="100%" stopColor={C.blue} stopOpacity={0.02} /></linearGradient></defs>
                                <CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis yAxisId="left" tickFormatter={fVnd} tickLine={false} axisLine={false} width={60} />
                                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} width={40} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Area yAxisId="left" type="monotone" dataKey="revenue" name="revenue" fill="url(#ov-grad)" stroke={C.blue} strokeWidth={2.5} dot={{ fill: "#fff", stroke: C.blue, strokeWidth: 2, r: 3 }} activeDot={{ r: 5, fill: C.blue, stroke: "#fff", strokeWidth: 2 }} />
                                <Line yAxisId="left" type="monotone" dataKey="plan" name="plan" stroke={C.amber} strokeWidth={2} strokeDasharray="6 3" dot={false} />
                                <Bar yAxisId="right" dataKey="volume" name="volume" fill={C.emerald} fillOpacity={0.6} radius={[4, 4, 0, 0]} maxBarSize={30} />
                            </ComposedChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="2xl:col-span-4">
                    <CardHeader><CardTitle className="text-sm">Top đơn vị</CardTitle><CardDescription className="text-xs">Click để drill-down vào đơn vị.</CardDescription></CardHeader>
                    <CardContent>
                        <ChartContainer config={{ dt: { label: 'Doanh thu', color: C.blue } } satisfies ChartConfig} className="h-[300px] w-full">
                            <BarChart data={units.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 5 }} onClick={e => { const u = (e?.activePayload?.[0]?.payload as Record<string, unknown>)?.unit as string; if (u) onDrillUnit(u); }} style={{ cursor: "pointer" }}>
                                <defs><linearGradient id="bar-blue" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={C.blue} stopOpacity={0.8} /><stop offset="100%" stopColor={C.blue} stopOpacity={0.3} /></linearGradient></defs>
                                <CartesianGrid horizontal={false} /><XAxis type="number" tickFormatter={fVnd} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="unit" tickLine={false} axisLine={false} width={40} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="dt" name="dt" fill="url(#bar-blue)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </section>

            {/* Unit Table + Leaderboard */}
            <section className="grid grid-cols-1 2xl:grid-cols-12 gap-3">
                <Card className="2xl:col-span-8">
                    <CardHeader><CardTitle className="text-sm">Bảng tổng hợp đơn vị</CardTitle><CardDescription className="text-xs">{units.length} đơn vị. Click drill-down.</CardDescription></CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead><tr className="border-b"><th className="text-left py-2 px-2 text-gray-500">Đơn vị</th><th className="text-right py-2 px-2 text-gray-500">NV</th><th className="text-right py-2 px-2 text-gray-500">Doanh thu</th><th className="text-right py-2 px-2 text-gray-500">Tiến độ</th><th className="text-right py-2 px-2 text-gray-500">SL</th><th className="text-right py-2 px-2 text-gray-500">Tỷ lệ gói</th></tr></thead>
                            <tbody>{units.map(u => (
                                <tr key={u.unit} className="border-b border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => onDrillUnit(u.unit)}>
                                    <td className="py-2 px-2"><span className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary"><Building2 className="h-3.5 w-3.5" />{u.unit}<ArrowRight className="h-3 w-3 text-gray-300" /></span></td>
                                    <td className="text-right py-2 px-2">{u.n}</td><td className="text-right py-2 px-2 font-semibold">{fVnd(u.dt)}</td>
                                    <td className="text-right py-2 px-2"><span className={cn(u.pDT >= .7 ? "text-emerald-600" : u.pDT >= .4 ? "text-amber-600" : "text-red-500")}>{fPct(u.pDT)}</span></td>
                                    <td className="text-right py-2 px-2">{fNum(u.sl)}</td><td className="text-right py-2 px-2">{fPct(u.mGoi)}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </CardContent>
                </Card>

                <Card className="2xl:col-span-4">
                    <CardHeader><CardTitle className="text-sm">Leaderboard nhân viên</CardTitle><CardDescription className="text-xs">Click để xem dashboard cá nhân.</CardDescription></CardHeader>
                    <CardContent className="space-y-1.5 max-h-[400px] overflow-y-auto">
                        {topEmps.map((e, i) => (
                            <button key={e.MaNV} onClick={() => onDrillEmployee(e.MaNV, e.DonVi)} className="w-full flex items-center justify-between border border-border/70 bg-background/60 px-2.5 py-1.5 hover:border-primary/50 transition-colors rounded-sm text-left">
                                <div className="flex items-center gap-2">
                                    <div className={cn("grid h-6 w-6 place-items-center border text-[10px] font-bold", i === 0 ? "border-amber-300 bg-amber-50 text-amber-600" : i < 3 ? "border-blue-200 bg-blue-50 text-blue-600" : "border-gray-200 bg-gray-50 text-gray-500")}>{i === 0 ? <Crown className="h-3.5 w-3.5" /> : i + 1}</div>
                                    <div><p className="text-xs font-medium text-foreground">{e.HoTen}</p><p className="text-[10px] text-muted-foreground">{e.MaNV} | {e.DonVi}</p></div>
                                </div>
                                <div className="text-right"><p className="text-xs font-semibold">{fVnd(e.ThucHien_Tong)}</p><p className="text-[10px] text-muted-foreground">{fPct(e.KeHoach_DT > 0 ? e.ThucHien_Tong / e.KeHoach_DT : 0)}</p></div>
                            </button>
                        ))}
                    </CardContent>
                </Card>
            </section>

            {/* Insights */}
            <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Thông điệp điều hành</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                    <p>1) Đang đạt <b className="text-foreground">{fPct(k.pDT)}</b> kế hoạch DT, còn <b className="text-foreground">{fVnd(k.rem)}</b> để về đích.</p>
                    <p>2) Tỷ lệ mua gói <b className="text-foreground">{fPct(k.mGoi)}</b>{k.mGoi >= .7 ? " — vượt mốc 70%." : " — cần đẩy bán gói."}</p>
                    <p>3) {k.n} nhân viên hoạt động, {units.length} đơn vị.</p>
                </CardContent>
            </Card>
        </>
    );
}

// =============================================
// LEVEL 2: UNIT (Chi tiết đơn vị)
// =============================================
function UnitView({ data, curRecs, prevRecs, allDates, curDate, unitCode, searchTerm, onDrillEmployee, setSelectedDate }: {
    data: Rec[]; curRecs: Rec[]; prevRecs: Rec[]; allDates: string[]; curDate: string;
    unitCode: string; searchTerm: string; onDrillEmployee: (m: string) => void; setSelectedDate: (d: string | null) => void;
}) {
    const unitRecs = useMemo(() => curRecs.filter(d => d.DonVi === unitCode), [curRecs, unitCode]);
    const unitPrev = useMemo(() => prevRecs.filter(d => d.DonVi === unitCode), [prevRecs, unitCode]);
    const k = agg(unitRecs); const kp = agg(unitPrev);
    const trend = kp.dt > 0 ? ((k.dt - kp.dt) / kp.dt) * 100 : 0;

    // Employees
    const employees = useMemo(() => {
        let r = unitRecs;
        if (searchTerm) { const t = searchTerm.toLowerCase(); r = r.filter(d => d.HoTen.toLowerCase().includes(t) || d.MaNV.toLowerCase().includes(t)); }
        return [...r].sort((a, b) => b.ThucHien_Tong - a.ThucHien_Tong);
    }, [unitRecs, searchTerm]);

    // Trend
    const trendData = useMemo(() => allDates.map(date => {
        const rs = data.filter(d => d.DENNGAY === date && d.DonVi === unitCode);
        return { date: date.slice(5), fullDate: date, revenue: rs.reduce((s, d) => s + d.ThucHien_Tong, 0), volume: rs.reduce((s, d) => s + d.ThucHien_SL_VNPTT, 0), plan: rs.reduce((s, d) => s + d.KeHoach_DT, 0) };
    }), [allDates, data, unitCode]);

    // Daily delta
    const deltaData = useMemo(() => trendData.map((d, i) => ({ ...d, deltaDT: i > 0 ? d.revenue - trendData[i - 1].revenue : 0, deltaSL: i > 0 ? d.volume - trendData[i - 1].volume : 0 })), [trendData]);

    return (
        <>
            {/* Header */}
            <section className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">Dashboard đơn vị {unitCode}</h2>
                    <p className="text-xs text-muted-foreground">Ngày {curDate} | {fNum(employees.length)} nhân viên</p>
                </div>
                <Badge variant="outline" className="rounded-sm px-2 py-0 text-[11px]">{fNum(employees.length)} NV</Badge>
            </section>

            {/* KPIs */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                <KpiCard title={`Doanh thu ${unitCode}`} subtitle="Tổng thực hiện" value={fVnd(k.dt)} plan={fVnd(k.kh)} remain={fVnd(k.rem)} progress={k.pDT} trend={trend} badgeText="DT" fnL={`VNPTT: ${fVnd(unitRecs.reduce((s, d) => s + d.ThucHien_DT_VNPTT, 0))}`} fnR={`VNPTS: ${fVnd(unitRecs.reduce((s, d) => s + d.ThucHien_DT_VNPTS, 0))}`} />
                <KpiCard title="Sản lượng VNPTT" subtitle="Thuê bao phát triển" value={`${fNum(k.sl)} SL`} plan={`${fNum(k.khSL)} SL`} remain={`${fNum(k.remSL)} SL`} progress={k.pSL} badgeText="SL" />
                <KpiCard title="Tỷ lệ mua gói" subtitle="TB có gói / SL" value={fPct(k.mGoi)} plan="Mốc 70%" remain={`TB có gói: ${fNum(k.cg)}`} progress={k.mGoi} badgeText="CL" />
            </section>

            {/* Trend + Rank */}
            <section className="grid grid-cols-1 2xl:grid-cols-12 gap-3">
                <Card className="2xl:col-span-8">
                    <CardHeader><CardTitle className="text-sm">Xu hướng lũy kế đơn vị</CardTitle></CardHeader>
                    <CardContent>
                        <ChartContainer config={{ revenue: { label: 'DT', color: C.blue }, plan: { label: 'KH', color: C.amber }, volume: { label: 'SL', color: C.emerald } } satisfies ChartConfig} className="h-[280px] w-full">
                            <ComposedChart data={trendData} margin={{ top: 10, right: 10, bottom: 5, left: 10 }} onClick={e => { const d = (e?.activePayload?.[0]?.payload as Record<string, unknown>)?.fullDate as string; if (d) setSelectedDate(d); }} style={{ cursor: "pointer" }}>
                                <defs><linearGradient id="u-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity={0.3} /><stop offset="100%" stopColor={C.blue} stopOpacity={0.02} /></linearGradient></defs>
                                <CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis yAxisId="left" tickFormatter={fVnd} tickLine={false} axisLine={false} width={60} /><YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} width={40} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Area yAxisId="left" type="monotone" dataKey="revenue" name="revenue" fill="url(#u-grad)" stroke={C.blue} strokeWidth={2.5} dot={{ fill: "#fff", stroke: C.blue, strokeWidth: 2, r: 3 }} />
                                <Line yAxisId="left" type="monotone" dataKey="plan" name="plan" stroke={C.amber} strokeWidth={2} strokeDasharray="6 3" dot={false} />
                                <Bar yAxisId="right" dataKey="volume" name="volume" fill={C.emerald} fillOpacity={0.6} radius={[4, 4, 0, 0]} maxBarSize={25} />
                            </ComposedChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="2xl:col-span-4">
                    <CardHeader><CardTitle className="text-sm">Top nhân viên</CardTitle><CardDescription className="text-xs">Click để drill-down cá nhân.</CardDescription></CardHeader>
                    <CardContent>
                        <ChartContainer config={{ dt: { label: 'DT', color: C.violet } } satisfies ChartConfig} className="h-[280px] w-full">
                            <BarChart data={employees.slice(0, 10).map(e => ({ name: e.HoTen.split(' ').slice(-2).join(' '), maNV: e.MaNV, dt: e.ThucHien_Tong }))} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 5 }} onClick={e => { const m = (e?.activePayload?.[0]?.payload as Record<string, unknown>)?.maNV as string; if (m) onDrillEmployee(m); }} style={{ cursor: "pointer" }}>
                                <defs><linearGradient id="bar-violet" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={C.violet} stopOpacity={0.8} /><stop offset="100%" stopColor={C.violet} stopOpacity={0.3} /></linearGradient></defs>
                                <CartesianGrid horizontal={false} /><XAxis type="number" tickFormatter={fVnd} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={70} />
                                <ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="dt" name="dt" fill="url(#bar-violet)" radius={[0, 4, 4, 0]} maxBarSize={18} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </section>

            {/* Delta + Employee table */}
            <section className="grid grid-cols-1 2xl:grid-cols-12 gap-3">
                <Card className="2xl:col-span-5">
                    <CardHeader><CardTitle className="text-sm">Biến động theo ngày</CardTitle></CardHeader>
                    <CardContent>
                        <ChartContainer config={{ deltaDT: { label: 'Δ DT', color: C.blue }, deltaSL: { label: 'Δ SL', color: C.emerald } } satisfies ChartConfig} className="h-[250px] w-full">
                            <BarChart data={deltaData} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
                                <defs>
                                    <linearGradient id="d-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity={0.8} /><stop offset="100%" stopColor={C.blue} stopOpacity={0.3} /></linearGradient>
                                    <linearGradient id="d-emerald" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.emerald} stopOpacity={0.8} /><stop offset="100%" stopColor={C.emerald} stopOpacity={0.3} /></linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis tickFormatter={fVnd} tickLine={false} axisLine={false} width={50} />
                                <ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} />
                                <Bar dataKey="deltaDT" name="deltaDT" fill="url(#d-blue)" radius={[3, 3, 0, 0]} maxBarSize={20} /><Bar dataKey="deltaSL" name="deltaSL" fill="url(#d-emerald)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="2xl:col-span-7">
                    <CardHeader><CardTitle className="text-sm">Bảng nhân viên đơn vị</CardTitle></CardHeader>
                    <CardContent className="overflow-x-auto max-h-[350px] overflow-y-auto">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-white dark:bg-gray-900"><tr className="border-b"><th className="text-left py-2 px-2 text-gray-500">Nhân viên</th><th className="text-right py-2 px-2 text-gray-500">DT</th><th className="text-right py-2 px-2 text-gray-500">Tiến độ</th><th className="text-right py-2 px-2 text-gray-500">SL</th><th className="text-right py-2 px-2 text-gray-500">Gói</th><th className="text-right py-2 px-2 text-gray-500">DT/SL</th></tr></thead>
                            <tbody>{employees.map(e => (
                                <tr key={e.MaNV} className="border-b border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => onDrillEmployee(e.MaNV)}>
                                    <td className="py-1.5 px-2"><span className="inline-flex items-center gap-1.5 font-medium hover:text-primary"><UserRound className="h-3.5 w-3.5" />{e.HoTen}<ArrowRight className="h-3 w-3 text-gray-300" /></span><div className="text-[10px] text-muted-foreground">{e.MaNV}</div></td>
                                    <td className="text-right py-1.5 px-2 font-semibold">{fVnd(e.ThucHien_Tong)}</td>
                                    <td className="text-right py-1.5 px-2"><span className={cn(e.TyLe_DT_VNPTT >= .7 ? "text-emerald-600" : e.TyLe_DT_VNPTT >= .4 ? "text-amber-600" : "text-red-500")}>{fPct(e.TyLe_DT_VNPTT)}</span></td>
                                    <td className="text-right py-1.5 px-2">{e.ThucHien_SL_VNPTT}</td><td className="text-right py-1.5 px-2">{fPct(e.TyLe_MuaGoi)}</td>
                                    <td className="text-right py-1.5 px-2">{e.ThucHien_SL_VNPTT > 0 ? fVnd(e.ThucHien_Tong / e.ThucHien_SL_VNPTT) : "-"}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </CardContent>
                </Card>
            </section>
        </>
    );
}

// =============================================
// LEVEL 3: EMPLOYEE (Chi tiết nhân viên)
// =============================================
function EmployeeView({ data, curRecs, allDates, curDate, maNV, unitCode, onDrillEmployee }: {
    data: Rec[]; curRecs: Rec[]; allDates: string[]; curDate: string;
    maNV: string; unitCode: string; onDrillEmployee: (m: string) => void;
}) {
    const empRecs = useMemo(() => curRecs.filter(d => d.MaNV === maNV), [curRecs, maNV]);
    const emp = empRecs[0];

    // Timeline: all dates for this employee
    const timeline = useMemo(() => {
        const recs = data.filter(d => d.MaNV === maNV).sort((a, b) => a.DENNGAY.localeCompare(b.DENNGAY));
        return recs.map((r, i) => ({
            ...r, date: r.DENNGAY.slice(5),
            deltaDT: i > 0 ? r.ThucHien_Tong - recs[i - 1].ThucHien_Tong : r.ThucHien_Tong,
            deltaSL: i > 0 ? r.ThucHien_SL_VNPTT - recs[i - 1].ThucHien_SL_VNPTT : r.ThucHien_SL_VNPTT,
        }));
    }, [data, maNV]);

    // Peer ranking
    const peers = useMemo(() => curRecs.filter(d => d.DonVi === unitCode).sort((a, b) => b.ThucHien_Tong - a.ThucHien_Tong), [curRecs, unitCode]);
    const rank = peers.findIndex(d => d.MaNV === maNV) + 1;

    if (!emp) return <div className="text-center py-20 text-gray-400">Không tìm thấy nhân viên</div>;

    const pDT = emp.KeHoach_DT > 0 ? emp.ThucHien_Tong / emp.KeHoach_DT : 0;
    const pSL = emp.KeHoach_SL > 0 ? emp.ThucHien_SL_VNPTT / emp.KeHoach_SL : 0;
    const avgDTPerDay = timeline.length > 0 ? emp.ThucHien_Tong / timeline.length : 0;
    const zeroDs = timeline.filter(t => t.deltaDT === 0).map(t => t.DENNGAY);
    const bestJump = timeline.reduce((b, c) => !b || c.deltaDT > b.deltaDT ? c : b, timeline[0]);

    return (
        <>
            {/* Header with breadcrumb */}
            <section className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight">{emp.HoTen}</h2>
                    <p className="text-xs text-muted-foreground">{emp.MaNV} | {emp.DonVi} | Đến ngày {curDate}</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="rounded-sm px-2 py-0 text-[11px]">MaDV: {emp.MaDV}</Badge>
                    {rank > 0 && <Badge variant="outline" className="gap-1 rounded-sm px-2 py-0 text-[11px]"><Medal className="h-3.5 w-3.5" />Top {rank}/{peers.length}</Badge>}
                </div>
            </section>

            {/* KPIs */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                <KpiCard title="Doanh thu cá nhân" subtitle="Lũy kế" value={fVnd(emp.ThucHien_Tong)} plan={fVnd(emp.KeHoach_DT)} remain={fVnd(Math.max(0, emp.KeHoach_DT - emp.ThucHien_Tong))} progress={pDT} badgeText="DT" fnL={`TB/ngày: ${fVnd(avgDTPerDay)}`} fnR={`Mục tiêu CL: ${fVnd(emp.MucTieuCL_VNPTT)}`} />
                <KpiCard title="Sản lượng cá nhân" subtitle="VNPTT" value={`${emp.ThucHien_SL_VNPTT} SL`} plan={`${emp.KeHoach_SL} SL`} remain={`${Math.max(0, emp.KeHoach_SL - emp.ThucHien_SL_VNPTT)} SL`} progress={pSL} badgeText="SL" fnL={`VNPTS: ${emp.ThucHien_SL_VNPTS} SL`} fnR={`TS: ${emp.KeHoach_SL_TS}`} />
                <KpiCard title="Tỷ lệ mua gói" subtitle="TB có gói / SL" value={fPct(emp.TyLe_MuaGoi)} plan="Mốc 70%" remain={`TB có gói: ${emp.TongTB_CoGoi}`} progress={emp.TyLe_MuaGoi} badgeText="CL" />
            </section>

            {/* Trend + Insights */}
            <section className="grid grid-cols-1 2xl:grid-cols-12 gap-3">
                <Card className="2xl:col-span-8">
                    <CardHeader><CardTitle className="text-sm">Xu hướng lũy kế cá nhân</CardTitle></CardHeader>
                    <CardContent>
                        <ChartContainer config={{ ThucHien_Tong: { label: 'DT Lũy kế', color: C.blue }, ThucHien_SL_VNPTT: { label: 'SL Lũy kế', color: C.emerald } } satisfies ChartConfig} className="h-[260px] w-full">
                            <ComposedChart data={timeline} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
                                <defs><linearGradient id="e-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity={0.25} /><stop offset="100%" stopColor={C.blue} stopOpacity={0.02} /></linearGradient></defs>
                                <CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis yAxisId="left" tickFormatter={fVnd} tickLine={false} axisLine={false} width={55} /><YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} width={30} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Area yAxisId="left" type="monotone" dataKey="ThucHien_Tong" name="ThucHien_Tong" fill="url(#e-grad)" stroke={C.blue} strokeWidth={2.5} dot={{ fill: "#fff", stroke: C.blue, strokeWidth: 2, r: 3 }} />
                                <Bar yAxisId="right" dataKey="ThucHien_SL_VNPTT" name="ThucHien_SL_VNPTT" fill={C.emerald} fillOpacity={0.5} radius={[3, 3, 0, 0]} maxBarSize={20} />
                            </ComposedChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="2xl:col-span-4">
                    <CardHeader><CardTitle className="text-sm">Nhận xét nhanh</CardTitle><CardDescription className="text-xs">Các điểm cần follow-up.</CardDescription></CardHeader>
                    <CardContent className="space-y-2 text-xs text-muted-foreground">
                        <p>1) DT đạt <b className="text-foreground">{fPct(pDT)}</b>, SL đạt <b className="text-foreground">{fPct(pSL)}</b>.</p>
                        <p>2) Ngày tăng DT lớn nhất: <b className="text-foreground">{bestJump?.DENNGAY?.slice(5) || "-"}</b> với <b className="text-foreground">{fVnd(bestJump?.deltaDT || 0)}</b>.</p>
                        <p>3) {zeroDs.length > 0 ? <>Có ngày ΔDT = 0: <b className="text-foreground">{zeroDs.map(d => d.slice(5)).join(", ")}</b></> : "Không có ngày ΔDT = 0."}</p>
                        <p>4) Tỷ lệ mua gói: <b className="text-foreground">{fPct(emp.TyLe_MuaGoi)}</b>{emp.TyLe_MuaGoi >= .7 ? " — tốt." : " — cần cải thiện."}</p>
                        <p>5) Xếp hạng: <b className="text-foreground">Top {rank}/{peers.length}</b> trong đơn vị.</p>
                    </CardContent>
                </Card>
            </section>

            {/* Delta + Daily table */}
            <section className="grid grid-cols-1 2xl:grid-cols-12 gap-3">
                <Card className="2xl:col-span-5">
                    <CardHeader><CardTitle className="text-sm">Biến động theo ngày</CardTitle></CardHeader>
                    <CardContent>
                        <ChartContainer config={{ deltaDT: { label: 'Δ DT', color: C.blue }, deltaSL: { label: 'Δ SL', color: C.emerald } } satisfies ChartConfig} className="h-[230px] w-full">
                            <BarChart data={timeline} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
                                <defs>
                                    <linearGradient id="t-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity={0.8} /><stop offset="100%" stopColor={C.blue} stopOpacity={0.3} /></linearGradient>
                                    <linearGradient id="t-emerald" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.emerald} stopOpacity={0.8} /><stop offset="100%" stopColor={C.emerald} stopOpacity={0.3} /></linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis tickFormatter={fVnd} tickLine={false} axisLine={false} width={50} />
                                <ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} />
                                <Bar dataKey="deltaDT" name="deltaDT" fill="url(#t-blue)" radius={[3, 3, 0, 0]} maxBarSize={18} /><Bar dataKey="deltaSL" name="deltaSL" fill="url(#t-emerald)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="2xl:col-span-7">
                    <CardHeader><CardTitle className="text-sm">Bảng chi tiết từng ngày</CardTitle></CardHeader>
                    <CardContent className="overflow-x-auto max-h-[300px] overflow-y-auto">
                        <table className="w-full text-[11px]">
                            <thead className="sticky top-0 bg-white dark:bg-gray-900"><tr className="border-b"><th className="text-left py-1.5 px-2 text-gray-500">Ngày</th><th className="text-right py-1.5 px-2 text-gray-500">SL lũy kế</th><th className="text-right py-1.5 px-2 text-gray-500">Δ SL</th><th className="text-right py-1.5 px-2 text-gray-500">DT lũy kế</th><th className="text-right py-1.5 px-2 text-gray-500">Δ DT</th><th className="text-right py-1.5 px-2 text-gray-500">Gói</th><th className="text-right py-1.5 px-2 text-gray-500">Tỷ lệ gói</th></tr></thead>
                            <tbody>{timeline.map(t => (
                                <tr key={t.DENNGAY} className={cn("border-b border-gray-100", t.deltaDT === 0 && "bg-amber-500/10")}>
                                    <td className="py-1 px-2">{t.DENNGAY}</td><td className="text-right py-1 px-2">{t.ThucHien_SL_VNPTT}</td><td className="text-right py-1 px-2">{t.deltaSL}</td>
                                    <td className="text-right py-1 px-2">{fVnd(t.ThucHien_Tong)}</td><td className="text-right py-1 px-2">{fVnd(t.deltaDT)}</td>
                                    <td className="text-right py-1 px-2">{t.TongTB_CoGoi}</td><td className="text-right py-1 px-2">{fPct(t.TyLe_MuaGoi)}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </CardContent>
                </Card>
            </section>

            {/* Peers */}
            <Card>
                <CardHeader><CardTitle className="text-sm">Nhân viên cùng đơn vị</CardTitle><CardDescription className="text-xs">Điều hướng nhanh đến dashboard cá nhân khác.</CardDescription></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">
                    {peers.slice(0, 12).map(p => (
                        <button key={p.MaNV} onClick={() => onDrillEmployee(p.MaNV)}
                            className={cn("flex items-center justify-between border bg-background/70 px-2.5 py-1.5 transition hover:border-primary/50 text-left rounded-sm", p.MaNV === maNV ? "border-primary/50 bg-primary/5" : "border-border/60")}>
                            <div className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-primary" /><div><p className="text-xs font-medium">{p.HoTen}</p><p className="text-[10px] text-muted-foreground">{p.MaNV}</p></div></div>
                            <span className="text-[11px] font-semibold text-muted-foreground">{fVnd(p.ThucHien_Tong)}</span>
                        </button>
                    ))}
                </CardContent>
            </Card>
        </>
    );
}
