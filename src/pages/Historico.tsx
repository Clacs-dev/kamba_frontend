import { useEffect, useState } from "react";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import FaixaKpis from "../components/FaixaKpis";

interface Distribuicao {
    level: string;
    count: number;
}

interface Direcao {
    department: string | null;
    average: number | null;
    count: number;
}

interface CicloHistorico {
    cycle_id: number;
    cycle_name: string;
    global_average: number | null;
    evaluated_count: number;
    distribution: Distribuicao[];
    by_direction: Direcao[];
}

interface HistoricoData {
    company_name: string;
    cycles: CicloHistorico[];
}

// Cor das barras conforme o nível (da escala do manual).
const CORES_NIVEL = ["bg-ok", "bg-ok", "bg-pri", "bg-warn", "bg-bad"];

export default function Historico() {
    const [dados, setDados] = useState<HistoricoData | null>(null);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");

    useEffect(() => {
        api.get("/evaluations/history")
            .then((r) => setDados(r.data))
            .catch((e) => setErro(e.response?.data?.detail || "Erro ao carregar o histórico."))
            .finally(() => setACarregar(false));
    }, []);

    if (aCarregar) {
        return (
            <div>
                <Cabecalho eyebrow="Séries de 3 ciclos" titulo="Histórico" />
                <p className="text-dim text-sm">A carregar histórico...</p>
            </div>
        );
    }

    if (erro || !dados) {
        return (
            <div>
                <Cabecalho eyebrow="Séries de 3 ciclos" titulo="Histórico" />
                <p className="text-bad text-sm">{erro || "Sem dados."}</p>
            </div>
        );
    }

    const totalAvaliados = dados.cycles.reduce((s, c) => s + c.evaluated_count, 0);
    const ultimo = dados.cycles[dados.cycles.length - 1];

    return (
        <div>
            <Cabecalho
                eyebrow="Séries de 3 ciclos"
                titulo={`Histórico — ${dados.company_name || "Avaliação de Desempenho"}`}
                descricao="Três anos de avaliações homologadas: evolução global, por direcção e distribuição de níveis."
            />

            <FaixaKpis kpis={[
                { valor: dados.cycles.length, label: "Ciclos no histórico" },
                { valor: totalAvaliados, label: "Avaliações homologadas" },
                { valor: ultimo?.global_average ?? "—", label: "Média global (último ciclo)" },
                { valor: ultimo?.evaluated_count ?? 0, label: "Avaliados (último ciclo)" },
            ]} />

            <div className="space-y-4">
                {dados.cycles.map((ciclo) => {
                    const maxNivel = Math.max(1, ...ciclo.distribution.map((d) => d.count));
                    const maxDir = Math.max(1, ...ciclo.by_direction.map((d) => d.count));
                    return (
                        <div key={ciclo.cycle_id} className="space-y-3">
                            <h3 className="text-[15px] text-strong">
                                {ciclo.cycle_name}
                                <span className="text-dim text-[11.5px] font-normal ml-2">
                                    média global {ciclo.global_average != null ? ciclo.global_average.toFixed(2) : "—"}
                                </span>
                            </h3>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {/* Distribuição de níveis */}
                                <Cartao>
                                    <h4 className="text-[13.5px] mb-3">Distribuição de níveis</h4>
                                    <div className="space-y-3">
                                        {ciclo.distribution.map((d, i) => (
                                            <div key={i}>
                                                <div className="flex justify-between text-[12.3px] mb-1">
                                                    <span className="text-ink">{d.level}</span>
                                                    <b>{d.count}</b>
                                                </div>
                                                <div className="h-2 bg-line rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${CORES_NIVEL[i % CORES_NIVEL.length]} rounded-full`}
                                                        style={{ width: `${(d.count / maxNivel) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Cartao>

                                {/* Média por direcção */}
                                <Cartao>
                                    <h4 className="text-[13.5px] mb-3">Média por direcção</h4>
                                    {ciclo.by_direction.length === 0 ? (
                                        <p className="text-dim text-[12.3px]">Sem avaliações com nota neste ciclo.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {ciclo.by_direction.map((dir, i) => (
                                                <div key={i}>
                                                    <div className="flex justify-between text-[12.3px] mb-1">
                                                        <span className="text-ink">{dir.department || "Sem direcção"}</span>
                                                        <b>{dir.average != null ? dir.average.toFixed(2) : "—"} <span className="text-dim font-normal">· {dir.count}</span></b>
                                                    </div>
                                                    <div className="h-2 bg-line rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-pri rounded-full"
                                                            style={{ width: `${(dir.count / maxDir) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Cartao>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
