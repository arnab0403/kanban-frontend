import { Board } from "@/components/layout/board";
import { Sidebar } from "@/components/layout/sidebar";

export default function Home() {
  return (
    <div className="p-2 grid min-h-screen grid-cols-[240px_1fr] bg-background font-sans">
      <Sidebar />
      <Board />
    </div>
  );
}
