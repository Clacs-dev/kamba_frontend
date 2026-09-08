import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FaixaKpis from "../components/FaixaKpis";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import Modal from "../components/Modal";
import Tag from "../components/ui/Tag";
import Notice from "../components/ui/Notice";
import Botao from "../components/ui/Botao";
import AutocompleteIA from "../components/AutocompleteIA";

interface Colaborador {
    id: number;
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
    // Ficha profissional (linha enriquecida — estrutura KAMBA).
    job_title?: string | null;
    job_category?: string | null;
    department?: string | null;
    admission_year?: string | null;
    situation_tags?: string | null;
    score_years?: number[];
    scores?: Record<string, number | null>;
    has_disciplinary?: boolean;
    has_leave?: boolean;
    company_short?: string | null;
}

interface PedidoFicha {
    id: number;
    collaborator_id: number;
    message: string;
    status: string;
    created_at: string;
    resolved_at: string | null;
}

interface Turno {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
}

// Tag de situação da tabela (estática por agora — afina-se depois).
function situacao(c: Colaborador): { texto: string; variante: "bad" | "info" | "gold" | "ok" } {
    if (c.has_disciplinary) return { texto: "Disciplinar", variante: "bad" };
    if (c.has_leave) return { texto: "Licença", variante: "info" };
    if (c.situation_tags && c.situation_tags.trim()) {
        return { texto: c.situation_tags.split(",")[0].trim().slice(0, 26), variante: "gold" };
    }
    return { texto: "Regular", variante: "ok" };
}

const DIRECOES = [
    { sigla: "DAF", nome: "DAF — Contabilidade e Finanças" },
    { sigla: "DCM", nome: "DCM — Comercial" },
    { sigla: "DOP", nome: "DOP — Operações" },
    { sigla: "DTI", nome: "DTI — Tecnologias de Informação" },
    { sigla: "DCH", nome: "DCH — Capital Humano" },
    { sigla: "DJC", nome: "DJC — Jurídica e Conformidade" },
];

// Níveis de habilitação literária (dropdown da formação académica).
const NIVEIS_FORMACAO = [
    "Ensino primário",
    "Ensino médio",
    "Licenciatura",
    "Mestrado",
    "Pós-graduação",
    "Doutoramento",
    "Outro",
];

// Itens de acolhimento criados por defeito para cada novo colaborador.
const ACOLHIMENTO_DEFAULT = [
    "Crachá e credenciais de acesso",
    "Conta de correio electrónico corporativo",
    "Equipamento de trabalho / EPI da função",
    "Apresentação à equipa e visita às instalações",
    "Formação de acolhimento (ética, segurança, portal)",
    "Leitura e assinatura das políticas",
];

// Campo de direção: dropdown com as direções padrão + entrada livre ("Outro").
function DirecaoField({ value, onChange, className }: { value: string; onChange: (v: string) => void; className: string }) {
    const ePadrao = DIRECOES.some((d) => d.nome === value);
    const eOutro = value && !ePadrao;
    return (
        <>
            <select
                value={ePadrao ? value : eOutro ? "outro" : ""}
                onChange={(e) => {
                    if (e.target.value === "outro") onChange("");
                    else onChange(e.target.value);
                }}
                className={className}
            >
                <option value="">— escolher —</option>
                {DIRECOES.map((d) => (
                    <option key={d.sigla} value={d.nome}>{d.nome}</option>
                ))}
                <option value="outro">Outro (escrever)</option>
            </select>
            {eOutro && (
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Escreva a direção/área"
                    className={className}
                    autoFocus
                />
            )}
        </>
    );
}

const PAISES = [    "Angola", "Moçambique", "Portugal", "Brasil", "Cabo Verde", "Guiné-Bissau",
    "São Tomé e Príncipe", "Timor-Leste", "África do Sul", "Botsuana", "Namíbia",
    "Nigéria", "RD Congo", "Egipto", "Etiópia", "Gana", "Quénia", "Marrocos",
    "Tunísia", "Argélia", "Libéria", "Uganda", "Tanzânia", "Zâmbia", "Zimbabué",
    "Senegal", "Costa do Marfim", "Camarões", "Gabão", "Guiné Equatorial",
    "República do Congo", "Benim", "Togo", "Mali", "Níger", "Burkina Faso",
    "Chade", "República Centro-Africana", "Sudão", "Sudão do Sul", "Somália",
    "Eritreia", "Djibuti", "Malawi", "Ilhas Maurícias", "Seicheles",
    "Madagáscar", "Comores", "Suíça", "Espanha", "Reino Unido", "França",
    "Itália", "Alemanha", "Bélgica", "Países Baixos", "Luxemburgo", "Suécia",
    "Noruega", "Dinamarca", "Finlândia", "Polónia", "Irlanda", "Áustria",
    "Estados Unidos", "Canadá", "México", "Cuba", "Argentina", "Colômbia",
    "Chile", "Peru", "Venezuela", "Uruguai", "Paraguai", "Equador", "China",
    "Japão", "Coreia do Sul", "Índia", "Rússia", "Emirados Árabes Unidos",
    "Arábia Saudita", "Israel", "Turquia", "Singapura", "Indonésia",
    "Malásia", "Filipinas", "Tailândia", "Vietname", "Austrália",
];

// Cursos comuns (formação académica) — dropdown com opção "Outro (escrever)".
const CURSOS_FORMACAO = [
    "Engenharia Informática",
    "Engenharia Civil",
    "Engenharia Electrotécnica",
    "Engenharia Mecânica",
    "Gestão de Empresas",
    "Contabilidade e Auditoria",
    "Economia",
    "Direito",
    "Recursos Humanos",
    "Marketing",
    "Gestão Hoteleira",
    "Enfermagem",
    "Medicina",
    "Farmacologia",
    "Psicologia",
    "Serviço Social",
    "Sociologia",
    "Educação / Pedagogia",
    "Arquitectura",
    "Jornalismo / Comunicação",
    "Relações Internacionais",
];

// Principais disciplinas — dropdown com opção "Outro (escrever)".
const DISCIPLINAS_FORMACAO = [
    "Programação e Desenvolvimento",
    "Base de Dados",
    "Redes de Comunicação",
    "Matemática Aplicada",
    "Estatística",
    "Gestão de Projetos",
    "Contabilidade Geral",
    "Direito do Trabalho",
    "Gestão de Pessoas",
    "Ética e Deontologia",
    "Comunicação Empresarial",
    "Liderança e Gestão",
    "Saúde Pública",
    "Investigação Científica",
    "Segurança e Higiene no Trabalho",
    "Empreendedorismo",
    "Atendimento ao Cliente",
    "Inglês Técnico",
];

// Dropdown com lista pré-definida + opção "Outro" que permite escrever.
function SelectComOutro({
    valor,
    aoMudar,
    opcoes,
    placeholder,
    rotuloOutro,
    className,
}: {
    valor: string;
    aoMudar: (v: string) => void;
    opcoes: string[];
    placeholder?: string;
    rotuloOutro?: string;
    className?: string;
}) {
    const ePadrao = opcoes.includes(valor);
    const [outroAtivo, setOutroAtivo] = useState(false);
    const eOutro = outroAtivo || (!!valor && !ePadrao);
    return (
        <>
            <select
                value={ePadrao ? valor : eOutro ? "outro" : ""}
                onChange={(e) => {
                    if (e.target.value === "outro") {
                        setOutroAtivo(true);
                        aoMudar("");
                    } else {
                        setOutroAtivo(false);
                        aoMudar(e.target.value);
                    }
                }}
                className={className}
            >
                <option value="">{placeholder || "— escolher —"}</option>
                {opcoes.map((o) => (
                    <option key={o} value={o}>{o}</option>
                ))}
                <option value="outro">{rotuloOutro || "Outro (escrever)"}</option>
            </select>
            {eOutro && (
                <input
                    value={valor}
                    onChange={(e) => aoMudar(e.target.value)}
                    placeholder="Escreva..."
                    className={className}
                    autoFocus
                />
            )}
        </>
    );
}

export default function Colaboradores() {

    const { user } = useAuth();
    const navigate = useNavigate();
    const [acolhimentoDe, setAcolhimentoDe] = useState<Colaborador | null>(null);
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [dadosRhDe, setDadosRhDe] = useState<Colaborador | null>(null);
    const [mudarPerfilDe, setMudarPerfilDe] = useState<Colaborador | null>(null);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");
    const [pesquisa, setPesquisa] = useState("");

    // Estado do modal de cadastro.
    const [modalAberto, setModalAberto] = useState(false);
    const [modalCorrecoes, setModalCorrecoes] = useState(false);

    const podeCadastrar = user?.role === "capital_humano" || user?.role === "admin";
    const eGestao = user?.role === "capital_humano" || user?.role === "administracao" || user?.role === "admin";

    const carregar = () => {
        setACarregar(true);
        const url = user?.role === "director" ? "/collaborators/my-direction" : "/collaborators";
        api.get(url)
            .then((resp) => setColaboradores(resp.data))
            .catch((err) => setErro(msgErro(err, "Erro ao carregar.")))
            .finally(() => setACarregar(false));
    };

    const alternarEstado = async (c: Colaborador) => {
        const acao = c.is_active ? "deactivate" : "reactivate";
        try {
            await api.post(`/collaborators/${c.id}/${acao}`);
            carregar(); // recarrega a lista para refletir a mudança
        } catch (err: any) {
            alert(msgErro(err, "Não foi possível alterar o estado."));
        }
    };

    useEffect(() => { carregar(); }, []);

    const filtrados = colaboradores.filter((c) => {
        const q = pesquisa.toLowerCase();
        return (
            c.full_name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (c.job_title || "").toLowerCase().includes(q) ||
            (c.department || "").toLowerCase().includes(q)
        );
    });

    const anos = colaboradores[0]?.score_years ?? [];
    const curto = colaboradores.find((c) => c.company_short)?.company_short ?? null;
    const eDirector = user?.role === "director";

    return (
        <div>
            <Cabecalho
                eyebrow={eDirector ? "A sua equipa" : "Gestão de pessoas"}
                titulo="Colaboradores"
                descricao={`${curto ? `Colaboradores — ${curto}.` : "Colaboradores da sua empresa."} Clique num nome para abrir o dossier completo no Portal do Colaborador.`}
            />
            <FaixaKpis kpis={[
                { valor: colaboradores.length, label: "Total de colaboradores" },
                { valor: colaboradores.filter(c => c.is_active).length, label: "Ativos", cor: "ok" },
                { valor: colaboradores.filter(c => !c.is_active).length, label: "Inativos", cor: colaboradores.filter(c => !c.is_active).length > 0 ? "warn" : "normal" },
                { valor: new Set(colaboradores.map(c => c.role)).size, label: "Perfis distintos" },
            ]} />

            <div className="flex gap-2.5 mb-3">
                <input
                    value={pesquisa}
                    onChange={(e) => setPesquisa(e.target.value)}
                    placeholder="Pesquisar…"
                    className="max-w-xs bg-panel border border-line rounded-lg px-3 py-2 text-[13px] text-strong focus:outline-none focus:border-pri"
                />
                {podeCadastrar && (
                    <button
                        onClick={() => setModalAberto(true)}
                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors"
                    >
                        + Cadastrar colaborador
                    </button>
                )}
                {eGestao && (
                    <button
                        onClick={() => setModalCorrecoes(true)}
                        className="bg-paper border border-line rounded-lg px-4 py-2 text-[12.3px] font-semibold text-ink hover:border-pri hover:text-pri transition-colors"
                    >
                        Pedidos de ficha
                    </button>
                )}
            </div>

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar colaboradores...</p>
            ) : erro ? (
                <p className="text-bad text-sm">{erro}</p>
            ) : (
                <Cartao className="p-0">
                    <div className="overflow-x-auto md:overflow-visible">
                        <table className="w-full text-[12.8px] min-w-[640px]">
                            <thead>
                                <tr>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Colaborador</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Cargo</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Dir.</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Adm.</th>
                                    {anos.map((ano) => (
                                        <th key={ano} className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">{ano}</th>
                                    ))}
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Situação</th>
                                    <th className="text-right text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.map((c) => {
                                    const s = situacao(c);
                                    const nota = (ano: number) => c.scores?.[String(ano)];
                                    return (
                                        <tr
                                            key={c.id}
                                            onClick={() => navigate(`/colaboradores/${c.id}/portal`, { state: { nome: c.full_name } })}
                                            className="hover:bg-panel transition-colors cursor-pointer"
                                        >
                                            <td className="px-3 py-2.5 border-b border-line2">
                                                <button type="button" onClick={() => navigate(`/colaboradores/${c.id}/portal`, { state: { nome: c.full_name } })} className="text-strong font-bold hover:text-pri hover:underline text-left">
                                                    {c.full_name}
                                                </button>
                                                <span className="block text-[11px] text-dim">{c.email}</span>
                                            </td>
                                            <td className="px-3 py-2.5 border-b border-line2">
                                                {c.job_title
                                                    ? <span className="text-[11.3px] text-dim">{c.job_title}</span>
                                                    : <span className="text-[11.3px] text-dim">—</span>}
                                            </td>
                                            <td className="px-3 py-2.5 border-b border-line2 text-ink">{c.department || <span className="text-dim">—</span>}</td>
                                            <td className="px-3 py-2.5 border-b border-line2">
                                                {c.admission_year
                                                    ? <span className="text-[11.3px] text-dim">{c.admission_year}</span>
                                                    : <span className="text-[11.3px] text-dim">—</span>}
                                            </td>
                                            {anos.map((ano) => {
                                                const n = nota(ano);
                                                return (
                                                    <td key={ano} className="px-3 py-2.5 border-b border-line2">
                                                        {n != null
                                                            ? <b className="text-strong">{n.toFixed(1)}</b>
                                                            : <span className="text-dim">—</span>}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-2.5 border-b border-line2">
                                                <Tag variante={s.variante}>{s.texto}</Tag>
                                            </td>
                                            <td className="px-3 py-2.5 border-b border-line2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                {podeCadastrar && (() => {
                                                    const opcoes: { label: string; onClick: () => void; perigo?: boolean; ok?: boolean }[] = [];
                                                    opcoes.push({ label: "Acolhimento", onClick: () => setAcolhimentoDe(c) });
                                                    opcoes.push({ label: "Dados RH", onClick: () => setDadosRhDe(c) });
                                                    if (c.id !== user?.id) {
                                                        if (user?.role === "admin") {
                                                            opcoes.push({ label: "Mudar perfil", onClick: () => setMudarPerfilDe(c) });
                                                        }
                                                        opcoes.push({
                                                            label: c.is_active ? "Desativar" : "Reativar",
                                                            onClick: () => alternarEstado(c),
                                                            perigo: c.is_active,
                                                            ok: !c.is_active,
                                                        });
                                                    }
                                                    return <MenuAcoes opcoes={opcoes} />;
                                                })()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {filtrados.length === 0 && (
                        <p className="px-3 py-6 text-dim text-center text-sm">
                            {pesquisa ? "Nenhum colaborador corresponde à pesquisa." : "Nenhum colaborador ainda."}
                        </p>
                    )}
                </Cartao>
            )}

            {modalAberto && (
                <ModalCadastro
                    aoFechar={() => setModalAberto(false)}
                    aoCriar={() => { setModalAberto(false); carregar(); }}
                />
            )}

            {acolhimentoDe && (
                <ModalAcolhimento
                    colaborador={acolhimentoDe}
                    aoFechar={() => setAcolhimentoDe(null)}
                />
            )}

            {dadosRhDe && (
                <ModalDadosRh
                    colaborador={dadosRhDe}
                    aoFechar={() => setDadosRhDe(null)}
                    aoGuardar={() => { setDadosRhDe(null); carregar(); }}
                />
            )}

            {mudarPerfilDe && (
                <ModalMudarPerfil
                    colaborador={mudarPerfilDe}
                    aoFechar={() => setMudarPerfilDe(null)}
                    aoMudar={() => { setMudarPerfilDe(null); carregar(); }}
                />
            )}

            {modalCorrecoes && (
                <ModalCorrecoesFicha aoFechar={() => setModalCorrecoes(false)} />
            )}
        </div>
    );
}

// ---- Modal de cadastro completo de colaborador (conta + ficha profissional + documentos) ----

interface DocumentoColaborador { id: number; filename: string; doc_type?: string | null; }
interface ItemAcolhimento { id: number; description: string; done: boolean; applicable: boolean | null; delivered: boolean | null; }

function ModalCadastro({ aoFechar, aoCriar }: { aoFechar: () => void; aoCriar: () => void }) {
    const { user } = useAuth();
    // Só o Admin da empresa pode atribuir perfis privilegiados.
    const podeAtribuirPerfis = user?.role === "admin";
    // Passo atual (1 a 4).
    const [passo, setPasso] = useState(1);

    // Passo 1 — dados de acesso.
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("colaborador");
    const [erro, setErro] = useState("");
    const [aCarregar, setACarregar] = useState(false);
    const [passwordTemp, setPasswordTemp] = useState<string | null>(null);
    const [novoId, setNovoId] = useState<number | null>(null);

    // Passo 2 — ficha profissional.
    const [admission, setAdmission] = useState("");
    const [contractType, setContractType] = useState("");
    const [contractEndDate, setContractEndDate] = useState("");
    const [jobCategory, setJobCategory] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [department, setDepartment] = useState("");
    const [workplace, setWorkplace] = useState("");
    const [situationTags, setSituationTags] = useState("");
    const [nationality, setNationality] = useState("");
    const [cv, setCv] = useState("");
    const [erroFicha, setErroFicha] = useState("");
    const [aGuardarFicha, setAGuardarFicha] = useState(false);

    // Horário — regime fixo (entrada/saída/intervalo) ou turno (catálogo da empresa).
    const [workScheduleType, setWorkScheduleType] = useState("");
    const [fixedEntryTime, setFixedEntryTime] = useState("");
    const [fixedExitTime, setFixedExitTime] = useState("");
    const [fixedBreakStart, setFixedBreakStart] = useState("");
    const [fixedBreakEnd, setFixedBreakEnd] = useState("");
    const [shiftId, setShiftId] = useState("");
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [turnosCarregados, setTurnosCarregados] = useState(false);
    const carregarTurnos = () => {
        if (turnosCarregados) return;
        setTurnosCarregados(true);
        api.get("/companies/shifts").then((r) => setTurnos(r.data || [])).catch(() => setTurnos([]));
    };

    // Cursos e certificações — repetível (nome, instituição, data, validade).
    interface CertificacaoLinha { nome: string; instituicao: string; data: string; validade: string; }
    const [certificacoes, setCertificacoes] = useState<CertificacaoLinha[]>([{ nome: "", instituicao: "", data: "", validade: "" }]);
    const atualizarCertificacao = (i: number, campo: keyof CertificacaoLinha, valor: string) =>
        setCertificacoes(prev => prev.map((c, idx) => idx === i ? { ...c, [campo]: valor } : c));
    const adicionarCertificacao = () =>
        setCertificacoes(prev => [{ nome: "", instituicao: "", data: "", validade: "" }, ...prev]);
    const removerCertificacao = (i: number) =>
        setCertificacoes(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

    // Formação académica — habilitações literárias repetíveis (licenciatura, mestrado, ...).
    interface FormacaoLinha { nivel: string; anoInicio: string; anoFim: string; pais: string; instituicao: string; curso: string; areas: string; }
    const [formacao, setFormacao] = useState<FormacaoLinha[]>([{ nivel: "", anoInicio: "", anoFim: "", pais: "", instituicao: "", curso: "", areas: "" }]);
    const atualizarFormacao = (i: number, campo: keyof FormacaoLinha, valor: string) =>
        setFormacao(prev => prev.map((f, idx) => idx === i ? { ...f, [campo]: valor } : f));
    const adicionarFormacao = () =>
        setFormacao(prev => [{ nivel: "", anoInicio: "", anoFim: "", pais: "", instituicao: "", curso: "", areas: "" }, ...prev]);
    const removerFormacao = (i: number) =>
        setFormacao(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

    // Experiência de trabalho — repetível (onde, anos, função).
    interface ExperienciaLinha { onde: string; anoInicio: string; anoFim: string; funcao: string; }
    const [experiencia, setExperiencia] = useState<ExperienciaLinha[]>([{ onde: "", anoInicio: "", anoFim: "", funcao: "" }]);
    const atualizarExperiencia = (i: number, campo: keyof ExperienciaLinha, valor: string) =>
        setExperiencia(prev => prev.map((f, idx) => idx === i ? { ...f, [campo]: valor } : f));
    const adicionarExperiencia = (i: number) =>
        setExperiencia(prev => [...prev.slice(0, i + 1), { onde: "", anoInicio: "", anoFim: "", funcao: "" }, ...prev.slice(i + 1)]);
    const removerExperiencia = (i: number) =>
        setExperiencia(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

    // IA — sugestões de universidades (por linha de formação, consoante o país da linha)
    const [universities, setUniversities] = useState<string[][]>([]);
    const [loadingUniv, setLoadingUniv] = useState<boolean[]>([]);

    const carregarUniversidades = (i: number, pais: string) => {
        if (!pais.trim() || pais.length < 4) {
            setUniversities((prev) => { const n = [...prev]; n[i] = []; return n; });
            return;
        }
        setUnivLoading(i, true);
        api.post("/ai/universities", { country: pais })
            .then((r) => setUniversities((prev) => { const n = [...prev]; n[i] = r.data || []; return n; }))
            .catch(() => setUniversities((prev) => { const n = [...prev]; n[i] = []; return n; }))
            .finally(() => setUnivLoading(i, false));
    };

    const setUnivLoading = (i: number, v: boolean) =>
        setLoadingUniv((prev) => { const n = [...prev]; n[i] = v; return n; });

    // Cargos (IA) — menu de sugestões para o campo "Cargo".
    const [cargos, setCargos] = useState<string[]>([]);
    const [cargosCarregados, setCargosCarregados] = useState(false);
    const carregarCargos = () => {
        if (cargosCarregados) return;
        setCargosCarregados(true);
        api.post("/ai/job-titles", {})
            .then((r) => setCargos(r.data || []))
            .catch(() => setCargos([]));
    };

    // Países (IA) — lista mundial para a nacionalidade.
    const [paises, setPaises] = useState<string[]>([]);
    const [paisesCarregados, setPaisesCarregados] = useState(false);
    const carregarPaises = () => {
        if (paisesCarregados) return;
        setPaisesCarregados(true);
        api.post("/ai/countries", {})
            .then((r) => setPaises(r.data || []))
            .catch(() => setPaises([]));
    };

    // Passo 3 — documentos.
    const [docsPendentes, setDocsPendentes] = useState<{ tipo: string; ficheiro: File | null }[]>([{ tipo: "bi", ficheiro: null }]);
    const [documentos, setDocumentos] = useState<DocumentoColaborador[]>([]);
    const [aEnviarDoc, setAEnviarDoc] = useState(false);
    const [erroDoc, setErroDoc] = useState("");

    // Passo 4 — acolhimento (checklist do primeiro dia).
    const [itensAcolhimento, setItensAcolhimento] = useState<ItemAcolhimento[]>([]);
    const [novoItem, setNovoItem] = useState("");
    const [erroAcolhimento, setErroAcolhimento] = useState("");
    const [acolhimentoCarregado, setAcolhimentoCarregado] = useState(false);

    const inputCls = "w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri";

    // ---- Passo 1: criar a conta ----
    const criarConta = async () => {
        setErro("");
        setACarregar(true);
        try {
            const resp = await api.post("/collaborators", { full_name: fullName, email, role });
            setPasswordTemp(resp.data.temporary_password);
            setNovoId(resp.data.id);
            // Não avança automaticamente: mostra a senha temporária no passo 1.
            // O utilizador clica em "Continuar" depois de a copiar.
        } catch (err: any) {
            setErro(msgErro(err, "Erro ao cadastrar."));
        } finally {
            setACarregar(false);
        }
    };

    // ---- Passo 2: guardar a ficha ----
    const guardarFicha = async (): Promise<boolean> => {
        if (!novoId) return false;
        setErroFicha("");
        setAGuardarFicha(true);
        try {
            await api.put(`/collaborators/${novoId}/profile`, {
                admission_date: admission || null,
                contract_type: contractType || null,
                contract_end_date: contractType === "termo_certo" ? (contractEndDate || null) : null,
                job_category: jobCategory || null,
                job_title: jobTitle || null,
                department: department || null,
                workplace: workplace || null,
                work_schedule_type: workScheduleType || null,
                fixed_entry_time: workScheduleType === "fixo" ? (fixedEntryTime || null) : null,
                fixed_exit_time: workScheduleType === "fixo" ? (fixedExitTime || null) : null,
                fixed_break_start: workScheduleType === "fixo" ? (fixedBreakStart || null) : null,
                fixed_break_end: workScheduleType === "fixo" ? (fixedBreakEnd || null) : null,
                shift_id: workScheduleType === "turno" ? (shiftId ? Number(shiftId) : null) : null,
                situation_tags: situationTags || null,
                nationality: nationality || null,
                cv: cv || null,
                education: formacao.map((f) => ({
                    nivel: f.nivel || null,
                    ano_inicio: f.anoInicio ? Number(f.anoInicio) : null,
                    ano_fim: f.anoFim ? Number(f.anoFim) : null,
                    pais: f.pais || null,
                    instituicao: f.instituicao || null,
                    curso: f.curso || null,
                    areas: f.areas || null,
                })),
                experience: experiencia.map((x) => ({
                    onde: x.onde || null,
                    ano_inicio: x.anoInicio ? Number(x.anoInicio) : null,
                    ano_fim: x.anoFim ? Number(x.anoFim) : null,
                    funcao: x.funcao || null,
                })),
                certifications: certificacoes
                    .filter((c) => c.nome.trim())
                    .map((c) => ({
                        nome: c.nome || null,
                        instituicao: c.instituicao || null,
                        data: c.data || null,
                        validade: c.validade || null,
                    })),
            });
            return true;
        } catch (err: any) {
            setErroFicha(msgErro(err, "Erro ao guardar a ficha."));
            return false;
        } finally {
            setAGuardarFicha(false);
        }
    };

    // Guarda a ficha e avança para o passo 3.
    const guardarEavancar = async () => {
        // Um director tem de gerir uma direção: sem direção não avança.
        if (role === "director" && !department.trim()) {
            setErroFicha("Um director tem de gerir uma direção. Selecione a direção que vai gerir.");
            return;
        }
        if (contractType === "termo_certo" && !contractEndDate) {
            setErroFicha("Contrato por tempo determinado exige a data de término.");
            return;
        }
        if (workScheduleType === "fixo" && (!fixedEntryTime || !fixedExitTime)) {
            setErroFicha("Horário fixo exige hora de entrada e hora de saída.");
            return;
        }
        if (workScheduleType === "turno" && !shiftId) {
            setErroFicha("Escolha o turno do colaborador.");
            return;
        }
        const ok = await guardarFicha();
        if (ok) setPasso(3);
    };

    // ---- Passo 3: documentos ----
    const atualizarDocPendente = (i: number, campo: keyof { tipo: string; ficheiro: File | null }, valor: string | File | null) =>
        setDocsPendentes(prev => prev.map((d, idx) => idx === i ? { ...d, [campo]: valor as never } : d));
    const adicionarDocPendente = (i: number) =>
        setDocsPendentes(prev => [...prev.slice(0, i + 1), { tipo: "bi", ficheiro: null }, ...prev.slice(i + 1)]);
    const removerDocPendente = (i: number) =>
        setDocsPendentes(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

    const enviarDocumento = async () => {
        const porEnviar = docsPendentes.filter((d) => d.ficheiro);
        if (!novoId || porEnviar.length === 0) return;
        setErroDoc("");
        setAEnviarDoc(true);
        let enviados: DocumentoColaborador[] = [];
        for (const d of porEnviar) {
            try {
                const dados = new FormData();
                dados.append("file", d.ficheiro as File);
                dados.append("doc_type", d.tipo);
                const resp = await api.post(`/collaborators/${novoId}/documents`, dados);
                enviados = [...enviados, resp.data];
            } catch (err: any) {
                setErroDoc(msgErro(err, "Não foi possível enviar um dos documentos."));
            }
        }
        if (enviados.length) setDocumentos((prev) => [...prev, ...enviados]);
        setDocsPendentes([{ tipo: "bi", ficheiro: null }]);
        setAEnviarDoc(false);
    };

    // ---- Passo 4: acolhimento ----
    const carregarAcolhimento = () => {
        if (!novoId) return;
        api.get(`/onboarding/${novoId}`)
            .then((r) => {
                const itens: ItemAcolhimento[] = r.data || [];
                if (itens.length > 0) {
                    setItensAcolhimento(itens);
                    return;
                }
                // Sem itens: cria os de acolhimento por defeito.
                (async () => {
                    for (const descricao of ACOLHIMENTO_DEFAULT) {
                        try {
                            await api.post("/onboarding", {
                                collaborator_id: novoId, description: descricao,
                                applicable: true, delivered: false,
                            });
                        } catch { /* continua com o próximo */ }
                    }
                    const vistos = await api.get(`/onboarding/${novoId}`);
                    setItensAcolhimento(vistos.data || []);
                })();
            })
            .catch(() => setItensAcolhimento([]));
    };

    useEffect(() => {
        if (passo === 4 && novoId && !acolhimentoCarregado) {
            setAcolhimentoCarregado(true);
            carregarAcolhimento();
        }
    }, [passo, novoId, acolhimentoCarregado]);

    const atualizarAcolhimento = async (item: ItemAcolhimento, campo: "applicable" | "delivered", valor: boolean | null) => {
        setItensAcolhimento((prev) => prev.map((it) => it.id === item.id ? { ...it, [campo]: valor } : it));
        try {
            await api.patch(`/onboarding/${item.id}`, { [campo]: valor });
        } catch { /* ignora — mantém o valor local */ }
    };

    const adicionarAcolhimento = async () => {
        if (!novoId || !novoItem.trim()) return;
        setErroAcolhimento("");
        try {
            const resp = await api.post("/onboarding", { collaborator_id: novoId, description: novoItem });
            setItensAcolhimento((prev) => [...prev, resp.data]);
            setNovoItem("");
        } catch (err: any) {
            setErroAcolhimento(msgErro(err, "Não foi possível adicionar o item."));
        }
    };

    const concluir = () => {
        aoCriar();
    };

    const PASSOS = ["Conta", "Ficha", "Documentos", "Acolhimento"];

    return (
        <Modal aberto={true} aoFechar={aoFechar} largura="max-w-[880px]"
            titulo="Cadastrar colaborador"
            subtitulo={`Passo ${passo} de 4 — ${PASSOS[passo - 1]}`}>

            {/* Barra de progresso dos passos */}
            <div className="flex items-center gap-1.5 mb-5">
                {PASSOS.map((nome, i) => {
                    const n = i + 1;
                    const ativo = n === passo;
                    const feito = n < passo;
                    return (
                        <div key={nome} className="flex-1 flex flex-col items-center gap-1">
                            <div className={`w-full h-1.5 rounded-full ${ativo || feito ? "bg-pri" : "bg-line2"}`} />
                            <span className={`text-[9.5px] ${ativo ? "text-pri font-semibold" : "text-dim"}`}>{nome}</span>
                        </div>
                    );
                })}
            </div>

            {/* ===== PASSO 1 — CONTA ===== */}
            {passo === 1 && (
                <div>
                    {passwordTemp ? (
                        <Notice variante="soft" className="mb-4">
                            <b>Conta criada!</b>
                            <div className="mt-2">Password temporária de primeiro acesso:</div>
                            <div className="font-mono text-[15px] text-strong bg-paper border border-line rounded-lg px-3 py-2 mt-1.5 select-all">
                                {passwordTemp}
                            </div>
                        </Notice>
                    ) : (
                        <>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Nome completo</label>
                            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex.: Nelma Cassule" className={inputCls} />
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Email</label>
                            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="nome@empresa.ao" className={inputCls} />
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Perfil</label>
                            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls} disabled={!podeAtribuirPerfis}>
                                <option value="colaborador">Colaborador</option>
                                {podeAtribuirPerfis && <option value="director">Director</option>}
                                {podeAtribuirPerfis && <option value="capital_humano">Capital Humano</option>}
                                {podeAtribuirPerfis && <option value="comissao">Comissão de Avaliação</option>}
                                {podeAtribuirPerfis && <option value="administracao">Administração</option>}
                            </select>
                            {!podeAtribuirPerfis && (
                                <p className="text-[10.5px] text-dim mb-3 -mt-1">
                                    O Capital Humano cria colaboradores. A atribuição de outros perfis é feita pelo Admin da empresa.
                                </p>
                            )}
                            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}
                        </>
                    )}
                    <div className="flex gap-2.5 mt-5 pt-4 border-t border-line">
                        <Botao variante="ghost" onClick={aoFechar}>Cancelar</Botao>
                        {passwordTemp ? (
                            <Botao onClick={() => setPasso(2)}>Continuar →</Botao>
                        ) : (
                            <Botao onClick={criarConta} disabled={!fullName || !email || aCarregar}>
                                {aCarregar ? "A criar..." : "Criar conta →"}
                            </Botao>
                        )}
                    </div>
                </div>
            )}

            {/* ===== PASSO 2 — FICHA ===== */}
            {passo === 2 && (
                <div className="pb-16">
                    <div className="grid grid-cols-2 gap-x-3">
                        <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Admissão</label>
                            <input value={admission} onChange={(e) => setAdmission(e.target.value)} type="date" className={inputCls} /></div>
                        <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Vínculo</label>
                            <select value={contractType} onChange={(e) => setContractType(e.target.value)} className={inputCls}>
                                <option value="">— escolher —</option>
                                <option value="termo_certo">Tempo determinado</option>
                                <option value="efetivo">Por tempo indeterminado</option>
                            </select></div>
                        {contractType === "termo_certo" && (
                            <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Término do contrato</label>
                                <input value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} type="date" min={admission || undefined} className={inputCls} /></div>
                        )}
                        <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Cargo {!jobTitle.trim() && <span className="text-dim normal-case">(sugestões ao clicar)</span>}</label>
                            <AutocompleteIA
                                value={jobTitle}
                                onChange={setJobTitle}
                                options={cargos}
                                onFocus={carregarCargos}
                                placeholder="Escreva ou escolha o cargo"
                                className={inputCls}
                            /></div>
                        <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Categoria (nível)</label>
                            <select
                                value={["Júnior", "Pleno", "Sénior", "Especialista"].includes(jobCategory) ? jobCategory : jobCategory ? "Outro:" + jobCategory : ""}
                                onChange={(e) => setJobCategory(
                                    e.target.value.startsWith("Outro:") ? e.target.value.slice(6) : e.target.value
                                )}
                                disabled={!jobTitle.trim()}
                                className={inputCls}
                            >
                                <option value="">{jobTitle.trim() ? "— escolher nível —" : "Defina o cargo primeiro"}</option>
                                <option value="Júnior">Júnior</option>
                                <option value="Pleno">Pleno</option>
                                <option value="Sénior">Sénior</option>
                                <option value="Especialista">Especialista</option>
                                {jobCategory && !["Júnior", "Pleno", "Sénior", "Especialista"].includes(jobCategory) && (
                                    <option value={`Outro:${jobCategory}`}>{jobCategory}</option>
                                )}
                            </select></div>
                        <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Direção {role === "director" && <span className="text-pri normal-case">(obrigatória — a que o director vai gerir)</span>}</label>
                            <DirecaoField value={department} onChange={setDepartment} className={inputCls} /></div>
                        <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Local</label>
                            <input value={workplace} onChange={(e) => setWorkplace(e.target.value)} className={inputCls} /></div>
                        <div className="col-span-2 mt-4">
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1.5">Formação académica</label>
                            <div className="space-y-2">
                                {formacao.map((f, i) => (
                                    <div key={i} className="border border-line rounded-lg p-3">
                                        <div className="flex gap-2 items-start">
                                            <div className="flex-[1.3]">
                                                <select
                                                    value={f.nivel}
                                                    onChange={(e) => atualizarFormacao(i, "nivel", e.target.value)}
                                                    className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                                >
                                                    <option value="">Habilitação literária</option>
                                                    {NIVEIS_FORMACAO.map((n) => (
                                                        <option key={n} value={n}>{n}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-[92px]">
                                                <input
                                                    type="number" min={1900} max={2200}
                                                    value={f.anoInicio}
                                                    onChange={(e) => atualizarFormacao(i, "anoInicio", e.target.value)}
                                                    placeholder="Ano início"
                                                    className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                                />
                                            </div>
                                            <div className="w-[92px]">
                                                <input
                                                    type="number" min={1900} max={2200}
                                                    value={f.anoFim}
                                                    onChange={(e) => atualizarFormacao(i, "anoFim", e.target.value)}
                                                    placeholder="Ano fim"
                                                    className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <AutocompleteIA
                                                    value={f.pais}
                                                    onChange={(valor) => atualizarFormacao(i, "pais", valor)}
                                                    options={paises.length ? paises : PAISES}
                                                    onFocus={carregarPaises}
                                                    placeholder="País de formação"
                                                    className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={adicionarFormacao}
                                                title="Adicionar formação"
                                                className="w-9 h-9 rounded-lg bg-pri-bg text-pri-dark font-bold text-[18px] leading-none hover:bg-pri hover:text-white transition-colors flex-shrink-0"
                                            >
                                                +
                                            </button>
                                            {formacao.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removerFormacao(i)}
                                                    title="Remover formação"
                                                    className="w-9 h-9 rounded-lg bg-panel border border-line text-dim font-bold text-[18px] leading-none hover:text-bad hover:border-bad transition-colors flex-shrink-0"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex gap-2 items-start mt-2">
                                            <div className="flex-1">
                                                <AutocompleteIA
                                                    value={f.instituicao}
                                                    onChange={(valor) => atualizarFormacao(i, "instituicao", valor)}
                                                    options={universities[i] || []}
                                                    loading={loadingUniv[i]}
                                                    disabled={!f.pais.trim()}
                                                    onFocus={() => carregarUniversidades(i, f.pais)}
                                                    placeholder={f.pais.trim() ? "Instituição de ensino (universidade)" : "Defina o país de formação primeiro"}
                                                    className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Curso</label>
                                            <SelectComOutro
                                                valor={f.curso}
                                                aoMudar={(valor) => atualizarFormacao(i, "curso", valor)}
                                                opcoes={CURSOS_FORMACAO}
                                                placeholder="— escolher curso —"
                                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                            />
                                        </div>
                                        <div className="mt-2">
                                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Principais disciplinas</label>
                                            <SelectComOutro
                                                valor={f.areas}
                                                aoMudar={(valor) => atualizarFormacao(i, "areas", valor)}
                                                opcoes={DISCIPLINAS_FORMACAO}
                                                placeholder="— escolher disciplina —"
                                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="col-span-2 mt-4 mb-5">
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1.5">Experiência de trabalho</label>
                            <div className="space-y-2">
                                {experiencia.map((x, i) => (
                                    <div key={i} className="flex gap-2 items-start">
                                        <div className="flex-1">
                                            <input
                                                value={x.onde}
                                                onChange={(e) => atualizarExperiencia(i, "onde", e.target.value)}
                                                placeholder="Onde trabalhou"
                                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                            />
                                        </div>
                                        <div className="w-[92px]">
                                            <input
                                                type="number" min={1900} max={2200}
                                                value={x.anoInicio}
                                                onChange={(e) => atualizarExperiencia(i, "anoInicio", e.target.value)}
                                                placeholder="Ano início"
                                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                            />
                                        </div>
                                        <div className="w-[92px]">
                                            <input
                                                type="number" min={1900} max={2200}
                                                value={x.anoFim}
                                                onChange={(e) => atualizarExperiencia(i, "anoFim", e.target.value)}
                                                placeholder="Ano fim"
                                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                            />
                                        </div>
                                        <div className="flex-[1.3]">
                                            <input
                                                value={x.funcao}
                                                onChange={(e) => atualizarExperiencia(i, "funcao", e.target.value)}
                                                placeholder="Função"
                                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => adicionarExperiencia(i)}
                                            title="Adicionar experiência"
                                            className="w-9 h-9 rounded-lg bg-pri-bg text-pri-dark font-bold text-[18px] leading-none hover:bg-pri hover:text-white transition-colors flex-shrink-0"
                                        >
                                            +
                                        </button>
                                        {experiencia.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removerExperiencia(i)}
                                                title="Remover experiência"
                                                className="w-9 h-9 rounded-lg bg-panel border border-line text-dim font-bold text-[18px] leading-none hover:text-bad hover:border-bad transition-colors flex-shrink-0"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Regime de horário</label>
                            <select value={workScheduleType} onChange={(e) => setWorkScheduleType(e.target.value)} onFocus={carregarTurnos} className={inputCls}>
                                <option value="">— escolher —</option>
                                <option value="fixo">Horário fixo</option>
                                <option value="turno">Regime de turno</option>
                            </select></div>
                        <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Nacionalidade</label>
                            <input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Ex.: Angolana" className={inputCls} /></div>
                        {workScheduleType === "fixo" && (
                            <>
                                <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Entrada</label>
                                    <input value={fixedEntryTime} onChange={(e) => setFixedEntryTime(e.target.value)} type="time" className={inputCls} /></div>
                                <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Saída</label>
                                    <input value={fixedExitTime} onChange={(e) => setFixedExitTime(e.target.value)} type="time" className={inputCls} /></div>
                                <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Início do intervalo</label>
                                    <input value={fixedBreakStart} onChange={(e) => setFixedBreakStart(e.target.value)} type="time" className={inputCls} /></div>
                                <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Fim do intervalo</label>
                                    <input value={fixedBreakEnd} onChange={(e) => setFixedBreakEnd(e.target.value)} type="time" className={inputCls} /></div>
                            </>
                        )}
                        {workScheduleType === "turno" && (
                            <div className="col-span-2"><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Turno</label>
                                <select value={shiftId} onChange={(e) => setShiftId(e.target.value)} className={inputCls}>
                                    <option value="">— escolher turno —</option>
                                    {turnos.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.start_time}–{t.end_time})</option>
                                    ))}
                                </select>
                                {turnosCarregados && turnos.length === 0 && (
                                    <p className="text-[10.5px] text-dim -mt-2 mb-3">
                                        Nenhum turno configurado. Peça à Administração para os configurar em Administração → Turnos.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="col-span-2 mt-2 mb-5">
                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1.5">Cursos e certificações</label>
                        <div className="space-y-2">
                            {certificacoes.map((c, i) => (
                                <div key={i} className="flex gap-2 items-start">
                                    <div className="flex-1">
                                        <input
                                            value={c.nome}
                                            onChange={(e) => atualizarCertificacao(i, "nome", e.target.value)}
                                            placeholder="Nome do curso/certificação"
                                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            value={c.instituicao}
                                            onChange={(e) => atualizarCertificacao(i, "instituicao", e.target.value)}
                                            placeholder="Instituição"
                                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                        />
                                    </div>
                                    <div className="w-[140px]">
                                        <input
                                            type="date"
                                            value={c.data}
                                            onChange={(e) => atualizarCertificacao(i, "data", e.target.value)}
                                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                        />
                                    </div>
                                    <div className="w-[140px]">
                                        <input
                                            type="date"
                                            value={c.validade}
                                            onChange={(e) => atualizarCertificacao(i, "validade", e.target.value)}
                                            title="Validade (opcional)"
                                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={adicionarCertificacao}
                                        title="Adicionar certificação"
                                        className="w-9 h-9 rounded-lg bg-pri-bg text-pri-dark font-bold text-[18px] leading-none hover:bg-pri hover:text-white transition-colors flex-shrink-0"
                                    >
                                        +
                                    </button>
                                    {certificacoes.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removerCertificacao(i)}
                                            title="Remover certificação"
                                            className="w-9 h-9 rounded-lg bg-panel border border-line text-dim font-bold text-[18px] leading-none hover:text-bad hover:border-bad transition-colors flex-shrink-0"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Tags de situação</label>
                    <input value={situationTags} onChange={(e) => setSituationTags(e.target.value)} placeholder="separadas por vírgula" className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">CV / Notas</label>
                    <textarea value={cv} onChange={(e) => setCv(e.target.value)} rows={5} placeholder="Biografia, experiência profissional, competências — o RH digitaliza aqui." className={`${inputCls} resize-y`} />
                    {erroFicha && <p className="text-bad text-sm mb-3">{erroFicha}</p>}
                    <div className="flex gap-2.5 mt-5 pt-4 border-t border-line">
                        <Botao variante="ghost" onClick={() => setPasso(1)}>← Anterior</Botao>
                        <Botao onClick={guardarEavancar} disabled={aGuardarFicha}>
                            {aGuardarFicha ? "A guardar..." : "Guardar e continuar →"}
                        </Botao>
                    </div>
                </div>
            )}

            {/* ===== PASSO 3 — DOCUMENTOS ===== */}
            {passo === 3 && (
                <div>
                    <p className="text-dim text-[11.5px] mb-3">Anexe os documentos do vínculo (BI, contrato, certificados). Pode saltar e fazê-lo depois.</p>
                    {documentos.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                            {documentos.map((d) => (
                                <div key={d.id} className="flex items-center gap-2 px-3 py-2 border border-line rounded-lg text-[12px]">
                                    <span className="text-ok">✓</span><span className="text-strong">{d.filename}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="space-y-2 mb-2">
                        {docsPendentes.map((d, i) => (
                            <div key={i} className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Tipo</label>
                                    <select value={d.tipo} onChange={(e) => atualizarDocPendente(i, "tipo", e.target.value)} className={inputCls}>
                                        <option value="bi">Bilhete de Identidade</option>
                                        <option value="contrato_assinado">Contrato assinado</option>
                                        <option value="certificado_habilitacoes">Certificado de habilitações</option>
                                        <option value="outro">Outro</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Ficheiro</label>
                                    <input
                                        type="file"
                                        onChange={(e) => atualizarDocPendente(i, "ficheiro", e.target.files?.[0] || null)}
                                        className="w-full bg-panel border border-line rounded-lg px-3 py-[7px] text-[12.5px] focus:outline-none focus:border-pri"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => adicionarDocPendente(i)}
                                    title="Adicionar documento"
                                    className="w-9 h-9 rounded-lg bg-pri-bg text-pri-dark font-bold text-[18px] leading-none hover:bg-pri hover:text-white transition-colors flex-shrink-0"
                                >
                                    +
                                </button>
                                {docsPendentes.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removerDocPendente(i)}
                                        title="Remover documento"
                                        className="w-9 h-9 rounded-lg bg-panel border border-line text-dim font-bold text-[18px] leading-none hover:text-bad hover:border-bad transition-colors flex-shrink-0"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {erroDoc && <p className="text-bad text-[11px] mb-2">{erroDoc}</p>}
                    <div className="flex justify-end mb-2">
                        <Botao
                            variante="ghost"
                            onClick={enviarDocumento}
                            disabled={aEnviarDoc || !docsPendentes.some((d) => d.ficheiro)}
                        >
                            {aEnviarDoc ? "A enviar..." : docsPendentes.filter((d) => d.ficheiro).length > 1 ? "Anexar todos" : "Anexar"}
                        </Botao>
                    </div>
                    <div className="flex gap-2.5 mt-5 pt-4 border-t border-line">
                        <Botao variante="ghost" onClick={() => setPasso(2)}>← Anterior</Botao>
                        <Botao onClick={() => setPasso(4)}>Continuar →</Botao>
                    </div>
                </div>
            )}

            {/* ===== PASSO 4 — ACOLHIMENTO ===== */}
            {passo === 4 && (
                <div>
                    <p className="text-dim text-[11.5px] mb-3">Lista de acolhimento — o que o colaborador deve receber/concluir no primeiro dia.</p>
                    {itensAcolhimento.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                            {itensAcolhimento.map((it) => (
                                <div key={it.id} className="flex items-center gap-2 px-3 py-2 border border-line rounded-lg text-[12px]">
                                    <span className="text-dim">○</span>
                                    <span className="flex-1 text-ink">{it.description}</span>
                                    <span className="text-[10px] uppercase tracking-wide text-dim">Aplicável</span>
                                    <select
                                        value={it.applicable === null ? "" : it.applicable ? "S" : "N"}
                                        onChange={(e) => atualizarAcolhimento(it, "applicable", e.target.value === "" ? null : e.target.value === "S")}
                                        className="w-[58px] bg-panel border border-line rounded-md px-1.5 py-1 text-[12px] focus:outline-none focus:border-pri"
                                    >
                                        <option value="">—</option>
                                        <option value="S">S</option>
                                        <option value="N">N</option>
                                    </select>
                                    <span className="text-[10px] uppercase tracking-wide text-dim">Entregue</span>
                                    <select
                                        value={it.delivered === null ? "" : it.delivered ? "S" : "N"}
                                        onChange={(e) => atualizarAcolhimento(it, "delivered", e.target.value === "" ? null : e.target.value === "S")}
                                        className="w-[58px] bg-panel border border-line rounded-md px-1.5 py-1 text-[12px] focus:outline-none focus:border-pri"
                                    >
                                        <option value="">—</option>
                                        <option value="S">S</option>
                                        <option value="N">N</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2 items-end mb-2">
                        <div className="flex-1">
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Novo item</label>
                            <input value={novoItem} onChange={(e) => setNovoItem(e.target.value)}
                                placeholder="Ex.: Crachá e credenciais" className={inputCls}
                                onKeyDown={(e) => { if (e.key === "Enter") adicionarAcolhimento(); }} />
                        </div>
                        <Botao variante="ghost" onClick={adicionarAcolhimento} disabled={!novoItem.trim()}>+ Adicionar</Botao>
                    </div>
                    {erroAcolhimento && <p className="text-bad text-[11px] mb-2">{erroAcolhimento}</p>}
                    <div className="flex gap-2.5 mt-5 pt-4 border-t border-line">
                        <Botao variante="ghost" onClick={() => setPasso(3)}>← Anterior</Botao>
                        <Botao onClick={concluir}>Concluir cadastro ✓</Botao>
                    </div>
                </div>
            )}
        </Modal>
    );
}


function ModalAcolhimento({ colaborador, aoFechar }: { colaborador: Colaborador; aoFechar: () => void }) {
    const [itens, setItens] = useState<{ id: number; description: string; done: boolean }[]>([]);
    const [novoItem, setNovoItem] = useState("");
    const [aCarregar, setACarregar] = useState(true);

    const carregar = () => {
        api.get(`/onboarding/${colaborador.id}`)
            .then((r) => setItens(r.data))
            .catch(() => setItens([]))
            .finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    const adicionar = async () => {
        if (!novoItem.trim()) return;
        try {
            await api.post("/onboarding", { collaborator_id: colaborador.id, description: novoItem });
            setNovoItem("");
            carregar();
        } catch { /* ignora */ }
    };

    const alternar = async (itemId: number) => {
        try {
            await api.post(`/onboarding/${itemId}/toggle`);
            carregar();
        } catch { /* ignora */ }
    };

    return (
        <Modal
            aberto={true}
            aoFechar={aoFechar}
            titulo={`Acolhimento — ${colaborador.full_name}`}
            subtitulo="Lista de verificação do primeiro dia"
        >
            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : (
                <>
                    <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto">
                        {itens.length === 0 && <p className="text-dim text-sm">Ainda não há itens. Adicione o primeiro abaixo.</p>}
                        {itens.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => alternar(item.id)}
                                className="flex items-center gap-3 px-3 py-2.5 border border-line rounded-lg cursor-pointer hover:border-pri"
                            >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] flex-shrink-0 ${item.done ? "bg-ok text-white" : "bg-line2 text-dim"
                                    }`}>
                                    {item.done ? "✓" : ""}
                                </span>
                                <span className={`text-[12.8px] ${item.done ? "text-strong" : "text-ink"}`}>
                                    {item.description}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2.5">
                        <input
                            value={novoItem}
                            onChange={(e) => setNovoItem(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") adicionar(); }}
                            placeholder="Novo item (ex.: Entrega de equipamento)"
                            className="flex-1 bg-panel border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-pri"
                        />
                        <button
                            onClick={adicionar}
                            disabled={!novoItem.trim()}
                            className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40"
                        >
                            Adicionar
                        </button>
                    </div>
                    <p className="text-dim text-[11px] mt-2">Clique num item para marcar/desmarcar como concluído.</p>
                </>
            )}
        </Modal>
    );
}

// ---- Modal de lançamento de dados de RH ----
function ModalDadosRh({ colaborador, aoFechar, aoGuardar }: { colaborador: Colaborador; aoFechar: () => void; aoGuardar: () => void }) {
    const [sub, setSub] = useState<"ficha" | "exame" | "salario" | "assiduidade" | "percurso" | "documentos" | "assinaturas" | "leituras">("ficha");
    const [msg, setMsg] = useState("");
    const [erro, setErro] = useState("");

    const feito = (t: string) => { setMsg(t); setErro(""); };
    const falhou = (e: any) => { setErro(e.response?.data?.detail || "Erro."); setMsg(""); };

    // Exame
    const [fitness, setFitness] = useState("apto");
    const [examDate, setExamDate] = useState("");
    const [nextExam, setNextExam] = useState("");
    const [restricao, setRestricao] = useState("");

    // Salário
    const [year, setYear] = useState(new Date().getFullYear());
    const [gross, setGross] = useState("");
    const [grade, setGrade] = useState("");

    // Assiduidade
    const [period, setPeriod] = useState("");
    const [present, setPresent] = useState("");
    const [justified, setJustified] = useState("");
    const [unjustified, setUnjustified] = useState("");
    const [vacation, setVacation] = useState("");

    // Ficha profissional
    const [empNumber, setEmpNumber] = useState("");
    const [admission, setAdmission] = useState("");
    const [contractType, setContractType] = useState("");
    const [contractEndDate, setContractEndDate] = useState("");
    const [jobCategory, setJobCategory] = useState("");
    const [department, setDepartment] = useState("");
    const [workplace, setWorkplace] = useState("");
    const [fichaCarregada, setFichaCarregada] = useState(false);
    const [jobTitle, setJobTitle] = useState("");
    const [workSchedule, setWorkSchedule] = useState("");
    const [situationTags, setSituationTags] = useState("");
    const [nationality, setNationality] = useState("");
    const [habilitacoes, setHabilitacoes] = useState("");
    const [university, setUniversity] = useState("");
    const [course, setCourse] = useState("");
    const [cv, setCv] = useState("");

    // Horário — regime fixo (entrada/saída/intervalo) ou turno (catálogo da empresa).
    const [workScheduleType, setWorkScheduleType] = useState("");
    const [fixedEntryTime, setFixedEntryTime] = useState("");
    const [fixedExitTime, setFixedExitTime] = useState("");
    const [fixedBreakStart, setFixedBreakStart] = useState("");
    const [fixedBreakEnd, setFixedBreakEnd] = useState("");
    const [shiftId, setShiftId] = useState("");
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [turnosCarregados, setTurnosCarregados] = useState(false);
    const carregarTurnos = () => {
        if (turnosCarregados) return;
        setTurnosCarregados(true);
        api.get("/companies/shifts").then((r) => setTurnos(r.data || [])).catch(() => setTurnos([]));
    };

    // Formação, experiência e certificações (JSON do perfil) — apenas leitura nesta ficha.
    interface FormacaoLinha { nivel: string; anoInicio: string; anoFim: string; pais: string; }
    const [formacao, setFormacao] = useState<FormacaoLinha[]>([]);
    interface ExperienciaLinha { onde: string; anoInicio: string; anoFim: string; funcao: string; }
    const [experiencia, setExperiencia] = useState<ExperienciaLinha[]>([]);
    interface CertificacaoLinha { nome: string; instituicao: string; data: string; validade: string; }
    const [certificacoes, setCertificacoes] = useState<CertificacaoLinha[]>([]);

    // IA — universidades e cursos
    const [universities, setUniversities] = useState<string[]>([]);
    const [coursesList, setCoursesList] = useState<string[]>([]);
    const [loadingUniv, setLoadingUniv] = useState(false);
    const [loadingCourses, setLoadingCourses] = useState(false);

    // Buscar universidades quando a nacionalidade muda
    useEffect(() => {
        if (!nationality.trim() || nationality.length < 4) {
            setUniversities([]);
            setUniversity("");
            setCoursesList([]);
            setCourse("");
            return;
        }
        setLoadingUniv(true);
        const timer = setTimeout(() => {
            api.post("/ai/universities", { country: nationality })
                .then((r) => setUniversities(r.data || []))
                .catch(() => setUniversities([]))
                .finally(() => setLoadingUniv(false));
        }, 600);
        return () => clearTimeout(timer);
    }, [nationality]);

    // Buscar cursos quando a universidade muda
    useEffect(() => {
        if (!university.trim() || university.trim().length < 4) {
            setCoursesList([]);
            setCourse("");
            return;
        }
        setLoadingCourses(true);
        const timer = setTimeout(() => {
            api.post("/ai/courses", { university, country: nationality })
                .then((r) => setCoursesList(r.data || []))
                .catch(() => setCoursesList([]))
                .finally(() => setLoadingCourses(false));
        }, 800);
        return () => clearTimeout(timer);
    }, [university]);

    // Cargos (IA) — menu de sugestões para o campo "Cargo".
    const [cargos, setCargos] = useState<string[]>([]);
    const [cargosCarregados, setCargosCarregados] = useState(false);
    const carregarCargos = () => {
        if (cargosCarregados) return;
        setCargosCarregados(true);
        api.post("/ai/job-titles", {})
            .then((r) => setCargos(r.data || []))
            .catch(() => setCargos([]));
    };

    // Países (IA) — lista mundial para a nacionalidade.
    const [paises, setPaises] = useState<string[]>([]);
    const [paisesCarregados, setPaisesCarregados] = useState(false);
    const carregarPaises = () => {
        if (paisesCarregados) return;
        setPaisesCarregados(true);
        api.post("/ai/countries", {})
            .then((r) => setPaises(r.data || []))
            .catch(() => setPaises([]));
    };

    // Dados da conta (nome e email) — editáveis para corrigir erros de cadastro.
    const [fullName, setFullName] = useState(colaborador.full_name || "");
    const [email, setEmail] = useState(colaborador.email || "");

    // Documentos do colaborador
    const [documentos, setDocumentos] = useState<{ id: number; filename: string; doc_type?: string | null; file_url?: string | null }[]>([]);
    const [tipoDoc, setTipoDoc] = useState("bi");
    const [ficheiroDoc, setFicheiroDoc] = useState<File | null>(null);
    const [aEnviarDoc, setAEnviarDoc] = useState(false);

    // Assinaturas e leituras do colaborador
    const [assinaturas, setAssinaturas] = useState<{ signature_type: string; signed_at: string }[]>([]);
    const [leituras, setLeituras] = useState<{ title: string; read_at: string }[]>([]);

    useEffect(() => {
        api.get(`/collaborators/${colaborador.id}/signatures`).then((r) => setAssinaturas(r.data)).catch(() => setAssinaturas([]));
        api.get(`/collaborators/${colaborador.id}/document-reads`).then((r) => setLeituras(r.data)).catch(() => setLeituras([]));
    }, [colaborador.id]);

    const carregarDocumentos = () => {
        api.get(`/collaborators/${colaborador.id}/documents`)
            .then((r) => setDocumentos(r.data))
            .catch(() => setDocumentos([]));
    };

    useEffect(() => { carregarDocumentos(); }, [colaborador.id]);

    const enviarDoc = async () => {
        if (!ficheiroDoc) return;
        setAEnviarDoc(true);
        try {
            const dados = new FormData();
            dados.append("file", ficheiroDoc);
            dados.append("doc_type", tipoDoc);
            await api.post(`/collaborators/${colaborador.id}/documents`, dados);
            setFicheiroDoc(null);
            carregarDocumentos();
            feito("Documento carregado.");
        } catch (e) { falhou(e); }
        finally { setAEnviarDoc(false); }
    };

    const apagarDoc = async (docId: number) => {
        if (!confirm("Apagar este documento?")) return;
        try {
            await api.delete(`/collaborators/${colaborador.id}/documents/${docId}`);
            carregarDocumentos();
            feito("Documento removido.");
        } catch (e) { falhou(e); }
    };

    // Evento de percurso
    const [eventType, setEventType] = useState("promocao");
    const [eventDate, setEventDate] = useState("");
    const [eventTitle, setEventTitle] = useState("");
    const [eventDesc, setEventDesc] = useState("");

    // Carrega a ficha atual do colaborador ao abrir.
    useEffect(() => {
        api.get(`/collaborators/${colaborador.id}/profile`)
            .then((r) => {
                const p = r.data;
                setEmpNumber(p.employee_number || "");
                setAdmission(p.admission_date || "");
                setContractType(p.contract_type || "");
                setContractEndDate(p.contract_end_date || "");
                setJobCategory(p.job_category || "");
                setDepartment(p.department || "");
                setWorkplace(p.workplace || "");
                setJobTitle(p.job_title || "");
                setWorkSchedule(p.work_schedule || "");
                setWorkScheduleType(p.work_schedule_type || "");
                setFixedEntryTime(p.fixed_entry_time || "");
                setFixedExitTime(p.fixed_exit_time || "");
                setFixedBreakStart(p.fixed_break_start || "");
                setFixedBreakEnd(p.fixed_break_end || "");
                setShiftId(p.shift_id ? String(p.shift_id) : "");
                setSituationTags(p.situation_tags || "");
                setNationality(p.nationality || "");
                setHabilitacoes(p.habilitacoes || "");
                setUniversity(p.university || "");
                setCourse(p.course || "");
                setCv(p.cv || "");
                // Carrega formação, experiência e certificações do JSON.
                if (Array.isArray(p.education)) {
                    setFormacao(p.education.map((e: any) => ({
                        nivel: e.nivel || "", anoInicio: e.ano_inicio ? String(e.ano_inicio) : "",
                        anoFim: e.ano_fim ? String(e.ano_fim) : "", pais: e.pais || "",
                    })));
                }
                if (Array.isArray(p.experience)) {
                    setExperiencia(p.experience.map((x: any) => ({
                        onde: x.onde || "", anoInicio: x.ano_inicio ? String(x.ano_inicio) : "",
                        anoFim: x.ano_fim ? String(x.ano_fim) : "", funcao: x.funcao || "",
                    })));
                }
                if (Array.isArray(p.certifications)) {
                    setCertificacoes(p.certifications.map((c: any) => ({
                        nome: c.nome || "", instituicao: c.instituicao || "",
                        data: c.data || "", validade: c.validade || "",
                    })));
                }
            })
            .catch(() => { })
            .finally(() => setFichaCarregada(true));
    }, [colaborador.id]);

    const gravarEvento = async () => {
        try {
            await api.post("/career/events", {
                collaborator_id: colaborador.id,
                event_type: eventType,
                event_date: eventDate,
                title: eventTitle,
                description: eventDesc || null,
            });
            aoGuardar();
        } catch (e) { falhou(e); }
    };
    const gravarFicha = async () => {
        if (contractType === "termo_certo" && !contractEndDate) {
            falhou({ response: { data: { detail: "Contrato por tempo determinado exige a data de término." } } });
            return;
        }
        if (workScheduleType === "fixo" && (!fixedEntryTime || !fixedExitTime)) {
            falhou({ response: { data: { detail: "Horário fixo exige hora de entrada e hora de saída." } } });
            return;
        }
        if (workScheduleType === "turno" && !shiftId) {
            falhou({ response: { data: { detail: "Escolha o turno do colaborador." } } });
            return;
        }
        try {
            // Guarda os dados da conta (nome e email) se mudaram.
            if (fullName !== colaborador.full_name || email !== colaborador.email) {
                await api.patch(`/collaborators/${colaborador.id}`, { full_name: fullName, email: email });
            }
            await api.put(`/collaborators/${colaborador.id}/profile`, {
                employee_number: empNumber || null,
                admission_date: admission || null,
                contract_type: contractType || null,
                contract_end_date: contractType === "termo_certo" ? (contractEndDate || null) : null,
                job_category: jobCategory || null,
                job_title: jobTitle || null,
                department: department || null,
                workplace: workplace || null,
                work_schedule: workSchedule || null,
                work_schedule_type: workScheduleType || null,
                fixed_entry_time: workScheduleType === "fixo" ? (fixedEntryTime || null) : null,
                fixed_exit_time: workScheduleType === "fixo" ? (fixedExitTime || null) : null,
                fixed_break_start: workScheduleType === "fixo" ? (fixedBreakStart || null) : null,
                fixed_break_end: workScheduleType === "fixo" ? (fixedBreakEnd || null) : null,
                shift_id: workScheduleType === "turno" ? (shiftId ? Number(shiftId) : null) : null,
                situation_tags: situationTags || null,
                nationality: nationality || null,
                habilitacoes: habilitacoes || null,
                university: university || null,
                course: course || null,
                cv: cv || null,
                education: formacao.map((f) => ({
                    nivel: f.nivel || null,
                    ano_inicio: f.anoInicio ? Number(f.anoInicio) : null,
                    ano_fim: f.anoFim ? Number(f.anoFim) : null,
                    pais: f.pais || null,
                })),
                experience: experiencia.map((x) => ({
                    onde: x.onde || null,
                    ano_inicio: x.anoInicio ? Number(x.anoInicio) : null,
                    ano_fim: x.anoFim ? Number(x.anoFim) : null,
                    funcao: x.funcao || null,
                })),
                certifications: certificacoes
                    .filter((c) => c.nome.trim())
                    .map((c) => ({
                        nome: c.nome || null,
                        instituicao: c.instituicao || null,
                        data: c.data || null,
                        validade: c.validade || null,
                    })),
            });
            aoGuardar();
        } catch (e) { falhou(e); }
    };
    const gravarExame = async () => {
        try {
            await api.post("/occupational-health/exams", {
                collaborator_id: colaborador.id, fitness, exam_date: examDate,
                next_exam_date: nextExam || null, restriction_note: restricao || null,
            });
            aoGuardar();
        } catch (e) { falhou(e); }
    };

    const gravarSalario = async () => {
        try {
            await api.post("/compensation/salary", {
                collaborator_id: colaborador.id, year, gross_salary: Number(gross),
                salary_grade: grade || null,
            });
            aoGuardar();
        } catch (e) { falhou(e); }
    };

    const gravarAssiduidade = async () => {
        try {
            await api.post("/compensation/attendance", {
                collaborator_id: colaborador.id, period,
                present_days: Number(present) || 0,
                justified_absences: Number(justified) || 0,
                unjustified_absences: Number(unjustified) || 0,
                vacation_days_taken: Number(vacation) || 0,
            });
            aoGuardar();
        } catch (e) { falhou(e); }
    };

    const inputCls = "w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri";
    const btnSub = (s: string, label: string) =>
        <button onClick={() => setSub(s as any)}
            className={`px-3 py-1.5 text-[12px] rounded-lg ${sub === s ? "bg-pri text-white" : "bg-panel text-dim border border-line"}`}>
            {label}
        </button>;

    return (
        <Modal aberto={true} aoFechar={aoFechar} titulo={`Dados de RH — ${colaborador.full_name}`}
            subtitulo="Lançamento de exames, salários e assiduidade">
            <div className="flex gap-2 mb-4 flex-wrap">
                {btnSub("ficha", "Ficha")}
                {btnSub("exame", "Exame de saúde")}
                {btnSub("salario", "Salário")}
                {btnSub("assiduidade", "Assiduidade")}
                {btnSub("percurso", "Percurso")}
                {btnSub("documentos", "Documentos")}

                {btnSub("assinaturas", "Assinaturas")}
                {btnSub("leituras", "Leituras")}
            </div>

            {msg && <div className="border-l-[3px] border-ok bg-ok-bg rounded-r-lg px-3 py-2 text-[12px] mb-3">{msg}</div>}
            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}

            {sub === "ficha" && (
                <div>
                    <div className="bg-panel border border-line rounded-lg p-3 mb-3">
                        <p className="text-[10px] uppercase tracking-wide text-dim mb-2 font-semibold">Dados da conta</p>
                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Nome completo</label>
                        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                        <p className="text-[10px] text-dim">O email é usado para iniciar sessão. Alterá-lo muda as credenciais de acesso.</p>
                    </div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Nº de colaborador</label>
                    <input value={empNumber} readOnly disabled className={inputCls + " opacity-60 cursor-not-allowed"} placeholder="Gerado automaticamente" />
                    <p className="text-[10.5px] text-dim mb-3 -mt-1">Número atribuído automaticamente pelo sistema.</p>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Data de admissão</label>
                    <input type="date" value={admission} onChange={(e) => setAdmission(e.target.value)} className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Tipo de vínculo</label>
                    <select value={contractType} onChange={(e) => setContractType(e.target.value)} className={inputCls}>
                        <option value="">— escolher —</option>
                        <option value="termo_certo">Tempo determinado</option>
                        <option value="efetivo">Por tempo indeterminado</option>
                    </select>
                    {contractType === "termo_certo" && (
                        <>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Término do contrato</label>
                            <input value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} type="date" min={admission || undefined} className={inputCls} />
                        </>
                    )}
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Cargo</label>
                    <AutocompleteIA
                        value={jobTitle}
                        onChange={setJobTitle}
                        options={cargos}
                        onFocus={carregarCargos}
                        placeholder="Escreva ou escolha o cargo"
                        className={inputCls}
                    />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Categoria (nível)</label>
                    <select
                        value={["Júnior", "Pleno", "Sénior", "Especialista"].includes(jobCategory) ? jobCategory : jobCategory ? "Outro:" + jobCategory : ""}
                        onChange={(e) => setJobCategory(
                            e.target.value.startsWith("Outro:") ? e.target.value.slice(6) : e.target.value
                        )}
                        disabled={!jobTitle.trim()}
                        className={inputCls}
                    >
                        <option value="">{jobTitle.trim() ? "— escolher nível —" : "Defina o cargo primeiro"}</option>
                        <option value="Júnior">Júnior</option>
                        <option value="Pleno">Pleno</option>
                        <option value="Sénior">Sénior</option>
                        <option value="Especialista">Especialista</option>
                        {jobCategory && !["Júnior", "Pleno", "Sénior", "Especialista"].includes(jobCategory) && (
                            <option value={`Outro:${jobCategory}`}>{jobCategory}</option>
                        )}
                    </select>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Direção/Departamento</label>
                    <DirecaoField value={department} onChange={setDepartment} className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Local de trabalho</label>
                    <input value={workplace} onChange={(e) => setWorkplace(e.target.value)} className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Horário de trabalho (nota livre, opcional)</label>
                    <input value={workSchedule} onChange={(e) => setWorkSchedule(e.target.value)} placeholder="Ex.: 2.ª a 6.ª · 08h00-16h30" className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Regime de horário</label>
                    <select value={workScheduleType} onChange={(e) => setWorkScheduleType(e.target.value)} onFocus={carregarTurnos} className={inputCls}>
                        <option value="">— escolher —</option>
                        <option value="fixo">Horário fixo</option>
                        <option value="turno">Regime de turno</option>
                    </select>
                    {workScheduleType === "fixo" && (
                        <div className="grid grid-cols-2 gap-x-3">
                            <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Entrada</label>
                                <input value={fixedEntryTime} onChange={(e) => setFixedEntryTime(e.target.value)} type="time" className={inputCls} /></div>
                            <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Saída</label>
                                <input value={fixedExitTime} onChange={(e) => setFixedExitTime(e.target.value)} type="time" className={inputCls} /></div>
                            <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Início do intervalo</label>
                                <input value={fixedBreakStart} onChange={(e) => setFixedBreakStart(e.target.value)} type="time" className={inputCls} /></div>
                            <div><label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Fim do intervalo</label>
                                <input value={fixedBreakEnd} onChange={(e) => setFixedBreakEnd(e.target.value)} type="time" className={inputCls} /></div>
                        </div>
                    )}
                    {workScheduleType === "turno" && (
                        <>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Turno</label>
                            <select value={shiftId} onChange={(e) => setShiftId(e.target.value)} className={inputCls}>
                                <option value="">— escolher turno —</option>
                                {turnos.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.start_time}–{t.end_time})</option>
                                ))}
                            </select>
                            {turnosCarregados && turnos.length === 0 && (
                                <p className="text-[10.5px] text-dim mb-3 -mt-1">
                                    Nenhum turno configurado. Peça à Administração para os configurar em Administração → Turnos.
                                </p>
                            )}
                        </>
                    )}
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Etiquetas de situação (separadas por vírgula)</label>
                    <input value={situationTags} onChange={(e) => setSituationTags(e.target.value)} placeholder="Ex.: promovido 2025, Chefia" className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Nacionalidade</label>
                    <AutocompleteIA
                        value={nationality}
                        onChange={setNationality}
                        options={paises.length ? paises : PAISES}
                        onFocus={carregarPaises}
                        placeholder="Escreva ou escolha o país"
                        className={inputCls}
                    />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Habilitações literárias</label>
                    <input value={habilitacoes} onChange={(e) => setHabilitacoes(e.target.value)} placeholder="Ex.: Licenciatura" className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Universidade</label>
                    <AutocompleteIA
                        value={university}
                        onChange={setUniversity}
                        options={universities}
                        loading={loadingUniv}
                        disabled={!nationality.trim()}
                        placeholder={loadingUniv ? "A carregar sugestões..." : "Digite ou escolha a universidade"}
                        className={inputCls}
                    />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Curso</label>
                    <AutocompleteIA
                        value={course}
                        onChange={setCourse}
                        options={coursesList}
                        loading={loadingCourses}
                        disabled={!university.trim()}
                        placeholder={loadingCourses ? "A carregar sugestões..." : "Digite ou escolha o curso"}
                        className={inputCls}
                    />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">CV / Notas</label>
                    <textarea value={cv} onChange={(e) => setCv(e.target.value)} rows={5} placeholder="Biografia, experiência profissional, competências — o RH digitaliza aqui." className={`${inputCls} resize-y`} />

                    {/* Formação académica guardada */}
                    {formacao.length > 0 && (
                        <div className="mt-3">
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Formação académica</label>
                            <div className="space-y-1">
                                {formacao.map((f, i) => (
                                    <div key={i} className="flex gap-2 text-[12px] px-2 py-1 bg-panel border border-line rounded-lg">
                                        <span className="font-semibold text-ink">{f.nivel || "—"}</span>
                                        {f.anoInicio && <span className="text-dim">{f.anoInicio}{f.anoFim ? ` – ${f.anoFim}` : ""}</span>}
                                        {f.pais && <span className="text-dim">— {f.pais}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Experiência profissional guardada */}
                    {experiencia.length > 0 && (
                        <div className="mt-3">
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Experiência profissional</label>
                            <div className="space-y-1">
                                {experiencia.map((x, i) => (
                                    <div key={i} className="flex gap-2 text-[12px] px-2 py-1 bg-panel border border-line rounded-lg">
                                        {x.onde && <span className="font-semibold text-ink">{x.onde}</span>}
                                        {x.anoInicio && <span className="text-dim">{x.anoInicio}{x.anoFim ? ` – ${x.anoFim}` : ""}</span>}
                                        {x.funcao && <span className="text-dim">— {x.funcao}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cursos e certificações guardados */}
                    {certificacoes.length > 0 && (
                        <div className="mt-3">
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Cursos e certificações</label>
                            <div className="space-y-1">
                                {certificacoes.map((c, i) => (
                                    <div key={i} className="flex gap-2 text-[12px] px-2 py-1 bg-panel border border-line rounded-lg">
                                        {c.nome && <span className="font-semibold text-ink">{c.nome}</span>}
                                        {c.instituicao && <span className="text-dim">— {c.instituicao}</span>}
                                        {c.data && <span className="text-dim">({c.data})</span>}
                                        {c.validade && <span className="text-dim">válido até {c.validade}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 mt-4">
                        <button onClick={gravarFicha} disabled={!fichaCarregada}
                            className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                            Guardar ficha
                        </button>
                        <button
                            onClick={async () => {
                                const token = localStorage.getItem("kamba_token");
                                const url = `${api.defaults.baseURL}/collaborators/${colaborador.id}/cv-pdf`;
                                const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                                const blob = await resp.blob();
                                const blobUrl = URL.createObjectURL(blob);
                                window.open(blobUrl, "_blank");
                            }}
                            className="inline-flex items-center gap-1.5 bg-panel border border-line rounded-lg px-4 py-2 text-[12.3px] font-semibold text-ink hover:border-pri hover:text-pri transition-colors"
                        >
                            Gerar CV (PDF)
                        </button>
                    </div>
                </div>
            )}

            {sub === "exame" && (

                <div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Aptidão</label>
                    <select value={fitness} onChange={(e) => setFitness(e.target.value)} className={inputCls}>
                        <option value="apto">Apto</option>
                        <option value="apto_com_restricoes">Apto com restrições</option>
                        <option value="inapto">Inapto</option>
                    </select>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Data do exame</label>
                    <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Próximo exame (opcional)</label>
                    <input type="date" value={nextExam} onChange={(e) => setNextExam(e.target.value)} className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Nota de restrição (opcional)</label>
                    <input value={restricao} onChange={(e) => setRestricao(e.target.value)} className={inputCls} />
                    <button onClick={gravarExame} disabled={!examDate}
                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                        Registar exame
                    </button>
                </div>
            )}

            {sub === "salario" && (
                <div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Ano</label>
                    <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Vencimento bruto (Kz)</label>
                    <input type="number" value={gross} onChange={(e) => setGross(e.target.value)} className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Enquadramento (opcional)</label>
                    <input value={grade} onChange={(e) => setGrade(e.target.value)} className={inputCls} />
                    <button onClick={gravarSalario} disabled={!gross}
                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                        Registar salário
                    </button>
                </div>
            )}

            {sub === "assiduidade" && (
                <div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Período</label>
                    <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Ex.: 2026" className={inputCls} />
                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Presenças</label>
                            <input type="number" value={present} onChange={(e) => setPresent(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Férias gozadas</label>
                            <input type="number" value={vacation} onChange={(e) => setVacation(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Faltas justificadas</label>
                            <input type="number" value={justified} onChange={(e) => setJustified(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Faltas injustificadas</label>
                            <input type="number" value={unjustified} onChange={(e) => setUnjustified(e.target.value)} className={inputCls} />
                        </div>
                    </div>
                    <button onClick={gravarAssiduidade} disabled={!period}
                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                        Registar assiduidade
                    </button>
                </div>
            )}

            {sub === "percurso" && (
                <div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Tipo de evento</label>
                    <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={inputCls}>
                        <option value="promocao">Promoção</option>
                        <option value="nomeacao">Nomeação</option>
                        <option value="louvor">Louvor</option>
                        <option value="outro">Outro</option>
                    </select>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Data</label>
                    <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Título</label>
                    <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Ex.: Promovido a Coordenador" className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Descrição (opcional)</label>
                    <textarea value={eventDesc} onChange={(e) => setEventDesc(e.target.value)} rows={2} className={inputCls} />
                    <button onClick={gravarEvento} disabled={!eventDate || !eventTitle}
                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                        Registar no percurso
                    </button>
                </div>
            )}
            {sub === "documentos" && (
                <div>
                    <p className="text-dim text-[11.5px] mb-3">
                        Documentos do vínculo (BI, contrato, certificados). Para substituir, apague o antigo e carregue o novo.
                    </p>

                    {documentos.length === 0 ? (
                        <p className="text-dim text-sm py-3 text-center">Ainda não há documentos carregados.</p>
                    ) : (
                        <div className="space-y-2 mb-4">
                            {documentos.map((d) => (
                                <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 border border-line rounded-lg">
                                    <div className="w-8 h-8 rounded-lg bg-pri-bg text-pri-dark flex items-center justify-center text-[12px] font-semibold flex-shrink-0">
                                        {(d.doc_type || d.filename).slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <b className="block text-[12.5px] text-strong truncate">{d.filename}</b>
                                        <span className="text-[10.5px] text-dim">{d.doc_type}</span>
                                    </div>
                                    {d.file_url && (
                                        <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-pri font-semibold hover:underline">Abrir</a>
                                    )}
                                    <button onClick={() => apagarDoc(d.id)} className="text-[11px] text-bad font-semibold hover:underline">Apagar</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="border-t border-line pt-3">
                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Tipo de documento</label>
                        <select value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)} className={inputCls}>
                            <option value="bi">Bilhete de Identidade</option>
                            <option value="contrato_assinado">Contrato assinado</option>
                            <option value="certificado_habilitacoes">Certificado de habilitações</option>
                            <option value="outro">Outro</option>
                        </select>
                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Ficheiro</label>
                        <input type="file" onChange={(e) => setFicheiroDoc(e.target.files?.[0] || null)}
                            className="w-full bg-panel border border-line rounded-lg px-3 py-[7px] text-[12.5px] mb-3 focus:outline-none focus:border-pri" />
                        <button onClick={enviarDoc} disabled={!ficheiroDoc || aEnviarDoc}
                            className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                            {aEnviarDoc ? "A carregar..." : "Carregar documento"}
                        </button>
                    </div>
                </div>
            )}


            {sub === "assinaturas" && (
                <div>
                    <p className="text-dim text-[11.5px] mb-3">
                        As três declarações de adesão e a data em que foram assinadas (carimbo temporal).
                    </p>
                    {(() => {
                        const LABELS: Record<string, string> = {
                            regulamento_politicas: "Adesão ao Regulamento e Políticas",
                            termos_portal: "Termos de Utilização do Portal",
                            consentimento_dados: "Consentimento de Dados (Lei 22/11)",
                        };
                        const tipos = ["regulamento_politicas", "termos_portal", "consentimento_dados"];
                        return (
                            <div className="space-y-2">
                                {tipos.map((t) => {
                                    const a = assinaturas.find((x) => x.signature_type === t);
                                    return (
                                        <div key={t} className="flex items-center justify-between gap-3 px-3 py-2.5 border border-line rounded-lg">
                                            <span className="text-[12.5px] text-ink">{LABELS[t]}</span>
                                            {a ? (
                                                <span className="text-[11px] text-ok font-semibold whitespace-nowrap">
                                                    ? {new Date(a.signed_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-warn font-semibold whitespace-nowrap">Pendente</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}

            {sub === "leituras" && (
                <div>
                    <p className="text-dim text-[11.5px] mb-3">
                        Documentos que o colaborador leu e registou (prova de comunicação das normas).
                    </p>
                    {leituras.length === 0 ? (
                        <p className="text-dim text-sm py-3 text-center">Ainda não registou nenhuma leitura.</p>
                    ) : (
                        <div className="space-y-2">
                            {leituras.map((l, i) => (
                                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 border border-line rounded-lg">
                                    <span className="text-[12.5px] text-ink">{l.title}</span>
                                    <span className="text-[11px] text-dim whitespace-nowrap">
                                        {new Date(l.read_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

        </Modal>
    );
}




// ---- Modal de mudança de perfil ----
function ModalMudarPerfil({ colaborador, aoFechar, aoMudar }: { colaborador: Colaborador; aoFechar: () => void; aoMudar: () => void }) {
    const [novoRole, setNovoRole] = useState(colaborador.role);
    const [erro, setErro] = useState("");
    const [aGuardar, setAGuardar] = useState(false);

    const guardar = async () => {
        setErro("");
        setAGuardar(true);
        try {
            await api.patch(`/collaborators/${colaborador.id}/role`, { role: novoRole });
            aoMudar();
        } catch (err: any) {
            setErro(msgErro(err, "Não foi possível mudar o perfil."));
        } finally {
            setAGuardar(false);
        }
    };

    return (
        <Modal aberto={true} aoFechar={aoFechar} titulo={`Mudar perfil — ${colaborador.full_name}`} subtitulo="Altere o perfil de acesso deste colaborador">
            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Novo perfil</label>
            <select value={novoRole} onChange={(e) => setNovoRole(e.target.value)}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-4 focus:outline-none focus:border-pri">
                <option value="colaborador">Colaborador</option>
                <option value="director">Director</option>
                <option value="capital_humano">Capital Humano</option>
                <option value="comissao">Comissão de Avaliação</option>
                <option value="administracao">Administração</option>
            </select>
            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}
            <div className="flex gap-2.5">
                <button onClick={aoFechar} className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors">Cancelar</button>
                <button onClick={guardar} disabled={aGuardar || novoRole === colaborador.role}
                    className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                    {aGuardar ? "A guardar..." : "Mudar perfil"}
                </button>
            </div>
        </Modal>
    );
}

// ---- Modal de pedidos de correção de ficha (CH / Administração) ----
function ModalCorrecoesFicha({ aoFechar }: { aoFechar: () => void }) {
    const [pedidos, setPedidos] = useState<PedidoFicha[]>([]);
    const [nomes, setNomes] = useState<Record<number, string>>({});
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");

    const carregar = () => {
        setACarregar(true);
        setErro("");
        Promise.all([
            api.get("/ficha-corrections").then((r) => setPedidos(r.data)),
            api.get("/collaborators").then((r) => {
                const mapa: Record<number, string> = {};
                r.data.forEach((c: Colaborador) => { mapa[c.id] = c.full_name; });
                setNomes(mapa);
            }),
        ]).catch((err) => setErro(msgErro(err, "Erro ao carregar os pedidos.")))
            .finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    const resolver = async (id: number) => {
        try {
            await api.post(`/ficha-corrections/${id}/resolve`);
            carregar();
        } catch (err: any) {
            alert(msgErro(err, "Não foi possível resolver o pedido."));
        }
    };

    const pendentes = pedidos.filter((p) => p.status === "pendente").length;

    return (
        <Modal aberto={true} aoFechar={aoFechar} titulo="Pedidos de correção de ficha" subtitulo="Os colaboradores requerem correções à ficha; resolva depois de corrigir o dado.">
            {erro && <Notice variante="alert" className="mb-3">{erro}</Notice>}
            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : pedidos.length === 0 ? (
                <p className="text-dim text-sm py-4 text-center">Sem pedidos de correção neste momento.</p>
            ) : (
                <>
                    <div className="text-[11.5px] text-dim mb-3">{pendentes} pendente(s) · {pedidos.length} no total</div>
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                        {pedidos.map((p) => (
                            <div key={p.id} className="border border-line rounded-lg px-3 py-2.5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="text-[12.6px] font-semibold text-strong">{nomes[p.collaborator_id] || `Colaborador #${p.collaborator_id}`}</div>
                                        <div className="text-[12.3px] text-ink mt-0.5">{p.message}</div>
                                        <div className="text-[10.8px] text-dim mt-1">
                                            {new Date(p.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                            {p.resolved_at && ` · tratado em ${new Date(p.resolved_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })}`}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {p.status === "resolvido"
                                            ? <Tag variante="ok">Resolvido</Tag>
                                            : <Tag variante="warn">Pendente</Tag>}
                                        {p.status === "pendente" && (
                                            <button onClick={() => resolver(p.id)} className="text-[11.5px] font-semibold cursor-pointer hover:underline text-pri">
                                                Marcar resolvido
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </Modal>
    );
}

// ---- Menu de ações (três pontos) ----
import { useRef, useEffect as useEffectMenu } from "react";

// Extrai sempre uma mensagem de texto de um erro do axios/FastAPI.
// O FastAPI devolve 422 com detail = lista de objetos; isto evita passar
// um objeto ao React (que rebentaria a renderização).
function msgErro(err: any, fallback = "Ocorreu um erro."): string {
    const d = err?.response?.data?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map((x: any) => x?.msg || "").filter(Boolean).join("; ") || fallback;
    if (d && typeof d === "object") return d.msg || fallback;
    return fallback;
}



function MenuAcoes({ opcoes }: { opcoes: { label: string; onClick: () => void; perigo?: boolean; ok?: boolean }[] }) {
    const [aberto, setAberto] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const botaoRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Fecha ao clicar fora.
    useEffectMenu(() => {
        const fechar = (e: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target as Node) &&
                botaoRef.current && !botaoRef.current.contains(e.target as Node)
            ) setAberto(false);
        };
        document.addEventListener("mousedown", fechar);
        return () => document.removeEventListener("mousedown", fechar);
    }, []);

    const abrir = () => {
        if (botaoRef.current) {
            const r = botaoRef.current.getBoundingClientRect();
            const alturaMenu = opcoes.length * 38 + 8; // altura estimada do menu
            const espacoAbaixo = window.innerHeight - r.bottom;
            // Se não há espaço em baixo, abre para cima.
            const top = espacoAbaixo < alturaMenu + 20
                ? r.top - alturaMenu - 4   // abre por cima do botão
                : r.bottom + 4;            // abre por baixo do botão
            setPos({ top, left: r.right - 176 }); // 176 = largura do menu (w-44)
        }
        setAberto((a) => !a);
    };

    return (
        <>
            <button
                ref={botaoRef}
                onClick={abrir}
                className="w-8 h-8 rounded-lg hover:bg-panel flex items-center justify-center text-dim hover:text-strong transition-colors text-lg leading-none"
                aria-label="Ações"
            >
                ⋮
            </button>
            {aberto && (
                <div
                    ref={menuRef}
                    style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 100 }}
                    className="w-44 bg-paper border border-line rounded-xl shadow-lg py-1 flex flex-col"
                >
                    {opcoes.map((o, i) => (
                        <button
                            key={i}
                            onClick={() => { o.onClick(); setAberto(false); }}
                            className={`block w-full text-left px-3.5 py-2 text-[12.5px] hover:bg-panel transition-colors ${o.perigo ? "text-bad" : o.ok ? "text-ok" : "text-ink"
                                }`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}
