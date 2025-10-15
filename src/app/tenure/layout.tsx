import TenureSidebar from "@/components/tenure/sidebar";

export default function TenureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <TenureSidebar />
      <main className="flex-1 bg-secondary/30">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
