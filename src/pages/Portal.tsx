import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useParams, useLocation } from "react-router-dom";
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
import Modal from "../components/Modal";
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

// Situação do vínculo e/ou cessação do contrato do colaborador.
const SITUACOES_VINCULO = [
    "Ativo",
    "Caducidade",
    "Revogação por mútuo acordo",
    "Despedimento por justa causa",
    "Despedimento coletivo / por causas objetivas",
    "Denúncia (rescisão) pelo trabalhador",
    "Rescisão pelo trabalhador com justa causa",
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
    photo_url?: string | null;
}

// Rótulo legível do tipo de vínculo.
function rotuloVinculo(v?: string | null): string | null | undefined {
    if (!v) return v;
    const mapa: Record<string, string> = {
        efetivo: "Por tempo indeterminado",
        termo_certo: "Tempo determinado",
        termo_incerto: "Tempo determinado",
        estagio: "Estágio",
        prestacao_servicos: "Prestação de serviços",
    };
    return mapa[v] || v;
}

export default function Portal() {
    const { user } = useAuth();
    const params = useParams();
    const location = useLocation();
    // Se a URL for /colaboradores/:id/portal, o CH está a ver OUTRO colaborador.
    const collaboratorId = params.id ? Number(params.id) : undefined;
    const verOutro = typeof collaboratorId === "number" && !Number.isNaN(collaboratorId);
    // O nome pode vir no state da navegação (ao clicar na linha).
    const nomeDoState = (location.state as { nome?: string } | null)?.nome;

    const baseProfile = verOutro ? `/collaborators/${collaboratorId}/profile` : "/me/profile";
    const baseHistorico = verOutro
        ? `/evaluations/collaborators/${collaboratorId}/score-history`
        : "/evaluations/me/score-history";
    const nomeMostrado = verOutro ? (nomeDoState || "Colaborador") : (user?.full_name || "");

    const [tab, setTab] = useState("ficha");
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [aCarregar, setACarregar] = useState(true);
    const [historico, setHistorico] = useState<{ cycle_name: string; final_score: number | null; classification: string | null }[]>([]);
    const [aGuardarSituacao, setAGuardarSituacao] = useState(false);

    const situacaoAtual = (perfil?.situation_tags || "").split(",").map((t) => t.trim()).find((t) => SITUACOES_VINCULO.includes(t)) || "";

    const guardarSituacao = async (valor: string) => {
        if (!verOutro || !collaboratorId) return;
        setAGuardarSituacao(true);
        try {
            const resp = await api.put(`/collaborators/${collaboratorId}/profile`, { situation_tags: valor });
            setPerfil(resp.data);
        } catch (err: any) {
            alert(err.response?.data?.detail || "Erro ao guardar a situação.");
        } finally {
            setAGuardarSituacao(false);
        }
    };
    useEffect(() => {
        setACarregar(true);
        api.get(baseProfile)
            .then((resp) => setPerfil(resp.data))
            .catch(() => setPerfil(null))
            .finally(() => setACarregar(false));
        api.get(baseHistorico)
            .then((resp) => setHistorico(resp.data))
            .catch(() => setHistorico([]));
    }, [collaboratorId]);

    const iniciais = (nomeMostrado || "").split(" ").map((p) => p[0]).slice(0, 2).join("");

    const [aCarregarFoto, setACarregarFoto] = useState(false);
    const [fotoModal, setFotoModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const aoEscolherFoto = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !verOutro) return;
        setACarregarFoto(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const resp = await api.post(`/collaborators/${collaboratorId}/photo`, fd);
            setPerfil(resp.data);
        } catch (err: any) {
            alert(err.response?.data?.detail || "Erro ao carregar a foto.");
        } finally {
            setACarregarFoto(false);
            e.target.value = "";
        }
    };
    const aoRemoverFoto = async () => {
        if (!verOutro) return;
        if (!window.confirm("Remover a foto deste colaborador?")) return;
        setACarregarFoto(true);
        try {
            const resp = await api.delete(`/collaborators/${collaboratorId}/photo`);
            setPerfil(resp.data);
        } catch (err: any) {
            alert(err.response?.data?.detail || "Erro ao remover a foto.");
        } finally {
            setACarregarFoto(false);
        }
    };

    // Quando o CH vê outro colaborador, mostra todas as abas com os dados desse colaborador.
    const tabsVisiveis = TABS;
    const tabAtiva = tab;

    return (
        <div>
            <Cabecalho
                eyebrow={verOutro ? "Portal do colaborador" : "O seu dossier pessoal"}
                titulo={`Portal do Colaborador — ${nomeMostrado}`}
                descricao="Do primeiro ao último dia: ficha, documentos, saúde e remuneração — tudo num só lugar."
                acao={verOutro ? (
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-wide text-dim">Situação</span>
                        <select
                            value={situacaoAtual || "Ativo"}
                            onChange={(e) => guardarSituacao(e.target.value)}
                            disabled={aGuardarSituacao}
                            className="text-[12.5px] bg-panel border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-pri disabled:opacity-50"
                            title="Situação / cessação do vínculo"
                        >
                            {SITUACOES_VINCULO.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                ) : undefined}
            />

            <Tabs tabs={tabsVisiveis} ativo={tabAtiva} aoSelecionar={setTab} />

            {tabAtiva === "ficha" && (
                <>
                    {/* Cabeçalho do colaborador — foto, cargo, tags e nota em destaque */}
                    <Cartao className="mb-3">
                        <div className="flex gap-4 items-start">
                            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => verOutro && setFotoModal(true)}
                                    disabled={!verOutro}
                                    title={verOutro ? "Gerir foto" : undefined}
                                    className={`w-24 h-24 rounded-full overflow-hidden bg-pri-bg text-pri-dark flex items-center justify-center font-serif text-3xl font-semibold ${verOutro ? "cursor-pointer hover:ring-2 hover:ring-pri/60 transition-shadow" : "cursor-default"}`}
                                >
                                    {perfil?.photo_url ? (
                                        <img src={perfil.photo_url} alt={nomeMostrado} className="w-full h-full object-cover" />
                                    ) : (
                                        iniciais
                                    )}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={aoEscolherFoto}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="m-0 text-[17px] text-strong">{nomeMostrado}</h3>
                                <div className="text-[11.5px] text-dim mt-0.5">
                                    {!verOutro && traduzPerfil(user?.role || "")}
                                    {perfil?.job_category && `${!verOutro ? " · " : ""}${perfil.job_category}`}
                                    {perfil?.department && ` · ${perfil.department}`}
                                </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {(perfil?.situation_tags || "").split(",").map((t) => t.trim()).filter(Boolean).filter((t) => !SITUACOES_VINCULO.includes(t)).map((t, i) => (
                                    <span key={i} className="text-[10.5px] bg-warn-bg text-warn rounded-full px-2 py-0.5 font-medium">{t}</span>
                                ))}
                                {situacaoAtual && <Tag variante="warn">{situacaoAtual}</Tag>}
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
                        <CorrecoesFicha colaboradorId={collaboratorId} />
                    </div>
                </>
            )}
            {tabAtiva === "acolhimento" && <AcolhimentoTab colaboradorId={collaboratorId} />}
            {tabAtiva === "percurso" && <PercursoTab colaboradorId={collaboratorId} />}
            {tabAtiva === "documentos" && <DocumentosTab colaboradorId={collaboratorId} />}
            {tabAtiva === "avaliacao" && <AvaliacaoTab colaboradorId={collaboratorId} />}
            {tabAtiva === "formacao" && <FormacaoTab colaboradorId={collaboratorId} />}
            {tabAtiva === "disciplina" && <DisciplinaTab colaboradorId={collaboratorId} />}
            {tabAtiva === "saude" && <SaudeTab colaboradorId={collaboratorId} />}
            {tabAtiva === "remuneracao" && <RemuneracaoTab colaboradorId={collaboratorId} />}
            {tabAtiva === "politicas" && <PoliticasTab colaboradorId={collaboratorId} />}

            {fotoModal && verOutro && (
                <Modal aberto aoFechar={() => setFotoModal(false)} titulo="Foto do colaborador" subtitulo={nomeMostrado}>
                    <div className="flex flex-col items-center gap-4">
                        {perfil?.photo_url ? (
                            <img
                                src={perfil.photo_url}
                                alt={nomeMostrado}
                                className="w-48 h-48 rounded-full object-cover border-4 border-line"
                            />
                        ) : (
                            <div className="w-48 h-48 rounded-full bg-pri-bg text-pri-dark flex items-center justify-center font-serif text-6xl font-semibold">
                                {iniciais}
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2.5 justify-center">
                            <button
                                type="button"
                                disabled={aCarregarFoto}
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40"
                            >
                                {aCarregarFoto ? "A carregar..." : perfil?.photo_url ? "Mudar foto" : "Adicionar foto"}
                            </button>
                            {perfil?.photo_url && (
                                <button
                                    type="button"
                                    disabled={aCarregarFoto}
                                    onClick={aoRemoverFoto}
                                    className="bg-bad text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:opacity-80 transition-opacity disabled:opacity-40"
                                >
                                    Remover foto
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setFotoModal(false)}
                                className="bg-paper border border-line rounded-lg px-4 py-2 text-[12.3px] font-semibold text-ink hover:border-pri hover:text-pri transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
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
        admin: "Admin",
    };
    return mapa[role] || role;
}
