/**
 * Charts Module - Export all chart components and utilities
 */

// Main Dynamic Chart Component
export { DynamicChart } from './DynamicChart';

// Individual Chart Type Components
export {
    LineChartComponent,
    BarChartComponent,
    AreaChartComponent,
    PieChartComponent,
    CardChartComponent,
    RadarChartComponent,
    ComposedChartComponent,
    FunnelChartComponent,
    ScatterChartComponent,
} from './types';

// Map Chart
export { MapChart } from './MapChart';

// Stat Card
export { StatCard } from './StatCard';

// Shared Components
export { DarkTooltip, LightTooltip, getTooltipComponent } from './shared/ChartTooltip';
export { ChartLegend, createLegendRenderer } from './shared/ChartLegend';
export { ChartDataLabel, createDataLabelRenderer } from './shared/ChartDataLabel';

// Utilities
export {
    formatDataLabel,
    getFieldLabel,
    getFieldColor,
    defaultAnimationConfig,
    lineAnimationConfig,
    buildLegendColorMap,
    filterDataByXAxisExclude,
    extractStyleProps,
} from './utils/chart-utils';

