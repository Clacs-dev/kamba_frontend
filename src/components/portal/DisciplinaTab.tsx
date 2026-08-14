import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import Cartao from "../Cartao";
import FlowBar from "../FlowBar";
import Notice from "../ui/Notice";
import Botao from "../ui/Botao";

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
    preventive_suspension: boolean;
    defense_deadline: string | null;
    decision_text: string | null;
}

// Aba "Disciplina" do Portal — o próprio processo disciplinar do colaborador, se existir
// (equivalente à aba `disc` do protótipo). Reaproveita os mesmos endpoints já usados em Disciplina.tsx.
export default function DisciplinaTab() {
    const { user } = useAuth();
    const [processos, setProcessos] = useState<Processo[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [texto, setTexto] = useState("");
    const [erro, setErro] = useState("");

    const carregar = () => {
        setACarregar(true);
        api.get("/disciplinary")
            .then((r) => setProcessos(r.data.filter((p: Processo) => p.accused_id === user?.id)))
            .catch(() => setProcessos([]))
            .finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, [user?.id]);

    const acao = async (processId: number, endpoint: string, body?: any) => {
        setErro("");
        try {
            await api.post(`/disciplinary/${processId}/${endpoint}`, body);
            setTexto("");
            carregar();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro na ação.");
        }
    };

    if (aCarregar) return <p className="text-dim text-sm">A carregar...</p>;

    if (processos.length === 0) {
        return (
            <Cartao>
                <p className="text-dim text-sm py-3 text-center">Sem processos disciplinares em curso.</p>
            </Cartao>
        );
    }

    return (
        <div className="space-y-3">
            {processos.map((p) => (
                <Cartao key={p.id}>
                    <h3 className="text-[14.5px] mb-2">{p.reference}</h3>
                    <FlowBar fases={FASES} atual={FASE_INDICE[p.phase] ?? 0} />
                    <div className="mt-3 text-[12.3px] text-ink bg-panel border border-line rounded-lg p-3">
                        <b className="text-strong">Factos imputados:</b> {p.imputed_facts}
                    </div>

                    {p.charge_note && (
                        <div className="mt-2 text-[12.3px] text-ink bg-panel border border-line rounded-lg p-3">
                            <b className="text-strong">Nota de culpa:</b>
                            <div className="whitespace-pre-wrap">{p.charge_note}</div>
                            {p.preventive_suspension && (
                                <p className="text-[11.5px] text-warn mt-1.5">
                                    Comunicação de suspensão preventiva (com remuneração) emitida em paralelo.
                                </p>
                            )}
                        </div>
                    )}

                    {p.decision_text && (
                        <div className="mt-2 text-[12.3px] text-ink bg-panel border border-line rounded-lg p-3">
                            <b className="text-strong">Decisão:</b>
                            <div className="whitespace-pre-wrap">{p.decision_text}</div>
                        </div>
                    )}

                    {(p.phase === "nota_culpa" || p.phase === "defesa") && p.defense_deadline && (
                        <p className="mt-2 text-[12.3px] text-warn bg-warn-bg border-l-[3px] border-warn rounded-r-lg px-3.5 py-2.5">
                            <b>Prazo de defesa:</b> até{" "}
                            {new Date(p.defense_deadline).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}{" "}
                            (10 dias úteis, Lei Geral do Trabalho).
                        </p>
                    )}

                    {erro && <p className="text-bad text-sm mt-2">{erro}</p>}

                    {p.phase === "nota_culpa" && (
                        <div className="mt-3">
                            <Notice className="mb-2">
                                Foi-lhe notificada uma nota de culpa. Tome conhecimento e apresente a sua defesa.
                            </Notice>
                            <Botao onClick={() => acao(p.id, "acknowledge-charge")}>Tomar conhecimento</Botao>
                        </div>
                    )}

                    {p.phase === "defesa" && (
                        <div className="mt-3">
                            <textarea
                                value={texto}
                                onChange={(e) => setTexto(e.target.value)}
                                rows={2}
                                placeholder="Apresente a sua defesa por escrito…"
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-2 focus:outline-none focus:border-pri"
                            />
                            <Botao onClick={() => acao(p.id, "defense", { defense_text: texto })} disabled={texto.length < 3}>
                                Submeter defesa
                            </Botao>
                        </div>
                    )}

                    {p.phase === "conhecimento_decisao" && (
                        <Botao className="mt-3" onClick={() => acao(p.id, "acknowledge-decision")}>
                            Tomar conhecimento da decisão
                        </Botao>
                    )}

                    {p.phase === "arquivado" && (
                        <Notice variante="soft" className="mt-3">Processo concluído e arquivado.</Notice>
                    )}
                </Cartao>
            ))}
        </div>
    );
}
