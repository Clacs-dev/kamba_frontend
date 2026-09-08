import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";

interface Conversa {
    user_id: number;
    full_name: string;
    role: string;
    last_message: string;
    last_message_at: string;
    unread_count: number;
}

interface Mensagem {
    id: number;
    sender_id: number;
    recipient_id: number;
    body: string;
    is_read: boolean;
    created_at: string;
}

interface Colega { id: number; full_name: string; role: string; }

function formatarHora(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "";
    }
}

function formatarDataHora(iso: string): string {
    try {
        return new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch {
        return iso;
    }
}

// Chat directo entre utilizadores (alteração 7). Polling — sem infraestrutura
// de tempo real no projecto (ver decisão de arquitectura no plano). Mesma
// cadência do painel de notificações: 30s para a lista, 5s para a thread aberta.
export default function Chat() {
    const { user } = useAuth();
    const [conversas, setConversas] = useState<Conversa[]>([]);
    const [colegas, setColegas] = useState<Colega[]>([]);
    const [colegasCarregados, setColegasCarregados] = useState(false);
    const [activaId, setActivaId] = useState<number | null>(null);
    const [mensagens, setMensagens] = useState<Mensagem[]>([]);
    const [texto, setTexto] = useState("");
    const [aEnviar, setAEnviar] = useState(false);
    const [mostrarNovaConversa, setMostrarNovaConversa] = useState(false);
    const [filtroColega, setFiltroColega] = useState("");
    const fimThreadRef = useRef<HTMLDivElement>(null);

    const carregarConversas = () => {
        api.get("/chat/conversations").then((r) => setConversas(r.data || [])).catch(() => { });
    };

    const carregarColegas = () => {
        if (colegasCarregados) return;
        setColegasCarregados(true);
        api.get("/chat/colleagues").then((r) => setColegas(r.data || [])).catch(() => { });
    };

    const carregarMensagens = (comId: number) => {
        api.get(`/chat/conversations/${comId}/messages`)
            .then((r) => setMensagens(r.data || []))
            .then(carregarConversas) // a leitura marca mensagens como lidas — refresca o contador
            .catch(() => { });
    };

    // Lista de conversas: polling a cada 30s.
    useEffect(() => {
        carregarConversas();
        const intervalo = setInterval(carregarConversas, 30000);
        return () => clearInterval(intervalo);
    }, []);

    // Conversa aberta: polling a cada 5s.
    useEffect(() => {
        if (activaId == null) return;
        carregarMensagens(activaId);
        const intervalo = setInterval(() => carregarMensagens(activaId), 5000);
        return () => clearInterval(intervalo);
    }, [activaId]);

    useEffect(() => {
        fimThreadRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [mensagens]);

    const abrirConversa = (id: number) => {
        setActivaId(id);
        setMostrarNovaConversa(false);
        setMensagens([]);
    };

    const enviar = async () => {
        if (!activaId || !texto.trim()) return;
        setAEnviar(true);
        try {
            await api.post(`/chat/conversations/${activaId}/messages`, { body: texto.trim() });
            setTexto("");
            carregarMensagens(activaId);
        } catch {
            /* ignora — tenta de novo no próximo envio */
        } finally {
            setAEnviar(false);
        }
    };

    const activo = conversas.find((c) => c.user_id === activaId)
        || (activaId != null ? colegas.find((c) => c.id === activaId) : undefined);
    const nomeActivo = activo ? ("full_name" in activo ? activo.full_name : "") : "";

    const colegasFiltrados = colegas.filter((c) =>
        c.full_name.toLowerCase().includes(filtroColega.toLowerCase())
    );

    return (
        <div>
            <Cabecalho eyebrow="Comunicação interna" titulo="Chat" descricao="Converse directamente com colegas da sua empresa." />

            <Cartao className="p-0 overflow-hidden">
                <div className="flex h-[560px]">
                    {/* Lista de conversas */}
                    <div className="w-[260px] border-r border-line flex flex-col flex-shrink-0">
                        <div className="p-2.5 border-b border-line">
                            <button
                                onClick={() => { setMostrarNovaConversa(true); setActivaId(null); carregarColegas(); }}
                                className="w-full bg-pri text-white rounded-lg px-3 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors"
                            >
                                + Nova conversa
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {conversas.length === 0 ? (
                                <p className="text-dim text-[12px] text-center py-6 px-3">Ainda sem conversas. Comece uma nova.</p>
                            ) : (
                                conversas.map((c) => (
                                    <button
                                        key={c.user_id}
                                        onClick={() => abrirConversa(c.user_id)}
                                        className={`w-full text-left px-3 py-2.5 border-b border-line2 hover:bg-panel transition-colors ${activaId === c.user_id ? "bg-pri-bg" : ""}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[12.5px] font-semibold text-strong truncate">{c.full_name}</span>
                                            {c.unread_count > 0 && (
                                                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-bad text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                    {c.unread_count > 9 ? "9+" : c.unread_count}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-dim truncate mt-0.5">{c.last_message}</div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Thread / nova conversa */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {mostrarNovaConversa ? (
                            <div className="flex-1 overflow-y-auto p-3">
                                <p className="text-[10.5px] uppercase tracking-wide text-dim mb-2">Escolher colega</p>
                                <input
                                    value={filtroColega}
                                    onChange={(e) => setFiltroColega(e.target.value)}
                                    placeholder="Procurar por nome..."
                                    className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-2 focus:outline-none focus:border-pri"
                                />
                                <div className="space-y-1">
                                    {colegasFiltrados.map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => abrirConversa(c.id)}
                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-panel transition-colors text-[13px]"
                                        >
                                            <span className="font-semibold text-strong">{c.full_name}</span>
                                        </button>
                                    ))}
                                    {colegasCarregados && colegasFiltrados.length === 0 && (
                                        <p className="text-dim text-[12px] text-center py-4">Nenhum colega encontrado.</p>
                                    )}
                                </div>
                            </div>
                        ) : activaId == null ? (
                            <div className="flex-1 flex items-center justify-center">
                                <p className="text-dim text-[13px]">Escolha uma conversa ou comece uma nova.</p>
                            </div>
                        ) : (
                            <>
                                <div className="px-4 py-2.5 border-b border-line">
                                    <span className="text-[13px] font-semibold text-strong">{nomeActivo}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    {mensagens.map((m) => {
                                        const minha = m.sender_id === user?.id;
                                        return (
                                            <div key={m.id} className={`flex ${minha ? "justify-end" : "justify-start"}`}>
                                                <div className={`max-w-[70%] rounded-lg px-3 py-2 text-[13px] ${minha ? "bg-pri text-white" : "bg-panel border border-line text-ink"}`}>
                                                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                                                    <div className={`text-[10px] mt-1 ${minha ? "text-white/70" : "text-dim"}`}>
                                                        {formatarHora(m.created_at)}
                                                        {minha && (m.is_read ? " · lida" : " · enviada")}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={fimThreadRef} />
                                </div>
                                <div className="p-2.5 border-t border-line flex gap-2">
                                    <input
                                        value={texto}
                                        onChange={(e) => setTexto(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                                        placeholder="Escreva uma mensagem..."
                                        className="flex-1 bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                    />
                                    <button
                                        onClick={enviar}
                                        disabled={aEnviar || !texto.trim()}
                                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40"
                                    >
                                        Enviar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </Cartao>

            {activo && "last_message_at" in activo && (
                <p className="text-[11px] text-dim mt-2">Última mensagem: {formatarDataHora((activo as Conversa).last_message_at)}</p>
            )}
        </div>
    );
}
