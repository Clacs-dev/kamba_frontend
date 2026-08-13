import { useEffect, useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";
import Modal from "../Modal";
import Notice from "../ui/Notice";
import Tag from "../ui/Tag";
import Botao from "../ui/Botao";

interface Pedido {
    id: number;
    message: string;
    status: string;
    created_at: string;
    resolved_at: string | null;
}

function formatarData(iso: string): string {
    return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Aba Ficha do Portal — o colaborador consulta a sua ficha e pode requerer correções (secção 2.1).
export default function CorrecoesFicha() {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);

    const carregar = () => {
        api.get("/ficha-corrections/me")
            .then((r) => setPedidos(r.data))
            .catch(() => setPedidos([]))
            .finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    return (
        <Cartao className="mt-3">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-[14.5px]">Correções à ficha</h3>
                <Botao onClick={() => setModalAberto(true)} className="!px-3 !py-1.5 !text-[11.5px]">
                    Requerer correção
                </Botao>
            </div>
            <p className="text-dim text-[11.5px] mb-3">
                Encontrou um dado incorreto? Peça a correção ao Capital Humano — fica registada e tratada.
            </p>

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : pedidos.length === 0 ? (
                <p className="text-dim text-sm py-3 text-center">Ainda não há pedidos de correção.</p>
            ) : (
                <div className="space-y-2">
                    {pedidos.map((p) => (
                        <div key={p.id} className="border border-line rounded-lg px-3 py-2.5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-[12.6px] text-ink flex-1">{p.message}</div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {p.status === "resolvido"
                                        ? <Tag variante="ok">Resolvido</Tag>
                                        : <Tag variante="warn">Pendente</Tag>}
                                </div>
                            </div>
                            <div className="text-[10.8px] text-dim mt-1.5">
                                Pedido em {formatarData(p.created_at)}
                                {p.resolved_at && ` · tratado em ${formatarData(p.resolved_at)}`}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modalAberto && (
                <ModalCorrigirFicha
                    aoFechar={() => setModalAberto(false)}
                    aoEnviar={() => { setModalAberto(false); carregar(); }}
                />
            )}
        </Cartao>
    );
}

function ModalCorrigirFicha({ aoFechar, aoEnviar }: { aoFechar: () => void; aoEnviar: () => void }) {
    const [message, setMessage] = useState("");
    const [aEnviar, setAEnviar] = useState(false);
    const [erro, setErro] = useState("");

    const submeter = async () => {
        setAEnviar(true);
        setErro("");
        try {
            await api.post("/ficha-corrections", { message });
            aoEnviar();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Não foi possível submeter o pedido.");
        } finally {
            setAEnviar(false);
        }
    };

    return (
        <Modal aberto={true} aoFechar={aoFechar} titulo="Requerer correção à ficha" subtitulo="Descreva o que considera incorreto e o Capital Humano trata o pedido.">
            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Ex.: o meu local de trabalho está desatualizado — atualize para…"
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri"
            />
            {erro && <Notice variante="alert" className="mb-3">{erro}</Notice>}
            <div className="flex gap-2.5">
                <button onClick={aoFechar} className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors">Cancelar</button>
                <Botao onClick={submeter} disabled={aEnviar || message.trim().length < 3}>
                    {aEnviar ? "A enviar..." : "Submeter pedido"}
                </Botao>
            </div>
        </Modal>
    );
}
