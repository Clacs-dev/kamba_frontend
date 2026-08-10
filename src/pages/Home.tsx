import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Notificacoes from "../components/Notificacoes";

export default function Home() {
    const { user, logout } = useAuth();

    const iniciais = (user?.full_name || "")
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("");

    return (
        <div className="min-h-screen bg-bg">
            {/* Topbar */}
            <div className="flex items-center gap-3.5 px-5 py-2.5 bg-paper border-b border-line sticky top-0 z-50 shadow-sm">
                <div className="flex items-baseline gap-2">
                    <span className="font-serif font-semibold text-xl text-pri tracking-wide">KAMBA</span>
                    <span className="text-[9.5px] uppercase tracking-[0.2em] text-dim">
                        {user?.company_name || "Capital Humano · Desempenho · Cultura"}
                    </span>
                </div>
                <div className="flex-1" />
                <Notificacoes />
                <div className="flex items-center gap-2 text-xs text-dim">
                    <span>{user?.full_name}</span>
                    <div className="w-8 h-8 rounded-full bg-pri-bg text-pri-dark flex items-center justify-center font-semibold text-xs">
                        {iniciais}
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="border border-line rounded-lg px-3 py-1.5 bg-panel text-sm text-ink hover:border-pri hover:text-pri transition-colors"
                >
                    Sair
                </button>
            </div>

            {/* Corpo: sidebar + conteúdo (a página atual aparece no Outlet) */}
            <div className="flex min-h-[calc(100vh-53px)]">
                <Sidebar />
                <main className="flex-1 px-7 py-5 max-w-[1230px]">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}