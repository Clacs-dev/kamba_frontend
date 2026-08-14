import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import FaixaKpis from "../components/FaixaKpis";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import Notice from "../components/ui/Notice";
import Tag from "../components/ui/Tag";
import Botao from "../components/ui/Botao";

interface Necessidade {
    collaborator_id: number;
    collaborator_name: string;
    last_score: number | null;
    classification: string | null;
    reason: string;
    source: string;
}

interface AcaoFormacao {
    id: number;
    plan_id: number;
    collaborator_id: number;
    title: string;
    description: string | null;
    source: string;
    status: string;
}

interface Plano {
    id: number;
    name: string;
    status: string;
}

interface AcaoPid {
    id: number;
    title: string;
    description: string | null;
    status: string;
}

interface Pid {
    id: number;
    collaborator_id: number;
    collaborator_name: string | null;
    year: number;
    status: string;
    actions: AcaoPid[];
}

interface Colaborador { id: number; full_name: string; }

function traduzEstadoPlano(s: string): { texto: string; cor: "ok" | "info" | "warn" | "pri" } {
    const mapa: Record<string, { texto: string; cor: "ok" | "info" | "warn" | "pri" }> = {
        rascunho: { texto: "Rascunho", cor: "warn" },
        submetido: { texto: "Submetido", cor: "info" },
        aprovado: { texto: "Aprovado", cor: "ok" },
        em_execucao: { texto: "Em execução", cor: "ok" },
    };
    return mapa[s] || { texto: s, cor: "pri" };
}

const ESTADO_ACAO: Record<string, { texto: string; cor: "ok" | "info" | "warn" | "pri" }> = {
    proposta: { texto: "Proposta", cor: "warn" },
    aprovada: { texto: "Aprovada", cor: "info" },
    concluida: { texto: "Concluída", cor: "ok" },
};

export default function Formacao() {
    const { user } = useAuth();
    const [necessidades, setNecessidades] = useState<Necessidade[]>([]);
    const [planos, setPlanos] = useState<Plano[]>([]);
    const [acoesPorPlano, setAcoesPorPlano] = useState<Record<number, AcaoFormacao[]>>({});
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [pids, setPids] = useState<Pid[]>([]);
    const [catalogo, setCatalogo] = useState<{ url: string | null; integrado: boolean }>({ url: null, integrado: false });
    const [aCarregar, setACarregar] = useState(true);
    const [msg, setMsg] = useState("");
    const [erro, setErro] = useState("");

    // Formulários
    const [nomePlano, setNomePlano] = useState("");
    const [areaPlanoId, setAreaPlanoId] = useState(0);
    const [areaColabId, setAreaColabId] = useState(0);
    const [areaTitulo, setAreaTitulo] = useState("");
    const [areaDescricao, setAreaDescricao] = useState("");
    const [pidColabId, setPidColabId] = useState(0);
    const [pidAno, setPidAno] = useState(String(new Date().getFullYear()));
    const [pidAcoes, setPidAcoes] = useState("");

    const eGestor = user?.role === "capital_humano" || user?.role === "administracao" || user?.role === "director";
    const eCH = user?.role === "capital_humano";
    const eAdmin = user?.role === "administracao";

    const carregar = () => {
        setACarregar(true);
        setErro("");
        api.get("/training/needs").then((r) => setNecessidades(r.data)).catch(() => setNecessidades([]));
        api.get("/training/plans").then((r) => setPlanos(r.data)).catch(() => setPlanos([]));
        api.get("/development-plans").then((r) => setPids(r.data)).catch(() => setPids([]));
        api.get("/training/academy-catalog").then((r) => setCatalogo(r.data)).catch(() => setCatalogo({ url: null, integrado: false }));
        if (eGestor) api.get("/collaborators").then((r) => setColaboradores(r.data)).catch(() => { });
        api.get("/training/plans")
            .then(async (r) => {
                const mapa: Record<number, AcaoFormacao[]> = {};
                for (const p of r.data as Plano[]) {
                    try {
                        const a = await api.get(`/training/plans/${p.id}/actions`);
                        mapa[p.id] = a.data;
                    } catch { mapa[p.id] = []; }
                }
                setAcoesPorPlano(mapa);
            })
            .catch(() => setAcoesPorPlano({}))
            .finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    const notificar = (m: string, e?: string) => { setMsg(m); setErro(e || ""); };

    const criarPlano = async () => {
        setMsg(""); setErro("");
        try {
            await api.post("/training/plans", { name: nomePlano });
            setNomePlano("");
            carregar();
        } catch (err: any) { setErro(err.response?.data?.detail || "Erro ao criar plano."); }
    };

    const gerarAcoes = async (planoId: number) => {
        setMsg(""); setErro("");
        try {
            const r = await api.post(`/training/plans/${planoId}/actions/from-needs`);
            notificar(`Ações geradas (${r.data.length}) a partir das necessidades do sistema.`);
            carregar();
        } catch (err: any) { setErro(err.response?.data?.detail || "Erro ao gerar ações."); }
    };

    const submeterPlano = async (planoId: number) => {
        setMsg(""); setErro("");
        try {
            await api.post(`/training/plans/${planoId}/submit`);
            notificar("Plano submetido à Administração.");
            carregar();
        } catch (err: any) { setErro(err.response?.data?.detail || "Erro ao submeter."); }
    };

    const aprovarPlano = async (planoId: number) => {
        setMsg(""); setErro("");
        try {
            await api.post(`/training/plans/${planoId}/approve`);
            notificar("Plano aprovado — em execução. O CH foi notificado.");
            carregar();
        } catch (err: any) { setErro(err.response?.data?.detail || "Erro ao aprovar."); }
    };

    const registrarAcaoArea = async () => {
        setMsg(""); setErro("");
        if (!areaPlanoId || !areaColabId || areaTitulo.length < 2) { setErro("Preencha o plano, o colaborador e o título."); return; }
        try {
            await api.post(`/training/plans/${areaPlanoId}/actions`, {
                collaborator_id: areaColabId, title: areaTitulo, description: areaDescricao || null,
            });
            notificar("Necessidade da área registada no plano.");
            setAreaColabId(0); setAreaTitulo(""); setAreaDescricao("");
            carregar();
        } catch (err: any) { setErro(err.response?.data?.detail || "Erro ao registar."); }
    };

    const atualizarStatusAcao = async (planoId: number, acaoId: number, status: string) => {
        setMsg(""); setErro("");
        try {
            await api.post(`/training/plans/${planoId}/actions/${acaoId}/status`, { status });
            carregar();
        } catch (err: any) { setErro(err.response?.data?.detail || "Erro na ação."); }
    };

    const criarPid = async () => {
        setMsg(""); setErro("");
        const linhas = pidAcoes.split("\n").map((l) => l.trim()).filter(Boolean);
        if (!pidColabId || linhas.length === 0) { setErro("Escolha o colaborador e escreva pelo menos uma ação."); return; }
        try {
            await api.post("/development-plans", {
                collaborator_id: pidColabId,
                year: Number(pidAno) || new Date().getFullYear(),
                actions: linhas.map((l) => ({ title: l })),
            });
            notificar("Plano Individual de Desenvolvimento criado.");
            setPidColabId(0); setPidAcoes("");
            carregar();
        } catch (err: any) { setErro(err.response?.data?.detail || "Erro ao criar o PID."); }
    };

    const completarAcaoPid = async (pidId: number, acaoId: number) => {
        setMsg(""); setErro("");
        try {
            await api.post(`/development-plans/${pidId}/actions/${acaoId}/complete`);
            carregar();
        } catch (err: any) { setErro(err.response?.data?.detail || "Erro ao concluir a ação."); }
    };

    const planosRascunho = planos.filter((p) => p.status === "rascunho");
    const emExecucao = planos.filter((p) => p.status === "em_execucao" || p.status === "aprovado").length;

    return (
        <div>
            <Cabecalho
                eyebrow="Gerado a partir das avaliações"
                titulo="Plano de Formação"
                descricao="O sistema identifica necessidades (notas abaixo de 3,5 e Planos Individuais de Desenvolvimento) e as áreas registam as suas, consolidando o plano para aprovação da Administração."
            />

            <FaixaKpis kpis={[
                { valor: necessidades.length, label: "Necessidades detetadas", cor: necessidades.length > 0 ? "warn" : "normal" },
                { valor: planos.length, label: "Planos de formação" },
                { valor: emExecucao, label: "Em execução", cor: "ok" },
                { valor: pids.filter((p) => p.status === "aberto").length, label: "PIDs em curso" },
            ]} />

            {msg && <Notice className="mb-4">{msg}</Notice>}
            {erro && <Notice variante="alert" className="mb-4">{erro}</Notice>}

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : (
                <>
                    {/* Necessidades detetadas automaticamente */}
                    <Cartao className="mb-4 p-0 overflow-hidden">
                        <h3 className="text-[14.5px] p-4 pb-2">Necessidades identificadas pelo sistema</h3>
                        {necessidades.length === 0 ? (
                            <p className="px-4 pb-4 text-dim text-sm">
                                Nenhuma necessidade detetada — sem avaliações validadas abaixo de 3,5 nem ações de PID pendentes.
                            </p>
                        ) : (
                            <table className="w-full text-[12.8px]">
                                <thead>
                                    <tr>
                                        <Th>Colaborador</Th><Th>Fonte</Th><Th>Motivo</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {necessidades.map((n, i) => (
                                        <tr key={i} className="hover:bg-panel">
                                            <Td><b className="text-strong">{n.collaborator_name}</b></Td>
                                            <Td>
                                                <Tag variante={n.source === "pid" ? "info" : "pri"}>
                                                    {n.source === "pid" ? "PID" : `Avaliação · ${n.last_score}`}
                                                </Tag>
                                            </Td>
                                            <Td className="text-dim">{n.reason}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <Notice className="m-4">
                            Critérios automáticos: nota do último ciclo <b>abaixo de 3,5</b> e ações <b>pendentes dos PIDs</b>.
                        </Notice>
                    </Cartao>

                    {/* Necessidades indicadas pelas áreas */}
                    {eGestor && (
                        <Cartao className="mb-4">
                            <h3 className="text-[14.5px] mb-1">Necessidades indicadas pelas áreas</h3>
                            <p className="text-dim text-[11.5px] mb-3">
                                Director e Capital Humano registam aqui as necessidades formativas da sua área, num plano em rascunho.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                                <div>
                                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Plano (rascunho)</label>
                                    <select value={areaPlanoId} onChange={(e) => setAreaPlanoId(Number(e.target.value))}
                                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                                        <option value={0}>— escolher —</option>
                                        {planosRascunho.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Colaborador</label>
                                    <select value={areaColabId} onChange={(e) => setAreaColabId(Number(e.target.value))}
                                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                                        <option value={0}>— escolher —</option>
                                        {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Ação formativa</label>
                            <input value={areaTitulo} onChange={(e) => setAreaTitulo(e.target.value)}
                                placeholder="Ex.: Comunicação interpessoal"
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Descrição (opcional)</label>
                            <textarea value={areaDescricao} onChange={(e) => setAreaDescricao(e.target.value)} rows={2}
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                            {planosRascunho.length === 0 && (
                                <p className="text-warn text-[12px] mb-3">Crie primeiro um plano (rascunho) para registar necessidades da área.</p>
                            )}
                            <Botao onClick={registrarAcaoArea} disabled={planosRascunho.length === 0}>Registar necessidade da área</Botao>
                        </Cartao>
                    )}

                    {/* Planos Individuais de Desenvolvimento */}
                    <Cartao className="mb-4">
                        <h3 className="text-[14.5px] mb-1">Planos Individuais de Desenvolvimento (PID)</h3>
                        <p className="text-dim text-[11.5px] mb-3">
                            As ações pendentes dos PIDs alimentam automaticamente as necessidades de formação identificadas pelo sistema.
                        </p>

                        {eGestor && (
                            <div className="border border-line rounded-lg p-3 mb-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
                                    <div>
                                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Colaborador</label>
                                        <select value={pidColabId} onChange={(e) => setPidColabId(Number(e.target.value))}
                                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                                            <option value={0}>— escolher —</option>
                                            {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Ano</label>
                                        <input type="number" value={pidAno} onChange={(e) => setPidAno(e.target.value)}
                                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                                    </div>
                                    <div className="sm:col-span-1">
                                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Ações (uma por linha)</label>
                                        <textarea value={pidAcoes} onChange={(e) => setPidAcoes(e.target.value)} rows={2}
                                            placeholder={"Formação em Excel avançado\nMentoria de liderança"}
                                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                                    </div>
                                </div>
                                <Botao onClick={criarPid} disabled={!pidColabId}>Criar PID</Botao>
                            </div>
                        )}

                        {pids.length === 0 ? (
                            <p className="text-dim text-sm">Ainda não há PIDs.</p>
                        ) : (
                            <div className="space-y-2">
                                {pids.map((p) => (
                                    <div key={p.id} className="border border-line rounded-lg px-3 py-2.5">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <b className="text-strong text-[13px]">
                                                {p.collaborator_name || `#${p.collaborator_id}`} · {p.year}
                                            </b>
                                            <Tag variante={p.status === "concluido" ? "ok" : "warn"}>
                                                {p.status === "concluido" ? "Concluído" : "Em curso"}
                                            </Tag>
                                        </div>
                                        {p.actions.map((a) => (
                                            <div key={a.id} className="flex items-center justify-between py-1 border-t border-line2">
                                                <span className="text-[12.5px] text-ink">{a.title}</span>
                                                <div className="flex items-center gap-2">
                                                    <Tag variante={a.status === "concluida" ? "ok" : "info"}>
                                                        {a.status === "concluida" ? "Concluída" : "Pendente"}
                                                    </Tag>
                                                    {a.status !== "concluida" && (
                                                        <button onClick={() => completarAcaoPid(p.id, a.id)}
                                                            className="text-[11.5px] text-pri font-semibold hover:underline">
                                                            Concluir
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Cartao>

                    {/* Gestão de planos */}
                    <Cartao>
                        <h3 className="text-[14.5px] mb-3">Planos de formação</h3>

                        {eCH && (
                            <div className="flex gap-2.5 mb-4">
                                <input
                                    value={nomePlano}
                                    onChange={(e) => setNomePlano(e.target.value)}
                                    placeholder="Nome do plano (ex.: Plano 2026/27)"
                                    className="flex-1 max-w-xs bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                />
                                <Botao onClick={criarPlano} disabled={!nomePlano}>+ Criar plano</Botao>
                            </div>
                        )}

                        {planos.length === 0 ? (
                            <p className="text-dim text-sm">Ainda não há planos.</p>
                        ) : (
                            <div className="space-y-2">
                                {planos.map((p) => {
                                    const est = traduzEstadoPlano(p.status);
                                    const acoes = acoesPorPlano[p.id] || [];
                                    return (
                                        <div key={p.id} className="border border-line rounded-lg px-3 py-2.5">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <b className="text-strong text-[13px]">{p.name}</b>
                                                    <Tag className="ml-2" variante={est.cor}>{est.texto}</Tag>
                                                </div>
                                                <div className="flex gap-2">
                                                    {eCH && p.status === "rascunho" && (
                                                        <>
                                                            <button onClick={() => gerarAcoes(p.id)}
                                                                className="text-[11.5px] text-pri font-semibold hover:underline">
                                                                Gerar ações (sistema)
                                                            </button>
                                                            <button onClick={() => submeterPlano(p.id)}
                                                                className="text-[11.5px] text-pri font-semibold hover:underline">
                                                                Submeter
                                                            </button>
                                                        </>
                                                    )}
                                                    {eAdmin && p.status === "submetido" && (
                                                        <button onClick={() => aprovarPlano(p.id)}
                                                            className="text-[11.5px] text-ok font-semibold hover:underline">
                                                            Aprovar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {acoes.length > 0 && (
                                                <div className="mt-2 border-t border-line2 pt-2">
                                                    {acoes.map((a) => {
                                                        const ea = ESTADO_ACAO[a.status] || { texto: a.status, cor: "pri" as const };
                                                        return (
                                                            <div key={a.id} className="flex items-center justify-between py-1">
                                                                <span className="text-[12.3px] text-ink">
                                                                    {a.title}
                                                                    <span className="text-dim text-[11px] ml-2">
                                                                        · {colaboradores.find((c) => c.id === a.collaborator_id)?.full_name || `#${a.collaborator_id}`} ·
                                                                        origem {a.source === "sistema" ? "sistema" : "área"}
                                                                    </span>
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <Tag variante={ea.cor}>{ea.texto}</Tag>
                                                                    {eCH && p.status === "em_execucao" && a.status === "proposta" && (
                                                                        <button onClick={() => atualizarStatusAcao(p.id, a.id, "aprovada")}
                                                                            className="text-[11.5px] text-pri font-semibold hover:underline">
                                                                            Aprovar ação
                                                                        </button>
                                                                    )}
                                                                    {eCH && p.status === "em_execucao" && a.status === "aprovada" && (
                                                                        <button onClick={() => atualizarStatusAcao(p.id, a.id, "concluida")}
                                                                            className="text-[11.5px] text-ok font-semibold hover:underline">
                                                                            Concluir
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Cartao>

                    {/* Catálogo CLACS Academy */}
                    <Cartao className="mt-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-[14.5px] mb-1">Catálogo CLACS Academy</h3>
                                <p className="text-dim text-[11.5px]">
                                    Ligação direta ao catálogo de formação da CLACS Academy para escolha das ações do plano.
                                </p>
                            </div>
                            {catalogo.integrado && catalogo.url ? (
                                <a href={catalogo.url} target="_blank" rel="noopener noreferrer"
                                    className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors inline-block flex-shrink-0">
                                    Abrir catálogo ↗
                                </a>
                            ) : (
                                <Tag variante="warn">URL não configurado</Tag>
                            )}
                        </div>
                    </Cartao>
                </>
            )}
        </div>
    );
}

function Th({ children }: { children: React.ReactNode }) {
    return <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-4 py-2.5 border-b border-line">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <td className={`px-4 py-2.5 border-b border-line2 ${className}`}>{children}</td>;
}
