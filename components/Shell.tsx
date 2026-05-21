import { Sidebar } from "./Sidebar";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
