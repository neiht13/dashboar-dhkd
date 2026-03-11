import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { jwtVerify } from "jose";
import { evaluateAlert, nextRunAfterCheck, sendAlertNotifications } from "@/lib/alerts/engine";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "your-super-secret-key-change-in-production"
);

async function getUserFromToken(request: NextRequest) {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { userId: string; email: string; role: string };
    } catch {
        return null;
    }
}

// POST /api/alerts/dispatch
// Trigger due alerts manually (for cron or admin runbook).
export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const dryRun = body?.dryRun === true;
        const limit = Math.min(Math.max(Number(body?.limit) || 50, 1), 200);
        const now = new Date();

        const db = await getDb();
        const query: Record<string, unknown> = {
            isActive: true,
            $or: [
                { nextRunAt: { $lte: now } },
                { frequency: "realtime" },
            ],
        };

        if (user.role !== "admin") {
            query.createdBy = new ObjectId(user.userId);
        }

        const alerts = await db
            .collection("dataalerts")
            .find(query)
            .sort({ nextRunAt: 1, createdAt: 1 })
            .limit(limit)
            .toArray();

        const processed: Array<Record<string, unknown>> = [];

        for (const alert of alerts) {
            const evaluation = await evaluateAlert(alert as any);
            const shouldTrigger = evaluation.shouldTrigger;

            let notificationResults: Array<Record<string, unknown>> = [];
            if (shouldTrigger && !dryRun) {
                notificationResults = await sendAlertNotifications(alert as any, {
                    alertId: alert._id.toString(),
                    alertName: alert.name,
                    currentValue: evaluation.currentValue,
                    conditionsMet: evaluation.conditionsMet,
                    anomalyTriggered: evaluation.anomalyTriggered,
                    anomalyReason: evaluation.anomalyReason,
                    checkedAt: now.toISOString(),
                });
            }

            const nextRunAt = nextRunAfterCheck(alert as any, now);
            if (!dryRun) {
                await db.collection("dataalerts").updateOne(
                    { _id: alert._id },
                    {
                        $set: {
                            lastCheckedAt: now,
                            lastTriggeredAt: shouldTrigger ? now : alert.lastTriggeredAt || null,
                            previousValue: alert.lastValue ?? null,
                            lastValue: evaluation.currentValue,
                            nextRunAt,
                            updatedAt: now,
                        },
                        ...(shouldTrigger ? { $inc: { triggerCount: 1 } } : {}),
                    }
                );
            }

            processed.push({
                alertId: alert._id.toString(),
                name: alert.name,
                currentValue: evaluation.currentValue,
                conditionsMet: evaluation.conditionsMet,
                anomalyTriggered: evaluation.anomalyTriggered,
                shouldTrigger,
                notifications: notificationResults,
                nextRunAt,
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                dryRun,
                processedCount: processed.length,
                triggeredCount: processed.filter((item) => item.shouldTrigger).length,
                alerts: processed,
            },
        });
    } catch (error) {
        console.error("Error dispatching alerts:", error);
        return NextResponse.json(
            { success: false, error: "Failed to dispatch alerts" },
            { status: 500 }
        );
    }
}
