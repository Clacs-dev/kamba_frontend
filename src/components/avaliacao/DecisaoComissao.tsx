import { useEffect, useState } from "react";
import api from "../../lib/api";

interface Props {
    evaluationId: number;
    aoDecidir?: () => void;
}

interface Comparacao {
    collaborator_name: string | null;
    director_name: string | null;
    weights: { objectives: number; competencies: number; values: number };
    auto: { objectives: number | null; competencies: number | null; values: number | null };
    director: { objectives: number | null; competencies: number | null; values: number | null };
    final_score: number | null;
    appeal_reason: string | null;
}

const OPCOES = [
    "Manter a nota do Director",
    "Rever a nota a favor do colaborador",
    "Determinar nova avaliação",
];

export default function DecisaoComissao({ evaluationId, aoDecidir }: Props) {
    const [comp, setComp] = useState<Comparacao | null>(null);
    const [decisao, setDecisao] = useState(OPCOES[0]);
    const [fundamentacao, setFundamentacao] = useState("");
    const [aGuardar, setAGuardar] = useState(false);
    const [erro, setErro] = useState("");
    const [feito, setFeito] = useState(false);

    useEffect(() => {
        api.get(`/evaluations/${evaluationId}/comparison`)
            .then((r) => setComp(r.data))
            .catch(() => setComp(null));
    }, [evaluationId]);

    const emitir = async () => {
        setErro(""); setAGuardar(true);
        try {
            const texto = fundamentacao.trim()
                ? `${decisao} — ${fundamentacao}`
                : decisao;
            await api.post(`/evaluations/${evaluationId}/commission-decision`, { decision: texto });
            setFeito(true);
            if (aoDecidir) aoDecidir();
        } catch (e: any) {
            setErro(e.response?.data?.detail || "Não foi possível emitir a decisão.");
        } finally {
            setAGuardar(false);
        }
    };

    if (feito) {
        return (
            <div className="border-l-[3px] border-ok bg-ok-bg rounded-r-lg px-4 py-3 text-[12.8px]">
                <b className="text-ok">Decisão emitida.</b> As partes foram notificadas e a avaliação está consolidada.
            </div>
        );
    }

    if (!comp) return <p className="text-dim text-sm">A carregar comparação...</p>;

    const linha = (label: string, peso: number, a: number | null, d: number | null) => (
        <tr className="border-t border-line2">
            <td className="py-2 text-ink">{label} ({peso}%)</td>
            <td className="py-2 text-right">{a ?? "—"}</td>
            <td className="py-2 text-right">{d ?? "—"}</td>
        </tr>
    );

    return (
        <div className="border border-line rounded-xl p-4 mt-3">
            <h4 className="text-[13.5px] font-semibold text-strong mb-1">
                Recurso de {comp.collaborator_name} — apreciação da Comissão
            </h4>

            {/* Tabela comparativa */}
            <table className="w-full text-[12.5px] mb-3">
                <thead>
                    <tr className="text-dim text-[10.5px] uppercase tracking-wide">
                        <th className="text-left py-1.5">Componente</th>
                        <th className="text-right py-1.5">Auto ({comp.collaborator_name?.split(" ")[0]})</th>
                        <th className="text-right py-1.5">Director</th>
                    </tr>
                </thead>
                <tbody>
                    {linha("Objectivos", comp.weights.objectives, comp.auto.objectives, comp.director.objectives)}
                    {linha("Competências", comp.weights.competencies, comp.auto.competencies, comp.director.competencies)}
                    {linha("Valores e conduta", comp.weights.values, comp.auto.values, comp.director.values)}
                    <tr className="border-t border-line">
                        <td className="py-2 font-semibold text-strong">Nota final</td>
                        <td className="py-2 text-right"></td>
                        <td className="py-2 text-right font-semibold text-pri-dark">{comp.final_score ?? "—"}</td>
                    </tr>
                </tbody>
            </table>

            {comp.appeal_reason && (
                <div className="border-l-[3px] border-pri-soft bg-pri-bg rounded-r-lg px-3.5 py-2.5 text-[12.3px] mb-3">
                    <b className="text-pri-dark">Fundamento do recorrente:</b> {comp.appeal_reason}
                </div>
            )}

            {/* Decisão */}
            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Decisão da Comissão</label>
            <select value={decisao} onChange={(e) => setDecisao(e.target.value)}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                {OPCOES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>

            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Fundamentação</label>
            <textarea value={fundamentacao} onChange={(e) => setFundamentacao(e.target.value)} rows={3}
                placeholder="A Comissão analisou as peças e considera que…"
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />

            {erro && <p className="text-bad text-sm mb-2">{erro}</p>}
            <button onClick={emitir} disabled={aGuardar}
                className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                {aGuardar ? "A emitir..." : "Emitir decisão e notificar as partes"}
            </button>
        </div>
    );
}