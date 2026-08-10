import { useEffect, useState, useRef } from "react";
import api from "../lib/api";

interface Notificacao {
    id: number;
    title: string;
    message: string;
    category: string;
    is_read: boolean;
    created_at: string;
    link?: string | null;
}

export default function Notificacoes() {
    const [aberto, setAberto] = useState(false);
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [naoLidas, setNaoLidas] = useState(0);
    const painelRef = useRef<HTMLDivElement>(null);

    // Busca o contador de não lidas.
    const buscarContador = () => {
        api.get("/notifications/unread-count")
            .then((r) => setNaoLidas(r.data.count ?? r.data.unread ?? 0))
            .catch(() => { });
    };

    // Busca a lista completa (quando abre o painel).
    const buscarLista = () => {
        api.get("/notifications")
            .then((r) => setNotificacoes(r.data))
            .catch(() => { });
    };

    // Ao montar, busca o contador e repete a cada 30 segundos (polling).
    useEffect(() => {
        buscarContador();
        const intervalo = setInterval(buscarContador, 30000);
        return () => clearInterval(intervalo);
    }, []);

    // Ao abrir o painel, busca a lista.
    useEffect(() => {
        if (aberto) buscarLista();
    }, [aberto]);

    // Fecha o painel ao clicar fora.
    useEffect(() => {
        const aoClicarFora = (e: MouseEvent) => {
            if (painelRef.current && !painelRef.current.contains(e.target as Node)) {
                setAberto(false);
            }
        };
        if (aberto) document.addEventListener("mousedown", aoClicarFora);
        return () => document.removeEventListener("mousedown", aoClicarFora);
    }, [aberto]);

    const marcarComoLida = async (id: number) => {
        try {
            await api.post(`/notifications/${id}/read`);
            buscarContador();
            buscarLista();
        } catch { /* ignora */ }
    };

    const marcarTodas = async () => {
        try {
            await api.post("/notifications/read-all");
            buscarContador();
            buscarLista();
        } catch { /* ignora */ }
    };

    return (
        <div className="relative" ref={painelRef}>
            <button
                onClick={() => setAberto(!aberto)}
                className="relative w-9 h-9 rounded-lg bg-panel border border-line flex items-center justify-center hover:border-pri transition-colors"
                title="Notificações"
            >
                <span className="text-[15px]">🔔</span>
                {naoLidas > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-bad text-white text-[10px] font-bold flex items-center justify-center">
                        {naoLidas > 9 ? "9+" : naoLidas}
                    </span>
                )}
            </button>

            {aberto && (
                <div className="absolute right-0 top-11 w-80 bg-paper border border-line rounded-xl shadow-2xl z-[100] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
                        <span className="text-[13px] font-semibold text-strong">Notificações</span>
                        {naoLidas > 0 && (
                            <button onClick={marcarTodas} className="text-[11px] text-pri font-semibold hover:underline">
                                Marcar todas como lidas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[380px] overflow-y-auto">
                        {notificacoes.length === 0 ? (
                            <p className="text-dim text-sm text-center py-8">Sem notificações.</p>
                        ) : (
                            notificacoes.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => !n.is_read && marcarComoLida(n.id)}
                                    className={`px-4 py-3 border-b border-line2 cursor-pointer hover:bg-panel ${n.is_read ? "opacity-60" : ""
                                        }`}
                                >
                                    <div className="flex items-start gap-2">
                                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-pri mt-1.5 flex-shrink-0" />}
                                        <div className={n.is_read ? "" : "-ml-0"}>
                                            <div className="text-[12.5px] font-semibold text-strong">{n.title}</div>
                                            <div className="text-[11.5px] text-dim mt-0.5">{n.message}</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}