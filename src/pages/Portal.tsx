import { useEffect, useState } from "react";
import DocumentosTab from "../components/portal/DocumentosTab";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import AcolhimentoTab from "../components/portal/AcolhimentoTab";
import SaudeTab from "../components/portal/SaudeTab";
import RemuneracaoTab from "../components/portal/RemuneracaoTab";
import PercursoTab from "../components/portal/PercursoTab";
import AvaliacaoTab from "../components/portal/AvaliacaoTab";
import DisciplinaTab from "../components/portal/DisciplinaTab";
import FormacaoTab from "../components/portal/FormacaoTab";
import PoliticasTab from "../components/portal/PoliticasTab";
import CorrecoesFicha from "../components/portal/CorrecoesFicha";
import Cartao from "../components/Cartao";
import Tabs from "../components/Tabs";
import Tag from "../components/ui/Tag";
import Spark from "../components/ui/Spark";

const TABS = [
    { chave: "ficha", label: "Ficha" },
    { chave: "acolhimento", label: "Boas-vindas & Assinaturas" },
    { chave: "percurso", label: "Percurso" },
    { chave: "documentos", label: "Documentos" },
    { chave: "avaliacao", label: "Minhas Avaliações" },
    { chave: "formacao", label: "Minha Formação" },
    { chave: "disciplina", label: "Disciplina & Notificações" },
    { chave: "saude", label: "Saúde Ocupacional" },
    { chave: "remuneracao", label: "Remuneração & Assiduidade" },
    { chave: "politicas", label: "Políticas" },
];

interface Perfil {
    employee_number?: string | null;
    admission_date?: string | null;
    contract_type?: string | null;
    job_category?: string | null;
    job_title?: string | null;
    department?: string | null;
    workplace?: string | null;
    work_schedule?: string | null;
    situation_tags?: string | null;
}

// Rótulo legível do tipo de vínculo.
function rotuloVinculo(v?: string | null): string | null | undefined {
    if (!v) return v;
    const mapa: Record<string, string> = {
        termo_incerto: "A termo incerto",
        termo_certo: "A termo certo",
        efetivo: "Por tempo indeterminado",
        estagio: "Estágio",
        prestacao_servicos: "Prestação de serviços",
    };
    return mapa[v] || v;
}

export default function Portal() {
    const { user } = useAuth();
    const [tab, setTab] = useState("ficha");
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [aCarregar, setACarregar] = useState(true);
    const [historico, setHistorico] = useState<{ cycle_name: string; final_score: number | null; classification: string | null }[]>([]);
    useEffect(() => {
        api.get("/me/profile")
            .then((resp) => setPerfil(resp.data))
            .catch(() => setPerfil(null))
            .finally(() => setACarregar(false));
        api.get("/evaluations/me/score-history")
            .then((resp) => setHistorico(resp.data))
            .catch(() => setHistorico([]));
    }, []);

    const iniciais = (user?.full_name || "").split(" ").map((p) => p[0]).slice(0, 2).join("");

    return (
        <div>
            <Cabecalho
                eyebrow="O seu dossier pessoal"
                titulo={`Portal do Colaborador — ${user?.full_name || ""}`}
                descricao="Do primeiro ao último dia: ficha, documentos, saúde e remuneração — tudo num só lugar."
            />

            <Tabs tabs={TABS} ativo={tab} aoSelecionar={setTab} />

            {tab === "ficha" && (
                <>
                    {/* Cabeçalho do colaborador — foto, cargo, tags e nota em destaque */}
                    <Cartao className="mb-3">
                        <div className="flex gap-4 items-start">
                            <div className="w-14 h-14 rounded-full bg-pri-bg text-pri-dark flex items-center justify-center font-serif text-xl font-semibold flex-shrink-0">
                                {iniciais}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="m-0 text-[17px] text-strong">{user?.full_name}</h3>
                                <div className="text-[11.5px] text-dim mt-0.5">
                                    {traduzPerfil(user?.role || "")}
                                    {perfil?.job_category && ` · ${perfil.job_category}`}
                                    {perfil?.department && ` · ${perfil.department}`}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {(perfil?.situation_tags || "").split(",").map((t) => t.trim()).filter(Boolean).map((t, i) => (
                                        <span key={i} className="text-[10.5px] bg-warn-bg text-warn rounded-full px-2 py-0.5 font-medium">{t}</span>
                                    ))}
                                    <Tag variante="ok">Ativo</Tag>
                                </div>
                            </div>
                            {historico.length > 0 && historico[historico.length - 1]?.final_score != null && (
                                <div className="text-right flex-shrink-0">
                                    <div className="text-[28px] font-serif font-semibold text-pri-dark leading-none">
                                        {historico[historico.length - 1].final_score}
                                    </div>
                                    <div className="text-[10.5px] text-dim mt-1">
                                        avaliação {historico[historico.length - 1].cycle_name}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Cartao>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {/* Identificação e vínculo */}
                        <Cartao>
                            <h3 className="text-[14.5px] mb-2">Identificação e vínculo</h3>
                            {aCarregar ? (
                                <p className="text-dim text-sm">A carregar ficha...</p>
                            ) : (
                                <table className="w-full text-[12.8px]">
                                    <tbody>
                                        <LinhaFicha rotulo="N.º de colaborador" valor={perfil?.employee_number} />
                                        <LinhaFicha rotulo="Admissão" valor={perfil?.admission_date} />
                                        <LinhaFicha rotulo="Vínculo" valor={rotuloVinculo(perfil?.contract_type)} />
                                        <LinhaFicha rotulo="Categoria" valor={perfil?.job_category} />
                                        <LinhaFicha rotulo="Cargo" valor={perfil?.job_title} />
                                        <LinhaFicha rotulo="Direção" valor={perfil?.department} />
                                        <LinhaFicha rotulo="Horário" valor={perfil?.work_schedule} />
                                        <LinhaFicha rotulo="Local" valor={perfil?.workplace} />
                                    </tbody>
                                </table>
                            )}
                        </Cartao>

                        {/* Evolução do desempenho — gráfico + tabela de ciclos */}
                        <Cartao>
                            <h3 className="text-[14.5px] mb-3">Evolução do desempenho</h3>
                            {historico.length === 0 ? (
                                <p className="text-dim text-sm">
                                    Ainda não há avaliações validadas. À medida que concluir ciclos, a evolução aparece aqui.
                                </p>
                            ) : (
                                <>
                                    <Spark valores={historico.map((h) => h.final_score)} />
                                    <table className="w-full text-[12.5px] mt-3">
                                        <thead>
                                            <tr className="text-dim text-[10px] uppercase tracking-wide">
                                                <td className="py-1.5 text-left">Ciclo</td>
                                                <td className="py-1.5 text-left">Nota</td>
                                                <td className="py-1.5 text-left">Nível</td>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historico.map((h, i) => (
                                                <tr key={i} className="border-t border-line">
                                                    <td className="py-2 text-ink">{h.cycle_name}</td>
                                                    <td className="py-2"><b className="text-pri-dark">{h.final_score ?? "—"}</b></td>
                                                    <td className="py-2">
                                                        {h.classification ? <Tag variante="ok">{h.classification}</Tag> : <span className="text-dim">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}
                        </Cartao>
                    </div>

                    <div className="mt-3">
                        <CorrecoesFicha />
                    </div>
                </>
            )}
            {tab === "acolhimento" && <AcolhimentoTab />}
            {tab === "percurso" && <PercursoTab />}
            {tab === "documentos" && <DocumentosTab />}
            {tab === "avaliacao" && <AvaliacaoTab />}
            {tab === "formacao" && <FormacaoTab />}
            {tab === "disciplina" && <DisciplinaTab />}
            {tab === "saude" && <SaudeTab />}
            {tab === "remuneracao" && <RemuneracaoTab />}
            {tab === "politicas" && <PoliticasTab />}
        </div>
    );
}

function LinhaFicha({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
    return (
        <tr>
            <td className="py-1.5 pr-4 text-dim text-[11px] align-top whitespace-nowrap">{rotulo}</td>
            <td className="py-1.5 text-strong">{valor || <span className="text-dim">—</span>}</td>
        </tr>
    );
}

function traduzPerfil(role: string): string {
    const mapa: Record<string, string> = {
        colaborador: "Colaborador",
        director: "Director",
        capital_humano: "Capital Humano",
        comissao: "Comissão de Avaliação",
        administracao: "Administração",
    };
    return mapa[role] || role;
}
