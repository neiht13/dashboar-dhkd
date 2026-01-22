// Script để tạo các default templates
// Chạy với: npx ts-node scripts/seed-templates.ts

const DEFAULT_TEMPLATES = [
    {
        name: "Dashboard Trống",
        description: "Bắt đầu với dashboard trống",
        category: "custom",
        widgets: [],
        layout: [],
        isPublic: true,
        isDefault: true,
        tags: ["trống", "mặc định"],
    },
    {
        name: "Tổng quan Doanh thu",
        description: "Dashboard theo dõi doanh thu với các KPI và biểu đồ cơ bản",
        category: "sales",
        widgets: [
            {
                id: "kpi_1",
                type: "kpi",
                config: {
                    title: "Tổng Doanh thu",
                    value: 0,
                    format: "currency",
                    color: "#0066FF",
                    icon: "DollarSign",
                },
                layout: { i: "kpi_1", x: 0, y: 0, w: 3, h: 2 },
            },
            {
                id: "kpi_2",
                type: "kpi",
                config: {
                    title: "Đơn hàng mới",
                    value: 0,
                    format: "number",
                    color: "#10B981",
                    icon: "ShoppingCart",
                },
                layout: { i: "kpi_2", x: 3, y: 0, w: 3, h: 2 },
            },
            {
                id: "kpi_3",
                type: "kpi",
                config: {
                    title: "Khách hàng mới",
                    value: 0,
                    format: "number",
                    color: "#8B5CF6",
                    icon: "Users",
                },
                layout: { i: "kpi_3", x: 6, y: 0, w: 3, h: 2 },
            },
            {
                id: "kpi_4",
                type: "kpi",
                config: {
                    title: "Tỷ lệ chuyển đổi",
                    value: 0,
                    format: "percent",
                    color: "#F59E0B",
                    icon: "TrendingUp",
                },
                layout: { i: "kpi_4", x: 9, y: 0, w: 3, h: 2 },
            },
            {
                id: "chart_1",
                type: "chart",
                config: {
                    type: "line",
                    title: "Xu hướng Doanh thu",
                    dataSource: { xAxis: "month", yAxis: ["revenue"] },
                    style: { colors: ["#0066FF"] },
                },
                layout: { i: "chart_1", x: 0, y: 2, w: 8, h: 5 },
            },
            {
                id: "chart_2",
                type: "chart",
                config: {
                    type: "pie",
                    title: "Phân bố theo Khu vực",
                    dataSource: { xAxis: "region", yAxis: ["value"] },
                },
                layout: { i: "chart_2", x: 8, y: 2, w: 4, h: 5 },
            },
        ],
        layout: [
            { i: "kpi_1", x: 0, y: 0, w: 3, h: 2 },
            { i: "kpi_2", x: 3, y: 0, w: 3, h: 2 },
            { i: "kpi_3", x: 6, y: 0, w: 3, h: 2 },
            { i: "kpi_4", x: 9, y: 0, w: 3, h: 2 },
            { i: "chart_1", x: 0, y: 2, w: 8, h: 5 },
            { i: "chart_2", x: 8, y: 2, w: 4, h: 5 },
        ],
        isPublic: true,
        isDefault: true,
        tags: ["doanh thu", "sales", "kpi"],
    },
    {
        name: "Analytics Dashboard",
        description: "Dashboard phân tích với nhiều loại biểu đồ",
        category: "analytics",
        widgets: [
            {
                id: "chart_line",
                type: "chart",
                config: {
                    type: "line",
                    title: "Xu hướng theo thời gian",
                    dataSource: { xAxis: "date", yAxis: ["value"] },
                },
                layout: { i: "chart_line", x: 0, y: 0, w: 6, h: 4 },
            },
            {
                id: "chart_bar",
                type: "chart",
                config: {
                    type: "bar",
                    title: "So sánh theo danh mục",
                    dataSource: { xAxis: "category", yAxis: ["value"] },
                },
                layout: { i: "chart_bar", x: 6, y: 0, w: 6, h: 4 },
            },
            {
                id: "chart_area",
                type: "chart",
                config: {
                    type: "area",
                    title: "Biểu đồ vùng",
                    dataSource: { xAxis: "month", yAxis: ["value1", "value2"] },
                },
                layout: { i: "chart_area", x: 0, y: 4, w: 8, h: 4 },
            },
            {
                id: "chart_donut",
                type: "chart",
                config: {
                    type: "donut",
                    title: "Phân bố",
                    dataSource: { xAxis: "name", yAxis: ["value"] },
                },
                layout: { i: "chart_donut", x: 8, y: 4, w: 4, h: 4 },
            },
        ],
        layout: [
            { i: "chart_line", x: 0, y: 0, w: 6, h: 4 },
            { i: "chart_bar", x: 6, y: 0, w: 6, h: 4 },
            { i: "chart_area", x: 0, y: 4, w: 8, h: 4 },
            { i: "chart_donut", x: 8, y: 4, w: 4, h: 4 },
        ],
        isPublic: true,
        isDefault: true,
        tags: ["analytics", "phân tích", "biểu đồ"],
    },
    {
        name: "Operations Dashboard",
        description: "Dashboard vận hành với các chỉ số quan trọng",
        category: "operations",
        widgets: [
            {
                id: "kpi_ops_1",
                type: "kpi",
                config: {
                    title: "Uptime",
                    value: 99.9,
                    format: "percent",
                    color: "#10B981",
                },
                layout: { i: "kpi_ops_1", x: 0, y: 0, w: 4, h: 2 },
            },
            {
                id: "kpi_ops_2",
                type: "kpi",
                config: {
                    title: "Requests/s",
                    value: 1250,
                    format: "number",
                    color: "#0066FF",
                },
                layout: { i: "kpi_ops_2", x: 4, y: 0, w: 4, h: 2 },
            },
            {
                id: "kpi_ops_3",
                type: "kpi",
                config: {
                    title: "Error Rate",
                    value: 0.1,
                    format: "percent",
                    color: "#EF4444",
                },
                layout: { i: "kpi_ops_3", x: 8, y: 0, w: 4, h: 2 },
            },
            {
                id: "chart_ops_1",
                type: "chart",
                config: {
                    type: "composed",
                    title: "Performance Metrics",
                    dataSource: { xAxis: "time", yAxis: ["cpu", "memory", "network"] },
                },
                layout: { i: "chart_ops_1", x: 0, y: 2, w: 12, h: 5 },
            },
        ],
        layout: [
            { i: "kpi_ops_1", x: 0, y: 0, w: 4, h: 2 },
            { i: "kpi_ops_2", x: 4, y: 0, w: 4, h: 2 },
            { i: "kpi_ops_3", x: 8, y: 0, w: 4, h: 2 },
            { i: "chart_ops_1", x: 0, y: 2, w: 12, h: 5 },
        ],
        isPublic: true,
        isDefault: true,
        tags: ["operations", "vận hành", "monitoring"],
    },
];

// Export để có thể sử dụng từ API route
export { DEFAULT_TEMPLATES };
