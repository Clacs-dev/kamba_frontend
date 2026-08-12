import { useEffect, useState } from "react";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";

// O formato que o /dashboard/summary devolve.
interface Resumo {
    collaborators: { total: number; active: number; inactive: number; by_role: Record<string, number> };
    evaluations: { total: number; in_progress: number; validated: number; below_threshold: number; by_classification: Record<string, number> };
    disciplinary: { total: number; in_progress: number; archived: number };
    training: { plans: number; actions: number };
    health: { exams: number; overdue: number };
}

type CorKpi = "normal" | "ok" | "warn" | "bad";

// Um cartão de métrica ao estilo KAMBA (mesmo padrão visual de FaixaKpis).
function Kpi({ titulo, valor, cor = "normal" }: { titulo: string; valor: number | string; cor?: CorKpi }) {
    const corValor: Record<CorKpi, string> = {
        normal: "text-pri-dark",
        ok: "text-ok",
        warn: "text-warn",
        bad: "text-bad",
    };
    return (
        <Cartao>
            <div className={`font-serif font-semibold text-[26px] ${corValor[cor]}`}>{valor}</div>
            <div className="text-[10.5px] text-dim uppercase tracking-wide mt-0.5 leading-tight">{titulo}</div>
        </Cartao>
    );
}

function Seccao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <div className="mb-5">
            <h3 className="text-[11px] uppercase tracking-[0.12em] text-dim mb-2.5">{titulo}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">{children}</div>
        </div>
    );
}

export default function Dashboard() {
    const [resumo, setResumo] = useState<Resumo | null>(null);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");

    useEffect(() => {
        api.get("/dashboard/summary")
            .then((resp) => setResumo(resp.data))
            .catch((err) => setErro(err.response?.data?.detail || "Erro ao carregar o dashboard."))
            .finally(() => setACarregar(false));
    }, []);

    if (aCarregar) return <p className="text-dim text-sm">A carregar métricas...</p>;
    if (erro) return <p className="text-bad text-sm">{erro}</p>;
    if (!resumo) return null;

    return (
        <div>
            <Cabecalho
                eyebrow="Visão consolidada"
                titulo="Dashboard"
                descricao="Indicadores globais de colaboradores, avaliações, disciplina, formação e saúde ocupacional."
            />

            <Seccao titulo="Colaboradores">
                <Kpi titulo="Total" valor={resumo.collaborators.total} />
                <Kpi titulo="Ativos" valor={resumo.collaborators.active} cor="ok" />
                <Kpi titulo="Inativos" valor={resumo.collaborators.inactive} />
            </Seccao>

            <Seccao titulo="Avaliações">
                <Kpi titulo="Total" valor={resumo.evaluations.total} />
                <Kpi titulo="Validadas" valor={resumo.evaluations.validated} cor="ok" />
                <Kpi titulo="Em curso" valor={resumo.evaluations.in_progress} cor="warn" />
                <Kpi titulo="Abaixo de 3,5" valor={resumo.evaluations.below_threshold} cor="bad" />
            </Seccao>

            <Seccao titulo="Disciplina">
                <Kpi titulo="Total" valor={resumo.disciplinary.total} />
                <Kpi titulo="Em curso" valor={resumo.disciplinary.in_progress} cor="warn" />
                <Kpi titulo="Arquivados" valor={resumo.disciplinary.archived} />
            </Seccao>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <h3 className="text-[11px] uppercase tracking-[0.12em] text-dim mb-2.5">Formação</h3>
                    <div className="grid grid-cols-2 gap-3.5">
                        <Kpi titulo="Planos" valor={resumo.training.plans} />
                        <Kpi titulo="Ações" valor={resumo.training.actions} />
                    </div>
                </div>
                <div>
                    <h3 className="text-[11px] uppercase tracking-[0.12em] text-dim mb-2.5">Saúde Ocupacional</h3>
                    <div className="grid grid-cols-2 gap-3.5">
                        <Kpi titulo="Exames" valor={resumo.health.exams} />
                        <Kpi titulo="Em atraso" valor={resumo.health.overdue} cor="bad" />
                    </div>
                </div>
            </div>
        </div>
    );
}
