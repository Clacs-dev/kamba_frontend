import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import FaixaKpis from "../components/FaixaKpis";
import Botao from "../components/ui/Botao";
import Notice from "../components/ui/Notice";
import Modal from "../components/Modal";
import TabelaAusencias, { type PedidoAusencia } from "../components/ausencias/TabelaAusencias";

// ---------------------------------------------------------------------------
// Módulo "Férias & Ausências" — usa os endpoints /leave/* do backend
// (app/api/routes/leave.py). O contrato está documentado em
// docs/pending-backend-endpoints.md. Se um endpoint falhar, a página mostra
// uma mensagem de erro amigável em vez de partir.
// ---------------------------------------------------------------------------

interface Saldo {
    direito: number;
    gozados: number;
    marcados: number;
    disponiveis: number;
}

interface Colaborador {
    id: number;
    full_name: string;
}

export default function Ausencias() {
    const { user } = useAuth();
    const perfil = user?.role || "";
    const eDirector = perfil === "director";
    const eCH = perfil === "capital_humano" || perfil === "administracao";
    const [departamento, setDepartamento] = useState("");

    useEffect(() => {
        if (perfil === "director") {
            api.get("/me/profile").then((r) => setDepartamento(r.data.department || "")).catch(() => { });
        }
    }, [perfil]);

    const eyebrow =
        perfil === "colaborador" ? `O seu tempo · ${user?.company_name || "KAMBA"}` :
        perfil === "director" ? (departamento ? `A sua equipa · ${departamento}` : "A sua equipa") :
        "Gestão de tempo de trabalho";

    const titulo = perfil === "director" ? "Férias & Ausências — autorizações" : "Férias & Ausências";

    const descricao =
        perfil === "colaborador"
            ? "Peça férias, justifique faltas e acompanhe as aprovações — sem papel, sem idas ao Capital Humano. Tudo conforme a Lei Geral do Trabalho."
            : perfil === "director"
                ? "Autoriza aqui os pedidos de férias da sua equipa. A decisão notifica o colaborador e o Capital Humano, e alimenta o mapa de férias."
                : "Pedidos de férias e faltas justificadas, aprovação pela chefia e mapa anual da empresa.";

    return (
        <div>
            <Cabecalho eyebrow={eyebrow} titulo={titulo} descricao={descricao} />
            {eCH ? <VistaCH /> : eDirector ? <VistaDirector /> : <VistaColaborador />}
        </div>
    );
}

// Motivos de falta justificada (art. 150.º LGT) — como no protótipo.
const FALTA_TIPOS = [
    { valor: "casamento", rotulo: "Casamento do trabalhador", duracao: "8 dias úteis" },
    { valor: "nascimento", rotulo: "Nascimento de filho (paternidade)", duracao: "1 dia útil" },
    { valor: "obito_conj", rotulo: "Falecimento de cônjuge, pai, mãe ou filho", duracao: "8 dias úteis" },
    { valor: "obito_fam", rotulo: "Falecimento de avós, netos, irmãos, sogros", duracao: "2 dias úteis" },
    { valor: "assist_fam", rotulo: "Assistência a membro do agregado familiar", duracao: "3 dias/mês (máx. 12/ano)" },
    { valor: "doenca_filho", rotulo: "Doença de filho menor de 10 anos", duracao: "até 24 dias úteis/ano" },
    { valor: "doenca", rotulo: "Doença ou acidente do próprio (com atestado)", duracao: "conforme atestado" },
    { valor: "sindical", rotulo: "Actividade sindical", duracao: "conforme mandato" },
    { valor: "tribunal", rotulo: "Cumprimento de obrigações legais (tribunal, etc.)", duracao: "tempo necessário" },
];

// ---------------- Colaborador ----------------
function VistaColaborador() {
    const [saldo, setSaldo] = useState<Saldo | null>(null);
    const [pedidos, setPedidos] = useState<PedidoAusencia[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erroCarga, setErroCarga] = useState("");
    const [detalheDe, setDetalheDe] = useState<PedidoAusencia | null>(null);

    // Formulário de férias.
    const [fInicio, setFInicio] = useState("");
    const [fFim, setFFim] = useState("");
    const [fObs, setFObs] = useState("");
    const [erroFerias, setErroFerias] = useState("");
    const [aEnviarFerias, setAEnviarFerias] = useState(false);

    // Formulário de justificação de falta.
    const [jMotivo, setJMotivo] = useState("casamento");
    const [jInicio, setJInicio] = useState("");
    const [jFim, setJFim] = useState("");
    const [jDocumento, setJDocumento] = useState<File | null>(null);
    const [erroFalta, setErroFalta] = useState("");
    const [aEnviarFalta, setAEnviarFalta] = useState(false);

    const carregar = () => {
        setACarregar(true);
        Promise.all([
            api.get("/leave/me/balance").then((r) => setSaldo(r.data)).catch(() => setSaldo(null)),
            api.get("/leave/requests").then((r) => setPedidos(r.data)).catch(() =>
                setErroCarga("Não foi possível carregar os pedidos de ausência.")
            ),
        ]).finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    const submeterFerias = async () => {
        setErroFerias("");
        setAEnviarFerias(true);
        try {
            const dados = new FormData();
            dados.append("tipo", "ferias");
            dados.append("inicio", fInicio);
            dados.append("fim", fFim);
            dados.append("motivo", fObs.trim() || "Gozo de férias");
            await api.post("/leave/requests", dados);
            setFInicio(""); setFFim(""); setFObs("");
            carregar();
        } catch (err: any) {
            setErroFerias(err.response?.data?.detail || "Não foi possível submeter o pedido.");
        } finally {
            setAEnviarFerias(false);
        }
    };

    const submeterFalta = async () => {
        setErroFalta("");
        setAEnviarFalta(true);
        try {
            const tipo = FALTA_TIPOS.find((t) => t.valor === jMotivo) || FALTA_TIPOS[0];
            const dados = new FormData();
            dados.append("tipo", "falta");
            dados.append("inicio", jInicio);
            dados.append("fim", jFim);
            dados.append("motivo", `${tipo.rotulo} — ${tipo.duracao}`);
            if (jDocumento) dados.append("documento", jDocumento);
            await api.post("/leave/requests", dados);
            setJMotivo("casamento"); setJInicio(""); setJFim(""); setJDocumento(null);
            carregar();
        } catch (err: any) {
            setErroFalta(err.response?.data?.detail || "Não foi possível submeter a justificação.");
        } finally {
            setAEnviarFalta(false);
        }
    };

    return (
        <div>
            <FaixaKpis kpis={[
                { valor: saldo?.direito ?? "—", label: "Dias de férias/ano (art. 201.º)" },
                { valor: saldo?.gozados ?? "—", label: "Já gozados / aprovados" },
                { valor: saldo?.marcados ?? "—", label: "Marcados (a aguardar)" },
                { valor: saldo?.disponiveis ?? "—", label: "Disponíveis", cor: "ok" },
            ]} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                {/* Solicitar férias */}
                <Cartao>
                    <h3 className="text-[14.5px] mb-3">Solicitar férias</h3>
                    <Notice className="mb-3">
                        <b>Regra LGT:</b> o gozo faz-se de acordo com o mapa anual; carece de autorização da chefia e comunicação ao Capital Humano. A empresa não pode impedir o gozo do direito (art. 214.º).
                    </Notice>
                    <div className="grid grid-cols-2 gap-x-3">
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Data de início</label>
                            <input type="date" value={fInicio} onChange={(e) => setFInicio(e.target.value)}
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                        </div>
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Data de fim</label>
                            <input type="date" value={fFim} onChange={(e) => setFFim(e.target.value)}
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                        </div>
                    </div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Observações (opcional)</label>
                    <input value={fObs} onChange={(e) => setFObs(e.target.value)}
                        placeholder="Ex.: período principal de férias"
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                    {erroFerias && <p className="text-bad text-sm mb-3">{erroFerias}</p>}
                    <Botao onClick={submeterFerias} disabled={aEnviarFerias || !fInicio || !fFim}>
                        {aEnviarFerias ? "A submeter..." : "Submeter pedido ao director"}
                    </Botao>
                </Cartao>

                {/* Justificar uma falta */}
                <Cartao>
                    <h3 className="text-[14.5px] mb-3">Justificar uma falta</h3>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Motivo (art. 150.º LGT)</label>
                    <select value={jMotivo} onChange={(e) => setJMotivo(e.target.value)}
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                        {FALTA_TIPOS.map((t) => (
                            <option key={t.valor} value={t.valor}>{t.rotulo} — {t.duracao}</option>
                        ))}
                    </select>
                    <div className="grid grid-cols-2 gap-x-3">
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">De</label>
                            <input type="date" value={jInicio} onChange={(e) => setJInicio(e.target.value)}
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                        </div>
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Até</label>
                            <input type="date" value={jFim} onChange={(e) => setJFim(e.target.value)}
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                        </div>
                    </div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Documento de suporte (atestado, certidão…)</label>
                    <input type="file" onChange={(e) => setJDocumento(e.target.files?.[0] || null)}
                        className="w-full bg-panel border border-line rounded-lg px-3 py-[7px] text-[12.5px] mb-1 focus:outline-none focus:border-pri" />
                    <p className="text-[10.8px] text-dim mb-3">
                        PDF ou imagem — atestado médico, certidão, convocatória. Com documento, a falta regista-se como justificada.
                    </p>
                    {erroFalta && <p className="text-bad text-sm mb-3">{erroFalta}</p>}
                    <Botao onClick={submeterFalta} disabled={aEnviarFalta || !jInicio || !jFim}>
                        {aEnviarFalta ? "A submeter..." : "Submeter justificação"}
                    </Botao>
                </Cartao>
            </div>

            <h3 className="text-[14.5px] mb-3">Os meus pedidos e ausências</h3>
            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : erroCarga ? (
                <Notice variante="alert">{erroCarga}</Notice>
            ) : (
                <TabelaAusencias
                    pedidos={pedidos}
                    mostrarDocumento
                    vazio="Ainda não fez nenhum pedido de férias ou falta."
                    acoes={(p) => (
                        <button onClick={() => setDetalheDe(p)} className="text-[11.5px] font-semibold cursor-pointer hover:underline text-pri">
                            detalhe
                        </button>
                    )}
                />
            )}

            {detalheDe && (
                <Modal aberto={true} aoFechar={() => setDetalheDe(null)} titulo="Detalhe do pedido" subtitulo="Tramitação registada">
                    <div className="text-[12.8px] space-y-1.5">
                        <p><b className="text-strong">Período:</b> {detalheDe.start_date} → {detalheDe.end_date} ({detalheDe.days} dias)</p>
                        <p><b className="text-strong">Motivo:</b> {detalheDe.reason}</p>
                        <p><b className="text-strong">Documento:</b> {detalheDe.document_name || "—"}</p>
                        <p><b className="text-strong">Estado:</b> {ROTULO_ESTADO_DETALHE[detalheDe.status]}</p>
                    </div>
                    {detalheDe.document_url && (
                        <div className="mt-3">
                            <a href={detalheDe.document_url} target="_blank" rel="noopener noreferrer"
                                className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors inline-block">
                                Abrir ficheiro
                            </a>
                        </div>
                    )}
                    <div className="flex gap-2.5 mt-4">
                        <button onClick={() => setDetalheDe(null)} className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors">Fechar</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

const ROTULO_ESTADO_DETALHE: Record<string, string> = {
    pendente_dir: "Aguarda o director",
    pendente_ch: "Aguarda o Capital Humano",
    aprovada: "Aprovada",
    justificada: "Justificada",
    recusada: "Recusada",
};

// ---------------- Director ----------------
const ROTULO_TIPO_PEDIDO: Record<string, string> = {
    ferias: "Férias",
    falta: "Falta",
    maternidade: "Licença de maternidade",
    doenca: "Doença prolongada",
};

function VistaDirector() {
    const [pedidos, setPedidos] = useState<PedidoAusencia[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erroCarga, setErroCarga] = useState("");
    const [erroAcao, setErroAcao] = useState("");
    const [aRejeitarId, setARejeitarId] = useState<number | null>(null);
    const [motivoRejeicao, setMotivoRejeicao] = useState("");
    const [detalheDe, setDetalheDe] = useState<PedidoAusencia | null>(null);

    const carregar = () => {
        setACarregar(true);
        setErroCarga("");
        api.get("/leave/requests")
            .then((r) => setPedidos(r.data))
            .catch(() => setErroCarga("Não foi possível carregar os pedidos de ausência."))
            .finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    const aprovar = async (id: number) => {
        setErroAcao("");
        try {
            await api.post(`/leave/requests/${id}/approve`);
            carregar();
        } catch (err: any) {
            setErroAcao(err.response?.data?.detail || "Não foi possível registar a decisão.");
        }
    };

    const confirmarRejeicao = async (id: number) => {
        setErroAcao("");
        try {
            await api.post(`/leave/requests/${id}/reject`, { motivo: motivoRejeicao });
            setARejeitarId(null);
            setMotivoRejeicao("");
            carregar();
        } catch (err: any) {
            setErroAcao(err.response?.data?.detail || "Não foi possível registar a decisão.");
        }
    };

    const pendentes = pedidos.filter((p) => p.status === "pendente_dir");
    const resolvidos = pedidos.filter((p) => p.status !== "pendente_dir");

    if (aCarregar) return <p className="text-dim text-sm">A carregar...</p>;
    if (erroCarga) return <Notice variante="alert">{erroCarga}</Notice>;

    return (
        <div>
            {erroAcao && <p className="text-bad text-sm mb-3">{erroAcao}</p>}

            <Cartao className="mb-5">
                <h3 className="text-[14.5px] mb-3">
                    Pedidos a aguardar a sua autorização{pendentes.length ? ` (${pendentes.length})` : ""}
                </h3>

                {pendentes.length === 0 ? (
                    <p className="text-dim text-sm py-3 text-center">
                        Sem pedidos pendentes. Quando um colaborador seu pedir férias, aparece aqui com uma notificação.
                    </p>
                ) : (
                    <div className="space-y-2.5">
                        {pendentes.map((p) => (
                            <div key={p.id} className="border border-line rounded-lg px-3.5 py-3">
                                <div className="flex items-start gap-3">
                                    <span className="w-9 h-9 rounded-full bg-pri-bg text-pri-dark flex items-center justify-center flex-shrink-0 text-[15px]">
                                        {p.type === "ferias" ? "☼" : "!"}
                                    </span>
                                    <div className="flex-1">
                                        <b className="text-strong text-[12.8px]">{p.collaborator_name || `#${p.collaborator_id}`} — {ROTULO_TIPO_PEDIDO[p.type]}</b>
                                        <div className="text-[11.5px] text-dim">
                                            {p.start_date} a {p.end_date} · {p.days} dias úteis
                                        </div>
                                        <div className="text-[12.3px] text-ink mt-1">{p.reason}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-3">
                                    <Botao onClick={() => aprovar(p.id)} className="!px-3 !py-1.5 !text-[11.5px]">Autorizar</Botao>
                                    <Botao variante="ghost" onClick={() => { setARejeitarId(p.id); setMotivoRejeicao(""); }} className="!px-3 !py-1.5 !text-[11.5px]">Recusar</Botao>
                                </div>

                                {aRejeitarId === p.id && (
                                    <div className="mt-3 border-t border-line pt-3">
                                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Motivo da rejeição</label>
                                        <textarea
                                            value={motivoRejeicao}
                                            onChange={(e) => setMotivoRejeicao(e.target.value)}
                                            rows={2}
                                            placeholder="Explique por que motivo o pedido está a ser recusado…"
                                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri"
                                        />
                                        <div className="flex gap-2.5">
                                            <Botao variante="ghost" onClick={() => setARejeitarId(null)} className="!px-3 !py-1.5 !text-[11.5px]">Cancelar</Botao>
                                            <Botao variante="perigo" onClick={() => confirmarRejeicao(p.id)} disabled={motivoRejeicao.length < 3} className="!px-3 !py-1.5 !text-[11.5px]">
                                                Confirmar rejeição
                                            </Botao>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Cartao>

            <h3 className="text-[14.5px] mb-3">Histórico da equipa</h3>
            <TabelaAusencias
                pedidos={resolvidos}
                mostrarColaborador
                mostrarDocumento
                vazio="Ainda não há histórico."
                acoes={(p) => (
                    <button onClick={() => setDetalheDe(p)} className="text-[11.5px] font-semibold cursor-pointer hover:underline text-pri">
                        detalhe
                    </button>
                )}
            />

            {detalheDe && (
                <Modal aberto={true} aoFechar={() => setDetalheDe(null)} titulo="Detalhe do pedido" subtitulo="Tramitação registada">
                    <div className="text-[12.8px] space-y-1.5">
                        <p><b className="text-strong">Colaborador:</b> {detalheDe.collaborator_name || `#${detalheDe.collaborator_id}`}</p>
                        <p><b className="text-strong">Período:</b> {detalheDe.start_date} → {detalheDe.end_date} ({detalheDe.days} dias)</p>
                        <p><b className="text-strong">Motivo:</b> {detalheDe.reason}</p>
                        <p><b className="text-strong">Documento:</b> {detalheDe.document_name || "—"}</p>
                        <p><b className="text-strong">Estado:</b> {ROTULO_ESTADO_DETALHE[detalheDe.status]}</p>
                    </div>
                    {detalheDe.document_url && (
                        <div className="mt-3">
                            <a href={detalheDe.document_url} target="_blank" rel="noopener noreferrer"
                                className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors inline-block">
                                Abrir ficheiro
                            </a>
                        </div>
                    )}
                    <div className="flex gap-2.5 mt-4">
                        <button onClick={() => setDetalheDe(null)} className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors">Fechar</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ---------------- Capital Humano / Administração ----------------
function VistaCH() {
    const [pedidos, setPedidos] = useState<PedidoAusencia[]>([]);
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erroCarga, setErroCarga] = useState("");
    const [erroAcao, setErroAcao] = useState("");

    // Formulário de licença de maternidade.
    const [empId, setEmpId] = useState(0);
    const [inicio, setInicio] = useState("");
    const [fim, setFim] = useState("");
    const [motivo, setMotivo] = useState("Licença de maternidade (art. 253.º da LGT).");
    const [documento, setDocumento] = useState<File | null>(null);
    const [aRegistar, setARegistar] = useState(false);
    const [msg, setMsg] = useState("");

    // Formulário de licença por doença prolongada.
    const [dEmpId, setDEmpId] = useState(0);
    const [dInicio, setDInicio] = useState("");
    const [dFim, setDFim] = useState("");
    const [dMotivo, setDMotivo] = useState("");
    const [dDocumento, setDDocumento] = useState<File | null>(null);
    const [aRegistarDoenca, setARegistarDoenca] = useState(false);
    const [msgDoenca, setMsgDoenca] = useState("");

    const carregar = () => {
        setACarregar(true);
        setErroCarga("");
        Promise.all([
            api.get("/leave/requests").then((r) => setPedidos(r.data)).catch(() =>
                setErroCarga("Não foi possível carregar os pedidos de ausência.")
            ),
            api.get("/collaborators").then((r) => setColaboradores(r.data)).catch(() => { }),
        ]).finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    const averbar = async (id: number) => {
        setErroAcao("");
        try {
            await api.post(`/leave/requests/${id}/register`);
            carregar();
        } catch (err: any) {
            setErroAcao(err.response?.data?.detail || "Não foi possível averbar o pedido.");
        }
    };

    const registarMaternidade = async () => {
        setMsg("");
        setARegistar(true);
        try {
            const dados = new FormData();
            dados.append("collaborator_id", String(empId));
            dados.append("inicio", inicio);
            dados.append("fim", fim);
            dados.append("motivo", motivo);
            if (documento) dados.append("documento", documento);
            await api.post("/leave/maternity", dados);
            setMsg("Licença de maternidade registada.");
            setInicio(""); setFim(""); setDocumento(null);
            carregar();
        } catch (err: any) {
            setMsg(err.response?.data?.detail || "Não foi possível registar.");
        } finally {
            setARegistar(false);
        }
    };

    const registarDoenca = async () => {
        setMsgDoenca("");
        setARegistarDoenca(true);
        try {
            const dados = new FormData();
            dados.append("collaborator_id", String(dEmpId));
            dados.append("inicio", dInicio);
            dados.append("fim", dFim);
            dados.append("motivo", dMotivo.trim() || "Licença por doença prolongada.");
            if (dDocumento) dados.append("documento", dDocumento);
            await api.post("/leave/prolonged-illness", dados);
            setMsgDoenca("Licença por doença prolongada registada. Ajusta o ciclo de avaliação do colaborador.");
            setDInicio(""); setDFim(""); setDMotivo(""); setDDocumento(null);
            carregar();
        } catch (err: any) {
            setMsgDoenca(err.response?.data?.detail || "Não foi possível registar.");
        } finally {
            setARegistarDoenca(false);
        }
    };

    const aAverbar = pedidos.filter((p) => p.status === "pendente_ch" || p.status === "aprovada");

    return (
        <div>
            <FaixaKpis kpis={[
                { valor: pedidos.length, label: "Total de pedidos" },
                { valor: pedidos.filter((p) => p.status === "pendente_dir" || p.status === "pendente_ch").length, label: "Pendentes", cor: "warn" },
                { valor: pedidos.filter((p) => p.status === "aprovada" || p.status === "justificada").length, label: "Aprovados/Justificados", cor: "ok" },
                { valor: pedidos.filter((p) => p.type === "maternidade" || p.type === "doenca").length, label: "Licenças médicas" },
            ]} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <Cartao>
                    <h3 className="text-[14.5px] mb-3">Registar licença de maternidade</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Colaboradora</label>
                            <select value={empId} onChange={(e) => setEmpId(Number(e.target.value))}
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                                <option value={0}>— escolher —</option>
                                {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Início</label>
                            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)}
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                        </div>
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Fim</label>
                            <input type="date" value={fim} onChange={(e) => setFim(e.target.value)}
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                        </div>
                    </div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Motivo</label>
                    <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2}
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">
                        Documento comprovativo (atestado médico + declaração de nascimento)
                    </label>
                    <input
                        type="file"
                        onChange={(e) => setDocumento(e.target.files?.[0] || null)}
                        className="w-full bg-panel border border-line rounded-lg px-3 py-[7px] text-[12.5px] mb-3 focus:outline-none focus:border-pri"
                    />
                    {msg && <p className="text-[12.3px] text-pri-dark mb-3">{msg}</p>}
                    <Botao onClick={registarMaternidade} disabled={aRegistar || !empId || !inicio || !fim}>
                        {aRegistar ? "A registar..." : "Registar licença"}
                    </Botao>
                </Cartao>

                <Cartao>
                    <h3 className="text-[14.5px] mb-3">Registar licença por doença prolongada</h3>
                    <Notice className="mb-3">
                        <b>Secção 3.1 / 8:</b> a licença por doença prolongada entra aprovada e <b>ajusta o ciclo de avaliação</b> do colaborador (o ciclo corrente é contado com ajuste).
                    </Notice>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Colaborador</label>
                            <select value={dEmpId} onChange={(e) => setDEmpId(Number(e.target.value))}
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                                <option value={0}>— escolher —</option>
                                {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Início</label>
                            <input type="date" value={dInicio} onChange={(e) => setDInicio(e.target.value)}
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                        </div>
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Fim</label>
                            <input type="date" value={dFim} onChange={(e) => setDFim(e.target.value)}
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                        </div>
                    </div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Motivo</label>
                    <textarea value={dMotivo} onChange={(e) => setDMotivo(e.target.value)} rows={2}
                        placeholder="Ex.: doença prolongada conforme atestado médico (art. 162.º LGT)"
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Documento comprovativo (atestado médico)</label>
                    <input
                        type="file"
                        onChange={(e) => setDDocumento(e.target.files?.[0] || null)}
                        className="w-full bg-panel border border-line rounded-lg px-3 py-[7px] text-[12.5px] mb-3 focus:outline-none focus:border-pri"
                    />
                    {msgDoenca && <p className="text-[12.3px] text-pri-dark mb-3">{msgDoenca}</p>}
                    <Botao onClick={registarDoenca} disabled={aRegistarDoenca || !dEmpId || !dInicio || !dFim}>
                        {aRegistarDoenca ? "A registar..." : "Registar licença"}
                    </Botao>
                </Cartao>
            </div>

            {erroAcao && <p className="text-bad text-sm mb-3">{erroAcao}</p>}

            <h3 className="text-[14.5px] mb-3">Pedidos aprovados por averbar no mapa</h3>
            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : erroCarga ? (
                <Notice variante="alert">{erroCarga}</Notice>
            ) : (
                <>
                    <TabelaAusencias
                        pedidos={aAverbar}
                        mostrarColaborador
                        mostrarDocumento
                        vazio="Não há pedidos por averbar."
                        acoes={(p) => (
                            <button onClick={() => averbar(p.id)} className="text-[11.5px] text-pri font-semibold hover:underline">
                                Averbar no mapa
                            </button>
                        )}
                    />

                    <h3 className="text-[14.5px] mb-3 mt-5">Mapa completo da empresa</h3>
                    <TabelaAusencias pedidos={pedidos} mostrarColaborador mostrarDocumento vazio="Ainda não há pedidos registados." />
                </>
            )}
        </div>
    );
}
