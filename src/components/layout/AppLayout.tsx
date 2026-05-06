import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppLayout() {
  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-0 lg:px-4">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header />
          <main className="flex-1 px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pb-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
