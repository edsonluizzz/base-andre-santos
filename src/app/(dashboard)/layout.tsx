import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0d0d0d]">
      <Sidebar />
      {/* Main content area — offset by sidebar width on desktop */}
      <main className="flex-1 lg:ml-64 min-w-0">
        <div className="p-6 lg:p-8 pt-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
