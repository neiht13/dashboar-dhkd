import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex bg-[#F8FAFC]">
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {children}
            </main>
        </div>
    );
}
