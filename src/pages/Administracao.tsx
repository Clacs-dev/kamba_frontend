import { useEffect, useState } from "react";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import Botao from "../components/ui/Botao";
import Notice from "../components/ui/Notice";

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

const campoCls = "w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri";

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

function campoNumero(valor: number, setValor: (n: number) => void, rotulo: string) {
    return (
        <div>
            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">{rotulo}</label>
            <input type="number" min={0} max={100} value={valor} onChange={(e) => setValor(Number(e.target.value))}
                className={campoCls} />
        </div>
    );
}

export default function Administracao() {
    const [dados, setDados] = useState<Overview | null>(null);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");

    // Parâmetros do ciclo (editáveis, em %).
    const [tecO, setTecO] = useState(0);
    const [tecC, setTecC] = useState(0);
    const [tecV, setTecV] = useState(0);
    const [dirO, setDirO] = useState(0);
    const [dirC, setDirC] = useState(0);
    const [dirV, setDirV] = useState(0);
    const [prazo, setPrazo] = useState(30);
    const [calendario, setCalendario] = useState("");
    const [msgParam, setMsgParam] = useState("");
    const [erroParam, setErroParam] = useState("");
    const [aGuardarParam, setAGuardarParam] = useState(false);

    // Plano de subscrição.
    const [plano, setPlano] = useState("essencial");
    const [msgPlano, setMsgPlano] = useState("");
    const [erroPlano, setErroPlano] = useState("");
    const [aAlterarPlano, setAAlterarPlano] = useState(false);

    const carregar = () => {
        setACarregar(true);
        api.get("/admin/overview")
            .then((r) => {
                setDados(r.data);
                const s: Parametros = r.data.settings;
                setTecO(s.tec_objectives); setTecC(s.tec_competencies); setTecV(s.tec_values);
                setDirO(s.dir_objectives); setDirC(s.dir_competencies); setDirV(s.dir_values);
                setPrazo(s.appeal_deadline_days);
                setCalendario(s.cycle_calendar || "");
                setPlano(r.data.company.plan);
            })
            .catch((e) => setErro(e.response?.data?.detail || "Erro ao carregar a administração."))
            .finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    const tecSoma = tecO + tecC + tecV;
    const dirSoma = dirO + dirC + dirV;

    const guardarParametros = async () => {
        setErroParam(""); setMsgParam(""); setAGuardarParam(true);
        try {
            await api.put("/evaluation-settings", {
                tec_objectives: tecO / 100,
                tec_competencies: tecC / 100,
                tec_values: tecV / 100,
                dir_objectives: dirO / 100,
                dir_competencies: dirC / 100,
                dir_values: dirV / 100,
                appeal_deadline_days: prazo,
                cycle_calendar: calendario.trim() || null,
            });
            setMsgParam("Parâmetros guardados e registados na auditoria.");
            carregar();
        } catch (err: any) {
            setErroParam(err.response?.data?.detail || "Não foi possível guardar os parâmetros.");
        } finally {
            setAGuardarParam(false);
        }
    };

    const alterarPlano = async () => {
        setErroPlano(""); setMsgPlano(""); setAAlterarPlano(true);
        try {
            const r = await api.put("/admin/company/plan", { plan: plano });
            setMsgPlano(`Plano alterado: ${NOME_PLANOS[r.data.anterior] || r.data.anterior} → ${NOME_PLANOS[r.data.plan] || r.data.plan}.`);
            carregar();
        } catch (err: any) {
            setErroPlano(err.response?.data?.detail || "Não foi possível alterar o plano.");
        } finally {
            setAAlterarPlano(false);
        }
    };

    const exportar = async (formato: "csv" | "pdf") => {
        setErro("");
        try {
            const r = await api.get(`/audit/export?formato=${formato}&limit=500`, { responseType: "blob" });
            const url = URL.createObjectURL(r.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `trilha_auditoria_${new Date().toISOString().slice(0, 10)}.${formato}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            setErro("Não foi possível exportar a trilha de auditoria.");
        }
    };

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

    const { company: emp, audit } = dados;

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
                {/* Parâmetros do ciclo (editáveis) */}
                <Cartao>
                    <h3 className="text-[14.5px] mb-2">Parâmetros do ciclo</h3>
                    <p className="text-[11.5px] text-dim mb-3">Ponderações em percentagem. Cada categoria (técnico e dirigente) tem de somar 100%.</p>

                    <div className="grid grid-cols-3 gap-x-3">
                        {campoNumero(tecO, setTecO, "Obj. técnico %")}
                        {campoNumero(tecC, setTecC, "Compet. técnico %")}
                        {campoNumero(tecV, setTecV, "Valores técnico %")}
                    </div>
                    <p className={`text-[11px] mb-2 ${tecSoma === 100 ? "text-ok" : "text-bad"}`}>
                        Soma técnico: {tecSoma}% {tecSoma !== 100 && "— tem de ser 100%"}
                    </p>

                    <div className="grid grid-cols-3 gap-x-3">
                        {campoNumero(dirO, setDirO, "Obj. dirigente %")}
                        {campoNumero(dirC, setDirC, "Compet. dirigente %")}
                        {campoNumero(dirV, setDirV, "Valores dirigente %")}
                    </div>
                    <p className={`text-[11px] mb-2 ${dirSoma === 100 ? "text-ok" : "text-bad"}`}>
                        Soma dirigente: {dirSoma}% {dirSoma !== 100 && "— tem de ser 100%"}
                    </p>

                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Prazo de recurso (dias úteis)</label>
                    <input type="number" min={1} max={60} value={prazo} onChange={(e) => setPrazo(Number(e.target.value))}
                        className={campoCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Calendário do ciclo</label>
                    <input value={calendario} onChange={(e) => setCalendario(e.target.value)}
                        placeholder="Ex.: avaliação intercalar em julho, anual em dezembro"
                        className={campoCls} />

                    <div className="mt-1">
                        {msgParam && <Notice variante="soft" className="mb-3">{msgParam}</Notice>}
                        {erroParam && <Notice variante="alert" className="mb-3">{erroParam}</Notice>}
                        <Botao onClick={guardarParametros}
                            disabled={aGuardarParam || tecSoma !== 100 || dirSoma !== 100 || prazo < 1}>
                            {aGuardarParam ? "A guardar..." : "Guardar parâmetros"}
                        </Botao>
                    </div>
                </Cartao>

                {/* Plano SaaS (editável) */}
                <Cartao>
                    <h3 className="text-[14.5px] mb-2">Plano SaaS</h3>
                    <table className="w-full mb-3">
                        <tbody>
                            {linha("Empresa", <b className="text-strong">{emp.name}</b>)}
                            {linha("NIF", emp.nif || "—")}
                            {linha("Colaboradores", emp.user_count)}
                            {linha("Estado", emp.is_active ? "ativo" : "inativo")}
                            {linha("Módulos", "Portal · Avaliação · Disciplina · Formação · Cultura · Relatórios")}
                            {linha("Alojamento", "dados em território nacional · cópias diárias")}
                            {linha("Multi-empresa", "cada cliente num espaço isolado")}
                        </tbody>
                    </table>

                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Plano de subscrição</label>
                    <select value={plano} onChange={(e) => setPlano(e.target.value)} className={campoCls}>
                        {Object.entries(NOME_PLANOS).map(([valor, rotulo]) => (
                            <option key={valor} value={valor}>{rotulo}</option>
                        ))}
                    </select>

                    <div>
                        {msgPlano && <Notice variante="soft" className="mb-3">{msgPlano}</Notice>}
                        {erroPlano && <Notice variante="alert" className="mb-3">{erroPlano}</Notice>}
                        <Botao onClick={alterarPlano} variante="ghost" disabled={aAlterarPlano || plano === emp.plan}>
                            {aAlterarPlano ? "A alterar..." : "Alterar plano"}
                        </Botao>
                    </div>
                </Cartao>
            </div>

            {/* Trilha de auditoria + export */}
            <Cartao className="mt-3 p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[14.5px] m-0">Trilha de auditoria (registos imutáveis, carimbo temporal)</h3>
                    <div className="flex gap-2">
                        <Botao variante="ghost" onClick={() => exportar("csv")} className="!px-3 !py-1.5 !text-[11.5px]">
                            Exportar CSV
                        </Botao>
                        <Botao variante="ghost" onClick={() => exportar("pdf")} className="!px-3 !py-1.5 !text-[11.5px]">
                            Exportar PDF
                        </Botao>
                    </div>
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
