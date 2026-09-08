import { useEffect, useState } from "react";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";

interface Ciclo {
    id: number;
    name: string;
}

interface GrupoStats {
    group: string;
    count: number;
    average_score: number | null;
    by_classification: Record<string, number>;
    below_threshold: number;
}

interface Relatorio {
    cycle_id: number;
    cycle_name: string;
    total_validated: number;
    overall_average: number | null;
    overall_by_classification: Record<string, number>;
    by_department: GrupoStats[];
    by_category: GrupoStats[];
}

// Cartão de KPI ao estilo do protótipo.
function Kpi({ valor, label }: { valor: string | number; label: string }) {
    return (
        <Cartao>
            <div className="font-serif font-semibold text-[26px] text-pri-dark">{valor}</div>
            <div className="text-[10.5px] text-dim uppercase tracking-wide mt-0.5">{label}</div>
        </Cartao>
    );
}

export default function Relatorios() {
    const [ciclos, setCiclos] = useState<Ciclo[]>([]);
    const [cicloId, setCicloId] = useState<number | null>(null);
    const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
    const [aCarregar, setACarregar] = useState(false);
    const [erro, setErro] = useState("");
    const [cruzamento, setCruzamento] = useState<{
        company_enps: string | null;
        company_participation: string | null;
        rows: { department: string; performance_average: number | null; below_threshold: number; headcount: number }[];
    } | null>(null);

    // Ao abrir, busca os ciclos disponíveis.
    useEffect(() => {
        api.get("/evaluations/cycles")
            .then((resp) => {
                setCiclos(resp.data);
                if (resp.data.length > 0) setCicloId(resp.data[0].id);
            })
            .catch(() => { });
    }, []);

    // Sempre que muda o ciclo escolhido, busca o relatório desse ciclo.
    useEffect(() => {
        if (cicloId == null) return;
        setACarregar(true);
        setErro("");
        api.get(`/reports/evaluations/${cicloId}`)
            .then((resp) => setRelatorio(resp.data))
            .catch((err) => {
                setRelatorio(null);
                setErro(err.response?.data?.detail || "Erro ao carregar o relatório.");
            })
            .finally(() => setACarregar(false));
        // Cruzamento cultura × desempenho (secção 6).
        api.get(`/reports/culture-vs-performance/${cicloId}`)
            .then((resp) => setCruzamento(resp.data))
            .catch(() => setCruzamento(null));
    }, [cicloId]);

    const descarregarPdf = async () => {
        if (cicloId == null) return;
        try {
            const resp = await api.get(`/reports/evaluations/${cicloId}/pdf`, {
                responseType: "blob", // importante: recebe o ficheiro como binário
            });
            // Cria um link temporário e clica nele para descarregar.
            const url = window.URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `relatorio_${relatorio?.cycle_name || "ciclo"}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            setErro("Não foi possível gerar o PDF.");
        }
    };
    return (
        <div>
            <Cabecalho
                eyebrow="Gerado automaticamente a partir dos fechos"
                titulo="Relatório Consolidado do Ciclo"
                descricao="Cada avaliação validada entra na consolidação por direção, por categoria e geral."
            />

            {/* Seletor de ciclo */}
            <div className="mb-4">
                <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Ciclo</label>
                <select
                    value={cicloId ?? ""}
                    onChange={(e) => setCicloId(Number(e.target.value))}
                    className="max-w-xs bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                >
                    {ciclos.length === 0 && <option>Sem ciclos</option>}
                    {ciclos.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {relatorio && relatorio.total_validated > 0 && (
                <button
                    onClick={descarregarPdf}
                    className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors mb-4"
                >
                    ↓ Descarregar relatório em PDF
                </button>
            )}

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar relatório...</p>
            ) : erro ? (
                <p className="text-bad text-sm">{erro}</p>
            ) : relatorio ? (
                <>
                    {/* KPIs gerais */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mb-4">
                        <Kpi valor={relatorio.total_validated} label="Avaliações validadas" />
                        <Kpi valor={relatorio.overall_average?.toFixed(2) ?? "—"} label="Média geral do ciclo" />
                        <Kpi valor={Object.keys(relatorio.overall_by_classification).length} label="Níveis presentes" />
                    </div>

                    {relatorio.total_validated === 0 && (
                        <Cartao>
                            <p className="text-dim text-center py-3">
                                Ainda não há avaliações validadas neste ciclo. Valide avaliações para as ver aqui.
                            </p>
                        </Cartao>
                    )}

                    {relatorio.total_validated > 0 && (
                        <>
                            {/* Distribuição por classificação */}
                            <Cartao className="mb-4">
                                <h3 className="text-[14.5px] mb-3">Distribuição por classificação</h3>
                                <div className="flex gap-2 flex-wrap">
                                    {Object.entries(relatorio.overall_by_classification).map(([nivel, n]) => (
                                        <div key={nivel} className="px-3 py-2 bg-pri-bg rounded-lg">
                                            <span className="text-pri-dark font-semibold">{n}</span>
                                            <span className="text-dim text-[12px] ml-1.5">{nivel}</span>
                                        </div>
                                    ))}
                                </div>
                            </Cartao>

                            {/* Por direção */}
                            <Cartao className="mb-4 p-0 overflow-hidden">
                                <h3 className="text-[14.5px] p-4 pb-2">Consolidação por direção</h3>
                                <table className="w-full text-[12.8px]">
                                    <thead>
                                        <tr>
                                            <Th>Direção</Th><Th>Avaliações</Th><Th>Média</Th><Th>Abaixo de 3,5</Th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {relatorio.by_department.map((g) => (
                                            <tr key={g.group} className="hover:bg-panel">
                                                <Td><b className="text-strong">{g.group}</b></Td>
                                                <Td>{g.count}</Td>
                                                <Td>{g.average_score?.toFixed(2) ?? "—"}</Td>
                                                <Td>{g.below_threshold}</Td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Cartao>

                            {/* Por categoria */}
                            <Cartao className="p-0 overflow-hidden">
                                <h3 className="text-[14.5px] p-4 pb-2">Consolidação por categoria</h3>
                                <table className="w-full text-[12.8px]">
                                    <thead>
                                        <tr><Th>Categoria</Th><Th>Avaliações</Th><Th>Média</Th></tr>
                                    </thead>
                                    <tbody>
                                        {relatorio.by_category.map((g) => (
                                            <tr key={g.group} className="hover:bg-panel">
                                                <Td><b className="text-strong">{g.group}</b></Td>
                                                <Td>{g.count}</Td>
                                                <Td>{g.average_score?.toFixed(2) ?? "—"}</Td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Cartao>

                            {/* Cruzamento cultura × desempenho (secção 6) */}
                            {cruzamento && cruzamento.rows.length > 0 && (
                                <Cartao className="mt-4 p-0 overflow-hidden">
                                    <div className="p-4 pb-2">
                                        <h3 className="text-[14.5px]">Cultura × Desempenho por direção</h3>
                                        <p className="text-dim text-[11.5px] mt-1">
                                            Leitura de governação: onde o clima pode estar a travar os resultados.
                                            {cruzamento.company_enps && <> eNPS da empresa: <b className="text-pri-dark">{cruzamento.company_enps}</b>.</>}
                                            {cruzamento.company_participation && <> Participação: <b className="text-pri-dark">{cruzamento.company_participation}</b>.</>}
                                        </p>
                                    </div>
                                    <table className="w-full text-[12.8px]">
                                        <thead>
                                            <tr>
                                                <Th>Direção</Th><Th>Colaboradores</Th><Th>Média de desempenho</Th><Th>Abaixo de 3,5</Th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cruzamento.rows.map((r, i) => (
                                                <tr key={i} className="hover:bg-panel">
                                                    <Td><b className="text-strong">{r.department}</b></Td>
                                                    <Td>{r.headcount}</Td>
                                                    <Td>
                                                        <b className={
                                                            r.performance_average == null ? "text-dim"
                                                                : r.performance_average < 3.5 ? "text-bad"
                                                                    : r.performance_average < 4.0 ? "text-warn" : "text-ok"
                                                        }>
                                                            {r.performance_average?.toFixed(2) ?? "—"}
                                                        </b>
                                                    </Td>
                                                    <Td>
                                                        {r.below_threshold > 0
                                                            ? <span className="text-bad font-semibold">{r.below_threshold}</span>
                                                            : <span className="text-dim">0</span>}
                                                    </Td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </Cartao>
                            )}
                        </>
                    )}
                </>
            ) : null}
        </div>
    );
}

function Th({ children }: { children: React.ReactNode }) {
    return <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-4 py-2.5 border-b border-line">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
    return <td className="px-4 py-2.5 border-b border-line2">{children}</td>;
}