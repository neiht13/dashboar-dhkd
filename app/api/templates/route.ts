import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "your-super-secret-key-change-in-production"
);

type TemplateRole = "admin" | "editor" | "viewer" | "user";

interface DefaultTemplate {
    name: string;
    description: string;
    category: string;
    widgets: unknown[];
    layout: unknown[];
    isPublic: boolean;
    isDefault: boolean;
    tags: string[];
    targetRoles?: TemplateRole[];
    persona?: string;
}

async function getUserFromToken(request: NextRequest) {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { userId: string; email: string; role: TemplateRole };
    } catch {
        return null;
    }
}

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
    {
        name: "Dashboard Trong",
        description: "Khoi tao nhanh dashboard moi.",
        category: "custom",
        widgets: [],
        layout: [],
        isPublic: true,
        isDefault: true,
        tags: ["default", "blank"],
    },
    {
        name: "Lanh dao - Tong quan dieu hanh",
        description: "Template tong hop KPI cap cao cho ban lanh dao.",
        category: "operations",
        widgets: [
            {
                id: "kpi_revenue",
                type: "kpi",
                config: { title: "Tong doanh thu", value: 0, format: "currency", color: "#0f766e" },
                layout: { i: "kpi_revenue", x: 0, y: 0, w: 3, h: 2 },
            },
            {
                id: "kpi_growth",
                type: "kpi",
                config: { title: "Tang truong", value: 0, format: "percent", color: "#2563eb" },
                layout: { i: "kpi_growth", x: 3, y: 0, w: 3, h: 2 },
            },
            {
                id: "kpi_churn",
                type: "kpi",
                config: { title: "Roi mang", value: 0, format: "percent", color: "#dc2626" },
                layout: { i: "kpi_churn", x: 6, y: 0, w: 3, h: 2 },
            },
            {
                id: "chart_main_trend",
                type: "chart",
                config: { type: "line", name: "Xu huong tong quan" },
                layout: { i: "chart_main_trend", x: 0, y: 2, w: 8, h: 5 },
            },
            {
                id: "chart_region_split",
                type: "chart",
                config: { type: "donut", name: "Ty trong theo khu vuc" },
                layout: { i: "chart_region_split", x: 8, y: 2, w: 4, h: 5 },
            },
        ],
        layout: [
            { i: "kpi_revenue", x: 0, y: 0, w: 3, h: 2 },
            { i: "kpi_growth", x: 3, y: 0, w: 3, h: 2 },
            { i: "kpi_churn", x: 6, y: 0, w: 3, h: 2 },
            { i: "chart_main_trend", x: 0, y: 2, w: 8, h: 5 },
            { i: "chart_region_split", x: 8, y: 2, w: 4, h: 5 },
        ],
        isPublic: true,
        isDefault: true,
        tags: ["lanh_dao", "tong_quan", "kpi"],
        targetRoles: ["admin"],
        persona: "lanh_dao",
    },
    {
        name: "Dieu hanh don vi - Van hanh tuc thoi",
        description: "Theo doi nang luc don vi, nghen mang va chat luong dich vu.",
        category: "operations",
        widgets: [
            {
                id: "kpi_ticket",
                type: "kpi",
                config: { title: "Su co mo", value: 0, format: "number", color: "#ea580c" },
                layout: { i: "kpi_ticket", x: 0, y: 0, w: 3, h: 2 },
            },
            {
                id: "kpi_sla",
                type: "kpi",
                config: { title: "SLA dat", value: 0, format: "percent", color: "#0284c7" },
                layout: { i: "kpi_sla", x: 3, y: 0, w: 3, h: 2 },
            },
            {
                id: "chart_unit_compare",
                type: "chart",
                config: { type: "bar", name: "So sanh don vi" },
                layout: { i: "chart_unit_compare", x: 0, y: 2, w: 6, h: 5 },
            },
            {
                id: "chart_heatmap",
                type: "chart",
                config: { type: "map", name: "Vung nong su co" },
                layout: { i: "chart_heatmap", x: 6, y: 2, w: 6, h: 5 },
            },
        ],
        layout: [
            { i: "kpi_ticket", x: 0, y: 0, w: 3, h: 2 },
            { i: "kpi_sla", x: 3, y: 0, w: 3, h: 2 },
            { i: "chart_unit_compare", x: 0, y: 2, w: 6, h: 5 },
            { i: "chart_heatmap", x: 6, y: 2, w: 6, h: 5 },
        ],
        isPublic: true,
        isDefault: true,
        tags: ["dieu_hanh", "operations", "network"],
        targetRoles: ["editor"],
        persona: "dieu_hanh",
    },
    {
        name: "Nhan vien kinh doanh - Hieu suat ban hang",
        description: "Bam sat pipeline, doanh thu ngay va muc tieu nhan vien.",
        category: "sales",
        widgets: [
            {
                id: "kpi_lead",
                type: "kpi",
                config: { title: "Lead moi", value: 0, format: "number", color: "#7c3aed" },
                layout: { i: "kpi_lead", x: 0, y: 0, w: 3, h: 2 },
            },
            {
                id: "kpi_conversion",
                type: "kpi",
                config: { title: "Ty le chot", value: 0, format: "percent", color: "#16a34a" },
                layout: { i: "kpi_conversion", x: 3, y: 0, w: 3, h: 2 },
            },
            {
                id: "chart_pipeline",
                type: "chart",
                config: { type: "funnel", name: "Funnel ban hang" },
                layout: { i: "chart_pipeline", x: 0, y: 2, w: 6, h: 5 },
            },
            {
                id: "chart_personal",
                type: "chart",
                config: { type: "line", name: "Tien do ca nhan" },
                layout: { i: "chart_personal", x: 6, y: 2, w: 6, h: 5 },
            },
        ],
        layout: [
            { i: "kpi_lead", x: 0, y: 0, w: 3, h: 2 },
            { i: "kpi_conversion", x: 3, y: 0, w: 3, h: 2 },
            { i: "chart_pipeline", x: 0, y: 2, w: 6, h: 5 },
            { i: "chart_personal", x: 6, y: 2, w: 6, h: 5 },
        ],
        isPublic: true,
        isDefault: true,
        tags: ["kinh_doanh", "sales", "pipeline"],
        targetRoles: ["viewer", "user"],
        persona: "kinh_doanh",
    },
];

async function seedDefaultTemplates(db: Awaited<ReturnType<typeof getDb>>) {
    const now = new Date();

    await Promise.all(
        DEFAULT_TEMPLATES.map((template) =>
            db.collection("dashboardtemplates").updateOne(
                { isDefault: true, name: template.name },
                {
                    $set: {
                        ...template,
                        updatedAt: now,
                    },
                    $setOnInsert: {
                        usageCount: 0,
                        createdAt: now,
                    },
                },
                { upsert: true }
            )
        )
    );
}

// GET /api/templates
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");
        const includePrivate = searchParams.get("includePrivate") === "true";
        const requestedRole = searchParams.get("role") as TemplateRole | null;
        const persona = searchParams.get("persona");

        const user = await getUserFromToken(request);
        const db = await getDb();

        await seedDefaultTemplates(db);

        const effectiveRole = requestedRole || user?.role;
        const andConditions: Record<string, unknown>[] = [];

        if (category) {
            andConditions.push({ category });
        }

        if (persona) {
            andConditions.push({ persona });
        }

        if (includePrivate && user) {
            andConditions.push({
                $or: [{ isPublic: true }, { createdBy: new ObjectId(user.userId) }],
            });
        } else {
            andConditions.push({ isPublic: true });
        }

        if (effectiveRole) {
            andConditions.push({
                $or: [
                    { targetRoles: { $exists: false } },
                    { targetRoles: { $size: 0 } },
                    { targetRoles: effectiveRole },
                ],
            });
        }

        const query =
            andConditions.length === 0
                ? {}
                : andConditions.length === 1
                    ? andConditions[0]
                    : { $and: andConditions };

        const templates = await db
            .collection("dashboardtemplates")
            .find(query)
            .sort({ usageCount: -1, createdAt: -1 })
            .toArray();

        return NextResponse.json({
            success: true,
            data: templates.map((template) => ({
                ...template,
                _id: template._id.toString(),
                createdBy: template.createdBy?.toString(),
            })),
        });
    } catch (error) {
        console.error("Error fetching templates:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch templates" },
            { status: 500 }
        );
    }
}

// POST /api/templates
export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            name,
            description,
            category,
            widgets,
            layout,
            isPublic,
            tags,
            thumbnail,
            targetRoles,
            persona,
        } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: "Template name is required" },
                { status: 400 }
            );
        }

        const safeTargetRoles = Array.isArray(targetRoles)
            ? targetRoles.filter((role: string) =>
                ["admin", "editor", "viewer", "user"].includes(role)
            )
            : [];

        const db = await getDb();
        const template = {
            name,
            description: description || "",
            category: category || "custom",
            thumbnail,
            widgets: widgets || [],
            layout: layout || [],
            isPublic: Boolean(isPublic),
            isDefault: false,
            createdBy: new ObjectId(user.userId),
            usageCount: 0,
            tags: tags || [],
            targetRoles: safeTargetRoles,
            persona: persona || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection("dashboardtemplates").insertOne(template);

        return NextResponse.json({
            success: true,
            data: {
                ...template,
                _id: result.insertedId.toString(),
                createdBy: user.userId,
            },
        });
    } catch (error) {
        console.error("Error creating template:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create template" },
            { status: 500 }
        );
    }
}
