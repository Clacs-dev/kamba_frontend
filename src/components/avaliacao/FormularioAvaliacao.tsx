import { useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";

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

    return (
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
                            <div className="flex gap-1.5 flex-wrap">
                                {ESCALA.map((s) => (
                                    <button
                                        key={s.v}
                                        onClick={() => setComps({ ...comps, [c.chave]: s.v })}
                                        className={`flex-1 min-w-[70px] px-2 py-2.5 border rounded-lg text-center transition-colors ${comps[c.chave] === s.v
                                                ? "border-pri bg-pri-bg"
                                                : "border-line bg-paper hover:border-pri-soft"
                                            }`}
                                    >
                                        <div className={`font-serif text-[15px] ${comps[c.chave] === s.v ? "text-pri-dark" : "text-dim"}`}>{s.v}</div>
                                        <div className={`text-[9.8px] ${comps[c.chave] === s.v ? "text-pri-dark" : "text-dim"}`}>{s.l}</div>
                                    </button>
                                ))}
                            </div>
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
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => setVals({ ...vals, [v.chave]: true })}
                                    className={`flex-1 px-2 py-2.5 border rounded-lg text-center transition-colors ${vals[v.chave] === true ? "border-pri bg-pri-bg text-pri-dark" : "border-line bg-paper text-dim hover:border-pri-soft"
                                        }`}
                                >
                                    <b>Sim</b>
                                </button>
                                <button
                                    onClick={() => setVals({ ...vals, [v.chave]: false })}
                                    className={`flex-1 px-2 py-2.5 border rounded-lg text-center transition-colors ${vals[v.chave] === false ? "border-pri bg-pri-bg text-pri-dark" : "border-line bg-paper text-dim hover:border-pri-soft"
                                        }`}
                                >
                                    <b>Não</b>
                                </button>
                            </div>
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
            <div className="sticky top-16 bg-pri-bg border border-pri-soft rounded-xl p-3.5">
                <div className="text-[10px] uppercase tracking-widest text-dim">Pontuação em direto</div>
                <div className="font-serif text-3xl font-semibold text-pri-dark">{notaFinal ?? "—"}</div>
                <table className="w-full mt-2 text-[12px]">
                    <tbody>
                        <tr><td className="text-dim py-0.5">Objetivos</td><td className="text-right">{objScore != null ? objScore.toFixed(1) : "—"}</td></tr>
                        <tr><td className="text-dim py-0.5">Competências</td><td className="text-right">{compMedia != null ? compMedia.toFixed(1) : "—"}</td></tr>
                        <tr><td className="text-dim py-0.5">Valores</td><td className="text-right">{valScore != null ? valScore.toFixed(1) : "—"}</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}