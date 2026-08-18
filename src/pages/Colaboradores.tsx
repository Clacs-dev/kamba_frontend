import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import FaixaKpis from "../components/FaixaKpis";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import Modal from "../components/Modal";
import Tag from "../components/ui/Tag";
import Notice from "../components/ui/Notice";
import Botao from "../components/ui/Botao";
import DocRow from "../components/ui/DocRow";

interface Colaborador {
    id: number;
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
}

interface PedidoFicha {
    id: number;
    collaborator_id: number;
    message: string;
    status: string;
    created_at: string;
    resolved_at: string | null;
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

export default function Colaboradores() {

    const { user } = useAuth();
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

    const podeCadastrar = user?.role === "capital_humano";
    const eGestao = user?.role === "capital_humano" || user?.role === "administracao";

    const carregar = () => {
        setACarregar(true);
        api.get("/collaborators")
            .then((resp) => setColaboradores(resp.data))
            .catch((err) => setErro(err.response?.data?.detail || "Erro ao carregar."))
            .finally(() => setACarregar(false));
    };

    const alternarEstado = async (c: Colaborador) => {
        const acao = c.is_active ? "deactivate" : "reactivate";
        try {
            await api.post(`/collaborators/${c.id}/${acao}`);
            carregar(); // recarrega a lista para refletir a mudança
        } catch (err: any) {
            alert(err.response?.data?.detail || "Não foi possível alterar o estado.");
        }
    };

    useEffect(() => { carregar(); }, []);

    const filtrados = colaboradores.filter((c) =>
        c.full_name.toLowerCase().includes(pesquisa.toLowerCase()) ||
        c.email.toLowerCase().includes(pesquisa.toLowerCase())
    );

    return (
        <div>
            <Cabecalho
                eyebrow="Gestão de pessoas"
                titulo="Colaboradores"
                descricao="A lista de colaboradores da sua empresa."
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
                    placeholder="Pesquisar por nome ou email…"
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
                        <table className="w-full text-[12.8px] min-w-[600px]">
                            <thead>
                                <tr>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Colaborador</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Email</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Perfil</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Situação</th>
                                    <th className="text-right text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.map((c) => (
                                    <tr key={c.id} className="hover:bg-panel transition-colors">
                                        <td className="px-3 py-2.5 border-b border-line2">
                                            <b className="text-strong">{c.full_name}</b>
                                        </td>
                                        <td className="px-3 py-2.5 border-b border-line2 text-ink">{c.email}</td>
                                        <td className="px-3 py-2.5 border-b border-line2 text-ink">{traduzPerfil(c.role)}</td>
                                        <td className="px-3 py-2.5 border-b border-line2">
                                            {c.is_active
                                                ? <Tag variante="ok">Ativo</Tag>
                                                : <Tag variante="bad">Inativo</Tag>}
                                        </td>

                                        <td className="px-3 py-2.5 border-b border-line2 text-right whitespace-nowrap">
                                            {podeCadastrar && (() => {
                                                const opcoes: { label: string; onClick: () => void; perigo?: boolean; ok?: boolean }[] = [];
                                                opcoes.push({ label: "Acolhimento", onClick: () => setAcolhimentoDe(c) });
                                                opcoes.push({ label: "Dados RH", onClick: () => setDadosRhDe(c) });
                                                if (c.id !== user?.id) {
                                                    opcoes.push({ label: "Mudar perfil", onClick: () => setMudarPerfilDe(c) });
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
                                ))}
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
const rotuloCampo = "block text-[10.5px] uppercase tracking-wide text-dim mb-1";
const campoCls = "w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri";

interface DocumentoColaborador { id: number; filename: string; doc_type?: string | null; }

function ModalCadastro({ aoFechar, aoCriar }: { aoFechar: () => void; aoCriar: () => void }) {
    // Passo 1 — dados de acesso.
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("colaborador");
    const [erro, setErro] = useState("");
    const [aCarregar, setACarregar] = useState(false);
    const [passwordTemp, setPasswordTemp] = useState<string | null>(null);
    const [novoId, setNovoId] = useState<number | null>(null);

    // Passo 2 — ficha profissional (opcional, mas recomendada no cadastro completo).
    const [empNumber, setEmpNumber] = useState("");
    const [admission, setAdmission] = useState("");
    const [contractType, setContractType] = useState("");
    const [jobCategory, setJobCategory] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [department, setDepartment] = useState("");
    const [workplace, setWorkplace] = useState("");
    const [workSchedule, setWorkSchedule] = useState("");
    const [situationTags, setSituationTags] = useState("");
    const [fichaGuardada, setFichaGuardada] = useState(false);
    const [erroFicha, setErroFicha] = useState("");
    const [aGuardarFicha, setAGuardarFicha] = useState(false);

    // Passo 3 — documentos do colaborador (upload de ficheiros: BI, contrato assinado, certificados…).
    const [tipoDocumento, setTipoDocumento] = useState("bi");
    const [ficheiro, setFicheiro] = useState<File | null>(null);
    const [documentos, setDocumentos] = useState<DocumentoColaborador[]>([]);
    const [aEnviarDoc, setAEnviarDoc] = useState(false);
    const [erroDoc, setErroDoc] = useState("");

    const criarConta = async () => {
        setErro("");
        setACarregar(true);
        try {
            const resp = await api.post("/collaborators", { full_name: fullName, email, role });
            // O backend devolve a password temporária — mostramo-la para o CH copiar.
            setPasswordTemp(resp.data.temporary_password);
            setNovoId(resp.data.id);
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao cadastrar.");
        } finally {
            setACarregar(false);
        }
    };

    const guardarFicha = async (): Promise<boolean> => {
        if (!novoId) return false;
        setErroFicha("");
        setAGuardarFicha(true);
        try {
            await api.put(`/collaborators/${novoId}/profile`, {
                employee_number: empNumber || null,
                admission_date: admission || null,
                contract_type: contractType || null,
                job_category: jobCategory || null,
                job_title: jobTitle || null,
                department: department || null,
                workplace: workplace || null,
                work_schedule: workSchedule || null,
                situation_tags: situationTags || null,
            });
            setFichaGuardada(true);
            return true;
        } catch (err: any) {
            setErroFicha(err.response?.data?.detail || "Erro ao guardar a ficha.");
            return false;
        } finally {
            setAGuardarFicha(false);
        }
    };

    const concluir = async () => {
        if (!novoId) return;
        if (!fichaGuardada) {
            const ok = await guardarFicha();
            if (!ok) return; // mantém o modal aberto para corrigir o erro
        }
        aoCriar();
    };

    const enviarDocumento = async () => {
        if (!novoId || !ficheiro) return;
        setErroDoc("");
        setAEnviarDoc(true);
        try {
            const dados = new FormData();
            dados.append("file", ficheiro);
            dados.append("doc_type", tipoDocumento);
            const resp = await api.post(`/collaborators/${novoId}/documents`, dados);
            setDocumentos((prev) => [...prev, resp.data]);
            setFicheiro(null);
        } catch (err: any) {
            setErroDoc(err.response?.data?.detail || "Não foi possível enviar o documento.");
        } finally {
            setAEnviarDoc(false);
        }
    };

    return (
        <Modal
            aberto={true}
            aoFechar={aoFechar}
            titulo="Cadastrar colaborador"
            subtitulo="Cadastro completo: conta de acesso, ficha profissional e documentos do vínculo"
        >
            {/* Passo 1 — Conta de acesso */}
            <h3 className="text-[14.5px] mb-2">1. Dados de acesso</h3>
            {passwordTemp ? (
                <Notice variante="soft" className="mb-4">
                    <b>Colaborador criado com sucesso!</b>
                    <div className="mt-2">Password temporária de primeiro acesso:</div>
                    <div className="font-mono text-[15px] text-strong bg-paper border border-line rounded-lg px-3 py-2 mt-1.5 select-all">
                        {passwordTemp}
                    </div>
                    <div className="text-dim text-[11px] mt-2">
                        Entregue esta password ao colaborador. Ele deve alterá-la no primeiro acesso.
                    </div>
                </Notice>
            ) : (
                <div className="mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                        <div>
                            <label className={rotuloCampo}>Nome completo</label>
                            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={campoCls} />
                        </div>
                        <div>
                            <label className={rotuloCampo}>Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={campoCls} />
                        </div>
                    </div>
                    <label className={rotuloCampo}>Perfil</label>
                    <select value={role} onChange={(e) => setRole(e.target.value)} className={campoCls}>
                        <option value="colaborador">Colaborador</option>
                        <option value="director">Director</option>
                        <option value="capital_humano">Capital Humano</option>
                        <option value="comissao">Comissão de Avaliação</option>
                        <option value="administracao">Administração</option>
                    </select>
                    {erro && <p className="text-bad text-sm mb-3">{erro}</p>}
                    <Botao onClick={criarConta} disabled={aCarregar || !fullName || !email}>
                        {aCarregar ? "A criar..." : "Criar conta"}
                    </Botao>
                </div>
            )}

            {/* Passo 2 — Ficha profissional */}
            <div className={novoId ? "" : "opacity-40 pointer-events-none select-none"}>
                <h3 className="text-[14.5px] mb-2 mt-1">2. Ficha profissional</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                    <div>
                        <label className={rotuloCampo}>Nº de colaborador</label>
                        <input value={empNumber} onChange={(e) => setEmpNumber(e.target.value)} className={campoCls} />
                    </div>
                    <div>
                        <label className={rotuloCampo}>Data de admissão</label>
                        <input type="date" value={admission} onChange={(e) => setAdmission(e.target.value)} className={campoCls} />
                    </div>
                    <div>
                        <label className={rotuloCampo}>Tipo de vínculo</label>
                        <select value={contractType} onChange={(e) => setContractType(e.target.value)} className={campoCls}>
                            <option value="">— escolher —</option>
                            <option value="efetivo">Efetivo</option>
                            <option value="termo_certo">Termo certo</option>
                            <option value="termo_incerto">Termo incerto</option>
                            <option value="estagio">Estágio</option>
                        </select>
                    </div>
                    <div>
                        <label className={rotuloCampo}>Categoria/Função</label>
                        <input value={jobCategory} onChange={(e) => setJobCategory(e.target.value)} className={campoCls} />
                    </div>
                    <div>
                        <label className={rotuloCampo}>Cargo específico</label>
                        <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Ex.: Chefe de Vendas" className={campoCls} />
                    </div>
                    <div>
                        <label className={rotuloCampo}>Direção/Departamento</label>
                        <input value={department} onChange={(e) => setDepartment(e.target.value)} className={campoCls} />
                    </div>
                    <div>
                        <label className={rotuloCampo}>Local de trabalho</label>
                        <input value={workplace} onChange={(e) => setWorkplace(e.target.value)} className={campoCls} />
                    </div>
                    <div>
                        <label className={rotuloCampo}>Horário de trabalho</label>
                        <input value={workSchedule} onChange={(e) => setWorkSchedule(e.target.value)} placeholder="Ex.: 2.ª a 6.ª · 08h00-16h30" className={campoCls} />
                    </div>
                    <div>
                        <label className={rotuloCampo}>Etiquetas de situação (separadas por vírgula)</label>
                        <input value={situationTags} onChange={(e) => setSituationTags(e.target.value)} placeholder="Ex.: promovido 2025, Chefia" className={campoCls} />
                    </div>
                </div>
                {erroFicha && <p className="text-bad text-sm mb-3">{erroFicha}</p>}
                {fichaGuardada && <Tag variante="ok" className="mb-3 block w-fit">Ficha guardada</Tag>}
                <Botao variante="ghost" onClick={guardarFicha} disabled={!novoId || aGuardarFicha}>
                    {aGuardarFicha ? "A guardar..." : "Guardar ficha"}
                </Botao>
            </div>

            {/* Passo 3 — Documentos do colaborador */}
            <div className={novoId ? "mt-5" : "mt-5 opacity-40 pointer-events-none select-none"}>
                <h3 className="text-[14.5px] mb-2">3. Documentos do colaborador</h3>
                <p className="text-dim text-[11px] mb-2">
                    Anexe cópias digitalizadas (BI, contrato assinado, certificados de habilitações, etc.).
                </p>
                {documentos.map((d) => (
                    <DocRow key={d.id} monograma={(d.doc_type || d.filename).slice(0, 2).toUpperCase()} titulo={d.filename} meta={d.doc_type || undefined} />
                ))}
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end mt-2">
                    <div className="flex-1">
                        <label className={rotuloCampo}>Tipo de documento</label>
                        <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} className={`${campoCls} mb-0`}>
                            <option value="bi">Bilhete de Identidade</option>
                            <option value="contrato_assinado">Contrato assinado</option>
                            <option value="certificado_habilitacoes">Certificado de habilitações</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className={rotuloCampo}>Ficheiro</label>
                        <input
                            type="file"
                            onChange={(e) => setFicheiro(e.target.files?.[0] || null)}
                            className="w-full bg-panel border border-line rounded-lg px-3 py-[7px] text-[12.5px] focus:outline-none focus:border-pri"
                        />
                    </div>
                    <Botao variante="ghost" onClick={enviarDocumento} disabled={!novoId || !ficheiro || aEnviarDoc}>
                        {aEnviarDoc ? "A enviar..." : "Anexar"}
                    </Botao>
                </div>
                {erroDoc && <p className="text-bad text-[11px] mt-2">{erroDoc}</p>}
            </div>

            <div className="flex gap-2.5 mt-5 pt-4 border-t border-line">
                <Botao variante="ghost" onClick={aoFechar}>Cancelar</Botao>
                <Botao onClick={concluir} disabled={!novoId || aGuardarFicha}>
                    {aGuardarFicha ? "A guardar ficha..." : "Concluir cadastro"}
                </Botao>
            </div>
        </Modal>
    );
}

// ---- Modal de gestão do acolhimento ----
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
function ModalDadosRh({ colaborador, aoFechar }: { colaborador: Colaborador; aoFechar: () => void }) {
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
    const [jobCategory, setJobCategory] = useState("");
    const [department, setDepartment] = useState("");
    const [workplace, setWorkplace] = useState("");
    const [fichaCarregada, setFichaCarregada] = useState(false);
    const [jobTitle, setJobTitle] = useState("");
    const [workSchedule, setWorkSchedule] = useState("");
    const [situationTags, setSituationTags] = useState("");

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
                setJobCategory(p.job_category || "");
                setDepartment(p.department || "");
                setWorkplace(p.workplace || "");
                setWorkplace(p.workplace || "");
                setJobTitle(p.job_title || "");
                setWorkSchedule(p.work_schedule || "");
                setSituationTags(p.situation_tags || "");
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
            feito("Evento de percurso registado.");
            setEventTitle(""); setEventDesc("");
        } catch (e) { falhou(e); }
    };
    const gravarFicha = async () => {
        try {
            await api.put(`/collaborators/${colaborador.id}/profile`, {
                employee_number: empNumber || null,
                admission_date: admission || null,
                contract_type: contractType || null,
                job_category: jobCategory || null,
                job_title: jobTitle || null,
                department: department || null,
                workplace: workplace || null,
                work_schedule: workSchedule || null,
                situation_tags: situationTags || null,
            });
            feito("Ficha atualizada.");
        } catch (e) { falhou(e); }
    };

    const gravarExame = async () => {
        try {
            await api.post("/occupational-health/exams", {
                collaborator_id: colaborador.id, fitness, exam_date: examDate,
                next_exam_date: nextExam || null, restriction_note: restricao || null,
            });
            feito("Exame registado.");
        } catch (e) { falhou(e); }
    };

    const gravarSalario = async () => {
        try {
            await api.post("/compensation/salary", {
                collaborator_id: colaborador.id, year, gross_salary: Number(gross),
                salary_grade: grade || null,
            });
            feito("Salário registado.");
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
            feito("Assiduidade registada.");
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
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Nº de colaborador</label>
                    <input value={empNumber} onChange={(e) => setEmpNumber(e.target.value)} className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Data de admissão</label>
                    <input type="date" value={admission} onChange={(e) => setAdmission(e.target.value)} className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Tipo de vínculo</label>
                    <select value={contractType} onChange={(e) => setContractType(e.target.value)} className={inputCls}>
                        <option value="">— escolher —</option>
                        <option value="efetivo">Efetivo</option>
                        <option value="termo_certo">Termo certo</option>
                        <option value="termo_incerto">Termo incerto</option>
                        <option value="estagio">Estágio</option>
                    </select>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Categoria/Função</label>
                    <input value={jobCategory} onChange={(e) => setJobCategory(e.target.value)} className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Cargo específico</label>
                    <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Ex.: Chefe de Vendas" className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Direção/Departamento</label>
                    <input value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Local de trabalho</label>
                    <input value={workplace} onChange={(e) => setWorkplace(e.target.value)} className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Horário de trabalho</label>
                    <input value={workSchedule} onChange={(e) => setWorkSchedule(e.target.value)} placeholder="Ex.: 2.ª a 6.ª · 08h00-16h30" className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Etiquetas de situação (separadas por vírgula)</label>
                    <input value={situationTags} onChange={(e) => setSituationTags(e.target.value)} placeholder="Ex.: promovido 2025, Chefia" className={inputCls} />
                    <button onClick={gravarFicha} disabled={!fichaCarregada}
                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                        Guardar ficha
                    </button>
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
                                                    ✓ {new Date(a.signed_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })}
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
            setErro(err.response?.data?.detail || "Não foi possível mudar o perfil.");
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
        ]).catch((err) => setErro(err.response?.data?.detail || "Erro ao carregar os pedidos."))
            .finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    const resolver = async (id: number) => {
        try {
            await api.post(`/ficha-corrections/${id}/resolve`);
            carregar();
        } catch (err: any) {
            alert(err.response?.data?.detail || "Não foi possível resolver o pedido.");
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
