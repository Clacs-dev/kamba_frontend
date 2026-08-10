import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Notificacoes from "../components/Notificacoes";

export default function Home() {
    const { user, logout } = useAuth();
    const [menuAberto, setMenuAberto] = useState(false);

    const iniciais = (user?.full_name || "")
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("");

    return (
        <div className="min-h-screen bg-bg">
            {/* Topbar */}
            <div className="flex items-center gap-2 sm:gap-3.5 px-3 sm:px-5 py-2.5 bg-paper border-b border-line sticky top-0 z-50 shadow-sm">
                {/* Botão hambúrguer — só aparece em mobile */}
                <button
                    onClick={() => setMenuAberto(true)}
                    className="md:hidden w-9 h-9 rounded-lg bg-panel border border-line flex items-center justify-center text-lg flex-shrink-0"
                    aria-label="Abrir menu"
                >
                    ☰
                </button>

                <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-serif font-semibold text-lg sm:text-xl text-pri tracking-wide">KAMBA</span>
                    <span className="hidden sm:inline text-[9.5px] uppercase tracking-[0.2em] text-dim truncate">
                        {user?.company_name || "Capital Humano · Desempenho · Cultura"}
                    </span>
                </div>
                <div className="flex-1" />
                <Notificacoes />
                <div className="hidden sm:flex items-center gap-2 text-xs text-dim">
                    <span className="truncate max-w-[120px]">{user?.full_name}</span>
                    <div className="w-8 h-8 rounded-full bg-pri-bg text-pri-dark flex items-center justify-center font-semibold text-xs flex-shrink-0">
                        {iniciais}
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="border border-line rounded-lg px-2.5 sm:px-3 py-1.5 bg-panel text-sm text-ink hover:border-pri hover:text-pri transition-colors flex-shrink-0"
                >
                    Sair
                </button>
            </div>

            {/* Corpo */}
            <div className="flex min-h-[calc(100vh-53px)]">
                {/* Sidebar: fixa em desktop; deslizante (overlay) em mobile */}
                <Sidebar aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />

                <main className="flex-1 px-4 sm:px-7 py-4 sm:py-5 max-w-[1230px] w-full overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}