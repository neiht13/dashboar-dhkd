"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Chart designer page is deprecated.
 * All chart creation/editing is now done inline within the Dashboard Builder.
 * If ?edit=chartId is present, redirect to builder with that chart.
 */
export default function ChartDesignerRedirectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const editId = searchParams.get("edit");
        if (editId) {
            // TODO: Could redirect to specific dashboard containing this chart
            router.replace("/");
                        } else {
            router.replace("/builder/new");
        }
    }, [router, searchParams]);

    return (
                                    <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">
                Chức năng thiết kế biểu đồ đã được tích hợp vào Dashboard Builder.
                Đang chuyển hướng...
                                        </p>
                                    </div>
    );
}
