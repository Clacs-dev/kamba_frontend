import { useEffect, useState } from "react";
import Cartao from "../Cartao";
import Notice from "../ui/Notice";
import Tag from "../ui/Tag";
import api from "../../lib/api";
import type { PedidoAusencia } from "./TabelaAusencias";

// ---------------------------------------------------------------------------
// Mapa de férias (art. 209.º da LGT).
//
// O Capital Humano recebe um único mapa consolidado de toda a empresa; cada
// director recebe apenas o mapa da sua Direcção. O direito de cada colaborador
// é lido da data de admissão (22 dias úteis por ano de férias) pelo backend.
// ---------------------------------------------------------------------------

interface LinhaMapa {
    collaborator_id: number;
    full_name: string;
    department: string | null;
    admission_date: string | null;
    direito: number;
    gozados: number;
    marcados: number;
    em_curso: number;
    disponiveis: number;
    pode_pedir: boolean;
    fracao: number;
    ano_inicio: string;
    ano_fim: string;
    ferias: PedidoAusencia[];
    ausencias: PedidoAusencia[];
}

interface Mapa {
    ano: number;
    scope: "empresa" | "departamento";
    direccao: string | null;
    direito_anual: number;
    aviso: string | null;
    departamentos: [string, number][];
    colaboradores: LinhaMapa[];
    totais: {
        colaboradores: number;
        ferias: number;
        ausencias: number;
        sem_direito: number;
    };
}

interface Props {
    ano?: number;
    /** Destaca a Direcção quando false (Capital Humansnão é que o mapa é consolidado). */
    mostrarDireccao?: boolean;
    aoAverbar?: (id: number) => void;
}

function dataCurta(iso: string) {
    const [a, m, d] = iso.split("-");
    return `${d}.${m}.${a}`;
}

function rotuloAusencia(p: PedidoAusencia) {
    if (p.type === "maternidade") return "Maternidade";
    if (p.type === "doenca") return "Doença";
    if (p.type === "falta") return "Falta";
    return "Férias";
}

export default function MapaFerias({ ano, mostrarDireccao = true, aoAverbar }: Props) {
    const anoCorrente = new Date().getFullYear();
    const [anoSel, setAnoSel] = useState(ano ?? anoCorrente);
    const [mapa, setMapa] = useState<Mapa | null>(null);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");

    const carregar = (y: number) => {
        setACarregar(true);
        setErro("");
        api.get("/leave/map", { params: { ano: y } })
            .then((r) => {
                const d = r.data;
                // O servidor pode responder com um formato inesperado (ex.: versao
                // antiga do endpoint). Validamos para nunca deixar a pagina partir.
                if (!d || !Array.isArray(d.colaboradores)) {
                    throw new Error("Resposta do mapa em formato inesperado.");
                }
                setMapa({
                    ano: d.ano ?? y,
                    scope: d.scope === "departamento" ? "departamento" : "empresa",
                    direccao: d.direccao ?? null,
                    direito_anual: d.direito_anual ?? 22,
                    aviso: d.aviso ?? null,
                    departamentos: Array.isArray(d.departamentos) ? d.departamentos : [],
                    colaboradores: d.colaboradores.map((c: any) => ({
                        ...c,
                        departamento: c.department ?? null,
                        admissao: c.admission_date ?? null,
                        direito: Number(c.direito ?? 0),
                        gozados: Number(c.gozados ?? 0),
                        marcados: Number(c.marcados ?? 0),
                        em_curso: Number(c.em_curso ?? 0),
                        disponiveis: Number(c.disponiveis ?? 0),
                        pode_pedir: Boolean(c.pode_pedir),
                        ferias: Array.isArray(c.ferias) ? c.ferias : [],
                        ausencias: Array.isArray(c.ausencias) ? c.ausencias : [],
                    })),
                    totais: {
                        colaboradores: d.totais?.colaboradores ?? d.colaboradores.length,
                        ferias: d.totais?.ferias ?? 0,
                        ausencias: d.totais?.ausencias ?? 0,
                        sem_direito: d.totais?.sem_direito ?? 0,
                    },
                });
            })
            .catch(() => setErro("Não foi possível carregar o mapa de férias."))
            .finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(anoSel); }, [anoSel]);

    const mostrarAno = ano ?? anoSel;

    if (aCarregar) return <Cartao><p className="text-dim text-sm text-center py-4">A carregar o mapa de férias...</p></Cartao>;
    if (erro) return <Notice variante="alert">{erro}</Notice>;
    if (!mapa) return null;

    const VARIANTE_ESTADO: Record<string, "ok" | "warn" | "bad" | "info"> = {
        pendente_dir: "warn", pendente_ch: "info", aprovada: "ok", justificada: "ok", recusada: "bad",
    };
    const ESTADO: Record<string, string> = {
        pendente_dir: "aguarda director", pendente_ch: "aguarda Capital Humano",
        aprovada: "aprovada", justificada: "justificada", recusada: "recusada",
    };

    const totaisFerias = mapa.colaboradores.reduce((s, c) => s + c.ferias.length, 0);
    const totaisAusencias = mapa.colaboradores.reduce((s, c) => s + c.ausencias.length, 0);

    return (
        <div>
            {/* Resumo + selector de ano */}
            <Cartao className="mb-3">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                        <h3 className="text-[14.5px]">
                            Mapa de férias {mapa.ano}
                        </h3>
                        <p className="text-[11.5px] text-dim mt-0.5">
                            {mapa.scope === "empresa"
                                ? "Mapa consolidado de toda a empresa."
                                : `Mapa da sua Direcção: ${mapa.direccao || "por definir"}.`}
                            {" "}Cada colaborador tem {mapa.direito_anual} dias úteis por ano de férias.
                        </p>
                    </div>
                    <select
                        value={mostrarAno}
                        onChange={(e) => setAnoSel(Number(e.target.value))}
                        className="bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                    >
                        {[anoCorrente - 1, anoCorrente, anoCorrente + 1].map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div>
                        <div className="text-[19px] font-bold text-pri">{mapa.colaboradores.length}</div>
                        <div className="text-[10.5px] uppercase tracking-wide text-dim mt-0.5">Colaboradores</div>
                    </div>
                    <div>
                        <div className="text-[19px] font-bold text-pri">{totaisFerias}</div>
                        <div className="text-[10.5px] uppercase tracking-wide text-dim mt-0.5">Gozo de férias</div>
                    </div>
                    <div>
                        <div className="text-[19px] font-bold text-pri">{totaisAusencias}</div>
                        <div className="text-[10.5px] uppercase tracking-wide text-dim mt-0.5">Outras ausências</div>
                    </div>
                    <div>
                        <div className="text-[19px] font-bold text-pri">{mapa.totais.sem_direito}</div>
                        <div className="text-[10.5px] uppercase tracking-wide text-dim mt-0.5">Sem direito em {mapa.ano}</div>
                    </div>
                </div>
            </Cartao>

            {mapa.aviso && <Notice variante="alert" className="mb-3">{mapa.aviso}</Notice>}

            {/* Duas tabelas lado a lado: mapa de férias + mapa de ausências */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Tabela 1 — Mapa de férias */}
                <div>
                    <h3 className="text-[13.5px] mb-2 text-pri">Saldo de férias</h3>
                    <Cartao className="p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12.5px] min-w-[520px]">
                                <thead>
                                    <tr>
                                        <Th>Colaborador</Th>
                                        <Th className="text-center">Direito</Th>
                                        <Th className="text-center">Gozados</Th>
                                        <Th className="text-center">Marcados</Th>
                                        <Th className="text-center">Disponíveis</Th>
                                        <Th>Férias</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mapa.colaboradores.map((c) => (
                                        <tr key={c.collaborator_id} className="hover:bg-panel transition-colors">
                                            <td className="px-3 py-2.5 border-b border-line2">
                                                <b className="text-strong">{c.full_name}</b>
                                                {mostrarDireccao && mapa.scope === "empresa" && c.department && (
                                                    <div className="text-[10.8px] text-dim mt-0.5">{c.department}</div>
                                                )}
                                                {!c.admission_date && (
                                                    <div className="text-[10.8px] text-dim mt-0.5">Sem data de admissão</div>
                                                )}
                                            </td>
                                            <Td centro>
                                                <span className={c.pode_pedir ? "text-pri font-semibold" : "text-dim"}>
                                                    {c.direito}
                                                </span>
                                            </Td>
                                            <Td centro>{c.gozados}</Td>
                                            <Td centro>{c.marcados}</Td>
                                            <Td centro>
                                                <b className="text-pri">{c.disponiveis}</b>
                                            </Td>
                                            <td className="px-3 py-2.5 border-b border-line2">
                                                {c.ferias.length === 0 ? (
                                                    <span className="text-dim">—</span>
                                                ) : (
                                                    <div className="space-y-0.5">
                                                        {c.ferias.map((p) => (
                                                            <div key={p.id} className="text-[11.8px] flex items-center gap-1.5 whitespace-nowrap">
                                                                <span className="text-ink">{dataCurta(p.start_date)}</span>
                                                                {p.start_date !== p.end_date && (
                                                                    <span className="text-dim">→ {dataCurta(p.end_date)}</span>
                                                                )}
                                                                <span className="text-dim">({p.days}d)</span>
                                                                <Tag variante={VARIANTE_ESTADO[p.status]}>{ESTADO[p.status]}</Tag>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {mapa.colaboradores.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-3 py-4 text-center text-dim">
                                                Sem colaboradores no âmbito.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Cartao>
                </div>

                {/* Tabela 2 — Mapa de ausências (faltas, maternidade, doença) */}
                <div>
                    <h3 className="text-[13.5px] mb-2 text-pri">Outras ausências</h3>
                    <Cartao className="p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12.5px] min-w-[520px]">
                                <thead>
                                    <tr>
                                        <Th>Colaborador</Th>
                                        <Th>Tipo</Th>
                                        <Th>Período</Th>
                                        <Th className="text-center">Dias</Th>
                                        <Th>Estado</Th>
                                        {aoAverbar && <Th />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {mapa.colaboradores.flatMap((c) =>
                                        c.ausencias.map((p) => (
                                            <tr key={p.id} className="hover:bg-panel transition-colors">
                                                <td className="px-3 py-2.5 border-b border-line2">
                                                    <b className="text-strong">{c.full_name}</b>
                                                </td>
                                                <td className="px-3 py-2.5 border-b border-line2 text-ink">
                                                    {rotuloAusencia(p)}
                                                </td>
                                                <td className="px-3 py-2.5 border-b border-line2 text-ink whitespace-nowrap">
                                                    {dataCurta(p.start_date)}{p.start_date !== p.end_date && ` → ${dataCurta(p.end_date)}`}
                                                </td>
                                                <Td centro>{p.days}</Td>
                                                <td className="px-3 py-2.5 border-b border-line2">
                                                    <Tag variante={VARIANTE_ESTADO[p.status]}>{ESTADO[p.status]}</Tag>
                                                </td>
                                                {aoAverbar && (
                                                    <td className="px-3 py-2.5 border-b border-line2 text-right whitespace-nowrap">
                                                        {p.status === "aprovada" && !p.averbado && (
                                                            <button
                                                                onClick={() => aoAverbar(p.id)}
                                                                className="text-[11.5px] text-pri font-semibold hover:underline"
                                                            >
                                                                Averbar
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                    {totaisAusencias === 0 && (
                                        <tr>
                                            <td colSpan={aoAverbar ? 6 : 5} className="px-3 py-4 text-center text-dim">
                                                Sem ausências registadas em {mapa.ano}.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Cartao>
                </div>
            </div>
        </div>
    );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
    return (
        <th className={`text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line ${className}`}>
            {children}
        </th>
    );
}

function Td({ children, centro }: { children?: React.ReactNode; centro?: boolean }) {
    return (
        <td className={`px-3 py-2.5 border-b border-line2 text-ink ${centro ? "text-center" : ""}`}>
            {children}
        </td>
    );
}