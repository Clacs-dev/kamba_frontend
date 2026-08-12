import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import Cartao from "../Cartao";
import FlowBar from "../FlowBar";

const FASES = ["Autoavaliação", "Avaliação do Director", "Concordância", "Comissão", "Fechada", "Validada"];
const FASE_INDICE: Record<string, number> = {
    autoavaliacao: 0, avaliacao_director: 1, concordancia: 2, comissao: 3, fechada: 4, validada: 5,
};

interface Avaliacao {
    id: number;
    collaborator_id: number;
    phase: string;
    category: string;
    final_score?: number | null;
    classification?: string | null;
}

// Aba "Avaliação" do Portal — estado do ciclo em curso e histórico, equivalente à aba `aval` do protótipo.
// Reaproveita GET /evaluations (já usado em Avaliacoes.tsx e PainelColaborador.tsx), filtrado ao próprio utilizador.
export default function AvaliacaoTab() {
    const { user } = useAuth();
    const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
    const [aCarregar, setACarregar] = useState(true);

    useEffect(() => {
        api.get("/evaluations")
            .then((r) => setAvaliacoes(r.data.filter((a: Avaliacao) => a.collaborator_id === user?.id)))
            .catch(() => setAvaliacoes([]))
            .finally(() => setACarregar(false));
    }, [user?.id]);

    if (aCarregar) return <p className="text-dim text-sm">A carregar...</p>;

    const emCurso = avaliacoes.filter((a) => a.phase !== "validada");
    const concluidas = avaliacoes.filter((a) => a.phase === "validada");

    return (
        <div className="space-y-3">
            <Cartao>
                <h3 className="text-[14.5px] mb-1">Ciclo(s) em curso</h3>
                <p className="text-dim text-[11.5px] mb-3">
                    O estado da sua avaliação neste momento. Para preencher ou decidir, use a página Avaliação no menu.
                </p>
                {emCurso.length === 0 ? (
                    <p className="text-dim text-sm py-3 text-center">Não há avaliações em curso.</p>
                ) : (
                    <div className="space-y-4">
                        {emCurso.map((a) => (
                            <div key={a.id}>
                                <div className="text-[12.3px] text-dim mb-1">categoria: {a.category}</div>
                                <FlowBar fases={FASES} atual={FASE_INDICE[a.phase] ?? 0} />
                            </div>
                        ))}
                    </div>
                )}
            </Cartao>

            <Cartao>
                <h3 className="text-[14.5px] mb-2">Histórico de avaliações validadas</h3>
                {concluidas.length === 0 ? (
                    <p className="text-dim text-sm py-3 text-center">Ainda não há avaliações validadas.</p>
                ) : (
                    <table className="w-full text-[12.8px]">
                        <tbody>
                            {concluidas.map((a) => (
                                <tr key={a.id} className="border-b border-line2 last:border-0">
                                    <td className="py-2 text-ink">{a.category}</td>
                                    <td className="py-2 text-right">
                                        <b className="text-pri-dark">{a.final_score ?? "—"}</b>
                                        {a.classification && <span className="text-dim ml-1.5">{a.classification}</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Cartao>
        </div>
    );
}
