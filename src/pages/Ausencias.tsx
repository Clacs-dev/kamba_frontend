import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import FaixaKpis from "../components/FaixaKpis";
import Botao from "../components/ui/Botao";
import Notice from "../components/ui/Notice";
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

    return (
        <div>
            <Cabecalho
                eyebrow="Gestão de tempo de trabalho"
                titulo="Férias & Ausências"
                descricao="Pedidos de férias e faltas justificadas, aprovação pela chefia e mapa anual da empresa."
            />
            {eCH ? <VistaCH /> : eDirector ? <VistaDirector /> : <VistaColaborador />}
        </div>
    );
}

// ---------------- Colaborador ----------------
function VistaColaborador() {
    const { user } = useAuth();
    const [saldo, setSaldo] = useState<Saldo | null>(null);
    const [pedidos, setPedidos] = useState<PedidoAusencia[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erroCarga, setErroCarga] = useState("");

    const [tipo, setTipo] = useState<"ferias" | "falta">("ferias");
    const [inicio, setInicio] = useState("");
    const [fim, setFim] = useState("");
    const [motivo, setMotivo] = useState("");
    const [documento, setDocumento] = useState<File | null>(null);
    const [erro, setErro] = useState("");
    const [aEnviar, setAEnviar] = useState(false);

    const carregar = () => {
        setACarregar(true);
        Promise.all([
            api.get("/leave/me/balance").then((r) => setSaldo(r.data)).catch(() => setSaldo(null)),
            api.get("/leave/requests").then((r) => setPedidos(r.data)).catch(() =>
                setErroCarga("Não foi possível carregar os pedidos de ausência.")
            ),
        ]).finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, [user?.id]);

    const submeter = async () => {
        setErro("");
        setAEnviar(true);
        try {
            // Envia como multipart para permitir anexar o documento comprovativo (ex.: atestado médico).
            const dados = new FormData();
            dados.append("tipo", tipo);
            dados.append("inicio", inicio);
            dados.append("fim", fim);
            dados.append("motivo", motivo);
            if (documento) dados.append("documento", documento);
            await api.post("/leave/requests", dados);
            setInicio(""); setFim(""); setMotivo(""); setDocumento(null);
            carregar();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Não foi possível submeter o pedido.");
        } finally {
            setAEnviar(false);
        }
    };

    return (
        <div>
            <FaixaKpis kpis={[
                { valor: saldo?.direito ?? "—", label: "Dias de direito" },
                { valor: saldo?.gozados ?? "—", label: "Dias gozados" },
                { valor: saldo?.marcados ?? "—", label: "Dias marcados" },
                { valor: saldo?.disponiveis ?? "—", label: "Dias disponíveis", cor: "ok" },
            ]} />

            <Cartao className="mb-4">
                <h3 className="text-[14.5px] mb-3">Solicitar férias ou falta justificada</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                    <div>
                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Tipo</label>
                        <select value={tipo} onChange={(e) => setTipo(e.target.value as "ferias" | "falta")}
                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                            <option value="ferias">Férias</option>
                            <option value="falta">Falta justificada</option>
                        </select>
                    </div>
                    <div />
                    <div>
                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Data de início</label>
                        <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)}
                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                    </div>
                    <div>
                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Data de fim</label>
                        <input type="date" value={fim} onChange={(e) => setFim(e.target.value)}
                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                    </div>
                </div>
                <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Motivo</label>
                <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2}
                    placeholder="Ex.: Gozo do período principal de férias."
                    className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />
                {tipo === "falta" && (
                    <>
                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">
                            Documento comprovativo (ex.: atestado médico)
                        </label>
                        <input
                            type="file"
                            onChange={(e) => setDocumento(e.target.files?.[0] || null)}
                            className="w-full bg-panel border border-line rounded-lg px-3 py-[7px] text-[12.5px] mb-3 focus:outline-none focus:border-pri"
                        />
                    </>
                )}
                {erro && <p className="text-bad text-sm mb-3">{erro}</p>}
                <Botao onClick={submeter} disabled={aEnviar || !inicio || !fim || !motivo}>
                    {aEnviar ? "A submeter..." : "Submeter pedido"}
                </Botao>
            </Cartao>

            <h3 className="text-[14.5px] mb-3">O seu histórico</h3>
            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : erroCarga ? (
                <Notice variante="alert">{erroCarga}</Notice>
            ) : (
                <TabelaAusencias pedidos={pedidos} vazio="Ainda não fez nenhum pedido de férias ou falta." />
            )}
        </div>
    );
}

// ---------------- Director ----------------
function VistaDirector() {
    const [pedidos, setPedidos] = useState<PedidoAusencia[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erroCarga, setErroCarga] = useState("");
    const [erroAcao, setErroAcao] = useState("");
    const [aRejeitarId, setARejeitarId] = useState<number | null>(null);
    const [motivoRejeicao, setMotivoRejeicao] = useState("");

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
            <h3 className="text-[14.5px] mb-3">Pedidos pendentes da sua equipa</h3>
            <TabelaAusencias
                pedidos={pendentes}
                mostrarColaborador
                vazio="Não há pedidos pendentes de aprovação."
                acoes={(p) => (
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => aprovar(p.id)} className="text-[11.5px] text-ok font-semibold hover:underline">Aprovar</button>
                        <button onClick={() => { setARejeitarId(p.id); setMotivoRejeicao(""); }} className="text-[11.5px] text-bad font-semibold hover:underline">Rejeitar</button>
                    </div>
                )}
            />

            {aRejeitarId != null && (
                <Cartao className="mt-3 mb-3">
                    <h3 className="text-[14.5px] mb-2">Motivo da rejeição</h3>
                    <textarea
                        value={motivoRejeicao}
                        onChange={(e) => setMotivoRejeicao(e.target.value)}
                        rows={2}
                        placeholder="Explique por que motivo o pedido está a ser rejeitado…"
                        className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri"
                    />
                    <div className="flex gap-2.5">
                        <Botao variante="ghost" onClick={() => setARejeitarId(null)}>Cancelar</Botao>
                        <Botao variante="perigo" onClick={() => confirmarRejeicao(aRejeitarId)} disabled={motivoRejeicao.length < 3}>
                            Confirmar rejeição
                        </Botao>
                    </div>
                </Cartao>
            )}

            <h3 className="text-[14.5px] mb-3 mt-5">Histórico da equipa</h3>
            <TabelaAusencias pedidos={resolvidos} mostrarColaborador vazio="Ainda não há histórico." />
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

    const aAverbar = pedidos.filter((p) => p.status === "pendente_ch" || p.status === "aprovada");

    return (
        <div>
            <FaixaKpis kpis={[
                { valor: pedidos.length, label: "Total de pedidos" },
                { valor: pedidos.filter((p) => p.status === "pendente_dir" || p.status === "pendente_ch").length, label: "Pendentes", cor: "warn" },
                { valor: pedidos.filter((p) => p.status === "aprovada" || p.status === "justificada").length, label: "Aprovados/Justificados", cor: "ok" },
                { valor: pedidos.filter((p) => p.type === "maternidade").length, label: "Licenças de maternidade" },
            ]} />

            <Cartao className="mb-4">
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
                        vazio="Não há pedidos por averbar."
                        acoes={(p) => (
                            <button onClick={() => averbar(p.id)} className="text-[11.5px] text-pri font-semibold hover:underline">
                                Averbar no mapa
                            </button>
                        )}
                    />

                    <h3 className="text-[14.5px] mb-3 mt-5">Mapa completo da empresa</h3>
                    <TabelaAusencias pedidos={pedidos} mostrarColaborador vazio="Ainda não há pedidos registados." />
                </>
            )}
        </div>
    );
}
