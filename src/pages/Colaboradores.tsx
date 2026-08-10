import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import FaixaKpis from "../components/FaixaKpis";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import Modal from "../components/Modal";

interface Colaborador {
    id: number;
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
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
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");
    const [pesquisa, setPesquisa] = useState("");

    // Estado do modal de cadastro.
    const [modalAberto, setModalAberto] = useState(false);

    const podeCadastrar = user?.role === "capital_humano";

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
            </div>

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar colaboradores...</p>
            ) : erro ? (
                <p className="text-bad text-sm">{erro}</p>
            ) : (
                <Cartao className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
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
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${c.is_active ? "bg-ok-bg text-ok" : "bg-line2 text-dim"
                                                }`}>
                                                {c.is_active ? "Ativo" : "Inativo"}
                                            </span>
                                        </td>

                                        <td className="px-3 py-2.5 border-b border-line2 text-right whitespace-nowrap">
                                            {podeCadastrar && (
                                                <button
                                                    onClick={() => setAcolhimentoDe(c)}
                                                    className="text-[11.5px] font-semibold cursor-pointer hover:underline text-pri mr-3"
                                                >
                                                    Acolhimento
                                                </button>
                                            )}

                                            {podeCadastrar && (
                                                <button
                                                    onClick={() => setDadosRhDe(c)}
                                                    className="text-[11.5px] font-semibold cursor-pointer hover:underline text-pri mr-3"
                                                >
                                                    Dados RH
                                                </button>
                                            )}
                                            {podeCadastrar && c.id !== user?.id && (
                                                <button
                                                    onClick={() => alternarEstado(c)}
                                                    className={`text-[11.5px] font-semibold cursor-pointer hover:underline ${c.is_active ? "text-bad" : "text-ok"
                                                        }`}
                                                >
                                                    {c.is_active ? "Desativar" : "Reativar"}
                                                </button>
                                            )}


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
        </div>
    );
}

// ---- Modal de cadastro de colaborador ----
function ModalCadastro({ aoFechar, aoCriar }: { aoFechar: () => void; aoCriar: () => void }) {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("colaborador");
    const [erro, setErro] = useState("");
    const [aCarregar, setACarregar] = useState(false);
    const [passwordTemp, setPasswordTemp] = useState<string | null>(null);

    const submeter = async () => {
        setErro("");
        setACarregar(true);
        try {
            const resp = await api.post("/collaborators", {
                full_name: fullName,
                email,
                role,
            });
            // O backend devolve a password temporária — mostramo-la para o CH copiar.
            setPasswordTemp(resp.data.temporary_password);
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao cadastrar.");
        } finally {
            setACarregar(false);
        }
    };

    return (
        <Modal
            aberto={true}
            aoFechar={aoFechar}
            titulo="Cadastrar colaborador"
            subtitulo="Cria a conta e gera uma password temporária de primeiro acesso"
        >
            {passwordTemp ? (
                <div>
                    <div className="border-l-[3px] border-ok bg-ok-bg rounded-r-lg px-3.5 py-3 text-[12.8px] leading-relaxed mb-4">
                        <b className="text-ok">Colaborador criado com sucesso!</b>
                        <div className="mt-2">Password temporária de primeiro acesso:</div>
                        <div className="font-mono text-[15px] text-strong bg-paper border border-line rounded-lg px-3 py-2 mt-1.5 select-all">
                            {passwordTemp}
                        </div>
                        <div className="text-dim text-[11px] mt-2">
                            Entregue esta password ao colaborador. Ele deve alterá-la no primeiro acesso.
                        </div>
                    </div>
                    <button
                        onClick={aoCriar}
                        className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors"
                    >
                        Concluir
                    </button>
                </div>
            ) : (
                <div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Nome completo</label>
                    <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri"
                    />

                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri"
                    />

                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Perfil</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-4 focus:outline-none focus:border-pri"
                    >
                        <option value="colaborador">Colaborador</option>
                        <option value="director">Director</option>
                        <option value="capital_humano">Capital Humano</option>
                        <option value="comissao">Comissão de Avaliação</option>
                        <option value="administracao">Administração</option>
                    </select>

                    {erro && <p className="text-bad text-sm mb-3">{erro}</p>}

                    <div className="flex gap-2.5">
                        <button
                            onClick={aoFechar}
                            className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={submeter}
                            disabled={aCarregar || !fullName || !email}
                            className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40"
                        >
                            {aCarregar ? "A criar..." : "Criar colaborador"}
                        </button>
                    </div>
                </div>
            )}
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
    const [sub, setSub] = useState<"ficha" | "exame" | "salario" | "assiduidade" | "percurso">("ficha");
    const [msg, setMsg] = useState("");
    const [erro, setErro] = useState("");

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
                department: department || null,
                workplace: workplace || null,
            });
            feito("Ficha atualizada.");
        } catch (e) { falhou(e); }
    };

    const feito = (t: string) => { setMsg(t); setErro(""); };
    const falhou = (e: any) => { setErro(e.response?.data?.detail || "Erro."); setMsg(""); };

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
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Direção/Departamento</label>
                    <input value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls} />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Local de trabalho</label>
                    <input value={workplace} onChange={(e) => setWorkplace(e.target.value)} className={inputCls} />
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
        </Modal>
    );
}