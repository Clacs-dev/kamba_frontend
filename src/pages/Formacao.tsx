import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import FaixaKpis from "../components/FaixaKpis";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import Notice from "../components/ui/Notice";
import Tag from "../components/ui/Tag";

interface Necessidade {
    collaborator_id: number;
    collaborator_name: string;
    last_score: number;
    classification: string | null;
    reason: string;
}

interface Plano {
    id: number;
    name: string;
    status: string;
}

function traduzEstadoPlano(s: string): string {
    const mapa: Record<string, string> = {
        rascunho: "Rascunho",
        submetido: "Submetido",
        aprovado: "Aprovado",
    };
    return mapa[s] || s;
}

export default function Formacao() {
    const { user } = useAuth();
    const [necessidades, setNecessidades] = useState<Necessidade[]>([]);
    const [planos, setPlanos] = useState<Plano[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [nomePlano, setNomePlano] = useState("");
    const [msg, setMsg] = useState("");

    const eGestor = user?.role === "capital_humano" || user?.role === "administracao";
    const eCH = user?.role === "capital_humano";
    const eAdmin = user?.role === "administracao";

    const carregar = () => {
        setACarregar(true);
        Promise.all([
            api.get("/training/needs").then((r) => setNecessidades(r.data)).catch(() => { }),
            api.get("/training/plans").then((r) => setPlanos(r.data)).catch(() => { }),
        ]).finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    const criarPlano = async () => {
        setMsg("");
        try {
            await api.post("/training/plans", { name: nomePlano });
            setNomePlano("");
            carregar();
        } catch (err: any) {
            setMsg(err.response?.data?.detail || "Erro ao criar plano.");
        }
    };

    const gerarAcoes = async (planoId: number) => {
        try {
            await api.post(`/training/plans/${planoId}/actions/from-needs`);
            setMsg("Ações geradas a partir das necessidades detetadas.");
            carregar();
        } catch (err: any) {
            setMsg(err.response?.data?.detail || "Erro ao gerar ações.");
        }
    };

    const submeterPlano = async (planoId: number) => {
        try {
            await api.post(`/training/plans/${planoId}/submit`);
            carregar();
        } catch (err: any) {
            setMsg(err.response?.data?.detail || "Erro ao submeter.");
        }
    };

    const aprovarPlano = async (planoId: number) => {
        try {
            await api.post(`/training/plans/${planoId}/approve`);
            carregar();
        } catch (err: any) {
            setMsg(err.response?.data?.detail || "Erro ao aprovar.");
        }
    };

    return (
        <div>
            <Cabecalho
                eyebrow="Gerado a partir das avaliações"
                titulo="Plano de Formação"
                descricao="O sistema identifica necessidades formativas a partir das notas (abaixo de 3,5) e consolida o plano para aprovação."
            />

            <FaixaKpis kpis={[
                { valor: necessidades.length, label: "Necessidades detetadas", cor: necessidades.length > 0 ? "warn" : "normal" },
                { valor: planos.length, label: "Planos de formação" },
                { valor: planos.filter(p => p.status === "aprovado").length, label: "Planos aprovados", cor: "ok" },
                { valor: planos.filter(p => p.status === "rascunho").length, label: "Em rascunho" },
            ]} />

            {msg && <Notice className="mb-4">{msg}</Notice>}

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : (
                <>
                    {/* Necessidades detetadas automaticamente */}
                    <Cartao className="mb-4 p-0 overflow-hidden">
                        <h3 className="text-[14.5px] p-4 pb-2">Necessidades identificadas automaticamente</h3>
                        {necessidades.length === 0 ? (
                            <p className="px-4 pb-4 text-dim text-sm">
                                Nenhuma necessidade detetada — não há avaliações validadas abaixo de 3,5.
                            </p>
                        ) : (
                            <table className="w-full text-[12.8px]">
                                <thead>
                                    <tr>
                                        <Th>Colaborador</Th><Th>Nota</Th><Th>Classificação</Th><Th>Motivo</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {necessidades.map((n) => (
                                        <tr key={n.collaborator_id} className="hover:bg-panel">
                                            <Td><b className="text-strong">{n.collaborator_name}</b></Td>
                                            <Td>{n.last_score}</Td>
                                            <Td>{n.classification || "—"}</Td>
                                            <Td className="text-dim">{n.reason}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <Notice className="m-4">
                            Critério automático: nota do último ciclo <b>abaixo de 3,5</b>.
                        </Notice>
                    </Cartao>

                    {/* Gestão de planos (só gestores) */}
                    {eGestor && (
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
                                    <button
                                        onClick={criarPlano}
                                        disabled={!nomePlano}
                                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40"
                                    >
                                        + Criar plano
                                    </button>
                                </div>
                            )}

                            {planos.length === 0 ? (
                                <p className="text-dim text-sm">Ainda não há planos.</p>
                            ) : (
                                <div className="space-y-2">
                                    {planos.map((p) => (
                                        <div key={p.id} className="flex items-center justify-between border border-line rounded-lg px-3 py-2.5">
                                            <div>
                                                <b className="text-strong text-[13px]">{p.name}</b>
                                                <Tag
                                                    className="ml-2"
                                                    variante={p.status === "aprovado" ? "ok" : p.status === "submetido" ? "info" : "warn"}
                                                >
                                                    {traduzEstadoPlano(p.status)}
                                                </Tag>
                                            </div>
                                            <div className="flex gap-2">
                                                {eCH && p.status === "rascunho" && (
                                                    <>
                                                        <button onClick={() => gerarAcoes(p.id)}
                                                            className="text-[11.5px] text-pri font-semibold hover:underline">
                                                            Gerar ações
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
                                    ))}
                                </div>
                            )}
                        </Cartao>
                    )}
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