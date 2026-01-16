// Chart Components Index
// Export all chart components for easy importing

// Dynamic chart (main chart for dashboard)
export { DynamicChart } from './DynamicChart';

// Chart style types for the dashboard builder
// Note: Glow, Hatched, and Highlighted effects are now built-in to DynamicChart
// for line, bar, and area charts respectively
export const CHART_STYLES = {
    default: {
        label: "Mặc định",
        description: "Biểu đồ cơ bản",
    },
    glowing: {
        label: "Phát sáng",
        description: "Đường có hiệu ứng glow",
    },
    hatched: {
        label: "Kẻ sọc",
        description: "Vùng với pattern kẻ sọc động",
    },
    highlighted: {
        label: "Nổi bật",
        description: "Thanh nổi bật khi hover",
    },
} as const;

export type ChartStyleType = keyof typeof CHART_STYLES;
