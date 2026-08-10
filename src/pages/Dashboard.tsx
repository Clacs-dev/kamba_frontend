import { useEffect, useState } from "react";
import api from "../lib/api";

// O formato que o /dashboard/summary devolve.
interface Resumo {
    collaborators: { total: number; active: number; inactive: number; by_role: Record<string, number> };
    evaluations: { total: number; in_progress: number; validated: number; below_threshold: number; by_classification: Record<string, number> };
    disciplinary: { total: number; in_progress: number; archived: number };
    training: { plans: number; actions: number };
    health: { exams: number; overdue: number };
}

// Um cartão de métrica reutilizável.
function Cartao({ titulo, valor, subtitulo, cor = "blue" }: {
    titulo: string; valor: number | string; subtitulo?: string; cor?: string;
}) {
    const cores: Record<string, string> = {
        blue: "text-blue-600",
        green: "text-green-600",
        amber: "text-amber-600",
        red: "text-red-600",
        slate: "text-slate-600",
    };
    return (
        <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-slate-500">{titulo}</div>
            <div className={`text-3xl font-bold mt-1 ${cores[cor]}`}>{valor}</div>
            {subtitulo && <div className="text-xs text-slate-400 mt-1">{subtitulo}</div>}
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

    if (aCarregar) return <p className="text-slate-500">A carregar métricas...</p>;
    if (erro) return <p className="text-red-600">{erro}</p>;
    if (!resumo) return null;

    return (
        <div>
            <h2 className="text-xl font-bold text-slate-800 mb-6">Dashboard</h2>

            {/* Colaboradores */}
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Colaboradores</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <Cartao titulo="Total" valor={resumo.collaborators.total} />
                <Cartao titulo="Ativos" valor={resumo.collaborators.active} cor="green" />
                <Cartao titulo="Inativos" valor={resumo.collaborators.inactive} cor="slate" />
            </div>

            {/* Avaliações */}
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Avaliações</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Cartao titulo="Total" valor={resumo.evaluations.total} />
                <Cartao titulo="Validadas" valor={resumo.evaluations.validated} cor="green" />
                <Cartao titulo="Em curso" valor={resumo.evaluations.in_progress} cor="amber" />
                <Cartao titulo="Abaixo de 3,5" valor={resumo.evaluations.below_threshold} cor="red" />
            </div>

            {/* Disciplina */}
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Disciplina</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <Cartao titulo="Total" valor={resumo.disciplinary.total} />
                <Cartao titulo="Em curso" valor={resumo.disciplinary.in_progress} cor="amber" />
                <Cartao titulo="Arquivados" valor={resumo.disciplinary.archived} cor="slate" />
            </div>

            {/* Formação e Saúde */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Formação</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Cartao titulo="Planos" valor={resumo.training.plans} />
                        <Cartao titulo="Ações" valor={resumo.training.actions} />
                    </div>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Saúde Ocupacional</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Cartao titulo="Exames" valor={resumo.health.exams} />
                        <Cartao titulo="Em atraso" valor={resumo.health.overdue} cor="red" />
                    </div>
                </div>
            </div>
        </div>
    );
}