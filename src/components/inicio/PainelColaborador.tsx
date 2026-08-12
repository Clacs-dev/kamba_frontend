import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import Cartao from "../Cartao";
import FlowBar from "../FlowBar";
import Notice from "../ui/Notice";
import { Timeline, TimelineItem } from "../ui/Timeline";

const FASES = ["Autoavaliação", "Avaliação do Director", "Concordância", "Comissão", "Fechada", "Validada"];
const FASE_INDICE: Record<string, number> = {
    autoavaliacao: 0, avaliacao_director: 1, concordancia: 2, comissao: 3, fechada: 4, validada: 5,
};

interface Avaliacao {
    id: number;
    collaborator_id: number;
    phase: string;
    final_score?: number | null;
    classification?: string | null;
}

interface ItemPercurso {
    date: string;
    source: string;
    title: string;
    detail?: string | null;
}

export default function PainelColaborador({ irPara }: { irPara: (seccao: string) => void }) {
    const { user } = useAuth();
    const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
    const [percurso, setPercurso] = useState<ItemPercurso[]>([]);
    const [aCarregar, setACarregar] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get("/evaluations").then((r) => setAvaliacoes(r.data)).catch(() => { }),
            api.get("/career/me/timeline").then((r) => setPercurso(r.data)).catch(() => { }),
        ]).finally(() => setACarregar(false));
    }, []);

    // A avaliação atual do colaborador (a mais recente que é dele).
    const minhaAvaliacao = avaliacoes.find((a) => a.collaborator_id === user?.id);

    // Há ação pendente se a avaliação está numa fase onde o colaborador tem de agir.
    const temAcaoPendente =
        minhaAvaliacao &&
        (minhaAvaliacao.phase === "autoavaliacao" || minhaAvaliacao.phase === "concordancia");

    const textoAcao =
        minhaAvaliacao?.phase === "autoavaliacao"
            ? "preencha a sua autoavaliação"
            : "a sua chefia já o avaliou: leia e decida (aceitar ou recorrer)";

    // Métricas do percurso (dados reais).
    const avaliacoesValidadas = percurso.filter((p) => p.source === "avaliacao").length;


    if (aCarregar) return <p className="text-dim text-sm">A carregar o seu painel...</p>;

    return (
        <div>
            {/* Alerta de ação pendente */}
            {temAcaoPendente && (
                <Notice>
                    <b>✎ Tem uma ação pendente na sua avaliação</b> — {textoAcao}.{" "}
                    <button onClick={() => irPara("avaliacoes")} className="text-pri font-semibold hover:underline">
                        Ir para a avaliação →
                    </button>
                </Notice>
            )}

            {/* Cartões de KPI do percurso (dados reais) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
                <KpiCard
                    valor={avaliacoesValidadas}
                    label="Avaliações no seu percurso"
                    onClick={() => irPara("portal")}
                />
                <KpiCard
                    valor={minhaAvaliacao?.final_score ?? "—"}
                    label="Nota da avaliação atual"
                    nota={minhaAvaliacao?.classification || undefined}
                />
                <KpiCard
                    valor={minhaAvaliacao ? FASES[FASE_INDICE[minhaAvaliacao.phase] ?? 0] : "—"}
                    label="Fase da avaliação atual"
                    pequeno
                />
                <KpiCard
                    valor={percurso.length}
                    label="Eventos no seu percurso"
                    onClick={() => irPara("portal")}
                />
            </div>

            {/* Fluxo da avaliação atual */}
            {minhaAvaliacao && (
                <Cartao className="mb-4">
                    <h3 className="text-[14.5px] mb-2">A sua avaliação {new Date().getFullYear()}</h3>
                    <FlowBar fases={FASES} atual={FASE_INDICE[minhaAvaliacao.phase] ?? 0} />
                </Cartao>
            )}

            {/* Percurso recente */}
            <Cartao>
                <h3 className="text-[14.5px] mb-3">O seu percurso recente</h3>
                {percurso.length === 0 ? (
                    <p className="text-dim text-sm">
                        Ainda não há eventos no seu percurso. À medida que for avaliado, formado e progredir, aparecerão aqui.
                    </p>
                ) : (
                    <Timeline>
                        {percurso.slice(0, 5).map((p, i) => (
                            <TimelineItem key={i} data={p.date} titulo={p.title} texto={p.detail} />
                        ))}
                    </Timeline>
                )}
            </Cartao>
        </div>
    );
}

function KpiCard({ valor, label, nota, onClick, pequeno }: {
    valor: string | number; label: string; nota?: string; onClick?: () => void; pequeno?: boolean;
}) {
    return (
        <Cartao onClick={onClick}>
            <div className={`font-serif font-semibold text-pri-dark ${pequeno ? "text-[15px]" : "text-[26px]"}`}>
                {valor}
            </div>
            <div className="text-[10.5px] text-dim uppercase tracking-wide mt-0.5">{label}</div>
            {nota && <div className="text-[10.5px] text-pri mt-1">{nota}</div>}
        </Cartao>
    );
}