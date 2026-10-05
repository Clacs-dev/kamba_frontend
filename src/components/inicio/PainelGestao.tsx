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
    evaluations: {
        total: number;
        validated: number;
        in_progress: number;
        in_appeal?: number;
        below_threshold: number;
        avg_score?: number | null;
        by_classification?: Record<string, number>;
    };
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

// Um pulse de cultura tal como o devolve GET /surveys.
interface PulseApi {
    id: number;
    title: string;
    created_at: string;
}

// Os resultados agregados de um pulse, tal como os devolve
// GET /surveys/{id}/results.
interface ResultadosPulse {
    released: boolean;
    note: string;
    results: Record<string, number>;
    enps_score: number | null;
    enps_detractors: number;
    participation_rate: number | null;
    participation_count: number;
    universe: number;
}

// Limiares usados para transformar números em recomendações. A escala dos
// pulses é 1–5 e o eNPS vai de −100 a +100.
const DIMENSION_MIN = 3.0;
const ENPS_BENCHMARK = 30;
const PARTICIPATION_TARGET = 70;
const NOTA_MINIMA = 3.5;
const MAX_RECOMENDACOES = 3;

// Formata um número com vírgula decimal (convenção portuguesa).
const num = (n: number, casas = 1) => n.toFixed(casas).replace(".", ",");

// Uma recomendação com a sua prioridade:higher `peso` aparece primeiro.
interface Recomendacao {
    peso: number;
    texto: string;
}

// ---------- Recomendações de cultura, a partir das respostas do pulse ----------
function recomendacoesCultura(pulse: ResultadosPulse | null): string[] {
    if (!pulse || !pulse.released) {
        return ["Ainda não há um pulse de cultura com resultados liberados — são necessárias 5 respostas por pulse para proteger o anonimato."];
    }

    const recs: Recomendacao[] = [];

    // 1. As dimensões mais baixas do pulse. Quando alguma está abaixo do
    //    limiar é um problema a tratar; quando todas passam, o que fica é
    //    indicar onde investir a margem de melhoria — por isso a lista nunca
    //    fica vazia enquanto houver respostas.
    const ord = Object.entries(pulse.results).sort((a, b) => a[1] - b[1]);
    const fracas = ord.filter(([, media]) => media < DIMENSION_MIN);

    if (fracas.length > 0) {
        const [nome, media] = fracas[0];
        recs.push({
            peso: 10 - media,
            texto: `“${nome}” é a dimensão mais fraca do pulse (${num(media)}/5, abaixo de ${num(DIMENSION_MIN)}) — abrir plano de melhoria até ao próximo ciclo.`,
        });
        if (fracas.length > 1) {
            const restantes = fracas
                .slice(1, 3)
                .map(([n, m]) => `${n} (${num(m)})`)
                .join(", ");
            recs.push({
                peso: 8 - media,
                texto: `Também abaixo de ${num(DIMENSION_MIN)}/5: ${restantes} — avaliar se a causa é comum e tratá-la em conjunto.`,
            });
        }
    } else if (ord.length > 0) {
        // Nenhuma abaixo do limiar: recommends-se as duas mais baixas.
        const [nome, media] = ord[0];
        const seguintes = ord.slice(1, 2).map(([n, m]) => ` e ${n} (${num(m)})`).join("");
        recs.push({
            peso: 6,
            texto: `Nenhuma dimensão abaixo de ${num(DIMENSION_MIN)}/5; as mais baixas do pulse são ${nome} (${num(media)}/5)${seguintes} — é aí que há margem de melhoria.`,
        });
    }

    // 2. eNPS — a pergunta de recomendação.
    const enps = pulse.enps_score;
    if (enps !== null && enps < ENPS_BENCHMARK) {
        recs.push(
            enps < 0
                ? {
                    peso: 8,
                    texto: `eNPS negativo (${enps}): há mais detratores que promotores — agir sobre as causas apontadas nas respostas.`,
                }
                : {
                    peso: 5,
                    texto: `eNPS de ${enps}, abaixo do referencial de ${ENPS_BENCHMARK} — ${pulse.enps_detractors} detrator(es) a recuperar.`,
                }
        );
    }

    // 3. Participação — uma leitura com pouca resposta não representa o clima.
    const taxa = pulse.participation_rate;
    if (taxa !== null && taxa < PARTICIPATION_TARGET) {
        recs.push({
            peso: 4,
            texto: `Apenas ${num(taxa)}% do universo respondeu (${pulse.participation_count} de ${pulse.universe}) — a leitura do clima é parcial.`,
        });
    }

    // 4. Se o pulse não tiver a pergunta de recomendação medida, dizê-lo evita
    //    que se leia a ausência de um alerta como um bom sinal.
    if (enps === null && ord.length > 0) {
        recs.push({
            peso: 3,
            texto: "O pulse não mediu a pergunta de recomendação, por isso não há eNPS para interpretar.",
        });
    }

    // Nada a assinalar: recomendar manter o que está a funcionar.
    if (recs.length === 0) {
        recs.push({
            peso: 1,
            texto: `Nenhuma dimensão abaixo de ${num(DIMENSION_MIN)}/5 — manter o pulse trimestral como leitura regular do clima.`,
        });
    }

    return recs
        .sort((a, b) => b.peso - a.peso)
        .slice(0, MAX_RECOMENDACOES)
        .map((r) => r.texto);
}

// ---------- Recomendações de desempenho, a partir dos resultados das avaliações ----------
function recomendacoesDesempenho(ev: Resumo["evaluations"]): string[] {
    const emDisputa = ev.in_appeal ?? 0;
    const emCurso = Math.max(ev.in_progress - emDisputa, 0);
    const media = ev.avg_score;

    const recs: Recomendacao[] = [];

    // 1. Recursos pendentes na Comissão — bloqueiam o fecho do ciclo.
    if (emDisputa > 0) {
        recs.push({
            peso: 9,
            texto: `${emDisputa} avaliação(ões) com recurso pendente na Comissão — agendar a sessão de decisão.`,
        });
    }

    // 2. Desempenhos validados abaixo do limiar → plano de recuperação.
    if (ev.below_threshold > 0) {
        recs.push({
            peso: 8,
            texto: `${ev.below_threshold} colaborador(es) validado(s) com nota abaixo de ${num(NOTA_MINIMA)} — plano de recuperação com reavaliação intercalar.`,
        });
    }

    // 3. Média do ciclo abaixo do limiar.
    if (media !== null && media !== undefined && media < NOTA_MINIMA) {
        recs.push({
            peso: 7,
            texto: `Média de desempenho validada em ${num(media, 2)}/5, abaixo de ${num(NOTA_MINIMA)} — reforçar a formação em gestão das chefias com equipas abaixo do esperado.`,
        });
    }

    // 4. O que ainda falta fechar.
    if (emCurso > 0) {
        recs.push({
            peso: 5,
            texto: `${emCurso} avaliação(ões) ainda em curso — completar o fecho do ciclo antes de iniciar o período seguinte.`,
        });
    }

    if (recs.length === 0) {
        recs.push(
            ev.total > 0
                ? {
                    peso: 1,
                    texto: media !== null && media !== undefined
                        ? `As ${ev.total} avaliações do ciclo estão validadas, com média de ${num(media, 2)}/5 e sem resultados abaixo do limiar — homologar os resultados.`
                        : `As ${ev.total} avaliações do ciclo estão validadas e sem resultados abaixo do limiar — homologar os resultados.`,
                }
                : { peso: 1, texto: "Ainda não há avaliações neste ciclo." }
        );
    }

    return recs
        .sort((a, b) => b.peso - a.peso)
        .slice(0, MAX_RECOMENDACOES)
        .map((r) => r.texto);
}

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

// Lista numerada de recomendações, calculada dos dados reais do ciclo.
function CartaoRecomendacoes({ titulo, itens, rodape, onClick }: {
    titulo: string;
    itens: string[];
    rodape: string;
    onClick?: () => void;
}) {
    return (
        <Cartao onClick={onClick}>
            <h3 className="text-[14.5px] mb-2.5">{titulo}</h3>
            {itens.map((r, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-line2 last:border-0">
                    <span className="shrink-0 rounded-full px-2 py-[3px] text-[10.5px] font-semibold bg-pri-bg text-pri-dark">
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
    const [pulseResultados, setPulseResultados] = useState<ResultadosPulse | null>(null);
    const [tituloPulse, setTituloPulse] = useState("");
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

        // Recomendações de cultura: o pulse mais recente cujos resultados já
        // foram liberados. `GET /surveys` vem do mais novo para o mais antigo,
        // por isso percorre-se a lista até encontrar um com resultados.
        api.get("/surveys")
            .then(async (r) => {
                const lista: PulseApi[] = Array.isArray(r.data) ? r.data : [];
                for (const pulse of lista) {
                    try {
                        const res = await api.get(`/surveys/${pulse.id}/results`);
                        if (res.data?.released) {
                            setPulseResultados(res.data);
                            setTituloPulse(pulse.title);
                            return;
                        }
                    } catch {
                        // Pulse sem resultados released: segue para o anterior.
                    }
                }
                setPulseResultados(null);
                setTituloPulse(lista[0]?.title || "");
            })
            .catch(() => {
                setPulseResultados(null);
                setTituloPulse("");
            });
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

    // Recomendações calculadas: a de cultura sai das respostas do pulse, a de
// desempenho sai dos resultados das avaliações.
const recCultura = recomendacoesCultura(pulseResultados);
const recDesempenho = recomendacoesDesempenho(resumo.evaluations);

const cicloCultura = tituloPulse ? ` — ${tituloPulse}` : "";

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
                    valor={resumo.evaluations.avg_score !== null && resumo.evaluations.avg_score !== undefined
                        ? num(resumo.evaluations.avg_score, 2)
                        : "—"}
                    label="Média de desempenho homologada"
                    indisponivel={resumo.evaluations.avg_score === null || resumo.evaluations.avg_score === undefined}
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

            {/* Recomendações — cultura a partir das respostas do pulse, desempenho a
                partir dos resultados das avaliações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <CartaoRecomendacoes
                    titulo={`Recomendações — ciclo de cultura${cicloCultura}`}
                    itens={recCultura}
                    rodape="abrir módulo de cultura →"
                    onClick={() => irPara("cultura")}
                />
                <CartaoRecomendacoes
                    titulo="Recomendações — ciclo de desempenho"
                    itens={recDesempenho}
                    rodape="abrir relatórios →"
                    onClick={() => irPara("relatorios")}
                />
            </div>
        </div>
    );
}