import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import Modal from "../components/Modal";

interface Inquerito {
    id: number;
    title: string;
    dimensions: string[];
    status: string;
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

export default function Cultura() {
    const { user } = useAuth();
    const [inqueritos, setInqueritos] = useState<Inquerito[]>([]);
    const [relatorio, setRelatorio] = useState<RelatorioCultura | null>(null);
    const [aCarregar, setACarregar] = useState(true);
    const [msg, setMsg] = useState("");
    const [modalCriar, setModalCriar] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [respostas, setRespostas] = useState<Record<number, Record<string, number>>>({});
    const [respondido, setRespondido] = useState<Record<number, boolean>>({});

    const eCH = user?.role === "capital_humano";
    const eGestor = eCH || user?.role === "administracao";
    const empresa = user?.company_name || "a sua empresa";

    const carregar = () => {
        setACarregar(true);
        Promise.all([
            api.get("/surveys").then((r) => setInqueritos(r.data)).catch(() => { }),
            api.get("/surveys/culture-report/data").then((r) => setRelatorio(r.data)).catch(() => { }),
        ]).finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    const definirResposta = (inqId: number, dim: string, valor: number) => {
        setRespostas((prev) => ({ ...prev, [inqId]: { ...(prev[inqId] || {}), [dim]: valor } }));
    };

    const submeterPulse = async (inq: Inquerito) => {
        try {
            await api.post(`/surveys/${inq.id}/respond`, { answers: respostas[inq.id] || {} });
            setRespondido((prev) => ({ ...prev, [inq.id]: true }));
            setMsg("Resposta registada anonimamente. Obrigado!");
        } catch (err: any) {
            setMsg(err.response?.data?.detail || "Erro ao responder (talvez já tenha respondido).");
        }
    };

    const temIndicadores = relatorio && (relatorio.enps || relatorio.participation || relatorio.pulses_note);
    const temDimensoes = relatorio && relatorio.dimensions.length > 0;

    return (
        <div>
            <Cabecalho
                eyebrow={relatorio?.pulses_note || "Inquéritos anónimos · anonimato por desenho"}
                titulo={`Cultura Organizacional — ${empresa}`}
                descricao="Como as pessoas se sentem, medido a sério: pulses anónimos, indicadores e recomendações. Anonimato por desenho: nenhum resultado é exibido com menos de 5 respostas."
            />

            {msg && (
                <div className="border-l-[3px] border-pri bg-pri-bg rounded-r-lg px-3.5 py-2.5 text-[12.3px] mb-4">{msg}</div>
            )}

            <div className="flex gap-2.5 mb-4">
                {eCH && (
                    <button onClick={() => setModalCriar(true)}
                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors">
                        + Criar inquérito (pulse)
                    </button>
                )}
                {eGestor && (
                    <button onClick={() => setModalEditar(true)}
                        className="bg-paper border border-line rounded-lg px-4 py-2 text-[12.3px] font-semibold text-ink hover:border-pri hover:text-pri transition-colors">
                        Editar indicadores e dimensões
                    </button>
                )}
            </div>

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : (
                <>
                    {/* Indicadores (editados pelo CH) */}
                    {temIndicadores && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
                            {relatorio?.enps && <KpiCard valor={relatorio.enps} label="eNPS" nota="série de cultura" />}
                            {relatorio?.participation && <KpiCard valor={relatorio.participation} label="Participação" />}
                            {relatorio?.pulses_note && <KpiCard valor="✓" label={relatorio.pulses_note} />}
                        </div>
                    )}

                    {/* Tabela de dimensões (editada pelo CH) */}
                    {temDimensoes && (
                        <Cartao className="mb-4 p-0 overflow-hidden">
                            <h3 className="text-[14.5px] p-4 pb-2">Dimensões — evolução 2023 → 2025</h3>
                            <table className="w-full text-[12.8px]">
                                <thead>
                                    <tr>
                                        <Th>Dimensão</Th><Th>2023</Th><Th>2024</Th><Th>2025</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {relatorio!.dimensions.map((d, i) => (
                                        <tr key={i} className="hover:bg-panel">
                                            <Td><b className="text-strong">{d.name}</b></Td>
                                            <Td>{d.y2023 != null ? `${d.y2023}%` : "—"}</Td>
                                            <Td>{d.y2024 != null ? `${d.y2024}%` : "—"}</Td>
                                            <Td>
                                                {d.y2025 != null ? (
                                                    <>
                                                        <b>{d.y2025}%</b>
                                                        <div className="h-1.5 bg-line2 rounded-full mt-1 overflow-hidden max-w-[120px]">
                                                            <div className="h-full bg-pri rounded-full" style={{ width: `${d.y2025}%` }} />
                                                        </div>
                                                    </>
                                                ) : "—"}
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Cartao>
                    )}

                    {/* Recomendações (editadas pelo CH) */}
                    {relatorio && relatorio.recommendations.length > 0 && (
                        <Cartao className="mb-4">
                            <h3 className="text-[14.5px] mb-2">Recomendações do último ciclo</h3>
                            {relatorio.recommendations.map((r, i) => (
                                <div key={i} className="flex gap-2.5 py-1.5 border-b border-line2 last:border-0">
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-pri-bg text-pri-dark h-fit">{i + 1}</span>
                                    <span className="text-[12.6px]">{r}</span>
                                </div>
                            ))}
                        </Cartao>
                    )}

                    {/* Pulses para responder */}
                    {inqueritos.length === 0 ? (
                        <Cartao><p className="text-dim text-center py-3">
                            {eCH ? "Ainda não há pulses — crie o primeiro acima." : "Sem pulses ativos de momento."}
                        </p></Cartao>
                    ) : (
                        <div className="space-y-4">
                            {inqueritos.map((inq) => (
                                <Cartao key={inq.id}>
                                    <h3 className="text-[15px] m-0 mb-3">{inq.title} — anónimo, 60 segundos</h3>
                                    {respondido[inq.id] ? (
                                        <div className="border-l-[3px] border-ok bg-ok-bg rounded-r-lg px-3.5 py-3 text-[12.8px]">
                                            <b className="text-ok">Resposta registada.</b> A sua identidade nunca é associada às respostas.
                                        </div>
                                    ) : (
                                        <>
                                            {inq.dimensions.map((dim) => (
                                                <div key={dim} className="py-2.5 border-b border-line2 last:border-0">
                                                    <div className="text-[13.3px] text-strong mb-2">{dim}</div>
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {ESCALA.map((s) => {
                                                            const sel = respostas[inq.id]?.[dim] === s.v;
                                                            return (
                                                                <button key={s.v} onClick={() => definirResposta(inq.id, dim, s.v)}
                                                                    className={`flex-1 min-w-[82px] px-2 py-2.5 border rounded-lg text-center transition-colors ${sel ? "border-pri bg-pri-bg" : "border-line bg-paper hover:border-pri-soft"
                                                                        }`}>
                                                                    <div className={`font-serif text-[15px] ${sel ? "text-pri-dark" : "text-dim"}`}>{s.v}</div>
                                                                    <div className={`text-[9.8px] ${sel ? "text-pri-dark" : "text-dim"}`}>{s.l}</div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                            {(() => {
                                                const ok = inq.dimensions.every((d) => respostas[inq.id]?.[d] != null);
                                                return (
                                                    <button onClick={() => submeterPulse(inq)} disabled={!ok}
                                                        className="w-full bg-pri text-white rounded-lg py-2.5 mt-3 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                                                        {ok ? "Submeter anonimamente" : `Responda às ${inq.dimensions.length} perguntas para submeter`}
                                                    </button>
                                                );
                                            })()}
                                        </>
                                    )}
                                </Cartao>
                            ))}
                        </div>
                    )}
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
function Td({ children }: { children: React.ReactNode }) {
    return <td className="px-4 py-2.5 border-b border-line2">{children}</td>;
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
    const [enps, setEnps] = useState(inicial.enps || "");
    const [participation, setParticipation] = useState(inicial.participation || "");
    const [pulsesNote, setPulsesNote] = useState(inicial.pulses_note || "");
    const [dims, setDims] = useState<DimRow[]>(inicial.dimensions.length ? inicial.dimensions : [{ name: "", y2023: null, y2024: null, y2025: null }]);
    const [recs, setRecs] = useState<string>(inicial.recommendations.join("\n"));
    const [erro, setErro] = useState("");

    const atualizarDim = (i: number, campo: keyof DimRow, valor: string) => {
        const copia = [...dims];
        if (campo === "name") copia[i].name = valor;
        else copia[i][campo] = valor === "" ? null : Number(valor);
        setDims(copia);
    };

    const guardar = async () => {
        setErro("");
        try {
            await api.put("/surveys/culture-report/data", {
                enps: enps || null,
                participation: participation || null,
                pulses_note: pulsesNote || null,
                dimensions: dims.filter((d) => d.name.trim()),
                recommendations: recs.split("\n").map((r) => r.trim()).filter(Boolean),
            });
            aoGuardar();
        } catch (err: any) { setErro(err.response?.data?.detail || "Erro ao guardar."); }
    };

    return (
        <Modal aberto={true} aoFechar={aoFechar} titulo="Editar indicadores e dimensões de cultura"
            subtitulo="Estes dados são consolidados pela empresa e ficam visíveis a todos">
            <div className="grid grid-cols-3 gap-2.5 mb-3">
                <div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">eNPS</label>
                    <input value={enps} onChange={(e) => setEnps(e.target.value)} placeholder="+34"
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri" />
                </div>
                <div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Participação</label>
                    <input value={participation} onChange={(e) => setParticipation(e.target.value)} placeholder="79%"
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri" />
                </div>
                <div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Nota (pulses)</label>
                    <input value={pulsesNote} onChange={(e) => setPulsesNote(e.target.value)} placeholder="12 pulses realizados"
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri" />
                </div>
            </div>

            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Dimensões (nome e % por ano)</label>
            <div className="space-y-2 mb-2 max-h-[30vh] overflow-y-auto">
                {dims.map((d, i) => (
                    <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-1.5">
                        <input value={d.name} onChange={(e) => atualizarDim(i, "name", e.target.value)} placeholder="Dimensão"
                            className="bg-panel border border-line rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:border-pri" />
                        <input value={d.y2023 ?? ""} onChange={(e) => atualizarDim(i, "y2023", e.target.value)} placeholder="2023" type="number"
                            className="bg-panel border border-line rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:border-pri" />
                        <input value={d.y2024 ?? ""} onChange={(e) => atualizarDim(i, "y2024", e.target.value)} placeholder="2024" type="number"
                            className="bg-panel border border-line rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:border-pri" />
                        <input value={d.y2025 ?? ""} onChange={(e) => atualizarDim(i, "y2025", e.target.value)} placeholder="2025" type="number"
                            className="bg-panel border border-line rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:border-pri" />
                    </div>
                ))}
            </div>
            <button onClick={() => setDims([...dims, { name: "", y2023: null, y2024: null, y2025: null }])}
                className="text-[11.5px] text-pri font-semibold hover:underline mb-3">+ Adicionar dimensão</button>

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