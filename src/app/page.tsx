import { Board } from "@/components/layout/board";
import { Sidebar } from "@/components/layout/sidebar";

export default function Home() {
  return (
    <div className="grid h-screen max-h-screen min-h-0 grid-cols-[240px_1fr] overflow-hidden bg-background p-2 font-sans">
      <Sidebar />
      <Board />
    </div>
  );
}
