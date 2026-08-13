import { useEffect, useState } from "react";
import api from "../../lib/api";
import Notice from "../ui/Notice";
import { normalizarComparacao, type Comparacao } from "../../lib/comparison";

interface Props {
    evaluationId: number;
    aoDecidir?: () => void;
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
            .then((r) => setComp(normalizarComparacao(r.data)))
            .catch((e: any) =>
                setErro(e.response?.data?.detail || "Não foi possível carregar a comparação.")
            );
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

    if (erro && !comp) return <p className="text-bad text-sm">{erro}</p>;
    if (!comp) return <p className="text-dim text-sm">A carregar comparação...</p>;

    const nome = comp.collaborator_name || "o colaborador";
    const d = comp.director;
    const a = comp.auto;
    const desvio = a?.final != null && d?.final != null
        ? Math.round((d.final - a.final) * 10) / 10
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
            <Notice className="mb-0">
                Recurso de <b>{nome}</b> — a Comissão dispõe de <b>8 dias úteis</b> para decidir
                {comp.appeal_deadline && (
                    <> (desde {new Date(comp.appeal_deadline).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })})</>
                )}.
            </Notice>

            {/* Tabela comparativa */}
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

            {comp.appeal_reason && (
                <div className="border-l-[3px] border-pri-soft bg-pri-bg rounded-r-lg px-3.5 py-2.5 text-[12.3px]">
                    <b className="text-pri-dark">Fundamento do recorrente:</b> {comp.appeal_reason}
                </div>
            )}

            <p className="text-dim text-[11.5px]">
                <b className="text-ink">Peças no processo:</b> autoavaliação selada · avaliação do Director.
            </p>

            {/* Decisão */}
            <div className="border border-line rounded-xl p-4 space-y-3">
                <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Decisão da Comissão</label>
                <select value={decisao} onChange={(e) => setDecisao(e.target.value)}
                    className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri">
                    {OPCOES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>

                <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Fundamentação</label>
                <textarea value={fundamentacao} onChange={(e) => setFundamentacao(e.target.value)} rows={3}
                    placeholder="A Comissão analisou as peças e considera que…"
                    className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri" />

                {erro && <p className="text-bad text-sm">{erro}</p>}
                <button onClick={emitir} disabled={aGuardar}
                    className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                    {aGuardar ? "A emitir..." : "Emitir decisão e notificar as partes"}
                </button>
            </div>
        </div>
    );
}
