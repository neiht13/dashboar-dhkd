import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Building2, Medal, ShieldAlert, UserRound } from "lucide-react";
import { useMemo, useRef } from "react";

import { CumulativeTrendChart, DailyDeltaChart } from "@/components/dashboard/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AccessDeniedCard } from "@/components/layout/access-denied-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDashboardContext } from "@/hooks/use-dashboard-context";
import { useRevealMotion } from "@/hooks/use-reveal-motion";
import { getEmployeeSnapshotsAtDate } from "@/lib/dataset";
import { formatNumber, formatPercentFromRatio, formatRatio, formatVnd } from "@/lib/format";

interface EmployeeDashboardPageProps {
  employeeId: string;
}

function getDayInMonth(date: string): number {
  const day = Number(date.slice(8, 10));
  return Number.isFinite(day) ? day : 1;
}

export function EmployeeDashboardPage({ employeeId }: EmployeeDashboardPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, access, fromDate, toDate } = useDashboardContext();

  const employee = data?.employeesById[employeeId];

  const fullTimeline = useMemo(() => {
    if (!employee) {
      return [];
    }

    return employee.timeline.filter((record) => record.date <= toDate);
  }, [employee, toDate]);

  const dailySeries = useMemo(() => {
    return fullTimeline.map((record, index) => {
      const previous = fullTimeline[index - 1];
      return {
        ...record,
        deltaRevenue: previous ? record.doneRevenueTotal - previous.doneRevenueTotal : record.doneRevenueTotal,
        deltaVolume: previous ? record.doneVolumeVNPTT - previous.doneVolumeVNPTT : record.doneVolumeVNPTT,
        deltaPackage: previous ? record.packageVolume - previous.packageVolume : record.packageVolume,
      };
    });
  }, [fullTimeline]);

  const visibleSeries = useMemo(
    () => dailySeries.filter((record) => record.date >= fromDate && record.date <= toDate),
    [dailySeries, fromDate, toDate],
  );

  const latest = visibleSeries[visibleSeries.length - 1] ?? dailySeries[dailySeries.length - 1];
  const first = visibleSeries[0] ?? dailySeries[0];

  const peerRanking = useMemo(() => {
    if (!data || !employee || !latest) {
      return { rank: 0, size: 0 };
    }

    const allowedSet = new Set(access.allowedEmployeeIds);
    const peerIds = (data.unitsById[employee.unitId]?.employeeIds ?? []).filter((id) => allowedSet.has(id));

    const peers = getEmployeeSnapshotsAtDate(data, latest.date, peerIds)
      .slice()
      .sort((a, b) => b.doneRevenue - a.doneRevenue);

    const rank = peers.findIndex((peer) => peer.employeeId === employeeId);
    return {
      rank: rank >= 0 ? rank + 1 : 0,
      size: peers.length,
    };
  }, [access.allowedEmployeeIds, data, employee, employeeId, latest]);

  useRevealMotion(containerRef, [employeeId, fromDate, toDate]);

  if (!data) {
    return null;
  }

  if (!access.tokenValid) {
    return <AccessDeniedCard message={access.accessMessage} />;
  }

  if (!employee || !latest || !first) {
    return (
      <div className="space-y-3">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> Quay lại tổng quan
        </Link>
        <AccessDeniedCard message="Không tìm thấy nhân viên hoặc không có dữ liệu trong khoảng ngày đã chọn." />
      </div>
    );
  }

  if (access.role === "employee" && access.employeeId !== employeeId) {
    return (
      <div className="space-y-3">
        <AccessDeniedCard message="Cấp Nhân viên chỉ được xem dashboard cá nhân của mình." />
        {access.employeeId ? (
          <Link
            to="/employee/$employeeId"
            params={{ employeeId: access.employeeId }}
            className="inline-flex items-center gap-2 border border-border px-3 py-2 text-sm text-primary"
          >
            Mở đúng dashboard cá nhân <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    );
  }

  if (access.role === "unit" && !access.allowedEmployeeIds.includes(employeeId)) {
    return <AccessDeniedCard message="Cấp Đơn vị không được xem nhân viên ngoài đơn vị được cấp." />;
  }

  const planRevenue = latest.planRevenue;
  const planVolume = latest.planVolume;
  const doneRevenue = latest.doneRevenueTotal;
  const doneVolume = latest.doneVolumeVNPTT;
  const remainingRevenue = Math.max(0, planRevenue - doneRevenue);
  const remainingVolume = Math.max(0, planVolume - doneVolume);

  const progressRevenue = planRevenue > 0 ? doneRevenue / planRevenue : 0;
  const progressVolume = planVolume > 0 ? doneVolume / planVolume : 0;

  const packageRate = doneVolume > 0 ? latest.packageVolume / doneVolume : 0;
  const avgRevenuePerSale = doneVolume > 0 ? doneRevenue / doneVolume : 0;

  const remainingDays = Math.max(0, data.daysInMonth - getDayInMonth(latest.date));
  const avgRevenuePerDay = doneRevenue / Math.max(1, visibleSeries.length);
  const avgVolumePerDay = doneVolume / Math.max(1, visibleSeries.length);
  const needRevenuePerDay = remainingDays > 0 ? remainingRevenue / remainingDays : 0;
  const needVolumePerDay = remainingDays > 0 ? remainingVolume / remainingDays : 0;

  const trendData = visibleSeries.map((item) => ({
    date: item.date.slice(5),
    revenue: item.doneRevenueTotal,
    volume: item.doneVolumeVNPTT,
    packageRate: item.ratePackage,
    deltaRevenue: item.deltaRevenue,
    deltaVolume: item.deltaVolume,
  }));

  const zeroRevenueDates = visibleSeries.filter((item) => item.deltaRevenue === 0).map((item) => item.date);
  const bestJump = visibleSeries.reduce((best, current) => {
    if (!best) {
      return current;
    }

    return current.deltaRevenue > best.deltaRevenue ? current : best;
  }, visibleSeries[0]);

  const projectedRevenue = avgRevenuePerDay * data.daysInMonth;
  const projectedVolume = avgVolumePerDay * data.daysInMonth;

  return (
    <div ref={containerRef} className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-2" data-reveal>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-primary">
              <ArrowLeft className="h-3.5 w-3.5" /> Tổng quan
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link
              to="/unit/$unitId"
              params={{ unitId: employee.unitId }}
              className="inline-flex items-center gap-1 text-xs text-primary"
            >
              <Building2 className="h-3.5 w-3.5" /> {employee.unitCode}
            </Link>
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{employee.name}</h2>
          <p className="text-xs text-muted-foreground">
            {employee.id} | Khoảng lọc {fromDate} → {toDate} | Dải số liệu {first.date} → {latest.date}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="rounded-sm px-2 py-0 text-[11px]">
            MaDV: {employee.maDv}
          </Badge>
          {peerRanking.rank > 0 && (
            <Badge variant="outline" className="gap-1 rounded-sm px-2 py-0 text-[11px]">
              <Medal className="h-3.5 w-3.5" /> Top {peerRanking.rank}/{peerRanking.size} trong đơn vị
            </Badge>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <KpiCard
          title="Doanh thu cá nhân"
          subtitle="Thực hiện lũy kế"
          value={formatVnd(doneRevenue)}
          plan={formatVnd(planRevenue)}
          remain={formatVnd(remainingRevenue)}
          progress={progressRevenue}
          badgeText="Doanh thu"
          footnoteLeft={`TB/ngày: ${formatVnd(avgRevenuePerDay)}`}
          footnoteRight={`Cần/ngày: ${formatVnd(needRevenuePerDay)}`}
        />
        <KpiCard
          title="Sản lượng cá nhân"
          subtitle="VNPTT"
          value={`${formatNumber(doneVolume)} SL`}
          plan={`${formatNumber(planVolume)} SL`}
          remain={`${formatNumber(remainingVolume)} SL`}
          progress={progressVolume}
          badgeText="Sản lượng"
          footnoteLeft={`TB/ngày: ${formatRatio(avgVolumePerDay)} SL`}
          footnoteRight={`Cần/ngày: ${formatRatio(needVolumePerDay)} SL`}
        />
        <KpiCard
          title="Tỷ lệ mua gói"
          subtitle="SLTB_CoGoi trên SL VNPTT"
          value={formatPercentFromRatio(packageRate)}
          plan="Mốc tối ưu: 70,0%"
          remain={`SL có gói: ${formatNumber(latest.packageVolume)}`}
          progress={packageRate}
          badgeText="Chất lượng"
          footnoteLeft={`DT/SL: ${formatVnd(avgRevenuePerSale)}`}
          footnoteRight={`VNPTS: ${formatNumber(latest.doneVolumeVNPTS)} SL`}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 2xl:grid-cols-12">
        <Card className="2xl:col-span-8" data-reveal>
          <CardHeader>
            <CardTitle>Xu hướng lũy kế cá nhân</CardTitle>
            <CardDescription>
              Nâng cấp từ layout mẫu: thêm nhãn giá trị trực tiếp trên chart và theo dõi tỷ lệ gói.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CumulativeTrendChart data={trendData} heightClassName="h-56" />
          </CardContent>
        </Card>

        <Card className="2xl:col-span-4" data-reveal>
          <CardHeader>
            <CardTitle>Nhận xét nhanh</CardTitle>
            <CardDescription>Các điểm cần follow-up đến cuối kỳ.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              1) Doanh thu đạt <b className="text-foreground">{formatPercentFromRatio(progressRevenue)}</b>, sản lượng đạt
              <b className="text-foreground"> {formatPercentFromRatio(progressVolume)}</b>.
            </p>
            <p>
              2) Ngày tăng DT lớn nhất: <b className="text-foreground">{bestJump?.date ?? "-"}</b> với
              <b className="text-foreground"> {formatVnd(bestJump?.deltaRevenue ?? 0)}</b>.
            </p>
            <p>
              3) {zeroRevenueDates.length > 0 ? "Có ngày ΔDT = 0:" : "Không có ngày ΔDT = 0."}
              {zeroRevenueDates.length > 0 ? <b className="text-foreground"> {zeroRevenueDates.join(", ")}</b> : null}
            </p>
            <p>
              4) Dự phóng cuối tháng: <b className="text-foreground">{formatVnd(projectedRevenue)}</b> và
              <b className="text-foreground"> {formatNumber(Math.round(projectedVolume))} SL</b> nếu giữ nhịp hiện tại.
            </p>
            <p>
              5) Còn <b className="text-foreground">{remainingDays}</b> ngày để hoàn thành KH.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3 2xl:grid-cols-12">
        <Card className="2xl:col-span-5" data-reveal>
          <CardHeader>
            <CardTitle>Biến động theo ngày</CardTitle>
            <CardDescription>Δ doanh thu và Δ sản lượng theo từng ngày.</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyDeltaChart data={trendData} />
          </CardContent>
        </Card>

        <Card className="2xl:col-span-7" data-reveal>
          <CardHeader>
            <CardTitle>Bảng chi tiết từng ngày</CardTitle>
            <CardDescription>
              Click sang nhân viên khác trong đơn vị
              <Link
                to="/unit/$unitId"
                params={{ unitId: employee.unitId }}
                className="ml-1 inline-flex items-center gap-1 text-primary"
              >
                tại đây <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead className="text-right">SL lũy kế</TableHead>
                  <TableHead className="text-right">Δ SL</TableHead>
                  <TableHead className="text-right">DT lũy kế</TableHead>
                  <TableHead className="text-right">Δ DT</TableHead>
                  <TableHead className="text-right">SL có gói</TableHead>
                  <TableHead className="text-right">Tỷ lệ gói</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSeries.map((item) => (
                  <TableRow key={item.date} className={item.deltaRevenue === 0 ? "bg-amber-500/10" : ""}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.doneVolumeVNPTT)}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.deltaVolume)}</TableCell>
                    <TableCell className="text-right">{formatVnd(item.doneRevenueTotal)}</TableCell>
                    <TableCell className="text-right">{formatVnd(item.deltaRevenue)}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.packageVolume)} (Δ {formatNumber(item.deltaPackage)})
                    </TableCell>
                    <TableCell className="text-right">{formatPercentFromRatio(item.ratePackage)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section data-reveal>
        <Card>
          <CardHeader>
            <CardTitle>Nhân viên cùng đơn vị</CardTitle>
            <CardDescription>Điều hướng nhanh đến dashboard cá nhân khác.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-3">
            {getEmployeeSnapshotsAtDate(data, toDate, data.unitsById[employee.unitId]?.employeeIds ?? [])
              .filter((peer) => access.allowedEmployeeIds.includes(peer.employeeId))
              .sort((a, b) => b.doneRevenue - a.doneRevenue)
              .slice(0, 12)
              .map((peer) => (
                <Link
                  key={peer.employeeId}
                  to="/employee/$employeeId"
                  params={{ employeeId: peer.employeeId }}
                  className="flex items-center justify-between border border-border/60 bg-background/70 px-2.5 py-1.5 transition hover:border-primary/50"
                >
                  <div className="flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{peer.employeeName}</p>
                      <p className="text-[11px] text-muted-foreground">{peer.employeeId}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground">{formatVnd(peer.doneRevenue)}</span>
                </Link>
              ))}
          </CardContent>
        </Card>
      </section>

      {access.role !== "global" && (
        <section data-reveal>
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-primary">
                <ShieldAlert className="h-4 w-4" /> Trạng thái phân quyền đang bật
              </CardTitle>
              <CardDescription>Token hiện tại giới hạn dữ liệu hiển thị theo đúng quyền truy cập.</CardDescription>
            </CardHeader>
          </Card>
        </section>
      )}
    </div>
  );
}
