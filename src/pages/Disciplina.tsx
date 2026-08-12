import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import FaixaKpis from "../components/FaixaKpis";
import Modal from "../components/Modal";
import FlowBar from "../components/FlowBar";
import Notice from "../components/ui/Notice";

const FASES = ["Instauração", "Nota de Culpa", "Defesa", "Decisão", "Conhecimento", "Arquivado"];
const FASE_INDICE: Record<string, number> = {
    instauracao: 0, nota_culpa: 1, defesa: 2, decisao: 3, conhecimento_decisao: 4, arquivado: 5,
};

interface Processo {
    id: number;
    accused_id: number;
    reference: string;
    phase: string;
    imputed_facts: string;
    charge_note: string | null;
}

interface Colaborador { id: number; full_name: string; }

export default function Disciplina() {
    const { user } = useAuth();
    const [processos, setProcessos] = useState<Processo[]>([]);
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");
    const [modalCriar, setModalCriar] = useState(false);

    const eInstrutor = user?.role === "capital_humano" || user?.role === "administracao" || user?.role === "comissao";
    const eCH = user?.role === "capital_humano";

    const carregar = () => {
        setACarregar(true);
        Promise.all([
            api.get("/disciplinary").then((r) => setProcessos(r.data)).catch((e) => setErro(e.response?.data?.detail || "Erro.")),
            eInstrutor ? api.get("/collaborators").then((r) => setColaboradores(r.data)).catch(() => { }) : Promise.resolve(),
        ]).finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    const descarregarPdf = async (processId: number, referencia: string) => {
        try {
            const resp = await api.get(`/disciplinary/${processId}/pdf`, { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `processo_${referencia}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            setErro("Não foi possível gerar o PDF.");
        }
    };

    const nomeDe = (id: number) => colaboradores.find((c) => c.id === id)?.full_name || `#${id}`;

    return (
        <div>
            <Cabecalho
                eyebrow="Procedimento legal · confidencial"
                titulo="Processos Disciplinares"
                descricao="O procedimento com garantias: instauração → nota de culpa → defesa → decisão → tomada de conhecimento → arquivo."
            />

            <FaixaKpis kpis={[
                { valor: processos.length, label: "Total de processos" },
                { valor: processos.filter(p => p.phase !== "arquivado").length, label: "Em curso", cor: "warn" },
                { valor: processos.filter(p => p.phase === "arquivado").length, label: "Arquivados", cor: "ok" },
                { valor: processos.filter(p => p.phase === "defesa").length, label: "Em fase de defesa" },
            ]} />

            {eCH && (
                <button onClick={() => setModalCriar(true)}
                    className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors mb-4">
                    + Instaurar processo
                </button>
            )}

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : erro ? (
                <p className="text-bad text-sm">{erro}</p>
            ) : processos.length === 0 ? (
                <Cartao><p className="text-dim text-center py-4">Não há processos disciplinares.</p></Cartao>
            ) : (
                <div className="space-y-3">
                    {processos.map((p) => (
                        <Cartao key={p.id}>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[14.5px] m-0">
                                    {p.reference}
                                    <span className="text-dim text-[11px] font-normal ml-2">
                                        {eInstrutor ? `arguido: ${nomeDe(p.accused_id)}` : "o seu processo"}
                                    </span>
                                </h3>
                            </div>
                            <FlowBar fases={FASES} atual={FASE_INDICE[p.phase] ?? 0} />
                            <div className="mt-3 text-[12.3px] text-ink bg-panel border border-line rounded-lg p-3">
                                <b className="text-strong">Factos imputados:</b> {p.imputed_facts}
                            </div>

                            <button
                                onClick={() => descarregarPdf(p.id, p.reference)}
                                className="mt-3 text-[11.5px] text-pri font-semibold hover:underline"
                            >
                                ↓ Descarregar peça em PDF
                            </button>
                            <AcoesProcesso processo={p} eInstrutor={!!eInstrutor} euId={user?.id} aoAgir={carregar} />
                        </Cartao>
                    ))}
                </div>
            )}

            {modalCriar && (
                <ModalInstaurar
                    colaboradores={colaboradores}
                    aoFechar={() => setModalCriar(false)}
                    aoCriar={() => { setModalCriar(false); carregar(); }}
                />
            )}
        </div>
    );
}

// As ações disponíveis conforme a fase e o perfil.
function AcoesProcesso({ processo, eInstrutor, euId, aoAgir }: {
    processo: Processo; eInstrutor: boolean; euId?: number; aoAgir: () => void;
}) {
    const [texto, setTexto] = useState("");
    const [outcome, setOutcome] = useState("repreensao");
    const [erro, setErro] = useState("");

    const eArguido = processo.accused_id === euId;

    const acao = async (endpoint: string, body?: any) => {
        setErro("");
        try {
            await api.post(`/disciplinary/${processo.id}/${endpoint}`, body);
            setTexto("");
            aoAgir();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro na ação.");
        }
    };

    return (
        <div className="mt-3">
            {erro && <p className="text-bad text-sm mb-2">{erro}</p>}

            {/* Fase 1 -> nota de culpa (instrutor) */}
            {processo.phase === "instauracao" && eInstrutor && (
                <div>
                    <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2}
                        placeholder="Redija a nota de culpa (factos e infrações imputadas)…"
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-2 focus:outline-none focus:border-pri" />
                    <button onClick={() => acao("charge-note", { charge_note: texto, preventive_suspension: false })}
                        disabled={texto.length < 3}
                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                        Emitir nota de culpa
                    </button>
                </div>
            )}

            {/* Fase 2 -> arguido toma conhecimento e defende-se */}
            {processo.phase === "nota_culpa" && eArguido && (
                <div>
                    <Notice className="mb-2">
                        Foi-lhe notificada uma nota de culpa. Tome conhecimento e apresente a sua defesa.
                    </Notice>
                    <button onClick={() => acao("acknowledge-charge")}
                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors mb-2">
                        Tomar conhecimento
                    </button>
                </div>
            )}

            {/* Fase defesa -> arguido escreve defesa */}
            {processo.phase === "defesa" && eArguido && (
                <div>
                    <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2}
                        placeholder="Apresente a sua defesa por escrito…"
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-2 focus:outline-none focus:border-pri" />
                    <button onClick={() => acao("defense", { defense_text: texto })}
                        disabled={texto.length < 3}
                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                        Submeter defesa
                    </button>
                </div>
            )}

            {/* Fase decisão -> instrutor decide */}
            {processo.phase === "decisao" && eInstrutor && (
                <div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Decisão</label>
                    <select value={outcome} onChange={(e) => setOutcome(e.target.value)}
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-2 focus:outline-none focus:border-pri">
                        <option value="arquivamento">Arquivamento (sem medida)</option>
                        <option value="repreensao">Repreensão</option>
                        <option value="suspensao">Suspensão</option>
                        <option value="despedimento">Despedimento</option>
                    </select>
                    <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2}
                        placeholder="Fundamentação da decisão…"
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-2 focus:outline-none focus:border-pri" />
                    <button onClick={() => acao("decision", { outcome, decision_text: texto })}
                        disabled={texto.length < 3}
                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                        Emitir decisão
                    </button>
                </div>
            )}

            {/* Fase conhecimento da decisão -> arguido toma conhecimento (arquiva) */}
            {processo.phase === "conhecimento_decisao" && eArguido && (
                <button onClick={() => acao("acknowledge-decision")}
                    className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors">
                    Tomar conhecimento da decisão
                </button>
            )}

            {processo.phase === "arquivado" && (
                <Notice variante="soft">Processo concluído e arquivado.</Notice>
            )}
        </div>
    );
}

function ModalInstaurar({ colaboradores, aoFechar, aoCriar }: {
    colaboradores: Colaborador[]; aoFechar: () => void; aoCriar: () => void;
}) {
    const [accusedId, setAccusedId] = useState(0);
    const [reference, setReference] = useState("");
    const [facts, setFacts] = useState("");
    const [erro, setErro] = useState("");

    const submeter = async () => {
        setErro("");
        try {
            await api.post("/disciplinary", { accused_id: accusedId, reference, imputed_facts: facts });
            aoCriar();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao instaurar.");
        }
    };

    return (
        <Modal aberto={true} aoFechar={aoFechar} titulo="Instaurar processo disciplinar"
            subtitulo="Início do procedimento com garantias">
            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Arguido</label>
            <select value={accusedId} onChange={(e) => setAccusedId(Number(e.target.value))}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                <option value={0}>— escolher —</option>
                {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Referência</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex.: PD-2026/01"
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Factos imputados</label>
            <textarea value={facts} onChange={(e) => setFacts(e.target.value)} rows={3}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-4 focus:outline-none focus:border-pri" />
            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}
            <div className="flex gap-2.5">
                <button onClick={aoFechar} className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors">Cancelar</button>
                <button onClick={submeter} disabled={!accusedId || !reference || facts.length < 3}
                    className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                    Instaurar
                </button>
            </div>
        </Modal>
    );
}