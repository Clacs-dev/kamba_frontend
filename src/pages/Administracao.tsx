import { useEffect, useState } from "react";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";

interface EmpresaOverview {
    id: number | null;
    name: string;
    nif: string | null;
    plan: string;
    is_active: boolean;
    user_count: number;
}

interface Parametros {
    tec_objectives: number;
    tec_competencies: number;
    tec_values: number;
    dir_objectives: number;
    dir_competencies: number;
    dir_values: number;
    appeal_deadline_days: number;
    cycle_calendar: string | null;
}

interface EventoAuditoria {
    id: number;
    actor_name: string;
    actor_role: string;
    action: string;
    detail: string | null;
    created_at: string | null;
}

interface Overview {
    company: EmpresaOverview;
    settings: Parametros;
    audit: EventoAuditoria[];
}

const NOME_PLANOS: Record<string, string> = {
    essencial: "Essencial",
    empresarial: "Empresarial",
    corporativo: "Corporativo",
    institucional: "Institucional",
};

function traduzPerfil(role: string): string {
    const mapa: Record<string, string> = {
        colaborador: "Colaborador", director: "Director", capital_humano: "Capital Humano",
        comissao: "Comissão", administracao: "Administração",
    };
    return mapa[role] || role;
}

function formatarData(iso: string | null): string {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        return d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
        return iso;
    }
}

export default function Administracao() {
    const [dados, setDados] = useState<Overview | null>(null);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");

    useEffect(() => {
        api.get("/admin/overview")
            .then((r) => setDados(r.data))
            .catch((e) => setErro(e.response?.data?.detail || "Erro ao carregar a administração."))
            .finally(() => setACarregar(false));
    }, []);

    if (aCarregar) {
        return (
            <div>
                <Cabecalho eyebrow="Parametrização & conformidade" titulo="Administração" />
                <p className="text-dim text-sm">A carregar...</p>
            </div>
        );
    }

    if (erro || !dados) {
        return (
            <div>
                <Cabecalho eyebrow="Parametrização & conformidade" titulo="Administração" />
                <p className="text-bad text-sm">{erro || "Sem dados."}</p>
            </div>
        );
    }

    const { company: emp, settings: s, audit } = dados;

    const linha = (label: string, valor: React.ReactNode) => (
        <tr>
            <td className="text-[10.5px] uppercase tracking-wide text-dim py-2 pr-3 align-top whitespace-nowrap">{label}</td>
            <td className="py-2 text-[12.8px] text-ink">{valor}</td>
        </tr>
    );

    return (
        <div>
            <Cabecalho
                eyebrow="Parametrização & conformidade"
                titulo={`Administração — ${emp.name}`}
                descricao="Parâmetros do ciclo, plano SaaS e trilha de auditoria imutável."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Parâmetros do ciclo */}
                <Cartao>
                    <h3 className="text-[14.5px] mb-2">Parâmetros do ciclo</h3>
                    <table className="w-full">
                        <tbody>
                            {linha("Escala", "1–5 · níveis de Insuficiente a Excelente")}
                            {linha("Ponderações (técnico)", `Objectivos ${s.tec_objectives}% · Competências ${s.tec_competencies}% · Valores ${s.tec_values}%`)}
                            {linha("Ponderações (dirigente)", `Objectivos ${s.dir_objectives}% · Competências ${s.dir_competencies}% · Valores ${s.dir_values}%`)}
                            {linha("Concordância do avaliado", "obrigatória · aceitar ou recorrer")}
                            {linha("Prazo de recurso", `${s.appeal_deadline_days} dias úteis`)}
                            {linha("Calendário do ciclo", s.cycle_calendar || "—")}
                            {linha("Comissão de Avaliação", "decide os recursos")}
                            {linha("Validação final", "Administração (CA/CE) · efeitos remuneratórios")}
                        </tbody>
                    </table>
                </Cartao>

                {/* Plano SaaS */}
                <Cartao>
                    <h3 className="text-[14.5px] mb-2">Plano SaaS</h3>
                    <table className="w-full">
                        <tbody>
                            {linha("Empresa", <b className="text-strong">{emp.name}</b>)}
                            {linha("NIF", emp.nif || "—")}
                            {linha("Plano", NOME_PLANOS[emp.plan] || emp.plan)}
                            {linha("Colaboradores", emp.user_count)}
                            {linha("Estado", emp.is_active ? "ativo" : "inativo")}
                            {linha("Módulos", "Portal · Avaliação · Disciplina · Formação · Cultura · Relatórios")}
                            {linha("Alojamento", "dados em território nacional · cópias diárias")}
                            {linha("Multi-empresa", "cada cliente num espaço isolado")}
                        </tbody>
                    </table>
                </Cartao>
            </div>

            {/* Trilha de auditoria */}
            <Cartao className="mt-3 p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-line">
                    <h3 className="text-[14.5px] m-0">Trilha de auditoria (registos imutáveis, carimbo temporal)</h3>
                </div>
                {audit.length === 0 ? (
                    <p className="text-dim text-center py-4 text-sm">Ainda não há eventos registados.</p>
                ) : (
                    <table className="w-full text-[12.8px]">
                        <thead>
                            <tr>
                                <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-4 py-2.5 border-b border-line">Data</th>
                                <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-4 py-2.5 border-b border-line">Ato</th>
                                <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-4 py-2.5 border-b border-line">Autor</th>
                                <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-4 py-2.5 border-b border-line">Detalhe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {audit.map((e) => (
                                <tr key={e.id} className="hover:bg-panel">
                                    <td className="px-4 py-2.5 border-b border-line2 text-dim whitespace-nowrap">{formatarData(e.created_at)}</td>
                                    <td className="px-4 py-2.5 border-b border-line2"><b className="text-strong">{e.action}</b></td>
                                    <td className="px-4 py-2.5 border-b border-line2">
                                        {e.actor_name}
                                        <span className="text-dim text-[10.8px] ml-1.5">({traduzPerfil(e.actor_role)})</span>
                                    </td>
                                    <td className="px-4 py-2.5 border-b border-line2 text-ink">{e.detail || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Cartao>
        </div>
    );
}
