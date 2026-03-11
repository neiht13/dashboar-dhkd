import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, Crown, Search, ShieldAlert, UserRound } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { CumulativeTrendChart, RankBarChart } from "@/components/dashboard/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AccessDeniedCard } from "@/components/layout/access-denied-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardContext } from "@/hooks/use-dashboard-context";
import { useRevealMotion } from "@/hooks/use-reveal-motion";
import {
  buildScopeSeries,
  getEmployeeSnapshotsAtDate,
  getScopeSnapshotAtDate,
  getUnitSnapshotsAtDate,
} from "@/lib/dataset";
import { formatNumber, formatPercentFromRatio, formatRatio, formatVnd } from "@/lib/format";
import { useDashboardUiStore } from "@/store/ui-store";

export function OverallDashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data, access, fromDate, toDate } = useDashboardContext();

  const globalEmployeeSearch = useDashboardUiStore((state) => state.globalEmployeeSearch);
  const setGlobalEmployeeSearch = useDashboardUiStore((state) => state.setGlobalEmployeeSearch);

  const [topMetric, setTopMetric] = useState<"revenue" | "volume">("revenue");

  const allowedEmployeeIds = access.allowedEmployeeIds;

  const fullSeries = useMemo(() => {
    if (!data || !access.tokenValid || allowedEmployeeIds.length === 0 || !toDate) {
      return [];
    }

    return buildScopeSeries(data, allowedEmployeeIds, toDate);
  }, [access.tokenValid, allowedEmployeeIds, data, toDate]);

  const series = useMemo(
    () => fullSeries.filter((item) => item.date >= fromDate && item.date <= toDate),
    [fromDate, fullSeries, toDate],
  );

  const snapshot = series[series.length - 1] ?? getScopeSnapshotAtDate(fullSeries, toDate);

  const unitSnapshots = useMemo(() => {
    if (!data || !access.tokenValid) {
      return [];
    }

    const allowedUnitIds = new Set(access.allowedUnitIds);
    return getUnitSnapshotsAtDate(data, toDate).filter((unit) => allowedUnitIds.has(unit.unitId));
  }, [access.allowedUnitIds, access.tokenValid, data, toDate]);

  const employeeSnapshots = useMemo(() => {
    if (!data || !access.tokenValid || allowedEmployeeIds.length === 0) {
      return [];
    }

    return getEmployeeSnapshotsAtDate(data, toDate, allowedEmployeeIds);
  }, [access.tokenValid, allowedEmployeeIds, data, toDate]);

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

  const unitsRankingData = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    const mapped = unitSnapshots.map((unit) => ({
      id: unit.unitId,
      name: `${unit.unitCode}`,
      revenue: unit.doneRevenue,
      volume: unit.doneVolume,
      progress: unit.progressRevenue,
    }));

    return mapped.sort((a, b) => (topMetric === "revenue" ? b.revenue - a.revenue : b.volume - a.volume)).slice(0, 10);
  }, [snapshot, topMetric, unitSnapshots]);

  const topEmployees = useMemo(() => {
    const normalizedSearch = globalEmployeeSearch.trim().toLowerCase();
    const filtered = normalizedSearch
      ? employeeSnapshots.filter((employee) => {
          const identity = `${employee.employeeName} ${employee.employeeId} ${employee.unitCode}`.toLowerCase();
          return identity.includes(normalizedSearch);
        })
      : employeeSnapshots;

    return filtered.sort((a, b) => b.doneRevenue - a.doneRevenue).slice(0, 18);
  }, [employeeSnapshots, globalEmployeeSearch]);

  const scopedUnitSnapshot = useMemo(() => {
    if (access.role !== "unit" || !access.unitId) {
      return undefined;
    }

    return unitSnapshots.find((unit) => unit.unitId === access.unitId);
  }, [access.role, access.unitId, unitSnapshots]);

  const scopedUnitEmployees = useMemo(() => {
    if (!scopedUnitSnapshot) {
      return [];
    }

    return employeeSnapshots
      .filter((employee) => employee.unitId === scopedUnitSnapshot.unitId)
      .sort((a, b) => b.doneRevenue - a.doneRevenue);
  }, [employeeSnapshots, scopedUnitSnapshot]);

  const scopedUnitRevenueShare = useMemo(() => {
    if (!snapshot || !scopedUnitSnapshot) {
      return 0;
    }

    return scopedUnitSnapshot.doneRevenue / Math.max(1, snapshot.totalDoneRevenue);
  }, [scopedUnitSnapshot, snapshot]);

  const previous = series.length > 1 ? series[series.length - 2] : undefined;
  const revenueTrend =
    snapshot && previous
      ? ((snapshot.totalDoneRevenue - previous.totalDoneRevenue) / Math.max(1, previous.totalDoneRevenue)) * 100
      : 0;
  const volumeTrend =
    snapshot && previous
      ? ((snapshot.totalDoneVolume - previous.totalDoneVolume) / Math.max(1, previous.totalDoneVolume)) * 100
      : 0;

  useRevealMotion(containerRef, [fromDate, globalEmployeeSearch, topMetric, toDate]);

  if (!data) {
    return null;
  }

  if (!access.tokenValid) {
    return <AccessDeniedCard message={access.accessMessage} />;
  }

  if (access.role === "employee" && access.employeeId) {
    return (
      <div className="space-y-3" ref={containerRef}>
        <AccessDeniedCard message="Cấp Nhân viên chỉ được xem dashboard cá nhân của mình." />
        <Link
          to="/employee/$employeeId"
          params={{ employeeId: access.employeeId }}
          className="inline-flex items-center gap-2 border border-border px-3 py-2 text-sm text-primary"
        >
          Đi tới dashboard cá nhân <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (!snapshot) {
    return <AccessDeniedCard message="Không có dữ liệu trong khoảng ngày đã chọn." />;
  }

  const qualityGap = snapshot.packageRate - 0.7;

  return (
    <div ref={containerRef} className="space-y-4">
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <KpiCard
          title="Doanh thu toàn mạng"
          subtitle={`Khoảng lọc: ${fromDate} → ${toDate}`}
          value={formatVnd(snapshot.totalDoneRevenue)}
          plan={formatVnd(snapshot.totalPlanRevenue)}
          remain={formatVnd(snapshot.remainingRevenue)}
          progress={snapshot.progressRevenue}
          trend={revenueTrend}
          badgeText="VNPTT"
          footnoteLeft={`TB/ngày: ${formatVnd(snapshot.avgRevenuePerDay)}`}
          footnoteRight={`Cần/ngày: ${formatVnd(snapshot.needRevenuePerDay)}`}
        />

        <KpiCard
          title="Sản lượng toàn mạng"
          subtitle="Tổng SL VNPTT"
          value={`${formatNumber(snapshot.totalDoneVolume)} SL`}
          plan={`${formatNumber(snapshot.totalPlanVolume)} SL`}
          remain={`${formatNumber(snapshot.remainingVolume)} SL`}
          progress={snapshot.progressVolume}
          trend={volumeTrend}
          badgeText={`VNPTS ${formatNumber(snapshot.totalDoneVolumeVNPTS)}`}
          footnoteLeft={`TB/ngày: ${formatRatio(snapshot.avgVolumePerDay)} SL`}
          footnoteRight={`Cần/ngày: ${formatRatio(snapshot.needVolumePerDay)} SL`}
        />

        <KpiCard
          title="Tỷ lệ mua gói"
          subtitle="SL có gói trên tổng SL"
          value={formatPercentFromRatio(snapshot.packageRate)}
          plan="Mốc chất lượng: 70,0%"
          remain={`${qualityGap >= 0 ? "+" : ""}${(qualityGap * 100).toFixed(1)}% so với mốc`}
          progress={snapshot.packageRate}
          badgeText="Chất lượng"
          footnoteLeft={`SL có gói: ${formatNumber(snapshot.totalPackageVolume)}`}
          footnoteRight={`DT/SL: ${formatVnd(snapshot.avgRevenuePerSale)}`}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 2xl:grid-cols-12">
        <Card className="2xl:col-span-8" data-reveal>
          <CardHeader>
            <CardTitle>Xu hướng lũy kế tổng đơn vị</CardTitle>
            <CardDescription>
              Dải ngày {fromDate} đến {toDate}. Dự phóng doanh thu tháng: {formatVnd(snapshot.projectedRevenue)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CumulativeTrendChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="2xl:col-span-4" data-reveal>
          <CardHeader>
            <CardTitle>Top đơn vị theo doanh thu/số lượng</CardTitle>
            <CardDescription>Click trực tiếp vào cột để drill-down vào dashboard đơn vị.</CardDescription>
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
                  data={unitsRankingData}
                  metric="revenue"
                  onSelect={(unitId) => navigate({ to: "/unit/$unitId", params: { unitId } })}
                />
              </TabsContent>
              <TabsContent value="volume" className="mt-2">
                <RankBarChart
                  data={unitsRankingData}
                  metric="volume"
                  onSelect={(unitId) => navigate({ to: "/unit/$unitId", params: { unitId } })}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3 2xl:grid-cols-12">
        {access.role === "global" ? (
          <Card className="2xl:col-span-8" data-reveal>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle>Bảng tổng hợp đơn vị</CardTitle>
                <CardDescription>
                  Sắp xếp giảm dần theo doanh thu. Số đơn vị có dữ liệu: {formatNumber(unitSnapshots.length)}.
                </CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-sm px-2 py-0 text-[11px]">
                Tổng DT VNPTS: {formatVnd(snapshot.totalDoneRevenueVNPTS)}
              </Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Đơn vị</TableHead>
                    <TableHead className="text-right">Nhân sự</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                    <TableHead className="text-right">Tiến độ DT</TableHead>
                    <TableHead className="text-right">Sản lượng</TableHead>
                    <TableHead className="text-right">Tỷ lệ gói</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unitSnapshots.map((unit) => (
                    <TableRow key={unit.unitId}>
                      <TableCell>
                        <Link
                          to="/unit/$unitId"
                          params={{ unitId: unit.unitId }}
                          className="inline-flex items-center gap-2 font-medium text-foreground transition hover:text-primary"
                        >
                          <Building2 className="h-4 w-4" />
                          <span>{unit.unitCode}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(unit.employeeCount)}</TableCell>
                      <TableCell className="text-right">{formatVnd(unit.doneRevenue)}</TableCell>
                      <TableCell className="text-right">{formatPercentFromRatio(unit.progressRevenue)}</TableCell>
                      <TableCell className="text-right">{formatNumber(unit.doneVolume)}</TableCell>
                      <TableCell className="text-right">{formatPercentFromRatio(unit.packageRate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card className="2xl:col-span-8" data-reveal>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle>Insight đơn vị đang phụ trách</CardTitle>
                <CardDescription>Cấp đơn vị hiển thị phân tích chi tiết thay cho bảng tổng hợp toàn mạng.</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-sm px-2 py-0 text-[11px]">
                {scopedUnitSnapshot ? `Đơn vị ${scopedUnitSnapshot.unitCode}` : "Không có đơn vị trong phạm vi token"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                <div className="border border-border/70 bg-muted/20 px-2 py-2">
                  <p className="text-[11px] text-muted-foreground">Doanh thu đơn vị</p>
                  <p className="text-sm font-semibold text-foreground">{formatVnd(scopedUnitSnapshot?.doneRevenue ?? 0)}</p>
                </div>
                <div className="border border-border/70 bg-muted/20 px-2 py-2">
                  <p className="text-[11px] text-muted-foreground">Tiến độ doanh thu</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatPercentFromRatio(scopedUnitSnapshot?.progressRevenue ?? 0)}
                  </p>
                </div>
                <div className="border border-border/70 bg-muted/20 px-2 py-2">
                  <p className="text-[11px] text-muted-foreground">Sản lượng</p>
                  <p className="text-sm font-semibold text-foreground">{formatNumber(scopedUnitSnapshot?.doneVolume ?? 0)} SL</p>
                </div>
                <div className="border border-border/70 bg-muted/20 px-2 py-2">
                  <p className="text-[11px] text-muted-foreground">Tỷ lệ mua gói</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatPercentFromRatio(scopedUnitSnapshot?.packageRate ?? 0)}
                  </p>
                </div>
                <div className="border border-border/70 bg-muted/20 px-2 py-2">
                  <p className="text-[11px] text-muted-foreground">Tỷ trọng doanh thu</p>
                  <p className="text-sm font-semibold text-foreground">{formatPercentFromRatio(scopedUnitRevenueShare)}</p>
                </div>
                <div className="border border-border/70 bg-muted/20 px-2 py-2">
                  <p className="text-[11px] text-muted-foreground">Doanh thu/SL</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatVnd(scopedUnitSnapshot?.avgRevenuePerSale ?? 0)}
                  </p>
                </div>
              </div>

              {scopedUnitEmployees.length === 0 ? (
                <div className="border border-dashed border-border p-3 text-sm text-muted-foreground">
                  Không có nhân sự trong phạm vi token hiện tại.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nhân viên nổi bật</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                      <TableHead className="text-right">Tiến độ DT</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scopedUnitEmployees.slice(0, 6).map((employee) => (
                      <TableRow key={employee.employeeId}>
                        <TableCell>
                          <Link
                            to="/employee/$employeeId"
                            params={{ employeeId: employee.employeeId }}
                            className="inline-flex items-center gap-1.5 text-foreground transition hover:text-primary"
                          >
                            <UserRound className="h-3.5 w-3.5" />
                            <span className="font-medium">{employee.employeeName}</span>
                          </Link>
                          <div className="text-[11px] text-muted-foreground">{employee.employeeId}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatVnd(employee.doneRevenue)}</TableCell>
                        <TableCell className="text-right">{formatPercentFromRatio(employee.progressRevenue)}</TableCell>
                        <TableCell className="text-right">{formatNumber(employee.doneVolume)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="2xl:col-span-4" data-reveal>
          <CardHeader>
            <CardTitle>Leaderboard nhân viên</CardTitle>
            <CardDescription>Top performer theo doanh thu, có thể tìm kiếm nhanh.</CardDescription>
            <label className="mt-1 inline-flex items-center gap-2 border border-border px-2 py-1.5 text-xs text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              <input
                className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Tìm theo tên, mã NV, đơn vị"
                value={globalEmployeeSearch}
                onChange={(event) => setGlobalEmployeeSearch(event.target.value)}
              />
            </label>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {topEmployees.length === 0 ? (
              <div className="border border-dashed border-border p-3 text-sm text-muted-foreground">Không có kết quả phù hợp.</div>
            ) : (
              topEmployees.map((employee, index) => (
                <Link
                  key={employee.employeeId}
                  to="/employee/$employeeId"
                  params={{ employeeId: employee.employeeId }}
                  className="group flex items-center justify-between border border-border/70 bg-background/60 px-2.5 py-1.5 transition hover:border-primary/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="grid h-6 w-6 place-items-center border border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                      {index === 0 ? <Crown className="h-3.5 w-3.5" /> : index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground group-hover:text-primary">{employee.employeeName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {employee.employeeId} | {employee.unitCode}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-foreground">{formatVnd(employee.doneRevenue)}</p>
                    <p className="text-[11px] text-muted-foreground">{formatPercentFromRatio(employee.progressRevenue)}</p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card data-reveal>
          <CardHeader>
            <CardTitle>Thông điệp điều hành</CardTitle>
            <CardDescription>Cô đọng các điểm cần ưu tiên theo phạm vi đang lọc.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              1) Đang đạt <b className="text-foreground">{formatPercentFromRatio(snapshot.progressRevenue)}</b> kế hoạch doanh thu,
              còn <b className="text-foreground"> {formatVnd(snapshot.remainingRevenue)}</b> để về đích.
            </p>
            <p>
              2) Tỷ lệ mua gói hiện tại <b className="text-foreground">{formatPercentFromRatio(snapshot.packageRate)}</b>
              {qualityGap >= 0 ? " và đang cao hơn mốc 70%." : ", dưới mốc 70% cần đẩy bán gói GTGT."}
            </p>
            <p>
              3) Dự phóng cuối tháng: <b className="text-foreground">{formatVnd(snapshot.projectedRevenue)}</b> và
              <b className="text-foreground"> {formatNumber(Math.round(snapshot.projectedVolume))} SL</b> nếu giữ nhịp hiện tại.
            </p>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2" data-reveal>
          <CardHeader>
            <CardTitle>Top nhân viên đóng góp doanh thu</CardTitle>
            <CardDescription>
              Sắp xếp giảm dần theo doanh thu tại ngày {toDate}. Click vào tên để xem dashboard cá nhân.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Đơn vị</TableHead>
                  <TableHead className="text-right">Doanh thu</TableHead>
                  <TableHead className="text-right">Sản lượng</TableHead>
                  <TableHead className="text-right">Tỷ lệ gói</TableHead>
                  <TableHead className="text-right">Tiến độ DT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeSnapshots
                  .slice()
                  .sort((a, b) => b.doneRevenue - a.doneRevenue)
                  .slice(0, 10)
                  .map((employee) => (
                    <TableRow key={employee.employeeId}>
                      <TableCell>
                        <Link
                          to="/employee/$employeeId"
                          params={{ employeeId: employee.employeeId }}
                          className="inline-flex items-center gap-1.5 text-foreground transition hover:text-primary"
                        >
                          <UserRound className="h-3.5 w-3.5" />
                          <span className="font-medium">{employee.employeeName}</span>
                        </Link>
                        <div className="text-[11px] text-muted-foreground">{employee.employeeId}</div>
                      </TableCell>
                      <TableCell>{employee.unitCode}</TableCell>
                      <TableCell className="text-right">{formatVnd(employee.doneRevenue)}</TableCell>
                      <TableCell className="text-right">{formatNumber(employee.doneVolume)}</TableCell>
                      <TableCell className="text-right">{formatPercentFromRatio(employee.packageRate)}</TableCell>
                      <TableCell className="text-right">{formatPercentFromRatio(employee.progressRevenue)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {access.role !== "global" && (
        <section data-reveal>
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-primary">
                <ShieldAlert className="h-4 w-4" /> Đang chạy ở chế độ phân quyền
              </CardTitle>
              <CardDescription>
                Bạn đang ở chế độ {access.role === "unit" ? "Đơn vị" : "Nhân viên"}. Chỉ dữ liệu thuộc phạm vi token được hiển thị.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      )}
    </div>
  );
}
