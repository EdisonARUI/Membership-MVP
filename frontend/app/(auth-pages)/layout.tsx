import Link from "next/link";
import { Sparkles } from "lucide-react";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="w-full py-4 px-8 border-b border-slate-700">
        <div className="max-w-7xl mx-auto flex items-center">
          <Link href="/" className="flex items-center space-x-2 text-xl font-bold">
            <Sparkles className="h-6 w-6 text-yellow-400" />
            <span>FREEHOME</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center py-12">
        <div className="max-w-7xl w-full px-4">{children}</div>
      </main>
    </div>
  );
}
