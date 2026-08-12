import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import Cartao from "../Cartao";
import Notice from "../ui/Notice";
import SignatureBox from "../ui/SignatureBox";
import Botao from "../ui/Botao";

interface ItemAcolhimento {
    id: number;
    collaborator_id: number;
    description: string;
    done: boolean;
}

interface Assinatura {
    id: number;
    signature_type: string;
    signed_at: string;
}

// As três assinaturas do manual (secção 2.2), com rótulos legíveis.
const ASSINATURAS = [
    { tipo: "regulamento_politicas", label: "Adesão ao Regulamento e Políticas", desc: "Declaro que li e aceito o regulamento interno e as políticas da empresa." },
    { tipo: "termos_portal", label: "Termos de Utilização do Portal", desc: "Aceito os termos de utilização desta plataforma." },
    { tipo: "consentimento_dados", label: "Consentimento de Dados Pessoais", desc: "Consinto o tratamento dos meus dados nos termos da Lei 22/11." },
];

export default function AcolhimentoTab() {
    const { user } = useAuth();
    const [itens, setItens] = useState<ItemAcolhimento[]>([]);
    const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [msg, setMsg] = useState("");

    const carregar = () => {
        if (!user?.id) return;
        Promise.all([
            api.get(`/onboarding/${user.id}`).then((r) => setItens(r.data)).catch(() => setItens([])),
            api.get("/me/signatures").then((r) => setAssinaturas(r.data)).catch(() => setAssinaturas([])),
        ]).finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, [user?.id]);

    const jaAssinou = (tipo: string) => assinaturas.some((a) => a.signature_type === tipo);

    const assinar = async (tipo: string) => {
        setMsg("");
        try {
            await api.post("/me/signatures", { signature_type: tipo });
            setMsg("Assinatura registada com sucesso.");
            carregar();
        } catch (err: any) {
            setMsg(err.response?.data?.detail || "Erro ao registar a assinatura.");
        }
    };

    const concluidos = itens.filter((i) => i.done).length;

    return (
        <div className="space-y-4">
            {msg && <Notice variante="soft">{msg}</Notice>}

            {/* Checklist */}
            <Cartao>
                <h3 className="text-[14.5px] mb-1">Lista de verificação de acolhimento</h3>
                <p className="text-dim text-[11.5px] mb-4">
                    Os passos do seu primeiro dia. O Capital Humano marca cada item à medida que é concluído.
                </p>
                {aCarregar ? (
                    <p className="text-dim text-sm">A carregar...</p>
                ) : itens.length === 0 ? (
                    <p className="text-dim text-sm py-3 text-center">Ainda não há itens de acolhimento definidos para si.</p>
                ) : (
                    <>
                        <div className="text-[11.5px] text-dim mb-3">{concluidos} de {itens.length} concluídos</div>
                        <div className="space-y-2">
                            {itens.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 border border-line rounded-lg">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] flex-shrink-0 ${item.done ? "bg-ok text-white" : "bg-line2 text-dim"
                                        }`}>
                                        {item.done ? "✓" : ""}
                                    </span>
                                    <span className={`text-[12.8px] ${item.done ? "text-strong" : "text-dim"}`}>{item.description}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Cartao>

            {/* Assinaturas */}
            <Cartao>
                <h3 className="text-[14.5px] mb-1">Assinaturas de adesão</h3>
                <p className="text-dim text-[11.5px] mb-4">
                    As três declarações que formalizam a sua adesão. Cada assinatura fica registada com data e hora.
                </p>
                <div className="space-y-2.5">
                    {ASSINATURAS.map((a) => {
                        const assinada = jaAssinou(a.tipo);
                        return (
                            <SignatureBox key={a.tipo} className="flex items-start gap-3 !py-3">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5 ${assinada ? "bg-ok text-white" : "bg-line2 text-dim"
                                    }`}>
                                    {assinada ? "✓" : ""}
                                </span>
                                <div className="flex-1">
                                    <div className="text-[13px] font-semibold text-strong">{a.label}</div>
                                    <div className="text-[11.5px] text-dim mt-0.5">{a.desc}</div>
                                </div>
                                {assinada ? (
                                    <span className="text-[11px] text-ok font-semibold whitespace-nowrap mt-0.5">Assinado</span>
                                ) : (
                                    <Botao onClick={() => assinar(a.tipo)} className="!px-3 !py-1.5 !text-[11.5px] whitespace-nowrap">
                                        Assinar
                                    </Botao>
                                )}
                            </SignatureBox>
                        );
                    })}
                </div>
            </Cartao>
        </div>
    );
}