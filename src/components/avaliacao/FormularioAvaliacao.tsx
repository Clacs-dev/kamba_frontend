import { useEffect, useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";
import { Chip, ChipGroup } from "../ui/Chip";
import ScoreBox from "../ui/ScoreBox";
import { normalizarLado, type LadoComparacao } from "../../lib/comparison";

const ESCALA_DEFAULT = [
    { v: 1, l: "Raramente" },
    { v: 2, l: "Às vezes" },
    { v: 3, l: "Com regularidade" },
    { v: 4, l: "Quase sempre" },
    { v: 5, l: "Sempre" },
];

interface FormItem {
    description: string;
    weight?: number | null;
    scale?: string[] | null;
}

interface FormStage {
    number: number;
    name: string;
    weight: number;
    stage_type: "objectives" | "competencies" | "values" | "notes";
    items: FormItem[];
}

interface ObjetivoLinha {
    description: string;
    weight: number;
    execution: string;
}

interface Props {
    evaluationId: number;
    cycleId?: number;
    modo: "auto" | "director";
    categoria?: string;
    objetivosDefinidos?: { description: string; weight: number }[] | null;
    aoSubmeter: () => void;
}

export default function FormularioAvaliacao({ evaluationId, cycleId, modo, categoria = "tecnico", objetivosDefinidos = null, aoSubmeter }: Props) {
    const pactuados = !!objetivosDefinidos && objetivosDefinidos.length > 0;

    const [stages, setStages] = useState<FormStage[]>([]);
    const [configLoaded, setConfigLoaded] = useState(false);
    const [objs, setObjs] = useState<ObjetivoLinha[]>([]);
    const [comps, setComps] = useState<Record<string, number>>({});
    const [vals, setVals] = useState<Record<string, boolean>>({});
    const [erro, setErro] = useState("");
    const [aCarregar, setACarregar] = useState(false);
    const [auto, setAuto] = useState<LadoComparacao | null>(null);

    const PESOS = {
        tecnico: { objectives: 50, competencies: 35, values: 15 },
        dirigente: { objectives: 60, competencies: 25, values: 15 },
    };
    const pesos = PESOS[categoria as keyof typeof PESOS] ?? PESOS.tecnico;

    useEffect(() => {
        if (!cycleId) {
            setStages([
                { number: 1, name: "Objectivos pactuados", weight: 50, stage_type: "objectives", items: [
                    { description: "Atingir 100% da meta anual de vendas da equipa", weight: 40 },
                    { description: "Reduzir o prazo médio de recebimento da carteira para 60 dias", weight: 30 },
                    { description: "Garantir a adopção do CRM por 90% da equipa comercial", weight: 30 },
                ]},
                { number: 2, name: "Competências", weight: 35, stage_type: "competencies", items: [
                    { description: "Orientação para resultados" },
                    { description: "Trabalho em equipa e colaboração" },
                    { description: "Ética e conformidade" },
                    { description: "Comunicação" },
                    { description: "Adaptabilidade e melhoria contínua" },
                ]},
                { number: 3, name: "Valores e conduta", weight: 15, stage_type: "values", items: [
                    { description: "Cumpri o Código de Ética e Conduta da empresa" },
                    { description: "Cumpri as normas de segurança e saúde no trabalho" },
                    { description: "Mantive assiduidade e pontualidade regulares" },
                ]},
            ]);
            setConfigLoaded(true);
            return;
        }
        api.get(`/evaluations/cycles/${cycleId}`)
            .then((r) => {
                const cfg = r.data?.form_config;
                const arr: FormStage[] = Array.isArray(cfg?.stages)
                    ? cfg.stages.map((s: any, i: number) => ({ ...s, number: i + 1 }))
                    : [];
                if (arr.length === 0) {
                    arr.push(
                        { number: 1, name: "Objectivos pactuados", weight: 50, stage_type: "objectives", items: [
                            { description: "Atingir 100% da meta anual de vendas da equipa", weight: 40 },
                            { description: "Reduzir o prazo médio de recebimento da carteira para 60 dias", weight: 30 },
                            { description: "Garantir a adopção do CRM por 90% da equipa comercial", weight: 30 },
                        ]},
                        { number: 2, name: "Competências", weight: 35, stage_type: "competencies", items: [
                            { description: "Orientação para resultados" },
                            { description: "Trabalho em equipa e colaboração" },
                            { description: "Ética e conformidade" },
                            { description: "Comunicação" },
                            { description: "Adaptabilidade e melhoria contínua" },
                        ]},
                        { number: 3, name: "Valores e conduta", weight: 15, stage_type: "values", items: [
                            { description: "Cumpri o Código de Ética e Conduta da empresa" },
                            { description: "Cumpri as normas de segurança e saúde no trabalho" },
                            { description: "Mantive assiduidade e pontualidade regulares" },
                        ]},
                    );
                }
                setStages(arr);
            })
            .catch(() => setStages([]))
            .finally(() => setConfigLoaded(true));
    }, [cycleId]);

    useEffect(() => {
        if (objs.length > 0) return;
        if (pactuados) {
            setObjs(objetivosDefinidos!.map((o) => ({
                description: o.description,
                weight: o.weight,
                execution: "",
            })));
            return;
        }
        const objItems = stages.find((s) => s.stage_type === "objectives")?.items ?? [];
        if (objItems.length > 0) {
            setObjs(objItems.map((it) => ({
                description: it.description,
                weight: it.weight ?? 0,
                execution: "",
            })));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stages]);

    useEffect(() => {
        if (modo !== "director") return;
        api.get(`/evaluations/${evaluationId}/comparison`)
            .then((r) => setAuto(normalizarLado(r.data?.auto) ?? null))
            .catch(() => setAuto(null));
    }, [evaluationId, modo]);

    const objetivosStage = stages.find((s) => s.stage_type === "objectives");
    const competenciasStage = stages.find((s) => s.stage_type === "competencies");
    const valoresStage = stages.find((s) => s.stage_type === "values");

    const alterarExecucao = (i: number, valor: string) => {
        setObjs((prev) => prev.map((o, idx) => (idx === i ? { ...o, execution: valor } : o)));
    };

    const objNums = objs.map((o) => ({
        description: o.description.trim(),
        weight: o.weight,
        execution: o.execution !== "" ? Number(o.execution) : null,
    }));

    const totalPeso = objNums.reduce((acc, o) => acc + o.weight, 0);
    const pesosOk = Math.round(totalPeso * 10) / 10 === 100;

    const objScore = pesosOk
        ? objNums.reduce((acc, o) => {
            if (o.execution == null) return acc;
            return acc + (Math.min(o.execution, 100) / 100 * o.weight);
        }, 0) / 100 * 5
        : null;

    const compItems = competenciasStage?.items ?? [];
    const valItems = valoresStage?.items ?? [];

    const compVals = compItems.map((it) => comps[it.description]).filter((v) => v != null);
    const compScore = compVals.length === compItems.length && compVals.length > 0
        ? compVals.reduce((a, b) => a + b, 0) / compVals.length
        : null;

    const valVals = valItems.map((it) => vals[it.description]).filter((v) => v != null);
    const valScore = valVals.length === valItems.length && valVals.length > 0
        ? valVals.reduce((a, b) => a + (b ? 5 : 2.5), 0) / valVals.length
        : null;

    const objDone = objNums.filter((o) => o.execution != null).length;
    const objTotal = objNums.length;
    const compDone = compVals.length;
    const compTotal = compItems.length;
    const valDone = valVals.length;
    const valTotal = valItems.length;

    const done = objDone + compDone + valDone;
    const total = objTotal + compTotal + valTotal;

    const tudoPreenchido = objDone === objTotal && compDone === compTotal && valDone === valTotal && pesosOk;

    const notaFinal = tudoPreenchido && objScore != null && compScore != null && valScore != null
        ? Math.round((objScore * pesos.objectives / 100 + compScore * pesos.competencies / 100 + valScore * pesos.values / 100) * 10) / 10
        : null;

    const submeter = async () => {
        setErro("");
        setACarregar(true);
        const endpoint = modo === "auto" ? "self-assessment" : "director-assessment";
        try {
            await api.post(`/evaluations/${evaluationId}/${endpoint}`, {
                objectives: objNums.map((o) => ({
                    description: o.description,
                    weight: o.weight,
                    execution: o.execution ?? 0,
                })),
                competencies: Object.fromEntries(
                    compItems.map((it) => [it.description, comps[it.description] ?? 0])
                ),
                values: Object.fromEntries(
                    valItems.map((it) => [it.description, vals[it.description] ?? false])
                ),
            });
            aoSubmeter();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao submeter.");
        } finally {
            setACarregar(false);
        }
    };

    const nota = (n: number | null | undefined) => (n != null ? n.toFixed(1) : "—");

    if (!configLoaded) {
        return <p className="text-dim text-sm">A carregar formulário...</p>;
    }

    return (
        <div className="space-y-3">
            {modo === "director" && auto && (
                <div className="border border-line rounded-xl p-4">
                    <h4 className="text-[13.5px] font-semibold text-strong mb-1">
                        Autoavaliação do colaborador — nota provisória {nota(auto.final)} ({auto.classification || "—"})
                    </h4>
                    <div className="space-y-3 mt-2">
                        {auto.objectives.length > 0 && (
                            <div>
                                <div className="text-dim text-[10.5px] uppercase tracking-wide mb-1">Objectivos</div>
                                {auto.objectives.map((o, i) => (
                                    <div key={i} className="text-[12.8px] py-1 border-b border-line2 last:border-0">
                                        {o.description || "—"} <span className="text-dim">· peso {o.weight}% · execução {o.execution}%</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {compItems.length > 0 && (
                            <div>
                                <div className="text-dim text-[10.5px] uppercase tracking-wide mb-1">Competências</div>
                                {compItems.map((c) => (
                                    <div key={c.description} className="flex justify-between text-[12.8px] py-1 border-b border-line2 last:border-0">
                                        <span>{c.description}</span>
                                        <span className="font-semibold">{auto.competencies[c.description] != null ? auto.competencies[c.description] : "—"}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {valItems.length > 0 && (
                            <div>
                                <div className="text-dim text-[10.5px] uppercase tracking-wide mb-1">Valores e conduta</div>
                                {valItems.map((v) => (
                                    <div key={v.description} className="flex justify-between text-[12.8px] py-1 border-b border-line2 last:border-0">
                                        <span>{v.description}</span>
                                        <span className="font-semibold">
                                            {auto.values[v.description] == null ? "—" : auto.values[v.description] ? "Sim" : "Não"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-between text-[12.8px] pt-1">
                            <span className="font-semibold text-strong">Nota provisória (auto)</span>
                            <span className="font-semibold text-pri-dark">{nota(auto.final)}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] gap-3 items-start">
                <div className="space-y-3">
                    {/* Etapa 1 — Objectivos */}
                    <Cartao>
                        <h3 className="text-[14.5px] mb-2">
                            Etapa 1 · {objetivosStage?.name || "Objectivos pactuados"}{" "}
                            <span className="text-dim text-[11px]">
                                (peso {pesos.objectives}% — indique a % de execução de cada objectivo)
                            </span>
                        </h3>
                        {objs.map((o, i) => (
                            <div key={i} className="py-2.5 border-b border-line2 last:border-0">
                                <div className="text-[13.3px] text-strong mb-2">
                                    {i + 1}. {o.description}{" "}
                                    <span className="inline-block bg-pri-bg text-pri-dark text-[10.5px] font-semibold px-2 py-0.5 rounded-full ml-1">
                                        peso {o.weight}%
                                    </span>
                                    {modo === "director" && auto && auto.objectives[i] && (
                                        <span className="inline-block bg-info-bg text-info text-[10.5px] font-semibold px-2 py-0.5 rounded-full ml-1">
                                            auto: {auto.objectives[i].execution}%
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <input
                                        type="number" min={0} max={100}
                                        value={o.execution}
                                        onChange={(e) => alterarExecucao(i, e.target.value)}
                                        placeholder="%"
                                        className="w-20 text-center font-semibold bg-panel border border-line rounded-lg px-2 py-2 text-[13px] focus:outline-none focus:border-pri"
                                    />
                                    <span className="text-dim text-[11px]">% de execução (0–100)</span>
                                </div>
                            </div>
                        ))}
                        {pesosOk && (
                            <p className="text-ok text-[12.3px] mt-2">Pesos: 100%.</p>
                        )}
                        {!pesosOk && (
                            <p className="text-warn text-[12.3px] mt-2">
                                Os pesos somam {Math.round(totalPeso * 10) / 10}% — têm de somar 100%.
                            </p>
                        )}
                    </Cartao>

                    {/* Etapa 2 — Competências */}
                    {compItems.length > 0 && (
                        <Cartao>
                            <h3 className="text-[14.5px] mb-2">
                                Etapa 2 · {competenciasStage?.name || "Competências"}{" "}
                                <span className="text-dim text-[11px]">(peso {pesos.competencies}% — escala 1 a 5)</span>
                            </h3>
                            {compItems.map((item) => (
                                <div key={item.description} className="py-2 border-b border-line2 last:border-0">
                                    <div className="text-[13.3px] text-strong mb-2">
                                        {item.description}
                                        {modo === "director" && auto && auto.competencies[item.description] != null && (
                                            <span className="inline-block bg-info-bg text-info text-[10.5px] font-semibold px-2 py-0.5 rounded-full ml-1">
                                                auto: {auto.competencies[item.description]}
                                            </span>
                                        )}
                                    </div>
                                    <ChipGroup>
                                        {ESCALA_DEFAULT.map((s) => (
                                            <Chip
                                                key={s.v}
                                                label={s.v}
                                                sublabel={s.l}
                                                selecionado={comps[item.description] === s.v}
                                                onClick={() => setComps({ ...comps, [item.description]: s.v })}
                                            />
                                        ))}
                                    </ChipGroup>
                                </div>
                            ))}
                        </Cartao>
                    )}

                    {/* Etapa 3 — Valores e conduta */}
                    {valItems.length > 0 && (
                        <Cartao>
                            <h3 className="text-[14.5px] mb-2">
                                Etapa 3 · {valoresStage?.name || "Valores e conduta"}{" "}
                                <span className="text-dim text-[11px]">(peso {pesos.values}% — resposta Sim / Não)</span>
                            </h3>
                            {valItems.map((item) => (
                                <div key={item.description} className="py-2 border-b border-line2 last:border-0">
                                    <div className="text-[13.3px] text-strong mb-2">
                                        {item.description}
                                        {modo === "director" && auto && auto.values[item.description] != null && (
                                            <span className="inline-block bg-info-bg text-info text-[10.5px] font-semibold px-2 py-0.5 rounded-full ml-1">
                                                auto: {auto.values[item.description] ? "Sim" : "Não"}
                                            </span>
                                        )}
                                    </div>
                                    <ChipGroup>
                                        <Chip
                                            largo
                                            label="Sim"
                                            sublabel="cumpri"
                                            selecionado={vals[item.description] === true}
                                            onClick={() => setVals({ ...vals, [item.description]: true })}
                                        />
                                        <Chip
                                            largo
                                            label="Não"
                                            sublabel="não cumpri / com falhas"
                                            selecionado={vals[item.description] === false}
                                            onClick={() => setVals({ ...vals, [item.description]: false })}
                                        />
                                    </ChipGroup>
                                </div>
                            ))}
                        </Cartao>
                    )}

                    {erro && <p className="text-bad text-sm mt-3">{erro}</p>}
                    <button
                        onClick={submeter}
                        disabled={!tudoPreenchido || aCarregar}
                        className="w-full bg-pri text-white rounded-lg py-2.5 mt-3 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40"
                    >
                        {aCarregar ? "A submeter..." : tudoPreenchido
                            ? (modo === "auto"
                                ? "Submeter autoavaliação"
                                : "Submeter avaliação e notificar o colaborador")
                            : "Responda a tudo para submeter"}
                    </button>
                </div>

                {/* ScoreBox */}
                <ScoreBox label="Pontuação em directo" valor={notaFinal ?? "—"}>
                    <div className="text-[11px] text-dim mt-0.5">
                        {notaFinal != null
                            ? notaFinal >= 4.5 ? "Excelente" : notaFinal >= 3.5 ? "Bom" : notaFinal >= 2.5 ? "Suficiente" : "Insuficiente"
                            : `${done} de ${total} respostas dadas`}
                    </div>
                    <table className="w-full mt-2 text-[12px]">
                        <tbody>
                            <tr>
                                <td className="text-dim py-0.5">Objectivos</td>
                                <td className="text-right">{objScore != null ? objScore.toFixed(1) : "—"}</td>
                            </tr>
                            <tr>
                                <td className="text-dim py-0.5">Competências</td>
                                <td className="text-right">{compScore != null ? compScore.toFixed(1) : "—"}</td>
                            </tr>
                            <tr>
                                <td className="text-dim py-0.5">Valores</td>
                                <td className="text-right">{valScore != null ? valScore.toFixed(1) : "—"}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="mt-2 h-2 bg-line rounded-full overflow-hidden">
                        <div
                            className="h-full bg-pri rounded-full transition-all duration-300"
                            style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                        />
                    </div>
                    <div className="text-[11px] text-dim mt-1">
                        {total > 0 ? Math.round((done / total) * 100) : 0}% preenchido
                    </div>
                </ScoreBox>
            </div>
        </div>
    );
}
