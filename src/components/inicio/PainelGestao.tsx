import { useEffect, useState, type ReactNode } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";

interface Resumo {
    collaborators: {
        total: number;
        active: number;
        inactive: number;
        by_role?: Record<string, number>;
        by_gender?: Record<string, number>;
        gender_por_definir?: number;
    };
    evaluations: { total: number; validated: number; in_progress: number; in_appeal?: number; below_threshold: number };
    disciplinary: { total: number; in_progress: number; archived: number };
    training: { plans: number; actions: number };
    health: { exams: number; overdue: number };
}

// Cada ciclo de cultura com respostas vira uma coluna na evolução.
interface EvolucaoCultura {
    cycles: string[];
}

// Um pedido de ausência tal como o devolve GET /leave/requests.
interface PedidoAusencia {
    type?: string;
}

// Um órgão social tal como o devolve GET /organs.
interface OrganoApi {
    organ: string;
    members: { user_id: number }[];
}

// Os quatro órgãos sociais, pela ordem em que aparecem no módulo.
const ORGAOS = [
    { organ: "conselho_administracao", sigla: "CA" },
    { organ: "comissao_executiva", sigla: "CE" },
    { organ: "conselho_fiscal", sigla: "CF" },
    { organ: "mesa_assembleia", sigla: "MA" },
];

// Cartão de KPI ao estilo do protótipo, com "ver detalhe →" clicável.
// Todo o texto do cartão usa a mesma cor azul (pri) — a hierarquia vem do
// tamanho e do peso, não da cor. `extra` é uma linha opcional ACIMA do
// "detalhe" (ex.: a quebra por sexo no cartão dos colaboradores ativos).
function KpiCard({ valor, label, detalhe, extra, onClick, indisponivel }: {
    valor: string | number;
    label: string;
    detalhe?: string;
    extra?: ReactNode;
    onClick?: () => void;
    indisponivel?: boolean;
}) {
    return (
        <Cartao onClick={onClick}>
            <div className="font-serif font-semibold text-[26px] text-pri-dark">
                {valor}
            </div>
            <div className="text-[10.5px] text-pri uppercase tracking-wide mt-0.5 leading-tight">{label}</div>
            {extra && <div className="text-[11px] text-pri mt-1.5 leading-tight">{extra}</div>}
            <div className="text-[10.5px] text-pri mt-1.5">{detalhe || (indisponivel ? "em breve" : "ver detalhe →")}</div>
        </Cartao>
    );
}

// Lista numerada de recomendações, como no demo.
function CartaoRecomendacoes({ titulo, itens, tom, rodape, onClick }: {
    titulo: string;
    itens: string[];
    tom: "pri" | "gold";
    rodape: string;
    onClick?: () => void;
}) {
    return (
        <Cartao onClick={onClick}>
            <h3 className="text-[14.5px] mb-2.5">{titulo}</h3>
            {itens.map((r, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-line2 last:border-0">
                    <span className={`shrink-0 rounded-full px-2 py-[3px] text-[10.5px] font-semibold ${
                        tom === "pri" ? "bg-pri-bg text-pri-dark" : "bg-warn-bg text-gold"}`}>
                        {i + 1}
                    </span>
                    <span className="text-[12.6px] leading-snug">{r}</span>
                </div>
            ))}
            <div className="text-[10.5px] text-pri mt-2">{rodape}</div>
        </Cartao>
    );
}

export default function PainelGestao({ irPara }: { irPara: (seccao: string) => void }) {
    const [resumo, setResumo] = useState<Resumo | null>(null);
    const [cultura, setCultura] = useState<EvolucaoCultura | null>(null);
    const [ausencias, setAusencias] = useState<PedidoAusencia[]>([]);
    const [organs, setOrgaos] = useState<OrganoApi[]>([]);
    const [aCarregar, setACarregar] = useState(true);

    useEffect(() => {
        api.get("/dashboard/summary")
            .then((r) => setResumo(r.data))
            .catch(() => setResumo(null))
            .finally(() => setACarregar(false));

        // Cultura: um ciclo por pulse com respostas.
        api.get("/surveys/culture-report/evolution")
            .then((r) => setCultura(r.data))
            .catch(() => setCultura(null));

        api.get("/leave/requests")
            .then((r) => setAusencias(Array.isArray(r.data) ? r.data : []))
            .catch(() => setAusencias([]));

        api.get("/organs")
            .then((r) => setOrgaos(Array.isArray(r.data) ? r.data : []))
            .catch(() => setOrgaos([]));
    }, []);

    if (aCarregar) return <p className="text-dim text-sm">A carregar métricas...</p>;
    if (!resumo) return <p className="text-bad text-sm">Não foi possível carregar as métricas.</p>;

    const porGenero = resumo.collaborators.by_gender ?? {};
    const homens = porGenero.masculino ?? 0;
    const mulheres = porGenero.feminino ?? 0;
    const semSexo = resumo.collaborators.gender_por_definir ?? 0;

    // Quebra por sexo, mostrada dentro do cartão dos colaboradores ativos.
    const quebraGenero =
        homens + mulheres > 0 ? (
            <span>
                <span className="font-semibold">{mulheres}</span> mulheres ·{" "}
                <span className="font-semibold">{homens}</span> homens
                {semSexo > 0 && (
                    <span> · {semSexo} por definir</span>
                )}
            </span>
        ) : (
            <span className="text-pri">Sexo por definir nas fichas</span>
        );

    // Contagens de ausências por tipo (o backend ainda não as agregava).
    const nAusencias = (tipo: string) => ausencias.filter((p) => p.type === tipo).length;

    // Órgãos sociais: total de membros por órgão e total geral (pessoas
    // distintas — alguém pode estar em mais de um órgão).
    const totaisOrgaos = ORGAOS.map((o) => {
        const membros = organs.find((x) => x.organ === o.organ)?.members ?? [];
        return { sigla: o.sigla, total: membros.length };
    });
    const totalOrgaos = new Set(
        organs.flatMap((o) => o.members.map((m) => m.user_id))
    ).size;
    const orgaosComMembros = totaisOrgaos.filter((o) => o.total > 0).length;

    const quebraOrgaos =
        totalOrgaos > 0 ? (
            <span>
                {totaisOrgaos.map((o, i) => (
                    <span key={o.sigla}>
                        {i > 0 && " · "}
                        <span className="font-semibold">{o.total}</span> {o.sigla}
                    </span>
                ))}
            </span>
) : (
            <span className="text-pri">Nenhum membro atribuido</span>
        );

    // Avaliações: em curso (total a Liquidar) vs. em disputa (recurso na
    // comissão). A disputa é um subconjunto das em curso, por isso o total do
    // cartão é a soma das duas.
    const emDisputa = resumo.evaluations.in_appeal ?? 0;
    const emCurso = Math.max(resumo.evaluations.in_progress - emDisputa, 0);

    const estadoAvaliacoes =
        resumo.evaluations.in_progress === 0 ? (
            <span className="text-pri">Sem avaliações abertas</span>
        ) : (
            <span>
                <span className="font-semibold">{emCurso}</span> em curso ·{" "}
                <span className="font-semibold">{emDisputa}</span> em disputa
            </span>
        );

    const pulses = cultura?.cycles?.length ?? 0;

    const ano = new Date().getFullYear();

    // Recomendações — a lógica de cálculo entra depois; por agora a estrutura
    // fica igual à do demo, com as listas por definir.
    const recCultura = [
        "Rever as práticas de reconhecimento归结das na última edição.",
        "Reforçar a comunicação entre direcções nas dimensões mais fracas.",
        "Manter o pulse trimestral como leitura regular do clima.",
    ];
    const recDesempenho = [
        "Estabelecer plano de recuperação com reavaliação intercalar para os desempenhos insuficientes.",
        "Reforçar a formação em gestão para as chefias com equipas abaixo do esperado.",
        "Homologar os resultados do ciclo antes de iniciar o período de avaliação seguinte.",
    ];

    return (
        <div>
            {/* Linha 1 — colaboradores, órgãos sociais, ciclos, ciclo corrente e disciplina */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-3.5">
                <KpiCard
                    valor={resumo.collaborators.active}
                    label="Colaboradores ativos"
                    extra={quebraGenero}
                    detalhe="ver detalhe →"
                    onClick={() => irPara("colaboradores")}
                />
                <KpiCard
                    valor={totalOrgaos}
                    label="Órgãos sociais (membros)"
                    extra={quebraOrgaos}
                    detalhe={`abrir órgãos → ${orgaosComMembros}/4 com membros`}
                    onClick={() => irPara("orgaos-sociais")}
                />
                <KpiCard
                    valor="—"
                    label="Ciclos de avaliação concluídos"
                    indisponivel
                    onClick={() => irPara("historico")}
                />
                <KpiCard
                    valor={resumo.evaluations.in_progress}
                    label="Avaliações em curso"
                    extra={estadoAvaliacoes}
                    onClick={() => irPara("avaliacoes")}
                />
                <KpiCard
                    valor={resumo.disciplinary.in_progress}
                    label="Processos disciplinares em curso"
                    detalhe="abrir processos →"
                    onClick={() => irPara("disciplina")}
                />
            </div>

            {/* Linha 2 — cultura e desempenho */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-3.5">
                <KpiCard
                    valor={pulses || "—"}
                    label="Avaliações de cultura realizadas (pulses)"
                    indisponivel={!pulses}
                    onClick={() => irPara("cultura")}
                />
                <KpiCard
                    valor="—"
                    label="eNPS · último ciclo de cultura"
                    indisponivel
                    onClick={() => irPara("cultura")}
                />
                <KpiCard
                    valor="—"
                    label="Participação na cultura"
                    indisponivel
                    onClick={() => irPara("cultura")}
                />
                <KpiCard
                    valor="—"
                    label="Média de desempenho homologada"
                    indisponivel
                    onClick={() => irPara("historico")}
                />
            </div>

            {/* Linha 3 — ausências */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-3.5">
                <KpiCard
                    valor="—"
                    label={`Mapa de férias ${ano}`}
                    indisponivel
                    onClick={() => irPara("ausencias")}
                />
                <KpiCard
                    valor={nAusencias("ferias")}
                    label="Pedidos de férias no sistema"
                    onClick={() => irPara("ausencias")}
                />
                <KpiCard
                    valor={nAusencias("falta")}
                    label="Faltas justificadas registadas"
                    onClick={() => irPara("ausencias")}
                />
                <KpiCard
                    valor={nAusencias("maternidade")}
                    label="Licenças de maternidade"
                    onClick={() => irPara("ausencias")}
                />
            </div>

            {/* Recomendações do último ciclo — cultura e desempenho */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <CartaoRecomendacoes
                    titulo="Recomendações — último ciclo de cultura"
                    itens={recCultura}
                    tom="pri"
                    rodape="abrir módulo de cultura →"
                    onClick={() => irPara("cultura")}
                />
                <CartaoRecomendacoes
                    titulo="Recomendações — último ciclo de desempenho"
                    itens={recDesempenho}
                    tom="gold"
                    rodape="abrir relatórios →"
                    onClick={() => irPara("relatorios")}
                />
            </div>
        </div>
    );
}