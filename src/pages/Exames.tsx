import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import FaixaKpis from "../components/FaixaKpis";
import Tag from "../components/ui/Tag";
import Notice from "../components/ui/Notice";

// ---------------------------------------------------------------------------
// Módulo "Exames Profissionais" — saúde ocupacional (secção 2.7 do manual).
//
// AVISO DE PRIVACIDADE: por desenho, a plataforma só regista a APTIDÃO laboral
// e as datas. Não existe diagnóstico, sintoma ou qualquer dado clínico —
// esses ficam na esfera do médico do trabalho.
// ---------------------------------------------------------------------------

interface Exame {
    id: number;
    collaborator_id: number;
    collaborator_name: string;
    fitness: string;
    exam_date: string;
    next_exam_date: string | null;
    restriction_note: string | null;
    days_to_next: number | null;
    atrasado: boolean;
}

const FIT: Record<string, { rotulo: string; variante: "ok" | "warn" | "bad" }> = {
    apto: { rotulo: "Apto", variante: "ok" },
    apto_com_restricoes: { rotulo: "Apto com restrições", variante: "warn" },
    inapto: { rotulo: "Inapto", variante: "bad" },
};

const dataCurta = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function Exames() {
    const navigate = useNavigate();

    const [exames, setExames] = useState<Exame[]>([]);
    const [busca, setBusca] = useState("");
    const [filtroAptidao, setFiltroAptidao] = useState("");
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");

    // A pesquisa vai para o servidor (filtra pelo nome do colaborador); um
    // pequeno atraso evita um pedido por cada tecla.
    useEffect(() => {
        const t = setTimeout(() => {
            setACarregar(true);
            const params: Record<string, string> = {};
            if (busca.trim()) params.search = busca.trim();
            if (filtroAptidao) params.fitness = filtroAptidao;
            api.get("/occupational-health/exams", { params })
                .then((r) => {
                    setExames(Array.isArray(r.data) ? r.data : []);
                    setErro("");
                })
                .catch(() => setErro("Não foi possível carregar os exames."))
                .finally(() => setACarregar(false));
        }, busca ? 300 : 0);
        return () => clearTimeout(t);
    }, [busca, filtroAptidao]);

    // Os totais vêm da lista inteira que o servidor devolve; com a pesquisa
    // activa, os KPIs mostram o que foi encontrado.
    const totais = useMemo(() => ({
        total: exames.length,
        aptos: exames.filter((e) => e.fitness === "apto").length,
        restritos: exames.filter((e) => e.fitness === "apto_com_restricoes").length,
        inaptos: exames.filter((e) => e.fitness === "inapto").length,
        atrasados: exames.filter((e) => e.atrasado).length,
    }), [exames]);

    const filtrado = busca.trim().length > 0 || filtroAptidao !== "";

    return (
        <div>
            <Cabecalho
                eyebrow="Saúde ocupacional · Aptidão laboral"
                titulo="Exames Profissionais"
                descricao="Aptidão laboral e datas dos exames médicos. Por desenho, a plataforma não guarda diagnósticos nem dados clínicos — esses pertencem ao médico do trabalho."
            />

            <FaixaKpis kpis={[
                { valor: totais.total, label: "Exames registados" },
                { valor: totais.aptos, label: "Aptos", cor: "ok" },
                { valor: totais.restritos, label: "Aptos com restrições", cor: "warn" },
                { valor: totais.inaptos, label: "Inaptos", cor: "bad" },
            ]} />

            {totais.atrasados > 0 && (
                <div className="mb-3.5">
                    <Notice>
                        <b>{totais.atrasados} exame(s) em atraso</b> — o próximo exame já passou a data prevista. Agendar a renovação.
                    </Notice>
                </div>
            )}

            {/* Pesquisa por nome do colaborador + filtro de aptidão */}
            <div className="flex flex-wrap gap-2.5 mb-4">
                <div className="relative flex-1 min-w-[220px]">
                    <input
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Pesquisar pelo nome do colaborador..."
                        aria-label="Pesquisar exames pelo nome do colaborador"
                        className="w-full bg-panel border border-line rounded-lg pl-3 pr-8 py-2 text-[13px] focus:outline-none focus:border-pri"
                    />
                    {busca && (
                        <button
                            type="button"
                            onClick={() => setBusca("")}
                            aria-label="Limpar pesquisa"
                            className="absolute right-0 top-0 h-full w-8 flex items-center justify-center text-dim hover:text-pri"
                        >
                            ×
                        </button>
                    )}
                </div>
                <select
                    value={filtroAptidao}
                    onChange={(e) => setFiltroAptidao(e.target.value)}
                    aria-label="Filtrar por aptidão"
                    className="bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                >
                    <option value="">Todas as aptidões</option>
                    <option value="apto">Apto</option>
                    <option value="apto_com_restricoes">Apto com restrições</option>
                    <option value="inapto">Inapto</option>
                </select>
            </div>

            {erro ? (
                <p className="text-bad text-sm">{erro}</p>
            ) : aCarregar ? (
                <p className="text-dim text-sm">A carregar exames...</p>
            ) : exames.length === 0 ? (
                <Cartao>
                    <p className="text-dim text-center py-4">
                        {filtrado
                            ? "Nenhum exame corresponde à pesquisa."
                            : "Ainda não há exames registados."}
                    </p>
                </Cartao>
            ) : (
                <Cartao className="p-0">
                    <div className="overflow-x-auto md:overflow-visible">
                        <table className="w-full text-[12.8px] min-w-[720px]">
                            <thead>
                                <tr>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Colaborador</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Aptidão</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Data do exame</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Próximo exame</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Observação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exames.map((e) => (
                                    <tr key={e.id} className="hover:bg-panel transition-colors">
                                        <td className="px-3 py-2.5 border-b border-line2">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/colaboradores/${e.collaborator_id}/portal`)}
                                                className="text-pri font-semibold hover:underline text-left"
                                            >
                                                {e.collaborator_name}
                                            </button>
                                        </td>
                                        <td className="px-3 py-2.5 border-b border-line2">
                                            <Tag variante={FIT[e.fitness]?.variante ?? "pri"}>
                                                {FIT[e.fitness]?.rotulo ?? e.fitness}
                                            </Tag>
                                        </td>
                                        <td className="px-3 py-2.5 border-b border-line2">{dataCurta(e.exam_date)}</td>
                                        <td className="px-3 py-2.5 border-b border-line2">
                                            {e.next_exam_date ? (
                                                <span className={e.atrasado ? "text-bad font-semibold" : ""}>
                                                    {dataCurta(e.next_exam_date)}
                                                    {e.atrasado && (
                                                        <span className="text-[11px] font-normal">
                                                            {" "}({Math.abs(e.days_to_next ?? 0)}d em atraso)
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-dim">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 border-b border-line2 text-dim">
                                            {e.restriction_note || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-2.5 text-[11px] text-dim border-t border-line">
                        {exames.length} exame(s){filtrado && " encontrado(s) pela pesquisa"}
                    </div>
                </Cartao>
            )}
        </div>
    );
}