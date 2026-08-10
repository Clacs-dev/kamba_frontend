import { useEffect, useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";

interface Resumo {
    collaborators: { total: number; active: number; inactive: number };
    evaluations: { total: number; validated: number; in_progress: number; below_threshold: number };
    disciplinary: { total: number; in_progress: number; archived: number };
    training: { plans: number; actions: number };
    health: { exams: number; overdue: number };
}

// Cartão de KPI ao estilo do protótipo, com "ver detalhe →" clicável.
function KpiCard({ valor, label, detalhe, onClick, indisponivel }: {
    valor: string | number;
    label: string;
    detalhe?: string;
    onClick?: () => void;
    indisponivel?: boolean;
}) {
    return (
        <Cartao onClick={onClick}>
            <div className={`font-serif font-semibold text-[26px] ${indisponivel ? "text-dim" : "text-pri-dark"}`}>
                {valor}
            </div>
            <div className="text-[10.5px] text-dim uppercase tracking-wide mt-0.5 leading-tight">{label}</div>
            {detalhe && <div className="text-[10.5px] text-pri mt-1.5">{detalhe}</div>}
        </Cartao>
    );
}

export default function PainelGestao({ irPara }: { irPara: (seccao: string) => void }) {
    const [resumo, setResumo] = useState<Resumo | null>(null);
    const [aCarregar, setACarregar] = useState(true);

    useEffect(() => {
        api.get("/dashboard/summary")
            .then((r) => setResumo(r.data))
            .catch(() => setResumo(null))
            .finally(() => setACarregar(false));
    }, []);

    if (aCarregar) return <p className="text-dim text-sm">A carregar métricas...</p>;
    if (!resumo) return <p className="text-bad text-sm">Não foi possível carregar as métricas.</p>;

    return (
        <div>
            {/* Primeira fila — dados reais do backend */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-3.5">
                <KpiCard
                    valor={resumo.collaborators.active}
                    label="Colaboradores ativos"
                    detalhe="ver detalhe →"
                    onClick={() => irPara("colaboradores")}
                />
                <KpiCard
                    valor={`${resumo.evaluations.validated}/${resumo.evaluations.total}`}
                    label="Avaliações validadas / total"
                    detalhe="ver detalhe →"
                    onClick={() => irPara("avaliacoes")}
                />
                <KpiCard
                    valor={resumo.evaluations.in_progress}
                    label="Avaliações em curso"
                    detalhe="ver detalhe →"
                    onClick={() => irPara("avaliacoes")}
                />
                <KpiCard
                    valor={resumo.disciplinary.in_progress}
                    label="Processos disciplinares em curso"
                    detalhe="abrir processos →"
                    onClick={() => irPara("disciplina")}
                />
            </div>

            {/* Segunda fila — mistura de reais e "preparados para o futuro" */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
                <KpiCard
                    valor={resumo.training.actions}
                    label="Ações de formação"
                    detalhe="ver detalhe →"
                    onClick={() => irPara("formacao")}
                />
                <KpiCard
                    valor={resumo.health.overdue}
                    label="Exames de saúde em atraso"
                    detalhe="ver detalhe →"
                    onClick={() => irPara("portal")}
                />
                {/* Cartões preparados para dados que o backend ainda não calcula */}
                <KpiCard
                    valor="—"
                    label="eNPS · cultura (em breve)"
                    indisponivel
                />
                <KpiCard
                    valor={resumo.evaluations.below_threshold}
                    label="Avaliações abaixo de 3,5"
                    detalhe="ver formação →"
                    onClick={() => irPara("formacao")}
                />
            </div>
        </div>
    );
}