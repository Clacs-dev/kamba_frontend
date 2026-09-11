import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";

interface Conversa {
    user_id: number;
    full_name: string;
    role: string;
    last_message: string;
    last_message_at: string;
    unread_count: number;
}

interface Colega {
    id: number;
    full_name: string;
    role: string;
}

interface Mensagem {
    id: number;
    sender_id: number;
    recipient_id: number;
    body: string;
    is_read: boolean;
    created_at: string;
}

const ROTULO_PERFIL: Record<string, string> = {
    colaborador: "Colaborador", director: "Director", capital_humano: "Capital Humano",
    comissao: "Comissão de Avaliação", administracao: "Administração", admin: "Admin",
};

function traduzPerfil(role: string): string {
    return ROTULO_PERFIL[role] || role;
}

// A API devolve as datas em UTC. Quando a string não traz fuso (ex.: "2026-09-11T12:13:08"),
// o browser interpretaria como hora local — por isso marca explicitamente como UTC.
function paraData(iso: string): Date {
    if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)) {
        return new Date(iso.replace(" ", "T") + "Z");
    }
    return new Date(iso);
}

function formatarHora(iso: string): string {
    try {
        return paraData(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "";
    }
}

function formatarDataLista(iso: string): string {
    try {
        const d = paraData(iso);
        const hoje = new Date();
        if (d.toDateString() === hoje.toDateString()) {
            return formatarHora(iso);
        }
        return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
    } catch {
        return "";
    }
}

function iniciais(nome: string): string {
    return nome
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

// Chave que só muda quando a informação realmente muda (evita re-renders e saltos).
function chaveMensagens(lista: Mensagem[]): string {
    return lista.map((m) => `${m.id}:${m.is_read}`).join("|");
}

function chaveConversas(lista: Conversa[]): string {
    return lista
        .map((c) => `${c.user_id}:${c.last_message_at}:${c.unread_count}:${c.last_message}`)
        .join("|");
}

export default function Chat() {
    const { user } = useAuth();
    const [conversas, setConversas] = useState<Conversa[]>([]);
    const [colegas, setColegas] = useState<Colega[]>([]);
    const [ativos, setAtivos] = useState<number | null>(null);
    const [mensagens, setMensagens] = useState<Mensagem[]>([]);
    const [texto, setTexto] = useState("");
    const [aProcurar, setAProcurar] = useState(false);
    const [aEnviar, setAEnviar] = useState(false);
    const [aCarregarMensagens, setACarregarMensagens] = useState(false);
    const [erro, setErro] = useState("");

    // Controlo fino de quando é preciso "mexer" no ecrã.
    const fimRef = useRef<HTMLDivElement>(null);
    const ultimaChaveMsgs = useRef("");
    const ultimaChaveConvs = useRef("");
    const ultimoTamanho = useRef<number | null>(null);
    const [rolar, setRolar] = useState(0); // incrementa quando há scroll para baixo

    const parceiro = conversas.find((c) => c.user_id === ativos) ?? colegas.find((c) => c.id === ativos);
    const contadorAtivos = conversas.find((c) => c.user_id === ativos)?.unread_count ?? 0;

    const solicitarRolagem = () => setRolar((s) => s + 1);

    const carregarMensagens = (userId: number, silencioso = false) => {
        if (!silencioso) setACarregarMensagens(true);
        api.get(`/chat/conversations/${userId}/messages`)
            .then((r) => {
                const lista: Mensagem[] = r.data;
                const chave = chaveMensagens(lista);
                if (chave !== ultimaChaveMsgs.current) {
                    const haNovas = ultimoTamanho.current !== null && lista.length > ultimoTamanho.current;
                    const primeira = ultimoTamanho.current === null;
                    setMensagens(lista);
                    ultimaChaveMsgs.current = chave;
                    ultimoTamanho.current = lista.length;
                    // Rola só na primeira abertura ou quando chegam mensagens novas.
                    if (primeira || haNovas) solicitarRolagem();
                }
            })
            .catch((e) => setErro(e.response?.data?.detail || "Erro ao carregar a conversa."))
            .finally(() => setACarregarMensagens(false));
    };

    const carregarConversas = () => {
        api.get("/chat/conversations")
            .then((r) => {
                const lista: Conversa[] = r.data;
                const chave = chaveConversas(lista);
                if (chave !== ultimaChaveConvs.current) {
                    setConversas(lista);
                    ultimaChaveConvs.current = chave;
                }
            })
            .catch(() => { });
    };

    const carregarColegas = () => {
        api.get("/chat/colleagues")
            .then((r) => setColegas(r.data))
            .catch(() => { });
    };

    const abrirConversa = (userId: number) => {
        setErro("");
        // Prepara a primeira carga: nunca compara com a conversa anterior.
        ultimaChaveMsgs.current = "";
        ultimoTamanho.current = null;
        setAtivos(userId);
        carregarMensagens(userId, false);
        carregarConversas(); // a leitura do histórico atualiza os não lidos
    };

    const enviar = async () => {
        if (ativos === null || !texto.trim() || aEnviar) return;
        setAEnviar(true);
        try {
            const r = await api.post(`/chat/conversations/${ativos}/messages`, { body: texto.trim() });
            setMensagens((prev) => [...prev, r.data]);
            ultimaChaveMsgs.current = "";
            ultimoTamanho.current = (ultimoTamanho.current ?? 0) + 1;
            setTexto("");
            solicitarRolagem();
            carregarConversas();
        } catch (e: any) {
            setErro(e.response?.data?.detail || "Não foi possível enviar a mensagem.");
        } finally {
            setAEnviar(false);
        }
    };

    // Ao montar: conversas + colegas (uma vez) e polling leve de 30s.
    useEffect(() => {
        carregarConversas();
        carregarColegas();
        const intervalo = setInterval(carregarConversas, 30000);
        return () => clearInterval(intervalo);
    }, []);

    // Enquanto está numa conversa, faz polling rápido (5s) mas silencioso:
    // não mostra o spinner nem rola a menos que haja mensagens novas.
    useEffect(() => {
        if (ativos === null) return;
        const intervalo = setInterval(() => {
            carregarMensagens(ativos, true);
            carregarConversas();
        }, 5000);
        return () => clearInterval(intervalo);
    }, [ativos]);

    // Só roda (descendo) quando é solicitado — nunca por causa do polling.
    useEffect(() => {
        if (rolar > 0) {
            fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [rolar]);

    const nomeDestino = parceiro?.full_name || "Colega";
    const inicialDestino = iniciais(nomeDestino);

    return (
        <div>
            <Cabecalho
                eyebrow="Comunicação interna"
                titulo="Mensagens"
                descricao="Conversa direta entre colegas da mesma empresa. As mensagens novas aparecem com o contador no topo."
            />

            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}

            <div className="flex flex-col lg:flex-row gap-4 items-stretch h-[560px]">
                {/* Coluna de conversas */}
                <div className="lg:w-[300px] w-full flex flex-col bg-paper border border-line rounded-xl overflow-hidden shrink-0">
                    <div className="px-4 py-2.5 border-b border-line flex items-center justify-between">
                        <span className="side-lab">Conversas</span>
                        <button
                            onClick={() => setAProcurar(!aProcurar)}
                            className="text-[11.5px] font-semibold text-pri hover:underline"
                        >
                            {aProcurar ? "Fechar nova" : "+ Nova conversa"}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {aProcurar && (
                            <div className="border-b border-line2">
                                <div className="side-lab px-4 pt-3 pb-1.5">Colegas disponíveis</div>
                                {colegas.length === 0 ? (
                                    <p className="text-dim text-[12px] px-4 pb-3">Sem colegas disponíveis.</p>
                                ) : (
                                    colegas.map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                abrirConversa(c.id);
                                                setAProcurar(false);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-panel text-left"
                                        >
                                            <span className="w-[30px] h-[30px] rounded-full bg-pri-bg text-pri-dark flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                                                {iniciais(c.full_name)}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[12.5px] font-semibold text-strong truncate">{c.full_name}</span>
                                                <span className="block text-[10.5px] text-dim truncate">{traduzPerfil(c.role)}</span>
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        {conversas.length === 0 && !aProcurar ? (
                            <p className="text-dim text-[12.5px] text-center py-10 px-4">
                                Ainda não tens conversas.
                                <br />
                                Usa "+ Nova conversa" para falar com um colega.
                            </p>
                        ) : (
                            conversas.map((c) => (
                                <button
                                    key={c.user_id}
                                    onClick={() => abrirConversa(c.user_id)}
                                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left border-b border-line2 transition-colors ${ativos === c.user_id ? "bg-pri-bg" : "hover:bg-panel"
                                        }`}
                                >
                                    <span className="relative flex-shrink-0">
                                        <span className="w-[34px] h-[34px] rounded-full bg-pri text-white flex items-center justify-center text-[12px] font-semibold">
                                            {iniciais(c.full_name)}
                                        </span>
                                        {c.unread_count > 0 && (
                                            <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-bad text-white text-[9.5px] font-bold flex items-center justify-center">
                                                {c.unread_count > 9 ? "9+" : c.unread_count}
                                            </span>
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-baseline justify-between gap-2">
                                            <span className="text-[12.5px] font-semibold text-strong truncate">{c.full_name}</span>
                                            <span className="text-[10px] text-dim flex-shrink-0">{formatarDataLista(c.last_message_at)}</span>
                                        </span>
                                        <span className={`block text-[11.5px] truncate ${c.unread_count > 0 ? "text-ink font-medium" : "text-dim"}`}>
                                            {c.last_message}
                                        </span>
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Thread de mensagens */}
                <div className="flex-1 w-full flex flex-col bg-paper border border-line rounded-xl overflow-hidden">
                    {ativos === null ? (
                        <div className="flex-1 flex items-center justify-center text-dim text-sm bg-panel/60">
                            Escolhe uma conversa para começar a trocar mensagens.
                        </div>
                    ) : (
                        <>
                            <div className="px-4 py-2.5 border-b border-line flex items-center gap-2.5 bg-panel/50">
                                <span className="w-[32px] h-[32px] rounded-full bg-pri text-white flex items-center justify-center text-[12px] font-semibold flex-shrink-0">
                                    {inicialDestino}
                                </span>
                                <div className="min-w-0">
                                    <div className="text-[13px] font-semibold text-strong truncate">{nomeDestino}</div>
                                    <div className="text-[10.5px] text-dim truncate">{traduzPerfil(parceiro?.role || "")}</div>
                                </div>
                                {contadorAtivos > 0 && (
                                    <span className="ml-auto text-[10.5px] text-dim">
                                        {contadorAtivos} por ler
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
                                {aCarregarMensagens ? (
                                    <p className="text-dim text-[12.5px] text-center py-6">A carregar mensagens...</p>
                                ) : mensagens.length === 0 ? (
                                    <p className="text-dim text-[12.5px] text-center py-10">Sem mensagens ainda. Envia a primeira!</p>
                                ) : (
                                    mensagens.map((m) => {
                                        const minha = m.sender_id === user?.id;
                                        return (
                                            <div key={m.id} className={`flex ${minha ? "justify-end" : "justify-start"}`}>
                                                <div
                                                    className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-[13px] leading-snug shadow-sm ${
                                                        minha
                                                            ? "bg-pri text-white rounded-br-sm"
                                                            : "bg-panel border border-line text-ink rounded-bl-sm"
                                                    }`}
                                                >
                                                    <span>{m.body}</span>
                                                    <span className={`block text-right text-[9.5px] mt-0.5 ${minha ? "text-white/70" : "text-dim"}`}>
                                                        {formatarHora(m.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={fimRef} />
                            </div>

                            <div className="px-3 py-2.5 border-t border-line flex items-center gap-2 bg-panel/50">
                                <input
                                    value={texto}
                                    onChange={(e) => setTexto(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            enviar();
                                        }
                                    }}
                                    placeholder="Escreve uma mensagem..."
                                    className="flex-1 px-3 py-2 text-[13px]"
                                />
                                <button
                                    onClick={enviar}
                                    disabled={!texto.trim() || aEnviar}
                                    className="px-4 py-2 rounded-[9px] text-[13px] font-semibold bg-pri text-white hover:bg-pri-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                >
                                    {aEnviar ? "A enviar..." : "Enviar"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}