import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Search, ShieldAlert, UserRound } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { CumulativeTrendChart, DailyDeltaChart, RankBarChart } from "@/components/dashboard/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AccessDeniedCard } from "@/components/layout/access-denied-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardContext } from "@/hooks/use-dashboard-context";
import { useRevealMotion } from "@/hooks/use-reveal-motion";
import { buildScopeSeries, getEmployeeSnapshotsAtDate, getScopeSnapshotAtDate } from "@/lib/dataset";
import { formatNumber, formatPercentFromRatio, formatRatio, formatVnd } from "@/lib/format";
import { useDashboardUiStore } from "@/store/ui-store";

interface UnitDashboardPageProps {
  unitId: string;
}

const EMPTY_EMPLOYEE_IDS: string[] = [];

export function UnitDashboardPage({ unitId }: UnitDashboardPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data, access, fromDate, toDate } = useDashboardContext();

  const unitEmployeeSearch = useDashboardUiStore((state) => state.unitEmployeeSearch);
  const setUnitEmployeeSearch = useDashboardUiStore((state) => state.setUnitEmployeeSearch);
  const [topMetric, setTopMetric] = useState<"revenue" | "volume">("revenue");

  const unit = data?.unitsById[unitId];

  const employeeIds = useMemo(() => {
    if (!unit) {
      return EMPTY_EMPLOYEE_IDS;
    }

    const allowed = new Set(access.allowedEmployeeIds);
    return unit.employeeIds.filter((employeeId) => allowed.has(employeeId));
  }, [access.allowedEmployeeIds, unit]);

  const fullSeries = useMemo(() => {
    if (!data || employeeIds.length === 0 || !access.tokenValid) {
      return [];
    }

    return buildScopeSeries(data, employeeIds, toDate);
  }, [access.tokenValid, data, employeeIds, toDate]);

  const series = useMemo(
    () => fullSeries.filter((item) => item.date >= fromDate && item.date <= toDate),
    [fromDate, fullSeries, toDate],
  );
  const snapshot = series[series.length - 1] ?? getScopeSnapshotAtDate(fullSeries, toDate);

  const employeeSnapshots = useMemo(() => {
    if (!data || employeeIds.length === 0 || !access.tokenValid) {
      return [];
    }

    return getEmployeeSnapshotsAtDate(data, toDate, employeeIds);
  }, [access.tokenValid, data, employeeIds, toDate]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = unitEmployeeSearch.trim().toLowerCase();
    const candidate = normalizedSearch
      ? employeeSnapshots.filter((employee) => {
          const identity = `${employee.employeeName} ${employee.employeeId}`.toLowerCase();
          return identity.includes(normalizedSearch);
        })
      : employeeSnapshots;

    return candidate.sort((a, b) => b.doneRevenue - a.doneRevenue);
  }, [employeeSnapshots, unitEmployeeSearch]);

  const chartData = useMemo(
    () =>
      series.map((item) => ({
        date: item.date.slice(5),
        revenue: item.totalDoneRevenue,
        volume: item.totalDoneVolume,
        packageRate: item.packageRate,
        deltaRevenue: item.deltaRevenue,
        deltaVolume: item.deltaVolume,
      })),
    [series],
  );

  const rankingData = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    return filteredEmployees
      .map((employee) => ({
        id: employee.employeeId,
        name: employee.employeeName,
        revenue: employee.doneRevenue,
        volume: employee.doneVolume,
        progress: employee.progressRevenue,
      }))
      .sort((a, b) => (topMetric === "revenue" ? b.revenue - a.revenue : b.volume - a.volume))
      .slice(0, 12);
  }, [filteredEmployees, snapshot, topMetric]);

  useRevealMotion(containerRef, [fromDate, toDate, topMetric, unitEmployeeSearch, unitId]);

  if (!data) {
    return null;
  }

  if (!access.tokenValid) {
    return <AccessDeniedCard message={access.accessMessage} />;
  }

  if (access.role === "employee") {
    return (
      <div className="space-y-3">
        <AccessDeniedCard message="Cấp Nhân viên không được xem dashboard đơn vị." />
        {access.employeeId ? (
          <Link
            to="/employee/$employeeId"
            params={{ employeeId: access.employeeId }}
            className="inline-flex items-center gap-2 border border-border px-3 py-2 text-sm text-primary"
          >
            Đi tới dashboard cá nhân <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    );
  }

  if (access.role === "unit" && access.unitId !== unitId) {
    return (
      <div className="space-y-3">
        <AccessDeniedCard message="Bạn chỉ có quyền xem dashboard của đơn vị được cấp trong token." />
        {access.unitId ? (
          <Link
            to="/unit/$unitId"
            params={{ unitId: access.unitId }}
            className="inline-flex items-center gap-2 border border-border px-3 py-2 text-sm text-primary"
          >
            Mở đúng dashboard đơn vị <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    );
  }

  if (!unit || !snapshot) {
    return (
      <div className="space-y-3">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> Quay lại tổng quan
        </Link>
        <AccessDeniedCard message="Không tìm thấy đơn vị hoặc không có dữ liệu trong khoảng ngày đã chọn." />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-2" data-reveal>
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại tổng quan
          </Link>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Dashboard đơn vị {unit.code}</h2>
          <p className="text-xs text-muted-foreground">
            Khoảng lọc {fromDate} → {toDate} | MaDV {unit.maDv} | {formatNumber(unit.employeeIds.length)} nhân sự
          </p>
        </div>
        <Badge variant="outline" className="rounded-sm px-2 py-0 text-[11px]">
          Nhân viên đang hiển thị: {formatNumber(filteredEmployees.length)}
        </Badge>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <KpiCard
          title={`Doanh thu đơn vị ${unit.code}`}
          subtitle="Tổng ThựcHiện_Tổng"
          value={formatVnd(snapshot.totalDoneRevenue)}
          plan={formatVnd(snapshot.totalPlanRevenue)}
          remain={formatVnd(snapshot.remainingRevenue)}
          progress={snapshot.progressRevenue}
          badgeText="Doanh thu"
          footnoteLeft={`TB/ngày: ${formatVnd(snapshot.avgRevenuePerDay)}`}
          footnoteRight={`Cần/ngày: ${formatVnd(snapshot.needRevenuePerDay)}`}
        />
        <KpiCard
          title="Sản lượng VNPTT"
          subtitle="Tổng số thuê bao phát triển"
          value={`${formatNumber(snapshot.totalDoneVolume)} SL`}
          plan={`${formatNumber(snapshot.totalPlanVolume)} SL`}
          remain={`${formatNumber(snapshot.remainingVolume)} SL`}
          progress={snapshot.progressVolume}
          badgeText="Sản lượng"
          footnoteLeft={`TB/ngày: ${formatRatio(snapshot.avgVolumePerDay)} SL`}
          footnoteRight={`Cần/ngày: ${formatRatio(snapshot.needVolumePerDay)} SL`}
        />
        <KpiCard
          title="Tỷ lệ mua gói"
          subtitle="SL có gói trên SL VNPTT"
          value={formatPercentFromRatio(snapshot.packageRate)}
          plan="Mốc tối ưu: 70,0%"
          remain={`SL có gói: ${formatNumber(snapshot.totalPackageVolume)}`}
          progress={snapshot.packageRate}
          badgeText="Chất lượng"
          footnoteLeft={`DT/SL: ${formatVnd(snapshot.avgRevenuePerSale)}`}
          footnoteRight={`Dự phóng DT: ${formatVnd(snapshot.projectedRevenue)}`}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 2xl:grid-cols-12">
        <Card className="2xl:col-span-8" data-reveal>
          <CardHeader>
            <CardTitle>Xu hướng lũy kế đơn vị</CardTitle>
            <CardDescription>
              Theo dõi doanh thu, sản lượng, tỷ lệ gói của đơn vị {unit.code} trong dải ngày đã chọn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CumulativeTrendChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="2xl:col-span-4" data-reveal>
          <CardHeader>
            <CardTitle>Top nhân viên theo doanh thu/số lượng</CardTitle>
            <CardDescription>Click cột để drill-down vào dashboard cá nhân.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={topMetric} onValueChange={(value) => setTopMetric(value as "revenue" | "volume")}>
              <TabsList className="h-8 rounded-sm">
                <TabsTrigger className="text-xs" value="revenue">
                  Theo doanh thu
                </TabsTrigger>
                <TabsTrigger className="text-xs" value="volume">
                  Theo số lượng
                </TabsTrigger>
              </TabsList>
              <TabsContent value="revenue" className="mt-2">
                <RankBarChart
                  data={rankingData}
                  metric="revenue"
                  onSelect={(employeeId) => navigate({ to: "/employee/$employeeId", params: { employeeId } })}
                />
              </TabsContent>
              <TabsContent value="volume" className="mt-2">
                <RankBarChart
                  data={rankingData}
                  metric="volume"
                  onSelect={(employeeId) => navigate({ to: "/employee/$employeeId", params: { employeeId } })}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3 2xl:grid-cols-12">
        <Card className="2xl:col-span-5" data-reveal>
          <CardHeader>
            <CardTitle>Biến động theo ngày</CardTitle>
            <CardDescription>Phát hiện các ngày tăng trưởng bất thường hoặc đứng tăng trưởng.</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyDeltaChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="2xl:col-span-7" data-reveal>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Bảng nhân viên đơn vị</CardTitle>
              <CardDescription>
                Sắp xếp giảm dần theo doanh thu. Click vào nhân viên để mở dashboard cá nhân.
              </CardDescription>
            </div>
            <label className="inline-flex items-center gap-2 border border-border px-2 py-1.5 text-xs text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              <input
                className="bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Tìm nhân viên"
                value={unitEmployeeSearch}
                onChange={(event) => setUnitEmployeeSearch(event.target.value)}
              />
            </label>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead className="text-right">Doanh thu</TableHead>
                  <TableHead className="text-right">Tiến độ DT</TableHead>
                  <TableHead className="text-right">Sản lượng</TableHead>
                  <TableHead className="text-right">Tỷ lệ gói</TableHead>
                  <TableHead className="text-right">DT/SL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.employeeId}>
                    <TableCell>
                      <Link
                        to="/employee/$employeeId"
                        params={{ employeeId: employee.employeeId }}
                        className="inline-flex items-center gap-1.5 text-foreground transition hover:text-primary"
                      >
                        <UserRound className="h-3.5 w-3.5" />
                        <span className="font-medium">{employee.employeeName}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <div className="text-[11px] text-muted-foreground">{employee.employeeId}</div>
                    </TableCell>
                    <TableCell className="text-right">{formatVnd(employee.doneRevenue)}</TableCell>
                    <TableCell className="text-right">{formatPercentFromRatio(employee.progressRevenue)}</TableCell>
                    <TableCell className="text-right">{formatNumber(employee.doneVolume)}</TableCell>
                    <TableCell className="text-right">{formatPercentFromRatio(employee.packageRate)}</TableCell>
                    <TableCell className="text-right">{formatVnd(employee.avgRevenuePerSale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {access.role === "unit" && (
        <section data-reveal>
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-primary">
                <ShieldAlert className="h-4 w-4" /> Đang chạy với quyền Đơn vị
              </CardTitle>
              <CardDescription>Chỉ dữ liệu của đơn vị {unit.code} được hiển thị theo token hiện tại.</CardDescription>
            </CardHeader>
          </Card>
        </section>
      )}
    </div>
  );
}
