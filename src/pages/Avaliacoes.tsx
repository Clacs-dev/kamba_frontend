import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import FormularioAvaliacao from "../components/avaliacao/FormularioAvaliacao";
import BlocoValidacao from "../components/avaliacao/BlocoValidacao";
import BlocoConcordancia from "../components/avaliacao/BlocoConcordancia";
import DecisaoComissao from "../components/avaliacao/DecisaoComissao";
import api from "../lib/api";
import FaixaKpis from "../components/FaixaKpis";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import Modal from "../components/Modal";
import FlowBar from "../components/FlowBar";
import Notice from "../components/ui/Notice";

const FASES = ["Autoavaliação", "Avaliação do Director", "Concordância", "Comissão", "Fechada", "Validada"];

const DIRECOES = [
    "DAF — Contabilidade e Finanças",
    "DCM — Comercial",
    "DOP — Operações",
    "DTI — Tecnologias de Informação",
    "DCH — Capital Humano",
    "DJC — Jurídica e Conformidade",
];

const FASE_INDICE: Record<string, number> = {
    autoavaliacao: 0,
    avaliacao_director: 1,
    concordancia: 2,
    comissao: 3,
    fechada: 4,
    validada: 5,
};

interface ObjetivoPactuado {
    description: string;
    weight: number;
}

interface Avaliacao {
    id: number;
    cycle_id: number;
    collaborator_id: number;
    director_id: number;
    category: string;
    phase: string;
    final_score?: number | null;
    classification?: string | null;
    appeal_deadline?: string | null;
    objectives?: ObjetivoPactuado[] | null;
}

interface Ciclo {
    id: number;
    name: string;
    form_config?: { stages: StageConfig[] } | null;
}

interface StageItem {
    description: string;
    weight?: number | null;
    scale?: string[] | null;
}

interface StageConfig {
    number: number;
    name: string;
    weight: number;
    stage_type: "objectives" | "competencies" | "values" | "notes";
    items: StageItem[];
}

interface Colaborador {
    id: number;
    full_name: string;
    role: string;
}

export default function Avaliacoes() {
    const { user } = useAuth();
    const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
    const [ciclos, setCiclos] = useState<Ciclo[]>([]);
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erro] = useState("");
    const [modalCiclo, setModalCiclo] = useState(false);
    const [modalAvaliacao, setModalAvaliacao] = useState(false);
    const [cicloAConfigurar, setCicloAConfigurar] = useState<Ciclo | null>(null);

    const eGestor = user?.role === "capital_humano" || user?.role === "administracao";

    const carregar = () => {
        setACarregar(true);
        Promise.all([
            api.get("/evaluations").then((r) => setAvaliacoes(r.data)).catch(() => { }),
            api.get("/evaluations/cycles").then((r) => setCiclos(r.data)).catch(() => { }),
            eGestor
                ? api.get("/collaborators").then((r) => setColaboradores(r.data)).catch(() => { })
                : Promise.resolve(),
        ]).finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    // Nome do colaborador a partir do id (para mostrar nas avaliações).
    const nomeDe = (id: number) =>
        colaboradores.find((c) => c.id === id)?.full_name || `#${id}`;

    return (
        <div>
            <Cabecalho
                eyebrow="Ciclo de avaliação · fluxo entre perfis"
                titulo="Avaliação de Desempenho"
                descricao="O procedimento completo: autoavaliação → avaliação do director → concordância ou recurso → comissão → validação da administração."
            />

            <FaixaKpis kpis={[
                { valor: avaliacoes.length, label: "Total de avaliações" },
                { valor: avaliacoes.filter(a => a.phase === "validada").length, label: "Validadas", cor: "ok" },
                { valor: avaliacoes.filter(a => !["validada", "fechada"].includes(a.phase)).length, label: "Em curso", cor: "warn" },
                { valor: ciclos.length, label: "Ciclos" },
            ]} />
            {eGestor && (
                <div className="flex gap-2.5 mb-4">
                    <button
                        onClick={() => setModalCiclo(true)}
                        className="bg-paper border border-line rounded-lg px-4 py-2 text-[12.3px] font-semibold text-ink hover:border-pri hover:text-pri transition-colors"
                    >
                        + Criar ciclo
                    </button>
                    <button
                        onClick={() => setModalAvaliacao(true)}
                        disabled={ciclos.length === 0}
                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40"
                    >
                        + Criar avaliação
                    </button>
                </div>
            )}

            {eGestor && ciclos.length > 0 && (
                <Cartao className="mb-4">
                    <h3 className="text-[14.5px] mb-3">Ciclos de avaliação</h3>
                    <div className="space-y-2">
                        {ciclos.map((ciclo) => (
                            <div key={ciclo.id} className="flex items-center justify-between py-2 border-b border-line2 last:border-0">
                                <div>
                                    <span className="text-[13.5px] font-semibold text-strong">{ciclo.name}</span>
                                    <span className="text-dim text-[11.5px] ml-2">
                                        {ciclo.form_config?.stages?.length ?? 4} etapas configuradas
                                    </span>
                                </div>
                                <button
                                    onClick={() => setCicloAConfigurar(ciclo)}
                                    className="text-[11.5px] font-semibold text-pri hover:text-pri-dark transition-colors"
                                >
                                    Configurar formulário
                                </button>
                            </div>
                        ))}
                    </div>
                </Cartao>
            )}

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar avaliações...</p>
            ) : erro ? (
                <p className="text-bad text-sm">{erro}</p>
            ) : avaliacoes.length === 0 ? (
                <Cartao>
                    <p className="text-dim text-center py-4">
                        Ainda não há avaliações neste ciclo.
                        {eGestor && ciclos.length === 0 && " Comece por criar um ciclo."}
                    </p>
                </Cartao>
            ) : (
                <div className="space-y-3">
                    {avaliacoes.map((av) => (
                        <Cartao key={av.id}>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[14.5px] m-0">
                                    {nomeDe(av.collaborator_id)}
                                    <span className="text-dim text-[11px] font-normal ml-2">
                                        categoria: {av.category}
                                    </span>
                                </h3>
                                {av.final_score != null && (
                                    <span className="font-serif font-semibold text-[15px] text-pri-dark">
                                        {av.final_score} · {av.classification}
                                    </span>
                                )}
                            </div>
                            <FlowBar fases={FASES} atual={FASE_INDICE[av.phase] ?? 0} />
                            {av.phase === "comissao" && av.appeal_deadline && (
                                <div className="mt-3 text-[12.3px] text-warn bg-warn-bg border-l-[3px] border-warn rounded-r-lg px-3.5 py-2.5">
                                    <b>Recurso em análise pela Comissão.</b> Prazo para decisão (8 dias úteis):{" "}
                                    {new Date(av.appeal_deadline).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}.
                                </div>
                            )}
                            {av.phase === "comissao" && user?.role === "comissao" && (
                                <div className="mt-4 pt-4 border-t border-line">
                                    <DecisaoComissao evaluationId={av.id} aoDecidir={carregar} />
                                </div>
                            )}
                            {av.phase === "autoavaliacao" && av.collaborator_id === user?.id && (
                                <div className="mt-4 pt-4 border-t border-line">
                                    <FormularioAvaliacao
                                        evaluationId={av.id}
                                        cycleId={av.cycle_id}
                                        modo="auto"
                                        categoria={av.category}
                                        objetivosDefinidos={av.objectives ?? null}
                                        aoSubmeter={carregar}
                                    />
                                </div>
                            )}

                            {av.phase === "avaliacao_director" && av.director_id === user?.id && (
                                <div className="mt-4 pt-4 border-t border-line">
                                    <Notice className="mb-4">
                                        O colaborador concluiu a autoavaliação. Faça agora a sua avaliação.
                                    </Notice>
                                    <FormularioAvaliacao
                                        evaluationId={av.id}
                                        cycleId={av.cycle_id}
                                        modo="director"
                                        categoria={av.category}
                                        objetivosDefinidos={av.objectives ?? null}
                                        aoSubmeter={carregar}
                                    />
                                </div>
                            )}

                            {av.phase === "concordancia" && av.collaborator_id === user?.id && (
                                <div className="mt-4 pt-4 border-t border-line">
                                    <BlocoConcordancia evaluationId={av.id} aoAgir={carregar} />
                                </div>
                            )}

                            {av.phase === "fechada" && user?.role === "administracao" && (
                                <div className="mt-4 pt-4 border-t border-line">
                                    <BlocoValidacao evaluationId={av.id} aoAgir={carregar} />
                                </div>
                            )}

                        </Cartao>
                    ))}
                </div>
            )}

            {modalCiclo && (
                <ModalCiclo
                    aoFechar={() => setModalCiclo(false)}
                    aoCriar={() => { setModalCiclo(false); carregar(); }}
                />
            )}
            {modalAvaliacao && (
                <ModalAvaliacao
                    ciclos={ciclos}
                    colaboradores={colaboradores}
                    aoFechar={() => setModalAvaliacao(false)}
                    aoCriar={() => { setModalAvaliacao(false); carregar(); }}
                />
            )}
            {cicloAConfigurar && (
                <ModalConfigAvaliacao
                    ciclo={cicloAConfigurar}
                    aoFechar={() => setCicloAConfigurar(null)}
                    aoGuardar={() => { setCicloAConfigurar(null); carregar(); }}
                />
            )}
        </div>
    );
}

// ---- Modal: criar ciclo ----
function ModalCiclo({ aoFechar, aoCriar }: { aoFechar: () => void; aoCriar: () => void }) {
    const [nome, setNome] = useState("");
    const [erro, setErro] = useState("");
    const [aCarregar, setACarregar] = useState(false);

    const submeter = async () => {
        setErro("");
        setACarregar(true);
        try {
            await api.post("/evaluations/cycles", { name: nome });
            aoCriar();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao criar ciclo.");
        } finally {
            setACarregar(false);
        }
    };

    return (
        <Modal aberto={true} aoFechar={aoFechar} titulo="Criar ciclo de avaliação"
            subtitulo="Um ciclo agrupa as avaliações de um período (ex.: um ano)">
            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Nome do ciclo</label>
            <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Ciclo 2026"
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-4 focus:outline-none focus:border-pri"
            />
            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}
            <div className="flex gap-2.5">
                <button onClick={aoFechar}
                    className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors">
                    Cancelar
                </button>
                <button onClick={submeter} disabled={aCarregar || !nome}
                    className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                    {aCarregar ? "A criar..." : "Criar ciclo"}
                </button>
            </div>
        </Modal>
    );
}

// ---- Modal: configurar formulário do ciclo ----
const TIPOS_LABEL: Record<string, string> = {
    objectives: "Objetivos",
    competencies: "Competências",
    values: "Valores e conduta",
    notes: "Notas",
};

const DEFAULT_STAGES: StageConfig[] = [
    { number: 1, name: "Objectivos pactuados", weight: 50, stage_type: "objectives", items: [
        { description: "Atingir 100% da meta anual de vendas da equipa", weight: 40 },
        { description: "Reduzir o prazo médio de recebimento da carteira para 60 dias", weight: 30 },
        { description: "Garantir a adopção do CRM por 90% da equipa comercial", weight: 30 },
    ]},
    { number: 2, name: "Competências", weight: 35, stage_type: "competencies", items: [
        { description: "Orientação para resultados" },
        { description: "Trabalho em equipa e colaboração" },
        { description: "Ética e conformidade" },
        { description: "Comunicação" },
        { description: "Adaptabilidade e melhoria contínua" },
    ]},
    { number: 3, name: "Valores e conduta", weight: 15, stage_type: "values", items: [
        { description: "Cumpri o Código de Ética e Conduta da empresa" },
        { description: "Cumpri as normas de segurança e saúde no trabalho" },
        { description: "Mantive assiduidade e pontualidade regulares" },
    ]},
];

function ModalConfigAvaliacao({ ciclo, aoFechar, aoGuardar }: {
    ciclo: Ciclo;
    aoFechar: () => void;
    aoGuardar: () => void;
}) {
    const [stages, setStages] = useState<StageConfig[]>(() => {
        if (ciclo.form_config?.stages && ciclo.form_config.stages.length > 0) {
            return ciclo.form_config.stages.map((s, i) => ({ ...s, number: i + 1 }));
        }
        return DEFAULT_STAGES.map((s, i) => ({ ...s, number: i + 1 }));
    });
    const [aCarregar, setACarregar] = useState(false);
    const [erro, setErro] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const pesoTotal = stages.reduce((acc, s) => acc + (s.weight || 0), 0);

    const alterarStage = (idx: number, campo: keyof StageConfig, valor: any) => {
        setStages((prev) => prev.map((s, i) => {
            if (i !== idx) return s;
            if (campo === "weight") {
                const n = Number(valor);
                return { ...s, weight: Number.isFinite(n) ? n : 0 };
            }
            return { ...s, [campo]: valor as never };
        }));
    };

    const alterarItem = (stageIdx: number, itemIdx: number, campo: keyof StageItem, valor: string) => {
        setStages((prev) => prev.map((s, i) => {
            if (i !== stageIdx) return s;
            return {
                ...s,
                items: s.items.map((it, j) => {
                    if (j !== itemIdx) return it;
                    if (campo === "weight") {
                        const n = Number(valor);
                        return { ...it, weight: Number.isFinite(n) ? n : null };
                    }
                    return { ...it, [campo]: valor };
                }),
            };
        }));
    };

    const adicionarItem = (stageIdx: number) => {
        setStages((prev) => prev.map((s, i) => {
            if (i !== stageIdx) return s;
            return { ...s, items: [...s.items, { description: "Novo item", weight: null }] };
        }));
    };

    const removerItem = (stageIdx: number, itemIdx: number) => {
        setStages((prev) => prev.map((s, i) => {
            if (i !== stageIdx) return s;
            if (s.items.length <= 1) return s;
            return { ...s, items: s.items.filter((_, j) => j !== itemIdx) };
        }));
    };

    const adicionarStage = () => {
        setStages((prev) => [
            ...prev,
            { number: prev.length + 1, name: "Nova etapa", weight: 0, stage_type: "objectives", items: [{ description: "Novo objetivo", weight: null }] },
        ]);
        requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        });
    };

    const removerStage = (idx: number) => {
        setStages((prev) => {
            if (prev.length <= 1) return prev;
            return prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, number: i + 1 }));
        });
    };

    const guardar = async () => {
        setErro("");
        setACarregar(true);
        try {
            await api.put(`/evaluations/cycles/${ciclo.id}/config`, { stages });
            aoGuardar();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao guardar configuração.");
        } finally {
            setACarregar(false);
        }
    };

    const reporDefaults = async () => {
        setErro("");
        setACarregar(true);
        try {
            await api.post(`/evaluations/cycles/${ciclo.id}/config/reset`);
            setStages(DEFAULT_STAGES.map((s, i) => ({ ...s, number: i + 1 })));
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao repor configuração.");
        } finally {
            setACarregar(false);
        }
    };

    return (
        <Modal aberto aoFechar={aoFechar} titulo={`Configurar formulário — ${ciclo.name}`}
            subtitulo="Defina as etapas, ponderações e itens do formulário de avaliação para este ciclo"
            largura="xl">
            <div ref={scrollRef} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                <div className="flex items-center justify-between">
                    <span className={`text-[12.3px] font-semibold ${Math.round(pesoTotal * 10) / 10 === 100 ? "text-ok" : "text-warn"}`}>
                        Peso total das etapas: {Math.round(pesoTotal * 10) / 10}%
                    </span>
                    <div className="flex gap-2">
                        <button onClick={reporDefaults} disabled={aCarregar}
                            className="text-[11px] font-semibold text-dim hover:text-ink transition-colors disabled:opacity-40">
                            Repor Valores Padrão
                        </button>
                        <button onClick={adicionarStage} disabled={aCarregar}
                            className="text-[11px] font-semibold text-pri hover:text-pri-dark transition-colors disabled:opacity-40">
                            + Adicionar etapa
                        </button>
                    </div>
                </div>

                {stages.map((stage, si) => (
                    <div key={si} className="border border-line rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="flex-1 grid grid-cols-[1fr_80px_140px] gap-2 items-center">
                                <input
                                    value={stage.name}
                                    onChange={(e) => alterarStage(si, "name", e.target.value)}
                                    placeholder={`Etapa ${si + 1}`}
                                    className="bg-panel border border-line rounded-lg px-3 py-2 text-[13px] font-semibold focus:outline-none focus:border-pri"
                                />
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number" min={0} max={100}
                                        value={stage.weight}
                                        onChange={(e) => alterarStage(si, "weight", Number(e.target.value))}
                                        className="w-16 text-center font-semibold bg-panel border border-line rounded-lg px-2 py-2 text-[13px] focus:outline-none focus:border-pri"
                                    />
                                    <span className="text-dim text-[11px]">%</span>
                                </div>
                                <select
                                    value={stage.stage_type}
                                    onChange={(e) => alterarStage(si, "stage_type", e.target.value)}
                                    className="bg-panel border border-line rounded-lg px-2 py-2 text-[12px] focus:outline-none focus:border-pri"
                                >
                                    {Object.entries(TIPOS_LABEL).map(([v, l]) => (
                                        <option key={v} value={v}>{l}</option>
                                    ))}
                                </select>
                            </div>
                            {stages.length > 1 && (
                                <button onClick={() => removerStage(si)} title="Remover etapa"
                                    className="text-bad text-[18px] leading-none hover:opacity-70 transition-opacity mt-1">×</button>
                            )}
                        </div>

                        {stage.stage_type === "objectives" ? (
                            <div className="space-y-2 pl-1">
                                <div className="text-[10.5px] uppercase tracking-wide text-dim">Itens / objetivos</div>
                                {stage.items.map((item, ii) => (
                                    <div key={ii} className="flex items-center gap-2">
                                        <input
                                            value={item.description}
                                            onChange={(e) => alterarItem(si, ii, "description", e.target.value)}
                                            placeholder={`Objetivo ${ii + 1}`}
                                            className="flex-1 bg-panel border border-line rounded-lg px-3 py-1.5 text-[12.5px] focus:outline-none focus:border-pri"
                                        />
                                        <input
                                            type="number" min={0} max={100}
                                            value={item.weight ?? ""}
                                            onChange={(e) => alterarItem(si, ii, "weight", e.target.value === "" ? "0" : e.target.value)}
                                            placeholder="Peso"
                                            className="w-16 text-center text-[12px] bg-panel border border-line rounded-lg px-2 py-1.5 focus:outline-none focus:border-pri"
                                        />
                                        <span className="text-dim text-[10px]">%</span>
                                        {stage.items.length > 1 && (
                                            <button onClick={() => removerItem(si, ii)} title="Remover"
                                                className="text-bad text-[16px] leading-none hover:opacity-70">×</button>
                                        )}
                                    </div>
                                ))}
                                <button onClick={() => adicionarItem(si)}
                                    className="text-[11px] font-semibold text-pri hover:text-pri-dark transition-colors">
                                    + Adicionar item
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2 pl-1">
                                <div className="text-[10.5px] uppercase tracking-wide text-dim">Itens</div>
                                {stage.items.map((item, ii) => (
                                    <div key={ii} className="flex items-center gap-2">
                                        <input
                                            value={item.description}
                                            onChange={(e) => alterarItem(si, ii, "description", e.target.value)}
                                            placeholder={`Item ${ii + 1}`}
                                            className="flex-1 bg-panel border border-line rounded-lg px-3 py-1.5 text-[12.5px] focus:outline-none focus:border-pri"
                                        />
                                        {stage.items.length > 1 && (
                                            <button onClick={() => removerItem(si, ii)} title="Remover"
                                                className="text-bad text-[16px] leading-none hover:opacity-70">×</button>
                                        )}
                                    </div>
                                ))}
                                <button onClick={() => adicionarItem(si)}
                                    className="text-[11px] font-semibold text-pri hover:text-pri-dark transition-colors">
                                    + Adicionar item
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {erro && <p className="text-bad text-sm mt-3">{erro}</p>}
            <div className="flex gap-2.5 mt-4 pt-4 border-t border-line">
                <button onClick={aoFechar}
                    className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors">
                    Cancelar
                </button>
                <button onClick={guardar} disabled={aCarregar}
                    className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                    {aCarregar ? "A guardar..." : "Guardar configuração"}
                </button>
            </div>
        </Modal>
    );
}

// ---- Modal: criar avaliação ----
function ModalAvaliacao({ ciclos, colaboradores, aoFechar, aoCriar }: {
    ciclos: Ciclo[];
    colaboradores: Colaborador[];
    aoFechar: () => void;
    aoCriar: () => void;
}) {
    const [modo, setModo] = useState<"individual" | "direcao">("individual");
    const [cycleId, setCycleId] = useState(ciclos[0]?.id || 0);
    const [collaboratorId, setCollaboratorId] = useState(0);
    const [directorId, setDirectorId] = useState(0);
    const [category, setCategory] = useState("tecnico");
    const [direcao, setDirecao] = useState("");
    const [direcaoOutra, setDirecaoOutra] = useState("");
    const [erro, setErro] = useState("");
    const [aCarregar, setACarregar] = useState(false);
    const { user } = useAuth();
    const diretores = colaboradores.filter((c) => c.role === "director");

    const direcaoFinal = direcao === "outro" ? direcaoOutra.trim() : direcao;

    const cicloSeleccionado = ciclos.find((c) => c.id === cycleId);

    const podeSubmeter = (modo === "individual" ? !!collaboratorId : !!direcaoFinal)
        && !!directorId && !!cicloSeleccionado;

    const submeter = async () => {
        setErro("");
        setACarregar(true);
        try {
            if (modo === "direcao") {
                await api.post("/evaluations/by-direction", {
                    cycle_id: cycleId,
                    director_id: directorId,
                    department: direcaoFinal,
                    category,
                });
            } else {
                await api.post("/evaluations", {
                    cycle_id: cycleId,
                    collaborator_id: collaboratorId,
                    director_id: directorId,
                    category,
                });
            }
            aoCriar();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao criar avaliação.");
        } finally {
            setACarregar(false);
        }
    };

    return (
        <Modal aberto={true} aoFechar={aoFechar} titulo="Criar avaliação"
            subtitulo="Selecione o ciclo configurado — os objectivos e competências vêm do form_config">
            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Alcance</label>
            <div className="flex gap-2 mb-3">
                <button onClick={() => setModo("individual")}
                    className={`flex-1 rounded-lg px-3 py-2 text-[12.3px] font-semibold border transition-colors ${modo === "individual" ? "bg-pri text-white border-pri" : "bg-paper border-line text-ink hover:border-pri"}`}>
                    Um colaborador
                </button>
                <button onClick={() => setModo("direcao")}
                    className={`flex-1 rounded-lg px-3 py-2 text-[12.3px] font-semibold border transition-colors ${modo === "direcao" ? "bg-pri text-white border-pri" : "bg-paper border-line text-ink hover:border-pri"}`}>
                    Toda a direção
                </button>
            </div>

            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Ciclo</label>
            <select value={cycleId} onChange={(e) => setCycleId(Number(e.target.value))}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                {ciclos.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {modo === "individual" && (
                <>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Colaborador a avaliar</label>
                    <select value={collaboratorId} onChange={(e) => setCollaboratorId(Number(e.target.value))}
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                        <option value={0}>— escolher —</option>
                        {colaboradores.filter((c) => c.id !== user?.id).map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                </>
            )}

            {modo === "direcao" && (
                <>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Direção</label>
                    <select value={direcao} onChange={(e) => { setDirecao(e.target.value); if (e.target.value !== "outro") setDirecaoOutra(""); }}
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-2 focus:outline-none focus:border-pri">
                        <option value="">— escolher —</option>
                        {DIRECOES.map((d) => <option key={d} value={d}>{d}</option>)}
                        <option value="outro">Outro (escrever)</option>
                    </select>
                    {direcao === "outro" && (
                        <input
                            value={direcaoOutra}
                            onChange={(e) => setDirecaoOutra(e.target.value)}
                            placeholder="Escreva a direção/área"
                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-2 focus:outline-none focus:border-pri"
                            autoFocus
                        />
                    )}
                    <p className="text-dim text-[11.5px] mb-3">Abre uma autoavaliação para todos os colaboradores desta direção que ainda não têm avaliação no ciclo.</p>
                </>
            )}

            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Director avaliador</label>
            <select value={directorId} onChange={(e) => setDirectorId(Number(e.target.value))}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                <option value={0}>— escolher —</option>
                {diretores.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>

            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Categoria</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                <option value="tecnico">Técnico</option>
                <option value="dirigente">Dirigente</option>
            </select>

            {cicloSeleccionado?.form_config?.stages && (
                <div className="border border-line rounded-xl p-3 mb-4 space-y-2">
                    <div className="text-[10.5px] uppercase tracking-wide text-dim mb-1">
                        Formulário do ciclo seleccionado
                    </div>
                    {(cicloSeleccionado.form_config as any).stages.map((s: any, i: number) => (
                        <div key={i} className="py-1.5 border-b border-line2 last:border-0">
                            <div className="text-[12.5px] font-semibold text-strong">
                                Etapa {s.number} · {s.name}
                                <span className="text-dim font-normal ml-1">(peso {s.weight}%)</span>
                            </div>
                            {s.items?.length > 0 && s.stage_type === "objectives" && (
                                <div className="ml-3 mt-1 space-y-0.5">
                                    {s.items.map((it: any, j: number) => (
                                        <div key={j} className="text-[12px] text-dim">
                                            {j + 1}. {it.description}
                                            {it.weight != null && (
                                                <span className="bg-pri-bg text-pri-dark text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1">
                                                    {it.weight}%
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {s.items?.length > 0 && s.stage_type !== "objectives" && (
                                <div className="ml-3 mt-1 text-[11.5px] text-dim">
                                    {s.items.length} {s.stage_type === "competencies" ? "competências" : s.stage_type === "values" ? "itens" : "itens"}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}
            <div className="flex gap-2.5">
                <button onClick={aoFechar}
                    className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors">
                    Cancelar
                </button>
                <button onClick={submeter} disabled={aCarregar || !podeSubmeter}
                    className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                    {aCarregar ? "A criar..." : modo === "direcao" ? "Criar avaliações (direção)" : "Criar avaliação"}
                </button>
            </div>
        </Modal>
    );
}