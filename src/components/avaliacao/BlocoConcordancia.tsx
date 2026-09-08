import { useEffect, useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";
import { normalizarComparacao, type Comparacao } from "../../lib/comparison";

interface Props {
    evaluationId: number;
    aoAgir: () => void;
}

export default function BlocoConcordancia({ evaluationId, aoAgir }: Props) {
    const [comp, setComp] = useState<Comparacao | null>(null);
    const [erroComp, setErroComp] = useState("");
    const [modoRecurso, setModoRecurso] = useState(false);
    const [motivo, setMotivo] = useState("");
    const [erro, setErro] = useState("");
    const [aCarregar, setACarregar] = useState(false);

    useEffect(() => {
        api.get(`/evaluations/${evaluationId}/comparison`)
            .then((r) => setComp(normalizarComparacao(r.data)))
            .catch((e: any) =>
                setErroComp(e.response?.data?.detail || "Não foi possível carregar a comparação.")
            );
    }, [evaluationId]);

    const aceitar = async () => {
        setErro("");
        setACarregar(true);
        try {
            await api.post(`/evaluations/${evaluationId}/accept`);
            aoAgir();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao aceitar.");
        } finally {
            setACarregar(false);
        }
    };

    const recorrer = async () => {
        setErro("");
        setACarregar(true);
        try {
            await api.post(`/evaluations/${evaluationId}/appeal`, { reason: motivo });
            aoAgir();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao submeter recurso.");
        } finally {
            setACarregar(false);
        }
    };

    const nome = comp?.collaborator_name || "o colaborador";
    const a = comp?.auto;
    const d = comp?.director;
    const desvio = a?.final != null && d?.final != null
        ? Math.round(Math.abs(d.final - a.final) * 10) / 10
        : null;

    const linha = (label: string, peso: number, av: number | null, dv: number | null) => (
        <tr className="border-t border-line2">
            <td className="py-2 text-ink">{label} ({peso}%)</td>
            <td className="py-2 text-right">{av ?? "—"}</td>
            <td className="py-2 text-right">{dv ?? "—"}</td>
        </tr>
    );

    return (
        <div className="space-y-3">
            {erroComp && !comp && <p className="text-bad text-sm">{erroComp}</p>}
            {comp ? (
                <div className="border border-line rounded-xl overflow-hidden">
                    <table className="w-full text-[12.5px]">
                        <thead>
                            <tr className="bg-panel text-dim text-[10.5px] uppercase tracking-wide">
                                <th className="text-left py-2 px-3">Componente</th>
                                <th className="text-right py-2 px-3">Auto ({nome.split(" ")[0]})</th>
                                <th className="text-right py-2 px-3">Director</th>
                            </tr>
                        </thead>
                        <tbody>
                            {linha("Objectivos", comp.weights.objectives, a?.scores.objectives ?? null, d?.scores.objectives ?? null)}
                            {linha("Competências", comp.weights.competencies, a?.scores.competencies ?? null, d?.scores.competencies ?? null)}
                            {linha("Valores e conduta", comp.weights.values, a?.scores.values ?? null, d?.scores.values ?? null)}
                            <tr className="border-t border-line">
                                <td className="py-2 px-3 font-semibold text-strong">Nota final</td>
                                <td className="py-2 px-3 text-right font-semibold">{a?.final ?? "—"}</td>
                                <td className="py-2 px-3 text-right font-semibold text-pri-dark">
                                    {d?.final ?? "—"}
                                    {desvio != null && <span className="text-dim text-[11px] font-normal ml-1.5">desvio {desvio}</span>}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : !erroComp ? (
                <p className="text-dim text-sm">A carregar comparação...</p>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Aceitar */}
                <Cartao className="border-ok">
                    <h3 className="text-[14.5px] mb-2">Concordo com a avaliação</h3>
                    <p className="text-dim text-[12.3px] mb-3">
                        A avaliação fecha com a nota do director ({d?.final ?? "—"}) e segue para validação da Administração.
                    </p>
                    <button
                        onClick={aceitar}
                        disabled={aCarregar}
                        className="bg-ok text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                        {aCarregar ? "A processar..." : "Aceitar a avaliação"}
                    </button>
                </Cartao>

                {/* Recorrer */}
                <Cartao className="border-warn">
                    <h3 className="text-[14.5px] mb-2">Não concordo — apresentar recurso</h3>
                    {!modoRecurso ? (
                        <>
                            <p className="text-dim text-[12.3px] mb-3">
                                Pode recorrer, por escrito e fundamentadamente, para a Comissão de Avaliação.
                            </p>
                            <button
                                onClick={() => setModoRecurso(true)}
                                className="bg-bad text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:opacity-90 transition-opacity"
                            >
                                Quero recorrer
                            </button>
                        </>
                    ) : (
                        <>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">
                                Fundamento do recurso
                            </label>
                            <textarea
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                rows={3}
                                placeholder="Ex.: os objetivos foram afetados por fatores externos documentados…"
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-2 focus:outline-none focus:border-pri"
                            />
                            <button
                                onClick={recorrer}
                                disabled={aCarregar || motivo.length < 3}
                                className="bg-bad text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                            >
                                {aCarregar ? "A submeter..." : "Submeter recurso à Comissão"}
                            </button>
                        </>
                    )}
                </Cartao>
            </div>

            {erro && <p className="text-bad text-sm">{erro}</p>}
        </div>
    );
}
