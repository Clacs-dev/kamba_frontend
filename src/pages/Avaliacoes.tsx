import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import FormularioAvaliacao from "../components/avaliacao/FormularioAvaliacao";
import BlocoValidacao from "../components/avaliacao/BlocoValidacao";
import BlocoConcordancia from "../components/avaliacao/BlocoConcordancia";
import DecisaoComissao from "../components/DecisaoComissao";
import api from "../lib/api";
import FaixaKpis from "../components/FaixaKpis";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import Modal from "../components/Modal";
import FlowBar from "../components/FlowBar";
import Notice from "../components/ui/Notice";

const FASES = ["Autoavaliação", "Avaliação do Director", "Concordância", "Comissão", "Fechada", "Validada"];

const FASE_INDICE: Record<string, number> = {
    autoavaliacao: 0,
    avaliacao_director: 1,
    concordancia: 2,
    comissao: 3,
    fechada: 4,
    validada: 5,
};

interface Avaliacao {
    id: number;
    collaborator_id: number;
    director_id: number;
    category: string;
    phase: string;
    final_score?: number | null;
    classification?: string | null;
    appeal_deadline?: string | null;
}

interface Ciclo {
    id: number;
    name: string;
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
                                        modo="auto"
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
                                        modo="director"
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

// ---- Modal: criar avaliação ----
function ModalAvaliacao({ ciclos, colaboradores, aoFechar, aoCriar }: {
    ciclos: Ciclo[];
    colaboradores: Colaborador[];
    aoFechar: () => void;
    aoCriar: () => void;
}) {
    const [cycleId, setCycleId] = useState(ciclos[0]?.id || 0);
    const [collaboratorId, setCollaboratorId] = useState(0);
    const [directorId, setDirectorId] = useState(0);
    const [category, setCategory] = useState("tecnico");
    const [erro, setErro] = useState("");
    const [aCarregar, setACarregar] = useState(false);

    // Diretores disponíveis (para escolher quem avalia).
    const diretores = colaboradores.filter((c) => c.role === "director");

    const submeter = async () => {
        setErro("");
        setACarregar(true);
        try {
            await api.post("/evaluations", {
                cycle_id: cycleId,
                collaborator_id: collaboratorId,
                director_id: directorId,
                category,
            });
            aoCriar();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao criar avaliação.");
        } finally {
            setACarregar(false);
        }
    };

    return (
        <Modal aberto={true} aoFechar={aoFechar} titulo="Criar avaliação"
            subtitulo="Inicia o fluxo de avaliação para um colaborador">
            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Ciclo</label>
            <select value={cycleId} onChange={(e) => setCycleId(Number(e.target.value))}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                {ciclos.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Colaborador a avaliar</label>
            <select value={collaboratorId} onChange={(e) => setCollaboratorId(Number(e.target.value))}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                <option value={0}>— escolher —</option>
                {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>

            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Director avaliador</label>
            <select value={directorId} onChange={(e) => setDirectorId(Number(e.target.value))}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                <option value={0}>— escolher —</option>
                {diretores.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>

            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Categoria</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-4 focus:outline-none focus:border-pri">
                <option value="tecnico">Técnico</option>
                <option value="dirigente">Dirigente</option>
            </select>

            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}
            <div className="flex gap-2.5">
                <button onClick={aoFechar}
                    className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors">
                    Cancelar
                </button>
                <button onClick={submeter} disabled={aCarregar || !collaboratorId || !directorId}
                    className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                    {aCarregar ? "A criar..." : "Criar avaliação"}
                </button>
            </div>
        </Modal>
    );
}