import { Fragment, useEffect, useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";

interface Pessoa {
    id: number;
    full_name: string;
}

interface Linha {
    id: number;
    cycle_id: number;
    cycle_name: string;
    collaborator_id: number;
    collaborator_name: string;
    position: string | null;
    potential: string | null;
    performance_score: number | null;
    performance_level: string | null;
    is_high_potential: boolean;
    risk_of_exit: boolean;
    notes: string | null;
}

interface Sucessao {
    id: number;
    role_title: string;
    incumbent_id: number | null;
    incumbent_name: string | null;
    successor_id: number;
    successor_name: string;
    readiness: string;
    risk_of_exit: boolean;
    notes: string | null;
}

interface ReporteTalento {
    cycle_id: number;
    cycle_name: string;
    matrix: Linha[];
    grid: Record<string, number>;
    high_potential_count: number;
    risk_of_exit_count: number;
    succession: Sucessao[];
}

const POTENCIAIS = [
    { value: "alto", label: "Alto" },
    { value: "medio", label: "Médio" },
    { value: "baixo", label: "Baixo" },
];

const PRONTIDAO = [
    { value: "pronto_agora", label: "Pronto agora" },
    { value: "em_6_meses", label: "Em até 6 meses" },
    { value: "em_12_meses", label: "Em até 12 meses" },
    { value: "nao_qualificado", label: "Não qualificado" },
];

// As 9 células: chave "desempenho_potencial".
const CELULAS: { chave: string; rotulo: string; cor: string; tom: string }[] = [
    { chave: "alto_alto", rotulo: "Estrela", cor: "bg-ok text-white", tom: "bg-ok" },
    { chave: "alto_medio", rotulo: "Alto desempenho", cor: "bg-ok-bg text-ok", tom: "bg-ok" },
    { chave: "alto_baixo", rotulo: "Alto desempenho · baixo pot.", cor: "bg-pri-bg text-pri-dark", tom: "bg-pri" },
    { chave: "medio_alto", rotulo: "Alto potencial", cor: "bg-warn-bg text-warn", tom: "bg-warn" },
    { chave: "medio_medio", rotulo: "Consistente", cor: "bg-pri-bg text-pri-dark", tom: "bg-pri" },
    { chave: "medio_baixo", rotulo: "Desempenho médio", cor: "bg-pri-bg text-pri-dark", tom: "bg-pri" },
    { chave: "baixo_alto", rotulo: "Potencial alto · baixo perf.", cor: "bg-warn-bg text-warn", tom: "bg-warn" },
    { chave: "baixo_medio", rotulo: "Necessita melhoria", cor: "bg-warn-bg text-warn", tom: "bg-warn" },
    { chave: "baixo_baixo", rotulo: "Risco / melhoria", cor: "bg-bad-bg text-bad", tom: "bg-bad" },
];

const NIVEL_DESEMPENHO: Record<string, { texto: string; classe: string }> = {
    alto: { texto: "Alto (≥4,0)", classe: "bg-ok-bg text-ok" },
    medio: { texto: "Médio (3,0–3,9)", classe: "bg-pri-bg text-pri-dark" },
    baixo: { texto: "Baixo (<3,0)", classe: "bg-bad-bg text-bad" },
};

const FAIXA_DESEMPENHO = ["alto", "medio", "baixo"];

function CabecalhoTalento({ titulo, sub }: { titulo: string; sub: string }) {
    return (
        <div className="mb-3">
            <h3 className="text-[14.5px]">{titulo}</h3>
            <p className="text-dim text-[11.5px] mt-1">{sub}</p>
        </div>
    );
}

function KpiPequeno({ valor, label, cor }: { valor: string | number; label: string; cor?: string }) {
    return (
        <div className="bg-panel rounded-xl px-4 py-3 flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full ${cor ?? "bg-pri"}`} />
            <div>
                <div className="font-serif font-semibold text-[20px] leading-none text-pri-dark">{valor}</div>
                <div className="text-[10.5px] text-dim uppercase tracking-wide mt-1">{label}</div>
            </div>
        </div>
    );
}

export default function TalentoSucessao({ cicloId }: { cicloId: number | null }) {
    const [dados, setDados] = useState<ReporteTalento | null>(null);
    const [colaboradores, setColaboradores] = useState<Pessoa[]>([]);
    const [aCarregar, setACarregar] = useState(false);
    const [erro, setErro] = useState("");
    const [msg, setMsg] = useState("");

    // Formulário de sucessão.
    const [form, setForm] = useState({
        role_title: "",
        incumbent_id: "",
        successor_id: "",
        readiness: "em_12_meses",
        risk_of_exit: false,
    });
    const [editarId, setEditarId] = useState<number | null>(null);

    const carregar = () => {
        if (cicloId == null) return;
        setACarregar(true);
        setErro("");
        api.get(`/talent/report/${cicloId}`)
            .then((resp) => setDados(resp.data))
            .catch((err) => {
                setDados(null);
                setErro(err.response?.data?.detail || "Erro ao carregar a matriz de talento.");
            })
            .finally(() => setACarregar(false));
    };

    useEffect(() => {
        api.get("/collaborators")
            .then((resp) => setColaboradores(resp.data))
            .catch(() => { });
    }, []);

    useEffect(() => {
        carregar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cicloId]);

    const descarregarPdf = async () => {
        if (cicloId == null) return;
        try {
            const resp = await api.get(`/talent/report/${cicloId}/pdf`, { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `talento_sucessao_${dados?.cycle_name || "ciclo"}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            setErro("Não foi possível gerar o PDF de talento.");
        }
    };

    const atualizarLinha = async (linha: Linha, dados: object) => {
        if (linha.id === 0) {
            await api.post("/talent/matrix", {
                cycle_id: linha.cycle_id,
                collaborator_id: linha.collaborator_id,
                ...dados,
            });
        } else {
            await api.put(`/talent/matrix/${linha.id}`, dados);
        }
    };

    const guardarPotencial = async (linha: Linha, potential: string) => {
        setMsg("");
        setErro("");
        try {
            await atualizarLinha(linha, {
                potential,
                position: linha.position ?? null,
                risk_of_exit: linha.risk_of_exit,
                notes: linha.notes ?? null,
            });
            setMsg(`Potencial de ${linha.collaborator_name} atualizado para o comité.`);
            carregar();
        } catch (e: any) {
            setErro(e.response?.data?.detail || "Erro ao guardar o potencial.");
        }
    };

    const alternarRisco = async (linha: Linha) => {
        if (!linha.potential) {
            setErro("Atribua primeiro o potencial para assinalar risco de saída.");
            return;
        }
        setErro("");
        setMsg("");
        try {
            await atualizarLinha(linha, {
                potential: linha.potential,
                position: linha.position ?? null,
                risk_of_exit: !linha.risk_of_exit,
                notes: linha.notes ?? null,
            });
            setMsg(`Risco de saída de ${linha.collaborator_name} atualizado.`);
            carregar();
        } catch (e: any) {
            setErro(e.response?.data?.detail || "Erro ao atualizar o risco.");
        }
    };

    const guardarSucessao = async () => {
        setErro("");
        setMsg("");
        if (form.role_title.trim().length < 2 || !form.successor_id) {
            setErro("Preencha o cargo-chave e o sucessor.");
            return;
        }
        const payload = {
            role_title: form.role_title.trim(),
            incumbent_id: form.incumbent_id ? Number(form.incumbent_id) : null,
            successor_id: Number(form.successor_id),
            readiness: form.readiness,
            risk_of_exit: form.risk_of_exit,
        };
        try {
            if (editarId != null) {
                await api.put(`/talent/succession/${editarId}`, payload);
            } else {
                await api.post("/talent/succession", payload);
            }
            setMsg(editarId != null ? "Plano de sucessão atualizado." : "Plano de sucessão criado.");
            setForm({ role_title: "", incumbent_id: "", successor_id: "", readiness: "em_12_meses", risk_of_exit: false });
            setEditarId(null);
            carregar();
        } catch (e: any) {
            setErro(e.response?.data?.detail || "Erro ao guardar o plano de sucessão.");
        }
    };

    const editarSucessao = (s: Sucessao) => {
        setForm({
            role_title: s.role_title,
            incumbent_id: s.incumbent_id ? String(s.incumbent_id) : "",
            successor_id: String(s.successor_id),
            readiness: s.readiness,
            risk_of_exit: s.risk_of_exit,
        });
        setEditarId(s.id);
    };

    const removerSucessao = async (s: Sucessao) => {
        setErro("");
        try {
            await api.delete(`/talent/succession/${s.id}`);
            setMsg("Plano de sucessão removido.");
            if (editarId === s.id) {
                setEditarId(null);
                setForm({ role_title: "", incumbent_id: "", successor_id: "", readiness: "em_12_meses", risk_of_exit: false });
            }
            carregar();
        } catch (e: any) {
            setErro(e.response?.data?.detail || "Erro ao remover o plano.");
        }
    };

    const selectClass = "bg-panel border border-line rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:border-pri";

    if (cicloId == null) return null;

    return (
        <div className="mt-6 space-y-4">
            {msg && <div className="border-l-[3px] border-ok bg-ok-bg rounded-r-lg px-3 py-2 text-[12px]">{msg}</div>}
            {erro && <div className="border-l-[3px] border-bad bg-bad-bg rounded-r-lg px-3 py-2 text-[12px]">{erro}</div>}

            <div className="flex items-center justify-between flex-wrap gap-2">
                <CabecalhoTalento
                    titulo="Comité de Talento — Matriz 9-Box"
                    sub="Desempenho (das avaliações validadas) × Potencial (juízo do comité). Atribua o potencial a cada colaborador; as estrelas alimentam a sucessão."
                />
                <button
                    onClick={descarregarPdf}
                    className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors"
                >
                    ↓ Talento & Sucessão em PDF
                </button>
            </div>

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar matriz de talento...</p>
            ) : dados ? (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <KpiPequeno valor={dados.high_potential_count} label="Estrelas" cor="bg-ok" />
                        <KpiPequeno valor={dados.risk_of_exit_count} label="Risco de saída" cor="bg-bad" />
                        <KpiPequeno valor={dados.succession.length} label="Cargos com sucessor" cor="bg-pri" />
                    </div>

                    {/* Matriz 9-Box */}
                    <Cartao>
                        <h3 className="text-[14.5px] mb-3">Matriz 9-Box</h3>
                        <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-2 text-[12px]">
                            <div />
                            {["Alto", "Médio", "Baixo"].map((p) => (
                                <div key={p} className="text-center text-[10.5px] uppercase tracking-wide text-dim font-semibold pb-1">
                                    Potencial {p}
                                </div>
                            ))}
                            {FAIXA_DESEMPENHO.map((perc) => (
                                <Fragment key={perc}>
                                    <div className="flex items-center text-[10.5px] uppercase tracking-wide text-dim font-semibold pr-1">
                                        Desempenho{" "}
                                        <span className="hidden md:inline">&nbsp;{perc === "alto" ? "(≥4,0)" : perc === "medio" ? "(3,0–3,9)" : "(<3,0)"}</span>
                                    </div>
                                    {["alto", "medio", "baixo"].map((pot) => {
                                        const cel = CELULAS.find((c) => c.chave === `${perc}_${pot}`)!;
                                        return (
                                            <div key={`${perc}-${pot}`} className={`${cel.cor} rounded-xl px-3 py-3 min-h-[74px]`}>
                                                <div className="font-serif font-semibold text-[22px] leading-none">
                                                    {dados.grid[cel.chave] ?? 0}
                                                </div>
                                                <div className="text-[10px] mt-1.5 leading-tight">{cel.rotulo}</div>
                                            </div>
                                        );
                                    })}
                                </Fragment>
                            ))}
                        </div>
                    </Cartao>

                    {/* Lista para o comité */}
                    <Cartao className="p-0 overflow-hidden">
                        <div className="p-4 pb-2">
                            <h3 className="text-[14.5px]">Atribuição de potencial pelo comité</h3>
                            <p className="text-dim text-[11.5px] mt-1">
                                Todos os validados do ciclo. Escolha o potencial (e assinale risco de saída) — fica registado em auditoria.
                            </p>
                        </div>
                        <table className="w-full text-[12.5px]">
                            <thead>
                                <tr>
                                    <Th>Colaborador</Th>
                                    <Th>Desempenho</Th>
                                    <Th>Potencial</Th>
                                    <Th>Risco de saída</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {dados.matrix.length === 0 && (
                                    <tr><Td colSpan={4}><span className="text-dim">Sem avaliados validados neste ciclo.</span></Td></tr>
                                )}
                                {dados.matrix.map((linha) => {
                                    const nivel = linha.performance_level ? NIVEL_DESEMPENHO[linha.performance_level] : null;
                                    return (
                                        <tr key={linha.collaborator_id} className="hover:bg-panel">
                                            <Td>
                                                <div className="flex items-center gap-2">
                                                    <b className="text-strong">{linha.collaborator_name}</b>
                                                    {linha.is_high_potential && (
                                                        <span className="bg-ok text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded-full">ESTRELA</span>
                                                    )}
                                                </div>
                                            </Td>
                                            <Td>
                                                <span className="text-dim">{linha.performance_score?.toFixed(2) ?? "—"}</span>
                                                {nivel && (
                                                    <span className={`ml-2 ${nivel.classe} text-[10px] font-semibold px-1.5 py-0.5 rounded-full`}>{nivel.texto.split(" ")[0]}</span>
                                                )}
                                            </Td>
                                            <Td>
                                                <select
                                                    value={linha.potential ?? ""}
                                                    onChange={(e) => guardarPotencial(linha, e.target.value)}
                                                    className={selectClass}
                                                >
                                                    <option value="">— atribuir —</option>
                                                    {POTENCIAIS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                                                </select>
                                            </Td>
                                            <Td>
                                                <button
                                                    onClick={() => alternarRisco(linha)}
                                                    disabled={!linha.potential}
                                                    className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors disabled:opacity-40 ${
                                                        linha.risk_of_exit
                                                            ? "bg-bad text-white border-bad"
                                                            : "border-line text-dim hover:border-bad hover:text-bad"
                                                    }`}
                                                >
                                                    {linha.risk_of_exit ? "Risco alto" : "Assinalar"}
                                                </button>
                                            </Td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Cartao>

                    {/* Sucessão */}
                    <Cartao>
                        <h3 className="text-[14.5px] mb-1">Plano de sucessão por cargo-chave</h3>
                        <p className="text-dim text-[11.5px] mb-3">
                            Para cada função crítica, um sucessor com a prontidão conhecida. A sucessão evita travões quando alguém sai.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                            <input
                                value={form.role_title}
                                onChange={(e) => setForm({ ...form, role_title: e.target.value })}
                                placeholder="Cargo-chave (ex.: Director de Operações)"
                                className="bg-panel border border-line rounded-lg px-3 py-2 text-[12.5px] focus:outline-none focus:border-pri"
                            />
                            <select
                                value={form.incumbent_id}
                                onChange={(e) => setForm({ ...form, incumbent_id: e.target.value })}
                                className={selectClass}
                            >
                                <option value="">Titular atual (opcional)</option>
                                {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                            <select
                                value={form.successor_id}
                                onChange={(e) => setForm({ ...form, successor_id: e.target.value })}
                                className={selectClass}
                            >
                                <option value="">Sucessor *</option>
                                {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                            <select
                                value={form.readiness}
                                onChange={(e) => setForm({ ...form, readiness: e.target.value })}
                                className={selectClass}
                            >
                                {PRONTIDAO.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                            <label className="flex items-center gap-2 text-[12px] text-dim">
                                <input
                                    type="checkbox"
                                    checked={form.risk_of_exit}
                                    onChange={(e) => setForm({ ...form, risk_of_exit: e.target.checked })}
                                />
                                Titular em risco de saída
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={guardarSucessao}
                                    className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors"
                                >
                                    {editarId != null ? "Guardar alterações" : "+ Adicionar plano"}
                                </button>
                                {editarId != null && (
                                    <button
                                        onClick={() => {
                                            setEditarId(null);
                                            setForm({ role_title: "", incumbent_id: "", successor_id: "", readiness: "em_12_meses", risk_of_exit: false });
                                        }}
                                        className="text-dim hover:text-strong text-[12.3px] font-semibold"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </div>

                        {dados.succession.length === 0 ? (
                            <p className="text-dim text-[12.3px]">Sem plano de sucessão definido.</p>
                        ) : (
                            <table className="w-full text-[12.5px]">
                                <thead>
                                    <tr>
                                        <Th>Cargo-chave</Th><Th>Titular</Th><Th>Sucessor</Th><Th>Prontidão</Th><Th>Risco</Th><Th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {dados.succession.map((s) => (
                                        <tr key={s.id} className="hover:bg-panel">
                                            <Td><b className="text-strong">{s.role_title}</b></Td>
                                            <Td>{s.incumbent_name ?? <span className="text-dim">—</span>}</Td>
                                            <Td>{s.successor_name}</Td>
                                            <Td>{PRONTIDAO.find((p) => p.value === s.readiness)?.label ?? s.readiness}</Td>
                                            <Td>
                                                {s.risk_of_exit
                                                    ? <span className="bg-bad-bg text-bad text-[10px] font-bold px-1.5 py-0.5 rounded-full">Sim</span>
                                                    : <span className="text-dim">Não</span>}
                                            </Td>
                                            <Td>
                                                <div className="flex gap-2">
                                                    <button onClick={() => editarSucessao(s)} className="text-[12px] text-pri font-semibold hover:underline">Editar</button>
                                                    <button onClick={() => removerSucessao(s)} className="text-[12px] text-bad font-semibold hover:underline">Remover</button>
                                                </div>
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Cartao>
                </>
            ) : null}
        </div>
    );
}

function Th({ children }: { children?: React.ReactNode }) {
    return <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-4 py-2.5 border-b border-line">{children}</th>;
}
function Td({ children, colSpan = 1 }: { children: React.ReactNode; colSpan?: number }) {
    return <td colSpan={colSpan} className="px-4 py-2.5 border-b border-line2">{children}</td>;
}