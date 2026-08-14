import { useEffect, useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";
import Notice from "../ui/Notice";
import Tag from "../ui/Tag";
import Botao from "../ui/Botao";

interface MinhaAcao {
    id: number;
    plan_id: number;
    plan_name: string;
    title: string;
    description: string | null;
    source: string;
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
    year: number;
    status: string;
    actions: AcaoPid[];
}

const ESTADO_ACAO: Record<string, { texto: string; cor: "ok" | "info" | "warn" | "pri" }> = {
    proposta: { texto: "Proposta", cor: "warn" },
    aprovada: { texto: "Aprovada", cor: "info" },
    concluida: { texto: "Concluída", cor: "ok" },
    pendente: { texto: "Pendente", cor: "warn" },
};

// Aba "Formação" do Portal — o plano de formação do próprio colaborador
// (ações do plano em execução) e o seu Plano Individual de Desenvolvimento (PID).
export default function FormacaoTab() {
    const [acoes, setAcoes] = useState<MinhaAcao[]>([]);
    const [pid, setPid] = useState<Pid | null>(null);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");

    const carregar = () => {
        setACarregar(true);
        setErro("");
        api.get("/training/my-actions").then((r) => setAcoes(r.data)).catch(() => setAcoes([]));
        api.get("/development-plans")
            .then((r) => {
                const meus = (r.data as Pid[]).filter((p) => p.status !== "concluido");
                setPid(meus.length > 0 ? meus[0] : null);
            })
            .catch(() => setPid(null))
            .finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    const completarAcao = async (acaoId: number) => {
        setErro("");
        try {
            await api.post(`/development-plans/${pid?.id}/actions/${acaoId}/complete`);
            carregar();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao concluir a ação.");
        }
    };

    if (aCarregar) return <p className="text-dim text-sm">A carregar...</p>;

    return (
        <div className="space-y-3">
            <Cartao>
                <h3 className="text-[14.5px] mb-1">As minhas ações de formação</h3>
                <p className="text-dim text-[11.5px] mb-3">
                    Ações dos planos de formação aprovados e em execução na sua área.
                </p>
                {acoes.length === 0 ? (
                    <p className="text-dim text-sm py-2 text-center">
                        Ainda não tem ações de formação atribuídas.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {acoes.map((a) => {
                            const ea = ESTADO_ACAO[a.status] || { texto: a.status, cor: "pri" as const };
                            return (
                                <div key={a.id} className="border border-line rounded-lg px-3 py-2.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <b className="text-strong text-[13px]">{a.title}</b>
                                        <Tag variante={ea.cor}>{ea.texto}</Tag>
                                    </div>
                                    <div className="text-[11.5px] text-dim mt-0.5">
                                        {a.plan_name}
                                        <span className="ml-2">· origem {a.source === "sistema" ? "sistema" : "área"}</span>
                                    </div>
                                    {a.description && (
                                        <p className="text-[12.3px] text-ink mt-1.5">{a.description}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </Cartao>

            <Cartao>
                <h3 className="text-[14.5px] mb-1">Plano Individual de Desenvolvimento (PID)</h3>
                <p className="text-dim text-[11.5px] mb-3">
                    O seu plano de desenvolvimento {pid ? `para ${pid.year}` : ""}. Conclua cada ação e acompanhe o progresso.
                </p>
                {erro && <p className="text-bad text-sm mb-2">{erro}</p>}
                {pid ? (
                    <div className="space-y-1.5">
                        {pid.actions.map((a) => {
                            const ea = ESTADO_ACAO[a.status] || { texto: a.status, cor: "pri" as const };
                            return (
                                <div key={a.id} className="flex items-center justify-between gap-3 border border-line rounded-lg px-3 py-2.5">
                                    <div className="flex-1">
                                        <span className="text-[12.8px] text-ink">{a.title}</span>
                                        {a.description && (
                                            <p className="text-[11.5px] text-dim">{a.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Tag variante={ea.cor}>{ea.texto}</Tag>
                                        {a.status !== "concluida" && (
                                            <Botao variante="ghost" className="!py-1.5 !px-3 !text-[11.5px]"
                                                onClick={() => completarAcao(a.id)}>
                                                Concluir ação
                                            </Botao>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {pid.actions.length === 0 && (
                            <p className="text-dim text-sm py-2 text-center">Sem ações definidas no plano.</p>
                        )}
                    </div>
                ) : (
                    <p className="text-dim text-sm py-2 text-center">
                        Não tem um PID em curso. {acoes.length === 0 && "As suas necessidades de formação serão definidas pela Capital Humano."}
                    </p>
                )}
            </Cartao>

            {acoes.length === 0 && (
                <Notice>
                    Ainda sem atividades? As necessidades de formação são identificadas a partir das avaliações
                    (nota abaixo de 3,5) e do PID, e consolidadas no plano de formação da empresa.
                </Notice>
            )}
        </div>
    );
}
