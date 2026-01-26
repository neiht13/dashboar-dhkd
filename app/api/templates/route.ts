import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
);

async function getUserFromToken(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { userId: string; email: string; role: string };
    } catch {
        return null;
    }
}

// Default templates to seed
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
            { id: "kpi_1", type: "kpi", config: { title: "Tổng Doanh thu", value: 0, format: "currency", color: "#0066FF" }, layout: { i: "kpi_1", x: 0, y: 0, w: 3, h: 2 } },
            { id: "kpi_2", type: "kpi", config: { title: "Đơn hàng mới", value: 0, format: "number", color: "#10B981" }, layout: { i: "kpi_2", x: 3, y: 0, w: 3, h: 2 } },
            { id: "kpi_3", type: "kpi", config: { title: "Khách hàng mới", value: 0, format: "number", color: "#8B5CF6" }, layout: { i: "kpi_3", x: 6, y: 0, w: 3, h: 2 } },
            { id: "kpi_4", type: "kpi", config: { title: "Tỷ lệ chuyển đổi", value: 0, format: "percent", color: "#F59E0B" }, layout: { i: "kpi_4", x: 9, y: 0, w: 3, h: 2 } },
            { id: "chart_1", type: "chart", config: { type: "line", title: "Xu hướng Doanh thu", dataSource: { xAxis: "month", yAxis: ["revenue"] } }, layout: { i: "chart_1", x: 0, y: 2, w: 8, h: 5 } },
            { id: "chart_2", type: "chart", config: { type: "pie", title: "Phân bố theo Khu vực", dataSource: { xAxis: "region", yAxis: ["value"] } }, layout: { i: "chart_2", x: 8, y: 2, w: 4, h: 5 } },
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
            { id: "chart_line", type: "chart", config: { type: "line", title: "Xu hướng theo thời gian" }, layout: { i: "chart_line", x: 0, y: 0, w: 6, h: 4 } },
            { id: "chart_bar", type: "chart", config: { type: "bar", title: "So sánh theo danh mục" }, layout: { i: "chart_bar", x: 6, y: 0, w: 6, h: 4 } },
            { id: "chart_area", type: "chart", config: { type: "area", title: "Biểu đồ vùng" }, layout: { i: "chart_area", x: 0, y: 4, w: 8, h: 4 } },
            { id: "chart_donut", type: "chart", config: { type: "donut", title: "Phân bố" }, layout: { i: "chart_donut", x: 8, y: 4, w: 4, h: 4 } },
        ],
        layout: [
            { i: "chart_line", x: 0, y: 0, w: 6, h: 4 },
            { i: "chart_bar", x: 6, y: 0, w: 6, h: 4 },
            { i: "chart_area", x: 0, y: 4, w: 8, h: 4 },
            { i: "chart_donut", x: 8, y: 4, w: 4, h: 4 },
        ],
        isPublic: true,
        isDefault: true,
        tags: ["analytics", "phân tích"],
    },
];

// Seed default templates if none exist
async function seedDefaultTemplates(db: ReturnType<typeof getDb> extends Promise<infer T> ? T : never) {
    const count = await db.collection('dashboardtemplates').countDocuments({ isDefault: true });
    if (count === 0) {
        const templates = DEFAULT_TEMPLATES.map(t => ({
            ...t,
            usageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        }));
        await db.collection('dashboardtemplates').insertMany(templates);
        console.log('Seeded default templates');
    }
}

// GET /api/templates - Get all templates
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const includePrivate = searchParams.get('includePrivate') === 'true';

        const user = await getUserFromToken(request);
        const db = await getDb();

        // Seed default templates if needed
        await seedDefaultTemplates(db);

        const query: Record<string, unknown> = {};

        if (category) {
            query.category = category;
        }

        // Show public templates and user's own templates
        if (includePrivate && user) {
            query.$or = [
                { isPublic: true },
                { createdBy: new ObjectId(user.userId) },
            ];
        } else {
            query.isPublic = true;
        }

        const templates = await db
            .collection('dashboardtemplates')
            .find(query)
            .sort({ usageCount: -1, createdAt: -1 })
            .toArray();

        return NextResponse.json({
            success: true,
            data: templates.map((t) => ({
                ...t,
                _id: t._id.toString(),
                createdBy: t.createdBy?.toString(),
            })),
        });
    } catch (error) {
        console.error('Error fetching templates:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch templates' },
            { status: 500 }
        );
    }
}

// POST /api/templates - Create new template
export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name, description, category, widgets, layout, isPublic, tags, thumbnail } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Template name is required' },
                { status: 400 }
            );
        }

        const db = await getDb();

        const template = {
            name,
            description: description || '',
            category: category || 'custom',
            thumbnail,
            widgets: widgets || [],
            layout: layout || [],
            isPublic: isPublic || false,
            isDefault: false,
            createdBy: new ObjectId(user.userId),
            usageCount: 0,
            tags: tags || [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection('dashboardtemplates').insertOne(template);

        return NextResponse.json({
            success: true,
            data: {
                ...template,
                _id: result.insertedId.toString(),
                createdBy: user.userId,
            },
        });
    } catch (error) {
        console.error('Error creating template:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create template' },
            { status: 500 }
        );
    }
}
