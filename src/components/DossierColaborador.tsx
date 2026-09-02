import { useEffect, useState } from "react";
import api from "../lib/api";
import Cartao from "./Cartao";
import Modal from "./Modal";
import Tag from "./ui/Tag";
import Barra from "./ui/Barra";

interface Colaborador {
    id: number;
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
}

interface Ficha {
    employee_number?: string | null;
    admission_date?: string | null;
    contract_type?: string | null;
    job_category?: string | null;
    job_title?: string | null;
    department?: string | null;
    workplace?: string | null;
    work_schedule?: string | null;
    situation_tags?: string | null;
    nationality?: string | null;
    habilitacoes?: string | null;
    university?: string | null;
    course?: string | null;
    cv?: string | null;
}

interface AvaliacaoNota {
    id: number;
    cycle_id: number;
    final_score?: number | null;
    classification?: string | null;
}

interface Ciclo {
    id: number;
    name: string;
}

interface EventoPercurso {
    date: string;
    source: string;
    category: string;
    title: string;
    detail?: string | null;
}

interface Salario {
    id: number;
    year: number;
    gross_salary: number;
    salary_grade?: string | null;
}

interface Assiduidade {
    id: number;
    period: string;
    present_days: number;
    justified_absences: number;
    unjustified_absences: number;
    vacation_days_taken: number;
}

interface Exame {
    id: number;
    fitness: string;
    exam_date: string;
    next_exam_date?: string | null;
    restriction_note?: string | null;
}

interface Documento {
    id: number;
    filename: string;
    doc_type?: string | null;
    file_url?: string | null;
}

interface Assinatura {
    id: number;
    signature_type: string;
    signed_at: string;
}

interface Leitura {
    document_id: number;
    title: string;
    doc_type: string;
    read_at: string;
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

const VINCULOS: Record<string, string> = {
    efetivo: "Por tempo indeterminado",
    termo_certo: "Tempo determinado",
    termo_incerto: "Tempo determinado",
};

const APTIDOES: Record<string, string> = {
    apto: "Apto",
    apto_com_restricoes: "Apto com restrições",
    inapto: "Inapto",
};

const nivelTag = (n: number): "ok" | "pri" | "warn" | "bad" =>
    n >= 4 ? "ok" : n >= 3 ? "pri" : n >= 2.5 ? "warn" : "bad";

function iniciais(nome: string): string {
    return nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Linha({ rotulo, valor }: { rotulo: string; valor?: string | number | null }) {
    return (
        <tr>
            <td className="text-dim text-[11px] py-1 pr-3 align-top whitespace-nowrap">{rotulo}</td>
            <td className="text-[12.8px] text-ink py-1">{valor || valor === 0 ? valor : "—"}</td>
        </tr>
    );
}

export default function DossierColaborador({ colaborador, aoFechar }: { colaborador: Colaborador; aoFechar: () => void }) {
    const [ficha, setFicha] = useState<Ficha | null>(null);
    const [notas, setNotas] = useState<AvaliacaoNota[]>([]);
    const [ciclos, setCiclos] = useState<Ciclo[]>([]);
    const [percurso, setPercurso] = useState<EventoPercurso[]>([]);
    const [salarios, setSalarios] = useState<Salario[]>([]);
    const [assiduidade, setAssiduidade] = useState<Assiduidade[]>([]);
    const [exames, setExames] = useState<Exame[]>([]);
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
    const [leituras, setLeituras] = useState<Leitura[]>([]);

    useEffect(() => {
        const id = colaborador.id;
        api.get(`/collaborators/${id}/profile`).then((r) => setFicha(r.data)).catch(() => { });
        api.get("/evaluations")
            .then((r) => setNotas(r.data.filter((a: AvaliacaoNota & { collaborator_id: number }) => a.collaborator_id === id)))
            .catch(() => { });
        api.get("/evaluations/cycles").then((r) => setCiclos(r.data)).catch(() => { });
        api.get(`/career/collaborators/${id}/timeline`).then((r) => setPercurso(r.data)).catch(() => { });
        api.get(`/compensation/collaborators/${id}/salary`).then((r) => setSalarios(r.data)).catch(() => { });
        api.get(`/compensation/collaborators/${id}/attendance`).then((r) => setAssiduidade(r.data)).catch(() => { });
        api.get(`/occupational-health/collaborators/${id}/exams`).then((r) => setExames(r.data)).catch(() => { });
        api.get(`/collaborators/${id}/documents`).then((r) => setDocumentos(r.data)).catch(() => { });
        api.get(`/collaborators/${id}/signatures`).then((r) => setAssinaturas(r.data)).catch(() => { });
        api.get(`/collaborators/${id}/document-reads`).then((r) => setLeituras(r.data)).catch(() => { });
    }, [colaborador.id]);

    // Notas validadas por ciclo (evolução).
    const evolucao = notas
        .filter((a) => a.final_score != null)
        .sort((a, b) => a.cycle_id - b.cycle_id)
        .map((a) => ({
            ciclo: ciclos.find((c) => c.id === a.cycle_id)?.name || `Ciclo #${a.cycle_id}`,
            nota: a.final_score!,
            classificacao: a.classification,
        }));
    const ultimaNota = evolucao.length > 0 ? evolucao[evolucao.length - 1].nota : null;

    return (
        <Modal aberto={true} aoFechar={aoFechar}
            titulo={`Dossier — ${colaborador.full_name}`}
            subtitulo="Todos os dados do colaborador num só lugar">
            <div className="space-y-3">

                {/* Cabeçalho */}
                <Cartao>
                    <div className="flex items-center gap-4">
                        <div className="w-[58px] h-[58px] rounded-full bg-pri-bg text-pri-dark flex items-center justify-center font-serif font-semibold text-[20px] flex-shrink-0">
                            {iniciais(colaborador.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] m-0">{colaborador.full_name}</h3>
                            <div className="text-dim text-[11.5px] mt-0.5">
                                {traduzPerfil(colaborador.role)}
                                {ficha?.job_title && ` · ${ficha.job_title}`}
                                {ficha?.department && ` · ${ficha.department}`}
                            </div>
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                {colaborador.is_active ? <Tag variante="ok">Ativo</Tag> : <Tag variante="bad">Inativo</Tag>}
                                {ficha?.situation_tags && ficha.situation_tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                                    <Tag key={t} variante="gold">{t}</Tag>
                                ))}
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className="font-serif font-semibold text-[22px] text-pri-dark">{ultimaNota != null ? ultimaNota.toFixed(1) : "—"}</div>
                            <div className="text-dim text-[10.5px]">última nota</div>
                        </div>
                    </div>
                </Cartao>

                {/* Identificação e vínculo + Evolução */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <Cartao>
                        <h3 className="text-[14px] mb-2">Identificação e vínculo</h3>
                        <table className="w-full">
                            <tbody>
                                <Linha rotulo="Email" valor={colaborador.email} />
                                <Linha rotulo="N.º colaborador" valor={ficha?.employee_number} />
                                <Linha rotulo="Admissão" valor={ficha?.admission_date} />
                                <Linha rotulo="Vínculo" valor={ficha?.contract_type ? (VINCULOS[ficha.contract_type] || ficha.contract_type) : null} />
                                <Linha rotulo="Categoria" valor={ficha?.job_category} />
                                <Linha rotulo="Cargo" valor={ficha?.job_title} />
                                <Linha rotulo="Direção" valor={ficha?.department} />
                                <Linha rotulo="Local" valor={ficha?.workplace} />
                                <Linha rotulo="Horário" valor={ficha?.work_schedule} />
                                <Linha rotulo="Nacionalidade" valor={ficha?.nationality} />
                                <Linha rotulo="Habilitações" valor={ficha?.habilitacoes} />
                                <Linha rotulo="Universidade" valor={ficha?.university} />
                                <Linha rotulo="Curso" valor={ficha?.course} />
                            </tbody>
                        </table>
                    </Cartao>

                    <Cartao>
                        <h3 className="text-[14px] mb-2">Evolução do desempenho</h3>
                        {evolucao.length === 0 ? (
                            <p className="text-dim text-sm py-3 text-center">Ainda não há avaliações validadas.</p>
                        ) : (
                            <>
                                {evolucao.map((e) => (
                                    <div key={e.ciclo} className="mb-2 last:mb-0">
                                        <div className="flex justify-between text-[12.3px]">
                                            <span>{e.ciclo}</span>
                                            <span><b className="text-pri-dark">{e.nota.toFixed(1)}</b>
                                                {e.classificacao && <span className="text-dim ml-1.5">{e.classificacao}</span>}
                                            </span>
                                        </div>
                                        <Barra valor={(e.nota / 5) * 100} variante={nivelTag(e.nota)} />
                                    </div>
                                ))}
                            </>
                        )}
                    </Cartao>
                </div>

                {ficha?.cv && (
                    <Cartao>
                        <h3 className="text-[14px] mb-2">CV / Notas</h3>
                        <p className="text-[12.5px] text-ink whitespace-pre-wrap leading-relaxed">{ficha.cv}</p>
                    </Cartao>
                )}

                {/* Remuneração + Assiduidade */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <Cartao>
                        <h3 className="text-[14px] mb-2">Remuneração</h3>
                        {salarios.length === 0 ? (
                            <p className="text-dim text-sm py-2 text-center">Sem salários registados.</p>
                        ) : (
                            <table className="w-full text-[12.8px]">
                                <thead>
                                    <tr>
                                        <th className="text-left text-[10.3px] uppercase tracking-wide text-dim py-1.5 border-b border-line">Ano</th>
                                        <th className="text-right text-[10.3px] uppercase tracking-wide text-dim py-1.5 border-b border-line">Vencimento bruto</th>
                                        <th className="text-right text-[10.3px] uppercase tracking-wide text-dim py-1.5 border-b border-line">Enquadramento</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...salarios].sort((a, b) => b.year - a.year).map((s) => (
                                        <tr key={s.id}>
                                            <td className="py-1.5 border-b border-line2">{s.year}</td>
                                            <td className="py-1.5 border-b border-line2 text-right font-semibold">{s.gross_salary.toLocaleString("pt-AO")} Kz</td>
                                            <td className="py-1.5 border-b border-line2 text-right text-dim">{s.salary_grade || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Cartao>

                    <Cartao>
                        <h3 className="text-[14px] mb-2">Assiduidade</h3>
                        {assiduidade.length === 0 ? (
                            <p className="text-dim text-sm py-2 text-center">Sem registos de assiduidade.</p>
                        ) : (
                            <table className="w-full text-[12.8px]">
                                <thead>
                                    <tr>
                                        <th className="text-left text-[10.3px] uppercase tracking-wide text-dim py-1.5 border-b border-line">Período</th>
                                        <th className="text-right text-[10.3px] uppercase tracking-wide text-dim py-1.5 border-b border-line">Presenças</th>
                                        <th className="text-right text-[10.3px] uppercase tracking-wide text-dim py-1.5 border-b border-line">Justif.</th>
                                        <th className="text-right text-[10.3px] uppercase tracking-wide text-dim py-1.5 border-b border-line">Injust.</th>
                                        <th className="text-right text-[10.3px] uppercase tracking-wide text-dim py-1.5 border-b border-line">Férias</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assiduidade.map((a) => (
                                        <tr key={a.id}>
                                            <td className="py-1.5 border-b border-line2">{a.period}</td>
                                            <td className="py-1.5 border-b border-line2 text-right">{a.present_days}</td>
                                            <td className="py-1.5 border-b border-line2 text-right">{a.justified_absences}</td>
                                            <td className={`py-1.5 border-b border-line2 text-right ${a.unjustified_absences > 0 ? "text-bad font-semibold" : ""}`}>{a.unjustified_absences}</td>
                                            <td className="py-1.5 border-b border-line2 text-right">{a.vacation_days_taken}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Cartao>
                </div>

                {/* Saúde ocupacional */}
                <Cartao>
                    <h3 className="text-[14px] mb-2">Saúde ocupacional</h3>
                    {exames.length === 0 ? (
                        <p className="text-dim text-sm py-2 text-center">Sem exames registados.</p>
                    ) : (
                        <table className="w-full text-[12.8px]">
                            <thead>
                                <tr>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim py-1.5 border-b border-line">Exame</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim py-1.5 border-b border-line">Aptidão</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim py-1.5 border-b border-line">Próximo</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim py-1.5 border-b border-line">Restrição</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exames.map((e) => (
                                    <tr key={e.id}>
                                        <td className="py-1.5 border-b border-line2">{new Date(e.exam_date).toLocaleDateString("pt-PT")}</td>
                                        <td className="py-1.5 border-b border-line2">{APTIDOES[e.fitness] || e.fitness}</td>
                                        <td className="py-1.5 border-b border-line2 text-dim">{e.next_exam_date ? new Date(e.next_exam_date).toLocaleDateString("pt-PT") : "—"}</td>
                                        <td className="py-1.5 border-b border-line2 text-dim">{e.restriction_note || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Cartao>

                {/* Percurso */}
                <Cartao>
                    <h3 className="text-[14px] mb-2">Percurso</h3>
                    {percurso.length === 0 ? (
                        <p className="text-dim text-sm py-2 text-center">Sem eventos de percurso.</p>
                    ) : (
                        <div className="space-y-2">
                            {[...percurso].reverse().map((ev, i) => (
                                <div key={i} className="flex gap-3 py-1.5 border-b border-line2 last:border-0">
                                    <span className="text-dim text-[11px] whitespace-nowrap w-[92px] flex-shrink-0 pt-0.5">
                                        {new Date(ev.date).toLocaleDateString("pt-PT")}
                                    </span>
                                    <div className="min-w-0">
                                        <b className="block text-[12.8px] text-strong">{ev.title}</b>
                                        {ev.detail && <span className="text-[12.3px] text-dim">{ev.detail}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Cartao>

                {/* Documentos + assinaturas e leituras */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <Cartao>
                        <h3 className="text-[14px] mb-2">Documentos do vínculo</h3>
                        {documentos.length === 0 ? (
                            <p className="text-dim text-sm py-2 text-center">Sem documentos carregados.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {documentos.map((d) => (
                                    <div key={d.id} className="flex items-center gap-3 px-3 py-2 border border-line rounded-lg">
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
                                    </div>
                                ))}
                            </div>
                        )}
                    </Cartao>

                    <Cartao>
                        <h3 className="text-[14px] mb-2">Assinaturas e leituras</h3>
                        {assinaturas.length > 0 ? (
                            <div className="mb-2">
                                {assinaturas.map((s) => (
                                    <div key={s.id} className="text-[12.3px] py-1 border-b border-line2 last:border-0">
                                        <span className="text-ok mr-1.5">✓</span>{s.signature_type.replace(/_/g, " ")}
                                        <span className="text-dim ml-1.5">{new Date(s.signed_at).toLocaleDateString("pt-PT")}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-dim text-[12px] py-1">Sem assinaturas registadas.</p>
                        )}
                        {leituras.length > 0 ? (
                            <div className="mt-2">
                                <div className="text-dim text-[10.5px] uppercase tracking-wide mb-1">Documentos lidos</div>
                                {leituras.map((l) => (
                                    <div key={l.document_id} className="text-[12.3px] py-1 border-b border-line2 last:border-0">
                                        <span className="text-ok mr-1.5">✓</span>{l.title}
                                        <span className="text-dim ml-1.5">{new Date(l.read_at).toLocaleDateString("pt-PT")}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-dim text-[12px] py-1">Sem leituras de documentos registadas.</p>
                        )}
                    </Cartao>
                </div>
            </div>
        </Modal>
    );
}
