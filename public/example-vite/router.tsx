import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

import { RootLayout } from "@/components/layout/root-layout";

const OverallDashboardPage = lazy(async () => {
  const module = await import("@/pages/overall-page");
  return { default: module.OverallDashboardPage };
});

const UnitDashboardPage = lazy(async () => {
  const module = await import("@/pages/unit-page");
  return { default: module.UnitDashboardPage };
});

const EmployeeDashboardPage = lazy(async () => {
  const module = await import("@/pages/employee-page");
  return { default: module.EmployeeDashboardPage };
});

function RouteLoadingFallback() {
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">Đang tải dashboard...</p>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => (
    <div className="rounded-sm border border-border bg-card p-4">
      <h2 className="text-xl font-semibold">Trang không tồn tại</h2>
      <p className="mt-2 text-sm text-muted-foreground">Kiểm tra lại đường dẫn hoặc quay lại trang tổng quan.</p>
    </div>
  ),
});

const overallRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: function OverallRouteComponent() {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <OverallDashboardPage />
      </Suspense>
    );
  },
});

const unitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/unit/$unitId",
  component: function UnitRouteComponent() {
    const { unitId } = unitRoute.useParams();
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <UnitDashboardPage unitId={unitId} />
      </Suspense>
    );
  },
});

const employeeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/employee/$employeeId",
  component: function EmployeeRouteComponent() {
    const { employeeId } = employeeRoute.useParams();
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <EmployeeDashboardPage employeeId={employeeId} />
      </Suspense>
    );
  },
});

const routeTree = rootRoute.addChildren([overallRoute, unitRoute, employeeRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
