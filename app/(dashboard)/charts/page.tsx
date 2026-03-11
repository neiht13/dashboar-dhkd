"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Charts page is deprecated.
 * All chart design is now done inline within the Dashboard Builder.
 * Redirect to home page (dashboard list).
 */
export default function ChartsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/");
    }, [router]);

    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">
                Chức năng thiết kế biểu đồ đã được tích hợp vào Trình xây dựng Dashboard.
                Đang chuyển hướng...
            </p>
        </div>
    );
}
