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
import PoliticasTab from "../components/portal/PoliticasTab";
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
    { chave: "disciplina", label: "Disciplina & Notificações" },
    { chave: "saude", label: "Saúde Ocupacional" },
    { chave: "remuneracao", label: "Remuneração & Assiduidade" },
    { chave: "politicas", label: "Políticas" },
];

interface Perfil {
    employee_number?: string | null;
    admission_date?: string | null;
    contract_type?: string | null;
    category?: string | null;
    department?: string | null;
    work_location?: string | null;
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
        // Histórico de notas para a evolução (secção 2.1).
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
                    {/* Cartão de cabeçalho do colaborador */}
                    <Cartao className="mb-3">
                        <div className="flex gap-4 items-center">
                            <div className="w-14 h-14 rounded-full bg-pri-bg text-pri-dark flex items-center justify-center font-serif text-xl font-semibold flex-shrink-0">
                                {iniciais}
                            </div>
                            <div className="flex-1">
                                <h3 className="m-0">{user?.full_name}</h3>
                                <div className="text-[10.8px] text-dim">
                                    {traduzPerfil(user?.role || "")}
                                    {perfil?.department && ` · ${perfil.department}`}
                                </div>
                                <div className="mt-1.5">
                                    <Tag variante="ok">Ativo</Tag>
                                </div>
                            </div>
                        </div>
                    </Cartao>

                    {/* Identificação e vínculo */}
                    <Cartao>
                        <h3 className="text-[14.5px] mb-2">Identificação e vínculo</h3>
                        {aCarregar ? (
                            <p className="text-dim text-sm">A carregar ficha...</p>
                        ) : (
                            <table className="w-full text-[12.8px]">
                                <tbody>
                                    <LinhaFicha rotulo="Nome" valor={user?.full_name} />
                                    <LinhaFicha rotulo="Email" valor={user?.email} />
                                    <LinhaFicha rotulo="N.º de colaborador" valor={perfil?.employee_number} />
                                    <LinhaFicha rotulo="Admissão" valor={perfil?.admission_date} />
                                    <LinhaFicha rotulo="Vínculo" valor={perfil?.contract_type} />
                                    <LinhaFicha rotulo="Categoria" valor={perfil?.category} />
                                    <LinhaFicha rotulo="Direção" valor={perfil?.department} />
                                    <LinhaFicha rotulo="Local" valor={perfil?.work_location} />
                                </tbody>
                            </table>
                        )}
                    </Cartao>

                    {/* Evolução das notas (secção 2.1) */}
                    <Cartao className="mt-3">
                        <h3 className="text-[14.5px] mb-3">Evolução das avaliações</h3>
                        {historico.length === 0 ? (
                            <p className="text-dim text-sm">
                                Ainda não há avaliações validadas. À medida que concluir ciclos, a evolução aparece aqui.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                <Spark valores={historico.map((h) => h.final_score)} />
                                {historico.map((h, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="text-[12.8px] text-strong">{h.cycle_name}</span>
                                            <span className="text-[12.8px]">
                                                <b className="text-pri-dark">{h.final_score ?? "—"}</b>
                                                {h.classification && <span className="text-dim ml-1.5">{h.classification}</span>}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-line2 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-pri rounded-full transition-all"
                                                style={{ width: `${((h.final_score ?? 0) / 5) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Cartao>
                </>

            )}
            {tab === "acolhimento" && <AcolhimentoTab />}
            {tab === "percurso" && <PercursoTab />}
            {tab === "documentos" && <DocumentosTab />}
            {tab === "avaliacao" && <AvaliacaoTab />}
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