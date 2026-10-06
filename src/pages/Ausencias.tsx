import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import FaixaKpis from "../components/FaixaKpis";
import Botao from "../components/ui/Botao";
import Notice from "../components/ui/Notice";
import Modal from "../components/Modal";
import TabelaAusencias, { periodoCurto, type PedidoAusencia } from "../components/ausencias/TabelaAusencias";
import MapaFerias from "../components/ausencias/MapaFerias";
import MapasLado from "../components/ausencias/MapasLado";

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
    department?: string | null;
    admission_date?: string | null;
}

/** Estado do mapa anual elaborado pelo Capital Humano (art. 209.º LGT). */
interface EstadoMapa {
    ano: number;
    elaborado: boolean;
    elaborado_em: string | null;
    elaborado_por: string | null;
}

export default function Ausencias() {
    const { user } = useAuth();
    const perfil = user?.role || "";
    const eDirector = perfil === "director";
    const eCH = perfil === "capital_humano" || perfil === "administracao";
    const eAdministracao = perfil === "administracao";
    const [departamento, setDepartamento] = useState("");

    useEffect(() => {
        if (perfil === "director") {
            api.get("/me/profile").then((r) => setDepartamento(r.data.department || "")).catch(() => { });
        }
    }, [perfil]);

    const empresa = user?.company_name || "KAMBA";

    const eyebrow =
        perfil === "colaborador" ? `O seu tempo · ${empresa}` :
            perfil === "director" ? (departamento ? `A sua equipa · ${departamento}` : "A sua equipa") :
                eAdministracao ? "Visão de gestão" : `Gestão de assiduidade · ${empresa}`;

    const titulo =
        perfil === "director" ? "Férias & Ausências — autorizações" :
            eAdministracao ? "Férias & Ausências" : "Férias & Ausências — Capital Humano";

    const descricao =
        perfil === "colaborador"
            ? "Peça férias, justifique faltas e acompanhe as aprovações — sem papel, sem idas ao Capital Humano. Tudo conforme a Lei Geral do Trabalho."
            : perfil === "director"
                ? "Autoriza aqui os pedidos de férias da sua equipa. A decisão notifica o colaborador e o Capital Humano, e alimenta o mapa de férias."
                : "O mapa de férias, os averbamentos, as faltas justificadas e as licenças de maternidade — geridos num só lugar, conforme a Lei Geral do Trabalho.";

    return (
        <div>
            <Cabecalho eyebrow={eyebrow} titulo={titulo} descricao={descricao} />
            {eCH ? <VistaCH /> : eDirector ? <VistaDirector departamento={departamento} /> : <VistaColaborador />}
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
                        <p><b className="text-strong">Período:</b> {periodoCurto(detalheDe.start_date, detalheDe.end_date)} ({detalheDe.days} dias)</p>
                        <p><b className="text-strong">Motivo:</b> {detalheDe.reason}</p>
                        <p><b className="text-strong">Documento:</b> {detalheDe.document_name || "—"}</p>
                        <p><b className="text-strong">Estado:</b> {ROTULO_ESTADO_DETALHE[detalheDe.status]}</p>
                        <p><b className="text-strong">Averbado no mapa:</b> {detalheDe.averbado ? "Sim" : "Não"}</p>
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
    pendente_dir: "aguarda director",
    pendente_ch: "aguarda Capital Humano",
    aprovada: "aprovada",
    justificada: "justificada",
    recusada: "recusada",
};

// ---------------- Director ----------------
const ROTULO_TIPO_PEDIDO: Record<string, string> = {
    ferias: "Férias",
    falta: "Falta",
    maternidade: "Licença de maternidade",
};

function VistaDirector({ departamento }: { departamento: string }) {
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
                                             {periodoCurto(p.start_date, p.end_date)} · {p.days} dias úteis
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

            <div className="mt-6">
                <MapaFerias mostrarDireccao={false} />
            </div>

            <div className="mt-6">
                <MapasLado
                    pedidos={pedidos}
                    subtitulo={`Pedidos de férias da sua Direcção${departamento ? ` (${departamento})` : ""}.`}
                    acoes={(p) => (
                        <button onClick={() => setDetalheDe(p)} className="text-[11.5px] font-semibold cursor-pointer hover:underline text-pri">
                            detalhe
                        </button>
                    )}
                />
            </div>

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

// Licença de maternidade (art. 253.º da LGT): 90 dias, ou 118 em parto múltiplo.
const MATERNIDADE_DIAS = 90;
const MATERNIDADE_DIAS_GEMELOS = 118;

function somarDias(iso: string, dias: number) {
    const [a, m, d] = iso.split("-").map(Number);
    const f = new Date(a, m - 1, d);
    f.setDate(f.getDate() + dias - 1);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
}

function VistaCH() {
    const ano = new Date().getFullYear();
    const [pedidos, setPedidos] = useState<PedidoAusencia[]>([]);
    const [colaboradoras, setColaboradoras] = useState<Colaborador[]>([]);
    const [erroColaboradoras, setErroColaboradoras] = useState("");
    const [mapa, setMapa] = useState<EstadoMapa>({ ano, elaborado: false, elaborado_em: null, elaborado_por: null });
    const [aCarregar, setACarregar] = useState(true);
    const [erroCarga, setErroCarga] = useState("");
    const [erroAcao, setErroAcao] = useState("");

    // Mapa anual (art. 209.º LGT).
    const [aElaborar, setAElaborar] = useState(false);

    // Formulário de licença de maternidade (art. 253.º LGT).
    const [empId, setEmpId] = useState(0);
    const [inicio, setInicio] = useState("");
    const [partoMultiplo, setPartoMultiplo] = useState(false);
    const [documento, setDocumento] = useState<File | null>(null);
    const [aRegistar, setARegistar] = useState(false);
    const [msg, setMsg] = useState("");
    const [erroMsg, setErroMsg] = useState("");

    const [detalheDe, setDetalheDe] = useState<PedidoAusencia | null>(null);
    const mapaCard = useRef<HTMLDivElement>(null);

    const carregar = () => {
        setACarregar(true);
        setErroCarga("");
        Promise.all([
            api.get("/leave/requests").then((r) => setPedidos(r.data)).catch(() =>
                setErroCarga("Não foi possível carregar os pedidos de ausência.")
            ),
            api.get("/leave/maternity/candidates")
                .then((r) => {
                    setColaboradoras(Array.isArray(r.data) ? r.data : []);
                    setErroColaboradoras("");
                })
                .catch((e) => {
                    // Sem este aviso o campo ficava só com "— escolher —" e
                    // parecia um defeito do formulário.
                    const status = e?.response?.status;
                    setColaboradoras([]);
                    setErroColaboradoras(
                        status === 404
                            ? "O servidor não tem esta rota (backend desactualizado) — não é possível listar as colaboradoras."
                            : status === 401 || status === 403
                              ? "O seu perfil não tem permissão para consultar as colaboradoras elegíveis."
                              : "Não foi possível carregar as colaboradoras. Verifique a ligação ao servidor.",
                    );
                }),
            api.get("/leave/map/estado", { params: { ano } })
                .then((r) => setMapa({
                    ano: r.data?.ano ?? ano,
                    elaborado: Boolean(r.data?.elaborado),
                    elaborado_em: r.data?.elaborado_em ?? null,
                    elaborado_por: r.data?.elaborado_por ?? null,
                }))
                .catch(() => { }),
        ]).finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, [ano]);

    const irParaOMapa = () => {
        mapaCard.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const elaborarMapa = async () => {
        setErroAcao("");
        setMsg("");
        setAElaborar(true);
        try {
            const r = await api.post("/leave/map/elaborar", null, { params: { ano } });
            setMapa({
                ano: r.data?.ano ?? ano,
                elaborado: Boolean(r.data?.elaborado),
                elaborado_em: r.data?.elaborado_em ?? null,
                elaborado_por: r.data?.elaborado_por ?? null,
            });
            setMsg(`Mapa de férias ${ano} elaborado.`);
        } catch (err: any) {
            setErroAcao(err.response?.data?.detail || "Não foi possível elaborar o mapa de férias.");
        } finally {
            setAElaborar(false);
        }
    };

    const averbar = async (id: number) => {
        setErroAcao("");
        setMsg("");
        setErroMsg("");
        try {
            await api.post(`/leave/requests/${id}/register`);
            setMsg("Pedido averbado no mapa de férias. O ciclo do pedido está completo.");
            carregar();
        } catch (err: any) {
            setErroAcao(err.response?.data?.detail || "Não foi possível averbar o pedido.");
        }
    };

    const registarMaternidade = async () => {
        setMsg("");
        setErroMsg("");
        setARegistar(true);
        try {
            const dados = new FormData();
            dados.append("collaborator_id", String(empId));
            dados.append("inicio", inicio);
            dados.append("parto_multiplo", String(partoMultiplo));
            if (documento) dados.append("documento", documento);
            await api.post("/leave/maternity", dados);
            setMsg("Licença de maternidade registada. A colaboradora foi notificada.");
            setInicio(""); setDocumento(null); setPartoMultiplo(false);
            carregar();
        } catch (err: any) {
            setErroMsg(err.response?.data?.detail || "Não foi possível registar.");
        } finally {
            setARegistar(false);
        }
    };

    // O mapa anual é elaborado pelo CH; os pedidos autorizados entram por
    // "averbado = False" e desaparecem desta lista assim que são registados.
    const aAverbar = pedidos.filter(
        (p) => (p.status === "aprovada" || p.status === "pendente_ch") && !p.averbado
    );
    const faltas = pedidos.filter((p) => p.type === "falta").length;
    const maternidades = pedidos.filter((p) => p.type === "maternidade").length;

    const diasMat = partoMultiplo ? MATERNIDADE_DIAS_GEMELOS : MATERNIDADE_DIAS;
    const fimMat = inicio ? somarDias(inicio, diasMat) : "";

    return (
        <div>
            <FaixaKpis kpis={[
                {
                    valor: mapa.elaborado ? "✓" : "—",
                    label: `Mapa de férias ${ano}`,
                    cor: mapa.elaborado ? "ok" : "normal",
                    onClick: irParaOMapa,
                },
                { valor: aAverbar.length, label: "A averbar (autorizados)", cor: aAverbar.length ? "warn" : "normal" },
                { valor: faltas, label: "Faltas justificadas" },
                { valor: maternidades, label: "Licenças de maternidade" },
            ]} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Início do exercício — mapa de férias (art. 209.º LGT) */}
                <Cartao>
                    <h3 className="text-[14.5px] mb-1">Início do exercício — mapa de férias</h3>
                    {mapa.elaborado ? (
                        <>
                            <Notice variante="soft">
                                <b>Mapa de {mapa.ano} elaborado.</b> Os pedidos dos colaboradores são
                                confrontados com o mapa e averbados à medida que são autorizados.
                            </Notice>
                            <p className="text-[11.8px] text-dim">
                                {mapa.elaborado_por ? `Elaborado por ${mapa.elaborado_por}` : "Elaborado pelo Capital Humano"}
                                {mapa.elaborado_em
                                    ? ` · ${new Date(mapa.elaborado_em).toLocaleDateString("pt-PT")}`
                                    : ""}
                            </p>
                        </>
                    ) : (
                        <>
                            <Notice>
                                <b>Obrigação legal (art. 209.º LGT):</b> a empresa elabora anualmente o
                                mapa de férias. Gere aqui a base do mapa para todo o efectivo.
                            </Notice>
                            <Botao onClick={elaborarMapa} disabled={aElaborar}>
                                {aElaborar ? "A elaborar..." : `Elaborar mapa de férias ${ano}`}
                            </Botao>
                        </>
                    )}
                </Cartao>

                {/* Registar licença de maternidade (art. 253.º LGT) */}
                <Cartao>
                    <h3 className="text-[14.5px] mb-1">Registar licença de maternidade</h3>
                    <Notice>
                        <b>Art. 253.º LGT:</b> licença de 3 meses (90 dias), remunerada; pode iniciar
                        4 semanas antes do parto; +4 semanas em parto múltiplo. Licença
                        complementar opcional de 4 semanas.
                    </Notice>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Colaboradora</label>
                    <select value={empId} onChange={(e) => setEmpId(Number(e.target.value))}
                        disabled={colaboradoras.length === 0}
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri disabled:cursor-not-allowed">
                        <option value={0}>
                            {colaboradoras.length === 0 ? "— sem colaboradoras para escolher —" : "— escolher —"}
                        </option>
                        {colaboradoras.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.full_name}{c.department ? ` · ${c.department}` : ""}
                            </option>
                        ))}
                    </select>
                    {erroColaboradoras && (
                        <p className="text-bad text-[12.3px] mb-3">{erroColaboradoras}</p>
                    )}
                    {!erroColaboradoras && colaboradoras.length === 0 && !aCarregar && (
                        <p className="text-dim text-[12.3px] mb-3">
                            Sem colaboradoras elegíveis no seu âmbito — confirme se existem colaboradores activos.
                        </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Início da licença</label>
                            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)}
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                        </div>
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Parto múltiplo?</label>
                            <select value={partoMultiplo ? "1" : "0"} onChange={(e) => setPartoMultiplo(e.target.value === "1")}
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                                <option value="0">Não — 90 dias</option>
                                <option value="1">Sim — 90 + 28 dias</option>
                            </select>
                        </div>
                    </div>
                    <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">
                        Documento comprovativo (opcional — atestado médico + declaração de nascimento)
                    </label>
                    <input
                        type="file"
                        onChange={(e) => setDocumento(e.target.files?.[0] || null)}
                        className="w-full bg-panel border border-line rounded-lg px-3 py-[7px] text-[12.5px] mb-1 focus:outline-none focus:border-pri"
                    />
                    {inicio && (
                        <p className="text-[11.8px] text-dim mt-1 mb-2">
                            {diasMat} dias · {periodoCurto(inicio, fimMat)} · remunerada
                        </p>
                    )}
                    {erroMsg && <p className="text-bad text-[12.3px] mb-3">{erroMsg}</p>}
                    <Botao onClick={registarMaternidade} disabled={aRegistar || !empId || !inicio}>
                        {aRegistar ? "A registar..." : "Registar licença"}
                    </Botao>
                </Cartao>
            </div>

            {erroAcao && <p className="text-bad text-sm mb-3">{erroAcao}</p>}
            {msg && <Notice variante="soft" className="mb-4">{msg}</Notice>}

            {/* Averbar no mapa — só aparece quando há pedidos por averbar */}
            {aAverbar.length > 0 && (
                <Cartao className="mb-4">
                    <h3 className="text-[14.5px] mb-3">Averbar no mapa (pedidos autorizados)</h3>
                    <div className="space-y-2.5">
                        {aAverbar.map((p) => (
                            <div key={p.id} className="border border-line rounded-lg px-3.5 py-3 flex flex-wrap items-center gap-3">
                                <span className="w-9 h-9 rounded-full bg-pri-bg text-pri-dark flex items-center justify-center flex-shrink-0 text-[15px]">
                                    {p.type === "ferias" ? "☼" : "!"}
                                </span>
                                <div className="flex-1 min-w-[200px]">
                                    <b className="text-strong text-[12.8px]">{p.collaborator_name || `#${p.collaborator_id}`}</b>
                                    <div className="text-[11.5px] text-dim">
                                        {periodoCurto(p.start_date, p.end_date)} · {p.days} dias · {ROTULO_TIPO_PEDIDO[p.type] || p.type}
                                    </div>
                                </div>
                                <Botao onClick={() => averbar(p.id)} className="!px-3 !py-1.5 !text-[11.5px]">
                                    Averbar no mapa
                                </Botao>
                            </div>
                        ))}
                    </div>
                </Cartao>
            )}

            {/* Mapa 1 — saldo de férias por colaborador */}
            <div className="mt-6">
                <MapaFerias aoAverbar={averbar} mostrarDireccao={false} />
            </div>

            {/* Mapas da empresa: férias à esquerda, ausências à direita */}
            <div ref={mapaCard} id="mapCard" className="mt-6 scroll-mt-4">
                <h3 className="text-[14.5px] mb-1">Mapas — toda a empresa</h3>
                <p className="text-[11.5px] text-dim mb-3">
                    Férias e ausências em mapas separados, do pedido mais recente para o mais antigo.
                </p>
                {aCarregar ? (
                    <p className="text-dim text-sm">A carregar...</p>
                ) : erroCarga ? (
                    <Notice variante="alert">{erroCarga}</Notice>
                ) : (
                    <MapasLado
                        pedidos={[...pedidos].sort((a, b) => b.id - a.id)}
                        subtitulo="Férias de todos os colaboradores da empresa."
                        acoes={(p) => (
                            <button onClick={() => setDetalheDe(p)} className="text-[11.5px] font-semibold cursor-pointer hover:underline text-pri">
                                detalhe
                            </button>
                        )}
                    />
                )}
            </div>

            {detalheDe && (
                <Modal aberto={true} aoFechar={() => setDetalheDe(null)} titulo="Detalhe do pedido" subtitulo="Tramitação registada">
                    <div className="text-[12.8px] space-y-1.5">
                        <p><b className="text-strong">Colaborador:</b> {detalheDe.collaborator_name || `#${detalheDe.collaborator_id}`}</p>
                        <p><b className="text-strong">Tipo:</b> {ROTULO_TIPO_PEDIDO[detalheDe.type] || detalheDe.type}</p>
                        <p><b className="text-strong">Período:</b> {periodoCurto(detalheDe.start_date, detalheDe.end_date)} ({detalheDe.days} dias)</p>
                        <p><b className="text-strong">Motivo:</b> {detalheDe.reason}</p>
                        <p><b className="text-strong">Documento:</b> {detalheDe.document_name || "—"}</p>
                        <p><b className="text-strong">Estado:</b> {ROTULO_ESTADO_DETALHE[detalheDe.status]}</p>
                        <p><b className="text-strong">Averbado no mapa:</b> {detalheDe.averbado ? "Sim" : "Não"}</p>
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
