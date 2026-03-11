/**
 * Dashboard Templates Registry
 *
 * Inspired by:
 * - Vite example app (3-level drilldown: Overall → Unit → Employee)
 * - Legacy standalone dashboards (phattrienmoi, roimang, trangthaithuebao)
 * - Power BI common templates
 *
 * Each template has multi-tab with drilldown navigation.
 */

import type { Widget, LayoutItem, ChartConfig, DashboardTab, DashboardDrilldownConfig } from "@/types";
import { generateId } from "@/lib/utils";

export interface DashboardTemplate {
    id: string;
    name: string;
    description: string;
    category: "telecom" | "sales" | "kpi" | "geographic" | "general";
    icon?: string;
    tabs: DashboardTab[];
}

// ==========================================================
// HELPER: create widget
// ==========================================================
function w(
    name: string,
    type: ChartConfig["type"],
    table: string,
    xAxis: string,
    yAxis: string[],
    layout: { x: number; y: number; w: number; h: number },
    opts?: Partial<ChartConfig>
): Widget {
    const id = generateId();
    return {
        id,
        type: "chart",
        config: {
            name,
            type,
            dataSource: {
                table,
                xAxis,
                yAxis,
                aggregation: "sum",
                ...opts?.dataSource,
            },
            style: {
                showLegend: true,
                showGrid: true,
                showTooltip: true,
                showDataLabels: false,
                ...opts?.style,
            },
            ...opts,
        } as ChartConfig,
        layout: { i: id, ...layout },
    };
}

// helper to build a tab quickly
function tab(
    id: string,
    name: string,
    widgets: Widget[],
    options?: { drilldown?: DashboardDrilldownConfig; parentTabId?: string }
): DashboardTab {
    return {
        id,
        name,
        widgets,
        layout: widgets.map(widget => widget.layout),
        drilldown: options?.drilldown,
        parentTabId: options?.parentTabId,
    };
}

// ==========================================================
// 1. KPI Tổng quan Doanh thu (Sales KPI Overview)
//    Inspired by Vite example: Overall → Unit → Employee
// ==========================================================
export const kpiDoanhThuTemplate: DashboardTemplate = {
    id: "kpi-doanhthu",
    name: "KPI Doanh thu & Sản lượng",
    description: "Tổng quan KPI doanh thu, sản lượng toàn mạng. Drill-down từ tổng quan → đơn vị → chi tiết.",
    category: "sales",
    icon: "TrendingUp",
    tabs: [
        tab("kpi-overview", "Tổng quan", [
            // Row 1: KPI Cards
            w("Doanh thu toàn mạng", "statCard", "KPI_Data", "", ["DoanhThu"],
                { x: 0, y: 0, w: 4, h: 2 },
                { style: { cardIcon: "TrendingUp", cardColor: "#0066FF" } }),
            w("Sản lượng VNPTT", "statCard", "KPI_Data", "", ["SanLuong"],
                { x: 4, y: 0, w: 4, h: 2 },
                { style: { cardIcon: "Users", cardColor: "#10B981" } }),
            w("Tỷ lệ hoàn thành", "gauge", "KPI_Data", "", ["TienDo"],
                { x: 8, y: 0, w: 4, h: 2 }),

            // Row 2: Trend + Ranking
            w("Xu hướng doanh thu lũy kế", "composed", "KPI_Data",
                "Ngay", ["DoanhThu", "SanLuong", "KeHoach"],
                { x: 0, y: 2, w: 8, h: 5 },
                { style: { composedFieldTypes: { KeHoach: "line", DoanhThu: "area", SanLuong: "bar" } } }),
            w("Top đơn vị theo doanh thu", "horizontalBar", "KPI_DonVi",
                "DonVi", ["DoanhThu"],
                { x: 8, y: 2, w: 4, h: 5 },
                {
                    style: { showDataLabels: true },
                    dataSource: { drillDownHierarchy: ["DonVi"], crossFilterFields: ["DonVi"] },
                }),

            // Row 3: Table + Leaderboard
            w("Bảng tổng hợp đơn vị", "dataTileGrid", "KPI_DonVi",
                "DonVi", ["DoanhThu", "SanLuong", "TienDo"],
                { x: 0, y: 7, w: 8, h: 4 }),
            w("Thông điệp điều hành", "statCard", "KPI_Data", "", ["Note"],
                { x: 8, y: 7, w: 4, h: 4 },
                { style: { cardIcon: "MessageCircle", cardColor: "#6366F1" } }),
        ], {
            drilldown: {
                targetTabId: "kpi-unit",
                passFilters: [{ sourceField: "DonVi", targetField: "DonVi" }],
            },
        }),

        tab("kpi-unit", "Chi tiết đơn vị", [
            // KPI cards for unit
            w("Doanh thu đơn vị", "statCard", "KPI_DonVi", "", ["DoanhThu"],
                { x: 0, y: 0, w: 4, h: 2 },
                { style: { cardIcon: "Building2", cardColor: "#0066FF" } }),
            w("Sản lượng đơn vị", "statCard", "KPI_DonVi", "", ["SanLuong"],
                { x: 4, y: 0, w: 4, h: 2 },
                { style: { cardIcon: "Users", cardColor: "#10B981" } }),
            w("Tỷ lệ mua gói", "gauge", "KPI_DonVi", "", ["TyLeGoi"],
                { x: 8, y: 0, w: 4, h: 2 }),

            // Charts
            w("Xu hướng lũy kế đơn vị", "composed", "KPI_NhanVien",
                "Ngay", ["DoanhThu", "SanLuong"],
                { x: 0, y: 2, w: 8, h: 5 }),
            w("Top nhân viên", "horizontalBar", "KPI_NhanVien",
                "NhanVien", ["DoanhThu"],
                { x: 8, y: 2, w: 4, h: 5 },
                { style: { showDataLabels: true } }),

            // Delta chart + table
            w("Biến động theo ngày", "bar", "KPI_NhanVien",
                "Ngay", ["DeltaDoanhThu", "DeltaSanLuong"],
                { x: 0, y: 7, w: 5, h: 4 }),
            w("Bảng nhân viên đơn vị", "dataTileGrid", "KPI_NhanVien",
                "NhanVien", ["DoanhThu", "TienDo", "SanLuong"],
                { x: 5, y: 7, w: 7, h: 4 }),
        ], {
            parentTabId: "kpi-overview",
            drilldown: {
                targetTabId: "kpi-employee",
                passFilters: [{ sourceField: "NhanVien", targetField: "MaNV" }],
            },
        }),

        tab("kpi-employee", "Chi tiết nhân viên", [
            // KPI cards
            w("Doanh thu cá nhân", "statCard", "KPI_NhanVien", "", ["DoanhThu"],
                { x: 0, y: 0, w: 4, h: 2 },
                { style: { cardIcon: "UserRound", cardColor: "#0066FF" } }),
            w("Sản lượng cá nhân", "statCard", "KPI_NhanVien", "", ["SanLuong"],
                { x: 4, y: 0, w: 4, h: 2 },
                { style: { cardIcon: "BarChart3", cardColor: "#10B981" } }),
            w("Xếp hạng trong đơn vị", "statCard", "KPI_NhanVien", "", ["Rank"],
                { x: 8, y: 0, w: 4, h: 2 },
                { style: { cardIcon: "Medal", cardColor: "#F59E0B" } }),

            // Trend + Delta
            w("Xu hướng lũy kế cá nhân", "composed", "KPI_ChiTiet",
                "Ngay", ["DoanhThu", "SanLuong", "TyLeGoi"],
                { x: 0, y: 2, w: 8, h: 5 }),
            w("Nhận xét nhanh", "statCard", "KPI_ChiTiet", "", ["Note"],
                { x: 8, y: 2, w: 4, h: 5 },
                { style: { cardIcon: "Lightbulb", cardColor: "#6366F1" } }),

            w("Biến động theo ngày", "bar", "KPI_ChiTiet",
                "Ngay", ["DeltaDoanhThu"],
                { x: 0, y: 7, w: 12, h: 4 }),
        ], { parentTabId: "kpi-unit" }),
    ],
};

// ==========================================================
// 2. Phát triển mới Băng rộng
//    Based on: phattrienmoi.tsx + stored procedure sp_rpt_ThongKe_PTM_Theo_C2
// ==========================================================
export const phatTrienMoiTemplate: DashboardTemplate = {
    id: "ptm-bangrong",
    name: "Phát triển mới Băng rộng",
    description: "Phát triển mới FiberVNN, MeshWifi, IPTV. Drilldown tổng quan → phân tích → bản đồ.",
    category: "telecom",
    icon: "Wifi",
    tabs: [
        tab("ptm-overview", "Tổng quan", [
            // KPI row
            w("PTM Fiber tổng", "statCard", "PTM_Data", "", ["PTM_Fiber"],
                { x: 0, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "Wifi", cardColor: "#0066FF" } }),
            w("PTM MyTV tổng", "statCard", "PTM_Data", "", ["PTM_MyTV"],
                { x: 3, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "Tv", cardColor: "#8B5CF6" } }),
            w("PTM MeshWifi", "statCard", "PTM_Data", "", ["PTM_MC"],
                { x: 6, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "Router", cardColor: "#10B981" } }),
            w("Tiến độ KH", "gauge", "PTM_Data", "", ["TienDo"],
                { x: 9, y: 0, w: 3, h: 2 }),

            // Charts
            w("Thực hiện vs Kế hoạch theo đơn vị", "composed", "PTM_DonVi",
                "TenTat", ["ThucHien", "KeHoach"],
                { x: 0, y: 2, w: 8, h: 5 },
                {
                    style: { composedFieldTypes: { KeHoach: "line" } },
                    dataSource: { drillDownHierarchy: ["TenTat"], crossFilterFields: ["TenTat"] },
                }),
            w("Cơ cấu dịch vụ", "donut", "PTM_Data",
                "DichVu", ["SoLuong"],
                { x: 8, y: 2, w: 4, h: 5 }),

            // Unit tiles
            w("Lưới đơn vị", "dataTileGrid", "PTM_DonVi",
                "TenTat", ["ThucHien", "KeHoach", "TienDo"],
                { x: 0, y: 7, w: 12, h: 4 }),
        ], {
            drilldown: {
                targetTabId: "ptm-analysis",
                passFilters: [{ sourceField: "TenTat", targetField: "DonVi" }],
            },
        }),

        tab("ptm-analysis", "Phân tích", [
            w("So sánh PTM theo dịch vụ", "stackedBar", "PTM_DonVi",
                "TenTat", ["PTM_Fiber", "PTM_MyTV", "PTM_MC"],
                { x: 0, y: 0, w: 8, h: 5 }),
            w("Tỷ lệ hoàn thành", "radar", "PTM_DonVi",
                "TenTat", ["PctFiber", "PctMyTV", "PctMC"],
                { x: 8, y: 0, w: 4, h: 5 }),
            w("Tương quan PTM vs Rời mạng", "scatter", "PTM_DonVi",
                "PTM_Fiber", ["RM_Fiber"],
                { x: 0, y: 5, w: 6, h: 5 }),
            w("Xu hướng theo ngày", "area", "PTM_NgayData",
                "Ngay", ["PTM_Fiber", "PTM_MyTV"],
                { x: 6, y: 5, w: 6, h: 5 },
                { style: { showDataLabels: false } }),
        ], { parentTabId: "ptm-overview" }),

        tab("ptm-map", "Bản đồ", [
            w("Bản đồ phân bố PTM", "map", "PTM_DonVi",
                "MaTTVT", ["ThucHien"],
                { x: 0, y: 0, w: 8, h: 8 }),
            w("Top khu vực", "horizontalBar", "PTM_DonVi",
                "TenTat", ["ThucHien"],
                { x: 8, y: 0, w: 4, h: 4 },
                { style: { showDataLabels: true } }),
            w("Tỷ trọng theo vùng", "pie", "PTM_DonVi",
                "TenTat", ["ThucHien"],
                { x: 8, y: 4, w: 4, h: 4 }),
        ], { parentTabId: "ptm-overview" }),
    ],
};

// ==========================================================
// 3. Rời mạng & Suy giảm
//    Based on: roimang.tsx + sp_rpt_ThongKe_SLTB_PSC_PTM_RM_Theo_C2
// ==========================================================
export const roiMangTemplate: DashboardTemplate = {
    id: "roi-mang",
    name: "Rời mạng & Suy giảm",
    description: "Theo dõi thuê bao rời mạng, suy giảm. Drilldown tổng quan → phân tích → bản đồ.",
    category: "telecom",
    icon: "TrendingDown",
    tabs: [
        tab("rm-overview", "Tổng quan", [
            // KPI cards
            w("Rời mạng Fiber", "statCard", "RM_Data", "", ["RM_Fiber"],
                { x: 0, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "TrendingDown", cardColor: "#EF4444" } }),
            w("Rời mạng MyTV", "statCard", "RM_Data", "", ["RM_MyTV"],
                { x: 3, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "Tv", cardColor: "#F59E0B" } }),
            w("PSC Fiber", "statCard", "RM_Data", "", ["PSC_Fiber"],
                { x: 6, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "Shield", cardColor: "#10B981" } }),
            w("Tỷ lệ RM/PSC", "gauge", "RM_Data", "", ["TyLeRM"],
                { x: 9, y: 0, w: 3, h: 2 }),

            // Charts
            w("RM vs PTM theo đơn vị", "composed", "RM_DonVi",
                "TenTat", ["RM_Fiber", "PTM_Fiber"],
                { x: 0, y: 2, w: 8, h: 5 },
                {
                    style: {
                        composedFieldTypes: { PTM_Fiber: "line" },
                        conditionalColoring: { enabled: true, targetValue: 0, belowColor: "#EF4444", aboveColor: "#10B981" },
                    },
                    dataSource: { crossFilterFields: ["TenTat"] },
                }),
            w("Cơ cấu rời mạng", "donut", "RM_Data",
                "LoaiRM", ["SoLuong"],
                { x: 8, y: 2, w: 4, h: 5 }),

            // Tiles
            w("Lưới đơn vị (RM)", "dataTileGrid", "RM_DonVi",
                "TenTat", ["RM_Fiber", "PTM_Fiber", "NetAdd"],
                { x: 0, y: 7, w: 12, h: 4 }),
        ], {
            drilldown: {
                targetTabId: "rm-analysis",
                passFilters: [{ sourceField: "TenTat", targetField: "DonVi" }],
            },
        }),

        tab("rm-analysis", "Phân tích", [
            w("Xu hướng RM theo tháng", "area", "RM_TrendData",
                "Thang", ["RM_Fiber", "RM_MyTV", "Huy", "HuyTD"],
                { x: 0, y: 0, w: 8, h: 5 }),
            w("Radar đơn vị", "radar", "RM_DonVi",
                "TenTat", ["RM_Fiber", "PTM_Fiber", "TNNC", "TNYC"],
                { x: 8, y: 0, w: 4, h: 5 }),
            w("Tương quan RM vs PSC", "scatter", "RM_DonVi",
                "RM_Fiber", ["PSC_Fiber"],
                { x: 0, y: 5, w: 6, h: 5 }),
            w("Phễu rời mạng", "funnel", "RM_Data",
                "GiaiDoan", ["SoLuong"],
                { x: 6, y: 5, w: 6, h: 5 }),
        ], { parentTabId: "rm-overview" }),

        tab("rm-map", "Bản đồ", [
            w("Bản đồ rời mạng", "map", "RM_DonVi",
                "MaTTVT", ["RM_Fiber"],
                { x: 0, y: 0, w: 8, h: 8 }),
            w("Top rời mạng", "horizontalBar", "RM_DonVi",
                "TenTat", ["RM_Fiber"],
                { x: 8, y: 0, w: 4, h: 4 },
                { style: { showDataLabels: true } }),
            w("Tỷ trọng RM", "pie", "RM_DonVi",
                "TenTat", ["RM_Fiber"],
                { x: 8, y: 4, w: 4, h: 4 }),
        ], { parentTabId: "rm-overview" }),
    ],
};

// ==========================================================
// 4. Biến động Thuê bao (Net-Add)
//    Based on: trangthaithuebao.tsx
// ==========================================================
export const bienDongThueBaoTemplate: DashboardTemplate = {
    id: "bien-dong-tb",
    name: "Biến động Thuê bao",
    description: "Theo dõi PTM, khôi phục, thanh lý, tạm ngưng. Drilldown tổng quan → phân tích → bản đồ.",
    category: "telecom",
    icon: "Activity",
    tabs: [
        tab("bd-overview", "Tổng quan", [
            // KPI row
            w("Phát triển mới", "statCard", "BD_Data", "", ["PTM"],
                { x: 0, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "Plus", cardColor: "#10B981" } }),
            w("Khôi phục", "statCard", "BD_Data", "", ["KhoiPhuc"],
                { x: 3, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "RefreshCw", cardColor: "#3B82F6" } }),
            w("Thanh lý", "statCard", "BD_Data", "", ["ThanhLy"],
                { x: 6, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "Minus", cardColor: "#EF4444" } }),
            w("Net-Add", "statCard", "BD_Data", "", ["NetAdd"],
                { x: 9, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "TrendingUp", cardColor: "#6366F1" } }),

            // Charts
            w("Biến động theo đơn vị", "stackedBar", "BD_DonVi",
                "TenTat", ["PTM", "KhoiPhuc", "ThanhLy", "TamNgung"],
                { x: 0, y: 2, w: 8, h: 5 },
                { dataSource: { crossFilterFields: ["TenTat"] } }),
            w("Cơ cấu trạng thái", "donut", "BD_Data",
                "TrangThai", ["SoLuong"],
                { x: 8, y: 2, w: 4, h: 5 }),

            // Waterfall
            w("Net-Add theo đơn vị (Waterfall)", "waterfall", "BD_DonVi",
                "TenTat", ["NetAdd"],
                { x: 0, y: 7, w: 12, h: 4 }),
        ], {
            drilldown: {
                targetTabId: "bd-analysis",
                passFilters: [{ sourceField: "TenTat", targetField: "DonVi" }],
            },
        }),

        tab("bd-analysis", "Phân tích", [
            w("Xu hướng thuê bao theo tháng", "composed", "BD_TrendData",
                "Thang", ["PTM", "ThanhLy", "NetAdd"],
                { x: 0, y: 0, w: 8, h: 5 },
                { style: { composedFieldTypes: { NetAdd: "line" } } }),
            w("So sánh đơn vị (Radar)", "radar", "BD_DonVi",
                "TenTat", ["PTM", "KhoiPhuc", "ThanhLy", "TamNgung"],
                { x: 8, y: 0, w: 4, h: 5 }),
            w("Tương quan PTM vs Thanh lý", "scatter", "BD_DonVi",
                "PTM", ["ThanhLy"],
                { x: 0, y: 5, w: 6, h: 5 }),
            w("Chi tiết thuê bao", "dataTileGrid", "BD_DonVi",
                "TenTat", ["PTM", "KhoiPhuc", "ThanhLy", "TamNgung", "NetAdd"],
                { x: 6, y: 5, w: 6, h: 5 }),
        ], { parentTabId: "bd-overview" }),

        tab("bd-map", "Bản đồ", [
            w("Bản đồ Net-Add", "map", "BD_DonVi",
                "MaTTVT", ["NetAdd"],
                { x: 0, y: 0, w: 8, h: 8 }),
            w("Top Net-Add", "horizontalBar", "BD_DonVi",
                "TenTat", ["NetAdd"],
                { x: 8, y: 0, w: 4, h: 4 },
                { style: { showDataLabels: true } }),
            w("Tỷ trọng PTM", "pie", "BD_DonVi",
                "TenTat", ["PTM"],
                { x: 8, y: 4, w: 4, h: 4 }),
        ], { parentTabId: "bd-overview" }),
    ],
};

// ==========================================================
// 5. Executive Summary (Tổng quan điều hành)
//    General purpose - any industry
// ==========================================================
export const executiveSummaryTemplate: DashboardTemplate = {
    id: "executive-summary",
    name: "Tổng quan Điều hành",
    description: "Dashboard điều hành: KPI chính, xu hướng, so sánh. Phù hợp mọi ngành.",
    category: "general",
    icon: "LayoutDashboard",
    tabs: [
        tab("exec-main", "Tổng quan", [
            // KPI row
            w("Doanh thu", "statCard", "", "", ["Revenue"],
                { x: 0, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "DollarSign", cardColor: "#0066FF" } }),
            w("Khách hàng", "statCard", "", "", ["Customers"],
                { x: 3, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "Users", cardColor: "#10B981" } }),
            w("Đơn hàng", "statCard", "", "", ["Orders"],
                { x: 6, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "ShoppingCart", cardColor: "#F59E0B" } }),
            w("Tỷ lệ tăng trưởng", "gauge", "", "", ["Growth"],
                { x: 9, y: 0, w: 3, h: 2 }),

            // Trend + Distribution
            w("Xu hướng doanh thu", "area", "",
                "Month", ["Revenue", "Target"],
                { x: 0, y: 2, w: 8, h: 5 }),
            w("Phân bổ theo nhóm", "donut", "",
                "Category", ["Revenue"],
                { x: 8, y: 2, w: 4, h: 5 }),

            // Table
            w("Top hạng mục", "horizontalBar", "",
                "Item", ["Revenue"],
                { x: 0, y: 7, w: 6, h: 4 },
                { style: { showDataLabels: true } }),
            w("So sánh KPI", "radar", "",
                "KPI", ["Actual", "Target"],
                { x: 6, y: 7, w: 6, h: 4 }),
        ]),
    ],
};

// ==========================================================
// 6. Sales Performance (Hiệu suất Bán hàng)
// ==========================================================
export const salesPerformanceTemplate: DashboardTemplate = {
    id: "sales-performance",
    name: "Hiệu suất Bán hàng",
    description: "Theo dõi hiệu suất bán hàng, pipeline, conversion rate. Drilldown theo team → cá nhân.",
    category: "sales",
    icon: "Target",
    tabs: [
        tab("sales-overview", "Tổng quan", [
            w("Doanh số tháng", "statCard", "", "", ["Sales"],
                { x: 0, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "TrendingUp", cardColor: "#0066FF" } }),
            w("Conversion Rate", "gauge", "", "", ["ConversionRate"],
                { x: 3, y: 0, w: 3, h: 2 }),
            w("Deals Won", "statCard", "", "", ["DealsWon"],
                { x: 6, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "Trophy", cardColor: "#10B981" } }),
            w("Pipeline Value", "statCard", "", "", ["Pipeline"],
                { x: 9, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "Layers", cardColor: "#F59E0B" } }),

            w("Pipeline Funnel", "funnel", "",
                "Stage", ["Value"],
                { x: 0, y: 2, w: 5, h: 5 }),
            w("Doanh số theo thời gian", "composed", "",
                "Month", ["Revenue", "Target", "Pipeline"],
                { x: 5, y: 2, w: 7, h: 5 },
                { style: { composedFieldTypes: { Target: "line", Pipeline: "area" } } }),

            w("Leaderboard nhân viên", "horizontalBar", "",
                "Employee", ["Revenue"],
                { x: 0, y: 7, w: 6, h: 4 },
                { style: { showDataLabels: true } }),
            w("Phân bổ theo sản phẩm", "treemap", "",
                "Product", ["Revenue"],
                { x: 6, y: 7, w: 6, h: 4 }),
        ], {
            drilldown: {
                targetTabId: "sales-team",
                passFilters: [{ sourceField: "Team", targetField: "Team" }],
            },
        }),

        tab("sales-team", "Chi tiết Team", [
            w("Doanh số Team", "statCard", "", "", ["TeamSales"],
                { x: 0, y: 0, w: 4, h: 2 }),
            w("Win Rate", "gauge", "", "", ["WinRate"],
                { x: 4, y: 0, w: 4, h: 2 }),
            w("Avg Deal Size", "statCard", "", "", ["AvgDeal"],
                { x: 8, y: 0, w: 4, h: 2 }),

            w("Nhân viên trong team", "bar", "",
                "Employee", ["Revenue", "Target"],
                { x: 0, y: 2, w: 12, h: 5 }),
            w("Xu hướng doanh số team", "line", "",
                "Week", ["Revenue"],
                { x: 0, y: 7, w: 12, h: 4 }),
        ], { parentTabId: "sales-overview" }),
    ],
};

// ==========================================================
// 7. Geographic Analysis (Phân tích theo vùng)
// ==========================================================
export const geographicTemplate: DashboardTemplate = {
    id: "geographic",
    name: "Phân tích theo Vùng",
    description: "Dashboard với bản đồ phân bố và phân tích theo khu vực địa lý.",
    category: "geographic",
    icon: "MapPin",
    tabs: [
        tab("geo-main", "Bản đồ", [
            w("Bản đồ phân bố", "map", "",
                "MaTTVT", ["Value"],
                { x: 0, y: 0, w: 8, h: 8 }),
            w("Top khu vực", "horizontalBar", "",
                "Region", ["Value"],
                { x: 8, y: 0, w: 4, h: 4 },
                { style: { showDataLabels: true } }),
            w("Cơ cấu theo vùng", "pie", "",
                "Region", ["Value"],
                { x: 8, y: 4, w: 4, h: 4 }),
        ]),
    ],
};

// ==========================================================
// 8. Operational Monitoring (Giám sát Vận hành)
// ==========================================================
export const operationalTemplate: DashboardTemplate = {
    id: "operational",
    name: "Giám sát Vận hành",
    description: "Dashboard giám sát vận hành real-time: chất lượng dịch vụ, sự cố, uptime.",
    category: "general",
    icon: "Activity",
    tabs: [
        tab("ops-main", "Giám sát", [
            w("Uptime", "gauge", "", "", ["Uptime"],
                { x: 0, y: 0, w: 3, h: 2 }),
            w("Sự cố đang mở", "statCard", "", "", ["OpenIncidents"],
                { x: 3, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "AlertTriangle", cardColor: "#EF4444" } }),
            w("SLA Compliance", "gauge", "", "", ["SLA"],
                { x: 6, y: 0, w: 3, h: 2 }),
            w("Tickets resolved", "statCard", "", "", ["Resolved"],
                { x: 9, y: 0, w: 3, h: 2 },
                { style: { cardIcon: "CheckCircle", cardColor: "#10B981" } }),

            w("Sự cố theo thời gian", "area", "",
                "Hour", ["Incidents", "Resolved"],
                { x: 0, y: 2, w: 8, h: 5 }),
            w("Phân loại sự cố", "donut", "",
                "Type", ["Count"],
                { x: 8, y: 2, w: 4, h: 5 }),

            w("Hệ thống health", "dataTileGrid", "",
                "System", ["Status", "Uptime", "Latency"],
                { x: 0, y: 7, w: 12, h: 4 }),
        ]),
    ],
};

// ==========================================================
// ALL TEMPLATES
// ==========================================================

export const ALL_TEMPLATES: DashboardTemplate[] = [
    kpiDoanhThuTemplate,
    phatTrienMoiTemplate,
    roiMangTemplate,
    bienDongThueBaoTemplate,
    executiveSummaryTemplate,
    salesPerformanceTemplate,
    geographicTemplate,
    operationalTemplate,
];

export function getTemplateById(id: string): DashboardTemplate | undefined {
    return ALL_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): DashboardTemplate[] {
    return ALL_TEMPLATES.filter(t => t.category === category);
}
