import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import Modal from "../components/Modal";
import Notice from "../components/ui/Notice";
import Tag from "../components/ui/Tag";
import Barra from "../components/ui/Barra";
import { Chip, ChipGroup } from "../components/ui/Chip";

interface Inquerito {
    id: number;
    title: string;
    dimensions: string[];
    status: string;
    participated?: boolean;
}

interface ResultadosInquerito {
    survey_id: number;
    response_count: number;
    released: boolean;
    results: Record<string, number>;
    note: string;
    participation_count: number;
    universe: number;
    participation_rate: number | null;
    enps_score: number | null;
    enps_promoters: number;
    enps_neutrals: number;
    enps_detractors: number;
}

interface DimRow {
    name: string;
    y2023: number | null;
    y2024: number | null;
    y2025: number | null;
}

interface RelatorioCultura {
    enps: string | null;
    participation: string | null;
    pulses_note: string | null;
    dimensions: DimRow[];
    recommendations: string[];
    participation_count: number;
    universe: number;
    participation_rate: number | null;
    enps_score: number | null;
    enps_promoters: number;
    enps_neutrals: number;
    enps_detractors: number;
}

interface DimensionCyclePoint {
    survey_id: number;
    cycle_label: string;
    value: number | null;
}

interface DimensionEvolution {
    name: string;
    points: DimensionCyclePoint[];
    latest: number | null;
}

interface EvolucaoCultura {
    dimensions: DimensionEvolution[];
    cycles: string[];
}

const ESCALA = [
    { v: 1, l: "Raramente" }, { v: 2, l: "Às vezes" }, { v: 3, l: "Com regularidade" },
    { v: 4, l: "Quase sempre" }, { v: 5, l: "Sempre" },
];

function KpiCard({ valor, label, nota }: { valor: string; label: string; nota?: string }) {
    return (
        <Cartao>
            <div className="font-serif font-semibold text-[26px] text-pri-dark">{valor}</div>
            <div className="text-[10.5px] text-dim uppercase tracking-wide mt-0.5 leading-tight">{label}</div>
            {nota && <div className="text-[10.5px] text-pri mt-1.5">{nota}</div>}
        </Cartao>
    );
}

const variantePorValor = (v: number | null): "ok" | "pri" | "warn" => {
    if (v == null) return "pri";
    if (v >= 70) return "ok";
    if (v >= 55) return "pri";
    return "warn";
};

// eNPS: formata com sinal (+30 / −12).
const fmtEnps = (n: number | null): string => {
    if (n == null) return "—";
    return n >= 0 ? `+${n}` : `${n}`;
};

export default function Cultura() {
    const { user } = useAuth();
    const [inqueritos, setInqueritos] = useState<Inquerito[]>([]);
    const [resultados, setResultados] = useState<Record<number, ResultadosInquerito>>({});
    const [relatorio, setRelatorio] = useState<RelatorioCultura | null>(null);
    const [aCarregar, setACarregar] = useState(true);
    const [msg, setMsg] = useState("");
    const [modalCriar, setModalCriar] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [respostas, setRespostas] = useState<Record<number, Record<string, number>>>({});
    const [respondido, setRespondido] = useState<Record<number, boolean>>({});
    const [evolucao, setEvolucao] = useState<EvolucaoCultura | null>(null);

    const eCH = user?.role === "capital_humano";
    const eGestor = eCH || user?.role === "administracao";
    // CH, Administração e Director podem criar pulses.
    const podeCriarPulse = eGestor || user?.role === "director";
    const empresa = user?.company_name || "a sua empresa";

    const carregar = () => {
        setACarregar(true);
        Promise.all([
            api.get("/surveys").then((r) => setInqueritos(r.data)).catch(() => { }),
            api.get("/surveys/culture-report/data").then((r) => setRelatorio(r.data)).catch(() => { }),
            api.get("/surveys/culture-report/evolution").then((r) => setEvolucao(r.data)).catch(() => { }),
        ]).finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    // Resultados e participação por pulse (só CH / Administração).
    useEffect(() => {
        if (!eGestor || inqueritos.length === 0) return;
        let vivo = true;
        Promise.all(inqueritos.map((inq) =>
            api.get(`/surveys/${inq.id}/results`).then((r) => r.data).catch(() => null)
        )).then((todos) => {
            if (!vivo) return;
            const mapa: Record<number, ResultadosInquerito> = {};
            todos.forEach((res, i) => {
                if (res) mapa[inqueritos[i].id] = res;
            });
            setResultados(mapa);
        });
        return () => { vivo = false; };
    }, [eGestor, inqueritos]);

    const definirResposta = (inqId: number, dim: string, valor: number) => {
        setRespostas((prev) => ({ ...prev, [inqId]: { ...(prev[inqId] || {}), [dim]: valor } }));
    };

    const submeterPulse = async (inq: Inquerito) => {
        try {
            await api.post(`/surveys/${inq.id}/respond`, { answers: respostas[inq.id] || {} });
            setRespondido((prev) => ({ ...prev, [inq.id]: true }));
            setMsg("Resposta registada anonimamente. Obrigado!");
            carregar();
        } catch (err: any) {
            setMsg(err.response?.data?.detail || "Erro ao responder (talvez já tenha respondido).");
        }
    };

    const eliminarPulse = async (inq: Inquerito) => {
        if (!confirm(`Eliminar o inquérito "${inq.title}"? As respostas anónimas também serão removidas.`)) return;
        try {
            await api.delete(`/surveys/${inq.id}`);
            setMsg("Inquérito eliminado.");
            carregar();
        } catch (err: any) {
            setMsg(err.response?.data?.detail || "Erro ao eliminar o inquérito.");
        }
    };

    const pulseAlvo = inqueritos.find((i) => i.status === "aberto") || inqueritos[0] || null;
    const resAlvo = pulseAlvo ? resultados[pulseAlvo.id] : undefined;
    const respondiAlvo = pulseAlvo ? !!(respondido[pulseAlvo.id] || pulseAlvo.participated) : false;

    const kpis: { v: string; l: string; n?: string }[] = [
        (() => {
            // eNPS SEMPRE calculado das respostas de recomendação — nunca estático.
            const src = (resAlvo && resAlvo.enps_score != null) ? resAlvo
                : (relatorio && relatorio.enps_score != null ? relatorio : null);
            if (src) {
                return {
                    v: fmtEnps(src.enps_score),
                    l: "eNPS",
                    n: `${src.enps_promoters} promotores · ${src.enps_neutrals} neutros · ${src.enps_detractors} detratores`,
                };
            }
            return {
                v: "—",
                l: "eNPS",
                n: "precisa de respostas à pergunta de recomendação",
            };
        })(),
        (() => {
            // Participação SEMPRE calculada dos dados reais — nunca estática.
            if (resAlvo && resAlvo.participation_rate != null) {
                return {
                    v: `${resAlvo.participation_rate}%`,
                    l: "Participação",
                    n: `${resAlvo.participation_count} de ${resAlvo.universe} colaboradores responderam`,
                };
            }
            if (relatorio?.participation_rate != null) {
                return {
                    v: `${relatorio.participation_rate}%`,
                    l: "Participação",
                    n: `${relatorio.participation_count} de ${relatorio.universe} colaboradores responderam`,
                };
            }
            return { v: "—", l: "Participação", n: "aguardando respostas ao pulse" };
        })(),
        { v: `${inqueritos.length}`, l: "Pulses realizados", n: "trimestrais" },
        pulseAlvo
            ? {
                v: podeCriarPulse ? "gestão" : respondiAlvo ? "✓ já respondeu" : "responda ao lado",
                l: pulseAlvo.title,
                n: podeCriarPulse ? "a gestão não participa" : "anónimo, 60 segundos",
            }
            : { v: "—", l: "Pulse ativo", n: "anónimo, 60 segundos" },
    ];

    const recomendacoes = relatorio?.recommendations?.length ? relatorio.recommendations : [];
    const ciclos = evolucao?.cycles?.length ? evolucao.cycles : [];
    const dimsVivas = evolucao?.dimensions?.filter((d) => d.name) || [];

    return (
        <div>
            <Cabecalho
                eyebrow="12 pulses realizados · 3 anos de série"
                titulo={`Cultura Organizacional — ${empresa}`}
                descricao="Como as pessoas se sentem, medido a sério: pulses anónimos, indicadores e recomendações. Anonimato por desenho: nenhum resultado é exibido com menos de 5 respostas."
            />

            {msg && <Notice className="mb-4">{msg}</Notice>}

            <div className="flex gap-2.5 mb-4">
                {podeCriarPulse && (
                    <button onClick={() => setModalCriar(true)}
                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors">
                        + Criar inquérito (pulse)
                    </button>
                )}
                {eGestor && (
                    <button onClick={() => setModalEditar(true)}
                        className="bg-paper border border-line rounded-lg px-4 py-2 text-[12.3px] font-semibold text-ink hover:border-pri hover:text-pri transition-colors">
Editar indicadores
                    </button>
                )}
            </div>

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : (
                <>
                    {/* Indicadores — calculados das respostas reais */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
                        {kpis.map((k, i) => (
                            <KpiCard key={i} valor={k.v} label={k.l} nota={k.n} />
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-4">
                    {/* Dimensões — percentagens calculadas das respostas anónimas */}
                    <Cartao className="mb-4 p-0 overflow-hidden">
                        <h3 className="text-[14.5px] p-4 pb-2">Dimensões — evolução por ciclo</h3>
                        <p className="px-4 pb-2 text-[11.5px] text-dim">
                            Percentagem calculada automaticamente das respostas anónimas (média das notas / 5 × 100) —
                            sobe à medida que as respostas ocorrem.
                        </p>
                        <table className="w-full text-[12.8px]">
                            <thead>
                                <tr>
                                    <Th>Dimensão</Th>
                                    {ciclos.map((c, i) => (
                                        <Th key={i}>{c}</Th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {dimsVivas.length > 0 ? (
                                    dimsVivas.map((d, i) => (
                                        <tr key={i} className="hover:bg-panel">
                                            <Td><b className="text-strong">{d.name}</b></Td>
                                            {ciclos.map((_, ci) => {
                                                const v = d.points[ci]?.value ?? null;
                                                return (
                                                    <Td key={ci}>
                                                        {v != null ? (
                                                            <>
                                                                <b className="text-pri-dark">{v}%</b>
                                                                <div className="max-w-[120px]">
                                                                    <Barra valor={v} variante={variantePorValor(v)} />
                                                                </div>
                                                            </>
                                                        ) : "—"}
                                                    </Td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <Td colSpan={Math.max(2, ciclos.length + 1)} className="text-dim text-center py-4">
                                            Sem respostas ainda — a percentagem sobe automaticamente com cada
                                            resposta anónima.
                                        </Td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <div className="border-t border-line2 p-4">
                            <b className="text-[12.6px]">Recomendações do último ciclo:</b>
                            {recomendacoes.length > 0 ? (
                                recomendacoes.map((r, i) => (
                                    <div key={i} className="flex gap-2 mt-1.5">
                                        <Tag className="h-fit">{i + 1}</Tag>
                                        <span className="text-[12.6px]">{r}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-dim text-[12.6px] mt-1">Sem recomendações neste ciclo.</p>
                            )}
                        </div>
                    </Cartao>
                    </div>

                        <div>
                    {/* Pulse ativo — anónimo, 60 segundos */}
                    <div className="space-y-4">
                        {pulseAlvo ? (
                            <Cartao>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <h3 className="text-[15px] m-0">{pulseAlvo.title} — anónimo, 60 segundos</h3>
                                    <div className="flex items-center gap-2.5 shrink-0">
                                        {pulseAlvo.status === "aberto" && <Tag variante="ok">Aberto</Tag>}
                                        {podeCriarPulse && (
                                            <button onClick={() => eliminarPulse(pulseAlvo)}
                                                className="text-[11px] font-semibold text-bad hover:underline">
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {eGestor && resultados[pulseAlvo.id] && (() => {
                                    const r = resultados[pulseAlvo.id];
                                    return (
                                        <div className="border border-line rounded-lg p-3 mb-3 bg-panel/40">
                                            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                                                <Tag variante="pri">
                                                    {r.participation_count} de {r.universe} responderam
                                                </Tag>
                                                {r.participation_rate != null && (
                                                    <Tag variante="info">Taxa de participação: {r.participation_rate}%</Tag>
                                                )}
                                            </div>
                                            {r.released ? (
                                                <>
                                                    {Object.entries(r.results).map(([dim, media]) => (
                                                        <div key={dim} className="py-1.5 border-b border-line2 last:border-0">
                                                            <div className="flex justify-between items-baseline mb-1">
                                                                <span className="text-[12.3px] text-strong">{dim}</span>
                                                                <span className="text-[12.3px]">
                                                                    <b className="text-pri-dark">{media}</b> / 5
                                                                </span>
                                                            </div>
                                                            <div className="h-2 bg-line2 rounded-full overflow-hidden">
                                                                <div className="h-full bg-pri rounded-full transition-all"
                                                                    style={{ width: `${(media / 5) * 100}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <p className="text-dim text-[11px] mt-2">{r.note}</p>
                                                </>
                                            ) : (
                                                <Notice variante="alert">{r.note}</Notice>
                                            )}
                                        </div>
                                    );
                                })()}

                                {podeCriarPulse ? (
                                    <Notice variante="soft">
                                        <b>Pulse gerido pela equipa de gestão.</b> A resposta é anónima e feita
                                        pelos colaboradores — a gestão não participa.
                                    </Notice>
                                ) : (respondido[pulseAlvo.id] || pulseAlvo.participated) ? (
                                    <Notice variante="soft">
                                        <b>Resposta registada com sucesso.</b> A identidade nunca é associada às respostas.
                                    </Notice>
                                ) : (
                                    <>
                                        {pulseAlvo.dimensions.map((dim) => (
                                            <div key={dim} className="py-2.5 border-b border-line2 last:border-0">
                                                <div className="text-[13.3px] text-strong mb-2">{dim}</div>
                                                <ChipGroup>
                                                    {ESCALA.map((s) => (
                                                        <Chip
                                                            key={s.v}
                                                            label={s.v}
                                                            sublabel={s.l}
                                                            selecionado={respostas[pulseAlvo.id]?.[dim] === s.v}
                                                            onClick={() => definirResposta(pulseAlvo.id, dim, s.v)}
                                                        />
                                                    ))}
                                                </ChipGroup>
                                            </div>
                                        ))}
                                        {(() => {
                                            const ok = pulseAlvo.dimensions.every((d) => respostas[pulseAlvo.id]?.[d] != null);
                                            return (
                                                <button onClick={() => submeterPulse(pulseAlvo)} disabled={!ok}
                                                    className="w-full bg-pri text-white rounded-lg py-2.5 mt-3 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                                                    {ok ? "Submeter anonimamente" : `Responda às ${pulseAlvo.dimensions.length} perguntas para submeter`}
                                                </button>
                                            );
                                        })()}
                                    </>
                                )}
                            </Cartao>
                        ) : (
                            <Cartao>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <h3 className="text-[15px] m-0">Pulse Q3 2026 — anónimo, 60 segundos</h3>
                                </div>
                                <Notice variante="soft">
                                    <b>Sem pulses ativos de momento.</b> Quando a empresa abrir um pulse trimestral,
                                    as perguntas aparecem aqui, de resposta anónima.
                                </Notice>
                            </Cartao>
                        )}

                        {inqueritos.filter((i) => i.id !== pulseAlvo?.id).map((inq) => (
                            <Cartao key={inq.id}>
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-[13.5px] m-0">{inq.title}</h3>
                                    <div className="flex items-center gap-2.5 shrink-0">
                                        <Tag variante={inq.status === "aberto" ? "ok" : "info"}>
                                            {inq.status === "aberto" ? "Aberto" : "Fechado"}
                                        </Tag>
                                        {podeCriarPulse && (
                                            <button onClick={() => eliminarPulse(inq)}
                                                className="text-[11px] font-semibold text-bad hover:underline">
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {eGestor && resultados[inq.id]?.participation_count != null && (
                                    <p className="text-[11.5px] text-dim mt-1.5">
                                        {resultados[inq.id].participation_count} de {resultados[inq.id].universe} responderam
                                    </p>
                                )}
                            </Cartao>
                        ))}
                    </div>
                    </div>
                    </div>
                </>
            )}

            {modalCriar && <ModalCriarInquerito aoFechar={() => setModalCriar(false)} aoCriar={() => { setModalCriar(false); carregar(); }} />}
            {modalEditar && relatorio && (
                <ModalEditarRelatorio
                    inicial={relatorio}
                    aoFechar={() => setModalEditar(false)}
                    aoGuardar={() => { setModalEditar(false); carregar(); }}
                />
            )}
        </div>
    );
}

function Th({ children }: { children: React.ReactNode }) {
    return <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-4 py-2.5 border-b border-line">{children}</th>;
}
function Td({ children, colSpan, className }: { children: React.ReactNode; colSpan?: number; className?: string }) {
    return <td colSpan={colSpan} className={`px-4 py-2.5 border-b border-line2 ${className || ""}`}>{children}</td>;
}

function ModalCriarInquerito({ aoFechar, aoCriar }: { aoFechar: () => void; aoCriar: () => void }) {
    const [title, setTitle] = useState("Pulse Q3 2026");
    const [dimensoes, setDimensoes] = useState(
        "Sinto que o meu trabalho é reconhecido, Confio nas decisões da liderança, Recomendaria a empresa como um bom lugar para trabalhar"
    );
    const [erro, setErro] = useState("");
    const submeter = async () => {
        setErro("");
        const dims = dimensoes.split(",").map((d) => d.trim()).filter(Boolean);
        if (dims.length === 0) { setErro("Indique pelo menos uma questão."); return; }
        try {
            await api.post("/surveys", { title, dimensions: dims });
            aoCriar();
        } catch (err: any) { setErro(err.response?.data?.detail || "Erro ao criar."); }
    };
    return (
        <Modal aberto={true} aoFechar={aoFechar} titulo="Criar pulse de cultura" subtitulo="As respostas serão anónimas">
            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Perguntas (separadas por vírgula)</label>
            <textarea value={dimensoes} onChange={(e) => setDimensoes(e.target.value)} rows={3}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-4 focus:outline-none focus:border-pri" />
            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}
            <div className="flex gap-2.5">
                <button onClick={aoFechar} className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors">Cancelar</button>
                <button onClick={submeter} disabled={!title} className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">Criar</button>
            </div>
        </Modal>
    );
}

function ModalEditarRelatorio({ inicial, aoFechar, aoGuardar }: {
    inicial: RelatorioCultura; aoFechar: () => void; aoGuardar: () => void;
}) {
    const [pulsesNote, setPulsesNote] = useState(inicial.pulses_note || "");
    const [recs, setRecs] = useState<string>(inicial.recommendations.join("\n"));
    const [erro, setErro] = useState("");

    const guardar = async () => {
        setErro("");
        try {
            await api.put("/surveys/culture-report/data", {
                pulses_note: pulsesNote || null,
                recommendations: recs.split("\n").map((r) => r.trim()).filter(Boolean),
            });
            aoGuardar();
        } catch (err: any) { setErro(err.response?.data?.detail || "Erro ao guardar."); }
    };

    return (
        <Modal aberto={true} aoFechar={aoFechar} titulo="Editar indicadores de cultura"
            subtitulo="Indicadores consolidados da empresa; as dimensões do pulse são calculadas automaticamente das respostas anónimas">
            <div className="grid grid-cols-3 gap-2.5 mb-3">
                <div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">eNPS</label>
                    {inicial.enps_score != null ? (
                        <div className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] text-pri-dark font-semibold">
                            {fmtEnps(inicial.enps_score)} <span className="text-dim font-normal">({inicial.enps_promoters} prom. · {inicial.enps_neutrals} neut. · {inicial.enps_detractors} detr.)</span>
                        </div>
                    ) : (
                        <div className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] text-dim">
                            calculado automaticamente
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Participação</label>
                    {inicial.participation_rate != null ? (
                        <div className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] text-pri-dark font-semibold">
                            {inicial.participation_rate}% <span className="text-dim font-normal">({inicial.participation_count} de {inicial.universe})</span>
                        </div>
                    ) : (
                        <div className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] text-dim">
                            calculada automaticamente
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Nota (pulses)</label>
                    <input value={pulsesNote} onChange={(e) => setPulsesNote(e.target.value)} placeholder="12 pulses realizados"
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri" />
                </div>
            </div>

            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Recomendações (uma por linha)</label>
            <textarea value={recs} onChange={(e) => setRecs(e.target.value)} rows={3}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-4 focus:outline-none focus:border-pri" />

            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}
            <div className="flex gap-2.5">
                <button onClick={aoFechar} className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors">Cancelar</button>
                <button onClick={guardar} className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors">Guardar</button>
            </div>
        </Modal>
    );
}