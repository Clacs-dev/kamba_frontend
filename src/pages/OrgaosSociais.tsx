import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import FaixaKpis from "../components/FaixaKpis";
import Modal from "../components/Modal";
import Tag from "../components/ui/Tag";
import Botao from "../components/ui/Botao";

const ORGAOS = [
    { sigla: "ca", organ: "conselho_administracao", label: "Conselho de Administração", icone: "◈" },
    { sigla: "ce", organ: "comissao_executiva", label: "Comissão Executiva", icone: "◈" },
    { sigla: "cf", organ: "conselho_fiscal", label: "Conselho Fiscal", icone: "◈" },
    { sigla: "ma", organ: "mesa_assembleia", label: "Mesa da Assembleia", icone: "◈" },
];

const ORGAO_DESCRICAO: Record<string, string> = {
    conselho_administracao: "Órgão executivo de topo — define a estratégia da empresa.",
    comissao_executiva: "Órgão de gestão corrente — executa a estratégia do Conselho.",
    conselho_fiscal: "Órgão de fiscalização — acompanha a contabilidade e a legalidade.",
    mesa_assembleia: "Órgão de representação dos acionistas / assembleia geral.",
};

interface Membro {
    id: number;
    user_id: number;
    full_name: string;
    role: string;
    organ_role: string | null;
    appointed_at: string | null;
}

interface OrganoApi {
    organ: string;
    label: string;
    members: Membro[];
}

interface Colaborador { id: number; full_name: string; role: string; }

export default function OrgaosSociais() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const podeGerir = ["capital_humano", "administracao", "admin"].includes(user?.role || "");

    const [organs, setOrgaos] = useState<OrganoApi[]>([]);
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");
    const [adicionarDe, setAdicionarDe] = useState<OrganoApi | null>(null);

    // Órgão ativo pela rota (/orgaos-sociais/ca); por defeito o primeiro.
    const organAtivo = useMemo(() => {
        const sigla = location.pathname.split("/").pop();
        return ORGAOS.find((o) => o.sigla === sigla)?.organ || ORGAOS[0].organ;
    }, [location.pathname]);

    const carregar = () => {
        setACarregar(true);
        Promise.all([
            api.get("/organs").then((r) => setOrgaos(r.data)).catch((e) => setErro(e.response?.data?.detail || "Erro ao carregar os órgãos.")),
            podeGerir ? api.get("/collaborators").then((r) => setColaboradores(r.data)).catch(() => { }) : Promise.resolve(),
        ]).finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    const orgao = organs.find((o) => o.organ === organAtivo);
    const membros = orgao?.members || [];

    const remover = async (m: Membro) => {
        try {
            await api.delete(`/organs/${m.id}`);
            carregar();
        } catch (e: any) {
            setErro(e.response?.data?.detail || "Erro ao remover.");
        }
    };

    return (
        <div>
            <Cabecalho
                eyebrow="Governança da empresa"
                titulo="Órgãos Sociais"
                descricao="Conselho de Administração · Comissão Executiva · Conselho Fiscal · Mesa da Assembleia"
            />

            <FaixaKpis kpis={[
                { valor: membersCount(organs, ORGAOS[0].organ) , label: ORGAOS[0].label.split(" ")[0] },
                { valor: membersCount(organs, ORGAOS[1].organ), label: ORGAOS[1].label.split(" ")[0] },
                { valor: membersCount(organs, ORGAOS[2].organ), label: ORGAOS[2].label.split(" ")[0] },
                { valor: membersCount(organs, ORGAOS[3].organ), label: ORGAOS[3].label.split(" ")[0] },
            ]} />

            {/* Abas por órgão */}
            <div className="flex flex-wrap gap-2 mb-4">
                {ORGAOS.map((o) => {
                    const ativo = o.organ === organAtivo;
                    return (
                        <NavLink
                            key={o.sigla}
                            to={`/orgaos-sociais/${o.sigla}`}
                            className={`px-4 py-2 rounded-lg text-[12.3px] font-semibold border transition-colors ${
                                ativo ? "bg-pri text-white border-pri" : "bg-paper border-line text-ink hover:border-pri hover:text-pri"
                            }`}
                        >
                            {o.label}
                            <span className="ml-2 text-[10.5px] opacity-90">({membersCount(organs, o.organ)})</span>
                        </NavLink>
                    );
                })}
            </div>

            {podeGerir && (
                <div className="mb-4">
                    <Botao onClick={() => orgao && setAdicionarDe(orgao)}>
                        + Adicionar membro
                    </Botao>
                </div>
            )}

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar órgãos sociais...</p>
            ) : erro ? (
                <p className="text-bad text-sm">{erro}</p>
            ) : orgao && membros.length === 0 ? (
                <Cartao>
                    <p className="text-dim text-center py-4">
                        Ainda não há membros no {orgao.label}.
                        {podeGerir && " Use o botão acima para adicionar o primeiro."}
                    </p>
                </Cartao>
            ) : orgao ? (
                <Cartao className="p-0">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                        <div>
                            <h3 className="text-[14px] m-0">{orgao.label}</h3>
                            <p className="text-[11.5px] text-dim m-0">{ORGAO_DESCRICAO[orgao.organ] || ""}</p>
                        </div>
                        <span className="text-[11px] text-dim">{membros.length} membro(s)</span>
                    </div>
                    <div className="overflow-x-auto md:overflow-visible">
                        <table className="w-full text-[12.8px] min-w-[520px]">
                            <thead>
                                <tr>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Membro</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Cargo no órgão</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Perfil</th>
                                    {podeGerir && (
                                        <th className="text-right text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Ação</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {membros.map((m) => (
                                    <tr key={m.id} className="hover:bg-panel transition-colors">
                                        <td className="px-3 py-2.5 border-b border-line2">
                                            <button type="button" onClick={() => navigate(`/colaboradores/${m.user_id}/portal`, { state: { nome: m.full_name } })} className="text-strong font-bold hover:text-pri hover:underline text-left">
                                                {m.full_name}
                                            </button>
                                        </td>
                                        <td className="px-3 py-2.5 border-b border-line2">
                                            {m.organ_role ? <Tag variante="gold">{m.organ_role}</Tag> : <span className="text-dim">—</span>}
                                        </td>
                                        <td className="px-3 py-2.5 border-b border-line2 text-ink">{traduzPerfil(m.role)}</td>
                                        {podeGerir && (
                                            <td className="px-3 py-2.5 border-b border-line2 text-right">
                                                <button
                                                    onClick={() => remover(m)}
                                                    className="text-[11.5px] text-bad font-semibold hover:underline cursor-pointer"
                                                >
                                                    remover
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Cartao>
            ) : (
                <Cartao><p className="text-dim text-center py-4">Não foi possível carregar os órgãos.</p></Cartao>
            )}

            {adicionarDe && (
                <ModalAdicionar
                    orgao={adicionarDe}
                    colaboradores={colaboradores.filter((c) => !adicionarDe.members.some((m) => m.user_id === c.id))}
                    aoFechar={() => setAdicionarDe(null)}
                    aoAdicionar={() => { setAdicionarDe(null); carregar(); }}
                />
            )}
        </div>
    );
}

function membersCount(organs: OrganoApi[], organ: string): number {
    return organs.find((o) => o.organ === organ)?.members.length || 0;
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

function ModalAdicionar({ orgao, colaboradores, aoFechar, aoAdicionar }: {
    orgao: OrganoApi; colaboradores: Colaborador[]; aoFechar: () => void; aoAdicionar: () => void;
}) {
    const [userId, setUserId] = useState(0);
    const [organRole, setOrganRole] = useState("");
    const [erro, setErro] = useState("");
    const [aGuardar, setAGuardar] = useState(false);

    const submeter = async () => {
        setErro("");
        setAGuardar(true);
        try {
            await api.post("/organs", { user_id: userId, organ: orgao.organ, organ_role: organRole || null });
            aoAdicionar();
        } catch (e: any) {
            setErro(e.response?.data?.detail || "Erro ao adicionar.");
        } finally {
            setAGuardar(false);
        }
    };

    return (
        <Modal aberto={true} aoFechar={aoFechar} titulo={`Adicionar membro — ${orgao.label}`}
            subtitulo="Atribui um colaborador da empresa a este órgão social, com o respetivo cargo no órgão.">
            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Colaborador</label>
            <select value={userId} onChange={(e) => setUserId(Number(e.target.value))}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                <option value={0}>— escolher —</option>
                {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({traduzPerfil(c.role)})</option>)}
            </select>

            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Cargo no órgão</label>
            <input value={organRole} onChange={(e) => setOrganRole(e.target.value)}
                placeholder="Ex.: Presidente, Vice-presidente, Vogal, Secretário"
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-4 focus:outline-none focus:border-pri" />

            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}
            <div className="flex gap-2.5">
                <Botao variante="ghost" onClick={aoFechar}>Cancelar</Botao>
                <Botao onClick={submeter} disabled={userId === 0 || aGuardar}>
                    {aGuardar ? "A adicionar..." : "Adicionar"}
                </Botao>
            </div>
        </Modal>
    );
}