/**
 * Mock data for telecom dashboard features
 * BTS/NodeB stations, coverage data, commercial KPIs
 */

export interface BTSStation {
    id: string;
    name: string;
    type: '2G' | '3G' | '4G' | '5G';
    lat: number;
    lng: number;
    province: string;
    district: string;
    signalStrength: number; // dBm (-50 to -110)
    traffic: number; // Mbps
    subscribers: number;
    status: 'active' | 'warning' | 'critical' | 'offline';
    uptime: number; // percentage
    lastUpdate: string;
    alarms: number;
    capacity: number; // percentage used
}

export interface CoveragePoint {
    lat: number;
    lng: number;
    signal2G: number | null;
    signal3G: number | null;
    signal4G: number | null;
    signal5G: number | null;
}

export interface CommercialKPI {
    period: string;
    arpu: number;
    newSubscribers: number;
    churnedSubscribers: number;
    netGrowth: number;
    revenue: number;
}

export interface RegionRevenue {
    province: string;
    code: string;
    revenue: number;
    subscribers: number;
    arpu: number;
    growth: number;
}

export interface PackageData {
    name: string;
    category: string;
    subscribers: number;
    revenue: number;
    children?: PackageData[];
}

export interface ChurnStage {
    stage: string;
    count: number;
    percentage: number;
}

// Vietnam provinces coordinates (simplified for major cities)
const VIETNAM_PROVINCES = [
    { name: 'Hà Nội', code: 'HN', lat: 21.0285, lng: 105.8542, region: 'north' },
    { name: 'TP. Hồ Chí Minh', code: 'HCM', lat: 10.8231, lng: 106.6297, region: 'south' },
    { name: 'Đà Nẵng', code: 'DN', lat: 16.0544, lng: 108.2022, region: 'central' },
    { name: 'Hải Phòng', code: 'HP', lat: 20.8449, lng: 106.6881, region: 'north' },
    { name: 'Cần Thơ', code: 'CT', lat: 10.0452, lng: 105.7469, region: 'south' },
    { name: 'Bình Dương', code: 'BD', lat: 11.3254, lng: 106.477, region: 'south' },
    { name: 'Đồng Nai', code: 'DNA', lat: 10.9574, lng: 106.8426, region: 'south' },
    { name: 'Nghệ An', code: 'NA', lat: 18.6788, lng: 105.6813, region: 'central' },
    { name: 'Thanh Hóa', code: 'TH', lat: 19.8067, lng: 105.7852, region: 'central' },
    { name: 'Quảng Ninh', code: 'QN', lat: 21.0064, lng: 107.2925, region: 'north' },
    { name: 'Bắc Ninh', code: 'BN', lat: 21.1861, lng: 106.0763, region: 'north' },
    { name: 'Khánh Hòa', code: 'KH', lat: 12.2388, lng: 109.1967, region: 'central' },
    { name: 'Long An', code: 'LA', lat: 10.5378, lng: 106.4133, region: 'south' },
    { name: 'Bà Rịa - Vũng Tàu', code: 'VT', lat: 10.4114, lng: 107.1362, region: 'south' },
    { name: 'Thừa Thiên Huế', code: 'HUE', lat: 16.4637, lng: 107.5909, region: 'central' },
];

// Generate random BTS stations
function generateBTSStations(count: number = 150): BTSStation[] {
    const stations: BTSStation[] = [];
    const types: BTSStation['type'][] = ['2G', '3G', '4G', '5G'];
    const statuses: BTSStation['status'][] = ['active', 'active', 'active', 'active', 'warning', 'critical', 'offline'];

    for (let i = 0; i < count; i++) {
        const province = VIETNAM_PROVINCES[Math.floor(Math.random() * VIETNAM_PROVINCES.length)];
        const type = types[Math.floor(Math.random() * types.length)];

        // Offset lat/lng randomly within province area
        const latOffset = (Math.random() - 0.5) * 0.3;
        const lngOffset = (Math.random() - 0.5) * 0.3;

        // Signal strength based on type
        const baseSignal = type === '5G' ? -65 : type === '4G' ? -70 : type === '3G' ? -80 : -85;
        const signalStrength = baseSignal + Math.floor(Math.random() * 30) - 15;

        stations.push({
            id: `BTS_${province.code}_${String(i + 1).padStart(3, '0')}`,
            name: `Trạm ${province.name} ${i + 1}`,
            type,
            lat: province.lat + latOffset,
            lng: province.lng + lngOffset,
            province: province.name,
            district: `Quận ${Math.floor(Math.random() * 12) + 1}`,
            signalStrength,
            traffic: Math.floor(Math.random() * 500) + 50,
            subscribers: Math.floor(Math.random() * 5000) + 500,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            uptime: 95 + Math.random() * 5,
            lastUpdate: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            alarms: Math.floor(Math.random() * 5),
            capacity: Math.floor(Math.random() * 40) + 40,
        });
    }

    return stations;
}

// Generate coverage grid points
function generateCoverageData(stations: BTSStation[]): CoveragePoint[] {
    const points: CoveragePoint[] = [];

    // Create grid around Vietnam
    for (let lat = 8.5; lat <= 23.5; lat += 0.5) {
        for (let lng = 102; lng <= 110; lng += 0.5) {
            // Find nearest stations of each type
            const nearbyStations = stations.filter(s => {
                const dist = Math.sqrt(Math.pow(s.lat - lat, 2) + Math.pow(s.lng - lng, 2));
                return dist < 1;
            });

            if (nearbyStations.length === 0) continue;

            const point: CoveragePoint = {
                lat,
                lng,
                signal2G: null,
                signal3G: null,
                signal4G: null,
                signal5G: null,
            };

            nearbyStations.forEach(station => {
                const dist = Math.sqrt(Math.pow(station.lat - lat, 2) + Math.pow(station.lng - lng, 2));
                const attenuation = dist * 20; // Signal weakens with distance
                const signal = station.signalStrength - attenuation;

                if (station.type === '2G' && (point.signal2G === null || signal > point.signal2G)) {
                    point.signal2G = signal;
                } else if (station.type === '3G' && (point.signal3G === null || signal > point.signal3G)) {
                    point.signal3G = signal;
                } else if (station.type === '4G' && (point.signal4G === null || signal > point.signal4G)) {
                    point.signal4G = signal;
                } else if (station.type === '5G' && (point.signal5G === null || signal > point.signal5G)) {
                    point.signal5G = signal;
                }
            });

            points.push(point);
        }
    }

    return points;
}

// Generate monthly commercial KPIs
function generateCommercialKPIs(): CommercialKPI[] {
    const kpis: CommercialKPI[] = [];
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    let baseSubscribers = 15000000;

    months.forEach((month, index) => {
        const newSubs = Math.floor(Math.random() * 200000) + 100000;
        const churned = Math.floor(Math.random() * 80000) + 40000;
        const netGrowth = newSubs - churned;
        baseSubscribers += netGrowth;

        kpis.push({
            period: `2025-${month}`,
            arpu: 85000 + Math.floor(Math.random() * 20000) - 10000,
            newSubscribers: newSubs,
            churnedSubscribers: churned,
            netGrowth,
            revenue: baseSubscribers * (85 + Math.random() * 20),
        });
    });

    return kpis;
}

// Generate region revenue data
function generateRegionRevenue(): RegionRevenue[] {
    return VIETNAM_PROVINCES.map(province => ({
        province: province.name,
        code: province.code,
        revenue: Math.floor(Math.random() * 500000000000) + 100000000000,
        subscribers: Math.floor(Math.random() * 2000000) + 500000,
        arpu: 75000 + Math.floor(Math.random() * 30000),
        growth: Math.floor(Math.random() * 20) - 5,
    }));
}

// Generate package distribution data (hierarchical)
function generatePackageData(): PackageData[] {
    return [
        {
            name: 'Gói cước Di động',
            category: 'mobile',
            subscribers: 8500000,
            revenue: 850000000000,
            children: [
                { name: 'Data Combo', category: 'mobile', subscribers: 3200000, revenue: 380000000000 },
                { name: 'Gọi + SMS', category: 'mobile', subscribers: 2800000, revenue: 220000000000 },
                { name: 'Sinh viên', category: 'mobile', subscribers: 1500000, revenue: 120000000000 },
                { name: 'Doanh nghiệp', category: 'mobile', subscribers: 1000000, revenue: 130000000000 },
            ],
        },
        {
            name: 'Internet cáp quang',
            category: 'fiber',
            subscribers: 2500000,
            revenue: 450000000000,
            children: [
                { name: 'Gia đình', category: 'fiber', subscribers: 1800000, revenue: 280000000000 },
                { name: 'Doanh nghiệp', category: 'fiber', subscribers: 500000, revenue: 150000000000 },
                { name: 'Gaming', category: 'fiber', subscribers: 200000, revenue: 20000000000 },
            ],
        },
        {
            name: 'Truyền hình',
            category: 'tv',
            subscribers: 1200000,
            revenue: 180000000000,
            children: [
                { name: 'Cơ bản', category: 'tv', subscribers: 700000, revenue: 70000000000 },
                { name: 'Premium', category: 'tv', subscribers: 350000, revenue: 80000000000 },
                { name: 'Combo', category: 'tv', subscribers: 150000, revenue: 30000000000 },
            ],
        },
        {
            name: 'Dịch vụ GTGT',
            category: 'vas',
            subscribers: 4000000,
            revenue: 120000000000,
            children: [
                { name: 'Nhạc', category: 'vas', subscribers: 1500000, revenue: 45000000000 },
                { name: 'Game', category: 'vas', subscribers: 1200000, revenue: 40000000000 },
                { name: 'Cloud', category: 'vas', subscribers: 800000, revenue: 25000000000 },
                { name: 'Khác', category: 'vas', subscribers: 500000, revenue: 10000000000 },
            ],
        },
    ];
}

// Generate churn funnel data
function generateChurnFunnel(): ChurnStage[] {
    const totalAtRisk = 500000;
    return [
        { stage: 'Thuê bao có rủi ro', count: totalAtRisk, percentage: 100 },
        { stage: 'Giảm sử dụng', count: Math.floor(totalAtRisk * 0.65), percentage: 65 },
        { stage: 'Ngưng nạp tiền', count: Math.floor(totalAtRisk * 0.40), percentage: 40 },
        { stage: 'Yêu cầu hủy', count: Math.floor(totalAtRisk * 0.18), percentage: 18 },
        { stage: 'Rời mạng', count: Math.floor(totalAtRisk * 0.12), percentage: 12 },
    ];
}

// Generate waterfall data (revenue changes)
function generateWaterfallData(): Array<{ name: string; value: number; type: 'start' | 'increase' | 'decrease' | 'total' }> {
    return [
        { name: 'Doanh thu Q3', value: 850000000000, type: 'start' },
        { name: 'Thuê bao mới', value: 120000000000, type: 'increase' },
        { name: 'Nâng cấp gói', value: 45000000000, type: 'increase' },
        { name: 'GTGT mới', value: 28000000000, type: 'increase' },
        { name: 'Thuê bao rời', value: -65000000000, type: 'decrease' },
        { name: 'Hạ gói cước', value: -22000000000, type: 'decrease' },
        { name: 'Khuyến mãi', value: -35000000000, type: 'decrease' },
        { name: 'Doanh thu Q4', value: 921000000000, type: 'total' },
    ];
}

// Export all mock data generators
export const mockTelecomData = {
    getBTSStations: () => generateBTSStations(150),
    getCoverageData: (stations: BTSStation[]) => generateCoverageData(stations),
    getCommercialKPIs: generateCommercialKPIs,
    getRegionRevenue: generateRegionRevenue,
    getPackageData: generatePackageData,
    getChurnFunnel: generateChurnFunnel,
    getWaterfallData: generateWaterfallData,
    provinces: VIETNAM_PROVINCES,
};

// Pre-generated static data for SSR
export const staticBTSStations = generateBTSStations(150);
export const staticCoverageData = generateCoverageData(staticBTSStations);
export const staticCommercialKPIs = generateCommercialKPIs();
export const staticRegionRevenue = generateRegionRevenue();
export const staticPackageData = generatePackageData();
export const staticChurnFunnel = generateChurnFunnel();
export const staticWaterfallData = generateWaterfallData();

export default mockTelecomData;
