import { useEffect, useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";
import { Chip, ChipGroup } from "../ui/Chip";
import ScoreBox from "../ui/ScoreBox";

// As cinco competências e três valores, com os nomes que o backend espera.
const COMPETENCIAS = [
    { chave: "orientacao_resultados", label: "Orientação para resultados" },
    { chave: "trabalho_equipa", label: "Trabalho em equipa e colaboração" },
    { chave: "etica_conformidade", label: "Ética e conformidade" },
    { chave: "comunicacao", label: "Comunicação" },
    { chave: "adaptabilidade", label: "Adaptabilidade e melhoria contínua" },
];

const VALORES = [
    { chave: "codigo_etica", label: "Cumpri o Código de Ética e Conduta" },
    { chave: "seguranca_saude", label: "Cumpri as normas de segurança e saúde no trabalho" },
    { chave: "assiduidade_pontualidade", label: "Mantive assiduidade e pontualidade regulares" },
];

const ESCALA = [
    { v: 1, l: "Raramente" },
    { v: 2, l: "Às vezes" },
    { v: 3, l: "Com regularidade" },
    { v: 4, l: "Quase sempre" },
    { v: 5, l: "Sempre" },
];

interface Objetivo {
    description: string;
    weight: number;
    execution: number;
}

interface AutoLado {
    objectives: Objetivo[];
    competencies: Record<string, number>;
    values: Record<string, boolean>;
    scores: { objectives: number; competencies: number; values: number };
    final: number | null;
    classification: string | null;
}

interface Props {
    evaluationId: number;
    modo: "auto" | "director"; // autoavaliação ou avaliação do director
    aoSubmeter: () => void;
}

export default function FormularioAvaliacao({ evaluationId, modo, aoSubmeter }: Props) {
    // Um objetivo simples para começar (o colaborador descreve e indica execução).
    const [objDescricao, setObjDescricao] = useState("");
    const [objExecucao, setObjExecucao] = useState<number | "">("");
    const [comps, setComps] = useState<Record<string, number>>({});
    const [vals, setVals] = useState<Record<string, boolean>>({});
    const [erro, setErro] = useState("");
    const [aCarregar, setACarregar] = useState(false);
    const [auto, setAuto] = useState<AutoLado | null>(null);

    // No modo director, mostra a autoavaliação do colaborador lado a lado.
    useEffect(() => {
        if (modo !== "director") return;
        api.get(`/evaluations/${evaluationId}/comparison`)
            .then((r) => setAuto(r.data?.auto ?? null))
            .catch(() => setAuto(null));
    }, [evaluationId, modo]);

    // Cálculo da pontuação em direto (aproximado, para feedback visual).
    const compVals = Object.values(comps);
    const compMedia = compVals.length === COMPETENCIAS.length
        ? compVals.reduce((a, b) => a + b, 0) / compVals.length : null;
    const valVals = Object.values(vals);
    const objScore = objExecucao !== "" ? Math.min(5, (Number(objExecucao) / 100) * 5) : null;
    const valScore = valVals.length === VALORES.length
        ? valVals.reduce((a, b) => a + (b ? 5 : 2.5), 0) / valVals.length : null;

    const tudoPreenchido =
        objExecucao !== "" &&
        compVals.length === COMPETENCIAS.length &&
        valVals.length === VALORES.length;

    const notaFinal = tudoPreenchido && objScore != null && compMedia != null && valScore != null
        ? Math.round((objScore * 0.5 + compMedia * 0.35 + valScore * 0.15) * 10) / 10
        : null;

    const submeter = async () => {
        setErro("");
        setACarregar(true);
        const endpoint = modo === "auto" ? "self-assessment" : "director-assessment";
        try {
            await api.post(`/evaluations/${evaluationId}/${endpoint}`, {
                objectives: [{ description: objDescricao, weight: 100, execution: Number(objExecucao) }],
                competencies: comps,
                values: vals,
            });
            aoSubmeter();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao submeter.");
        } finally {
            setACarregar(false);
        }
    };

    const nota = (n: number | null | undefined) => (n != null ? n.toFixed(1) : "—");

    return (
        <div className="space-y-3">
            {modo === "director" && (
                <div className="border border-line rounded-xl p-4">
                    <h4 className="text-[13.5px] font-semibold text-strong mb-1">
                        Autoavaliação do colaborador{auto ? ` — nota provisória ${nota(auto.final)} (${auto.classification || "—"})` : ""}
                    </h4>
                    {!auto ? (
                        <p className="text-dim text-sm">A carregar a autoavaliação...</p>
                    ) : (
                        <div className="space-y-3 mt-2">
                            {auto.objectives.length > 0 && (
                                <div>
                                    <div className="text-dim text-[10.5px] uppercase tracking-wide mb-1">Objetivos</div>
                                    {auto.objectives.map((o, i) => (
                                        <div key={i} className="text-[12.8px] py-1 border-b border-line2 last:border-0">
                                            {o.description || "—"} <span className="text-dim">· execução {o.execution}%</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div>
                                <div className="text-dim text-[10.5px] uppercase tracking-wide mb-1">Competências</div>
                                {COMPETENCIAS.map((c) => (
                                    <div key={c.chave} className="flex justify-between text-[12.8px] py-1 border-b border-line2 last:border-0">
                                        <span>{c.label}</span>
                                        <span className="font-semibold">{auto.competencies[c.chave] != null ? auto.competencies[c.chave] : "—"}</span>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <div className="text-dim text-[10.5px] uppercase tracking-wide mb-1">Valores e conduta</div>
                                {VALORES.map((v) => (
                                    <div key={v.chave} className="flex justify-between text-[12.8px] py-1 border-b border-line2 last:border-0">
                                        <span>{v.label}</span>
                                        <span className="font-semibold">
                                            {auto.values[v.chave] == null ? "—" : auto.values[v.chave] ? "Sim" : "Não"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-[12.8px] pt-1">
                                <span className="font-semibold text-strong">Nota provisória (auto)</span>
                                <span className="font-semibold text-pri-dark">{nota(auto.final)}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] gap-3 items-start">
                <div className="space-y-3">
                    {/* Objetivos */}
                    <Cartao>
                        <h3 className="text-[14.5px] mb-2">
                            Objetivos <span className="text-dim text-[11px]">(peso 50% — indique a execução)</span>
                        </h3>
                        <input
                            value={objDescricao}
                            onChange={(e) => setObjDescricao(e.target.value)}
                            placeholder="Descreva o seu principal objetivo do ciclo…"
                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-2 focus:outline-none focus:border-pri"
                        />
                        <div className="flex items-center gap-2.5">
                            <input
                                type="number" min={0} max={120}
                                value={objExecucao}
                                onChange={(e) => setObjExecucao(e.target.value === "" ? "" : Number(e.target.value))}
                                placeholder="%"
                                className="w-24 text-center font-semibold bg-panel border border-line rounded-lg px-2 py-2 text-[13px] focus:outline-none focus:border-pri"
                            />
                            <span className="text-dim text-[11px]">% de execução (0–120)</span>
                        </div>
                    </Cartao>

                    {/* Competências */}
                    <Cartao>
                        <h3 className="text-[14.5px] mb-2">
                            Competências <span className="text-dim text-[11px]">(peso 35% — escala 1 a 5)</span>
                        </h3>
                        {COMPETENCIAS.map((c) => (
                            <div key={c.chave} className="py-2 border-b border-line2 last:border-0">
                                <div className="text-[13.3px] text-strong mb-2">{c.label}</div>
                                <ChipGroup>
                                    {ESCALA.map((s) => (
                                        <Chip
                                            key={s.v}
                                            label={s.v}
                                            sublabel={s.l}
                                            selecionado={comps[c.chave] === s.v}
                                            onClick={() => setComps({ ...comps, [c.chave]: s.v })}
                                        />
                                    ))}
                                </ChipGroup>
                            </div>
                        ))}
                    </Cartao>

                    {/* Valores */}
                    <Cartao>
                        <h3 className="text-[14.5px] mb-2">
                            Valores e conduta <span className="text-dim text-[11px]">(peso 15% — Sim / Não)</span>
                        </h3>
                        {VALORES.map((v) => (
                            <div key={v.chave} className="py-2 border-b border-line2 last:border-0">
                                <div className="text-[13.3px] text-strong mb-2">{v.label}</div>
                                <ChipGroup>
                                    <Chip
                                        largo
                                        label="Sim"
                                        selecionado={vals[v.chave] === true}
                                        onClick={() => setVals({ ...vals, [v.chave]: true })}
                                    />
                                    <Chip
                                        largo
                                        label="Não"
                                        selecionado={vals[v.chave] === false}
                                        onClick={() => setVals({ ...vals, [v.chave]: false })}
                                    />
                                </ChipGroup>
                            </div>
                        ))}
                        {erro && <p className="text-bad text-sm mt-3">{erro}</p>}
                        <button
                            onClick={submeter}
                            disabled={!tudoPreenchido || aCarregar}
                            className="w-full bg-pri text-white rounded-lg py-2.5 mt-3 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40"
                        >
                            {aCarregar ? "A submeter..." : tudoPreenchido
                                ? (modo === "auto" ? "Submeter autoavaliação" : "Submeter avaliação")
                                : "Preencha tudo para submeter"}
                        </button>
                    </Cartao>
                </div>

                {/* Caixa de pontuação em direto */}
                <ScoreBox label="Pontuação em direto" valor={notaFinal ?? "—"}>
                    <table className="w-full mt-2 text-[12px]">
                        <tbody>
                            <tr><td className="text-dim py-0.5">Objetivos</td><td className="text-right">{objScore != null ? objScore.toFixed(1) : "—"}</td></tr>
                            <tr><td className="text-dim py-0.5">Competências</td><td className="text-right">{compMedia != null ? compMedia.toFixed(1) : "—"}</td></tr>
                            <tr><td className="text-dim py-0.5">Valores</td><td className="text-right">{valScore != null ? valScore.toFixed(1) : "—"}</td></tr>
                        </tbody>
                    </table>
                </ScoreBox>
            </div>
        </div>
    );
}
