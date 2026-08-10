import { useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";

interface Props {
    evaluationId: number;
    aoAgir: () => void;
}

export default function BlocoConcordancia({ evaluationId, aoAgir }: Props) {
    const [modoRecurso, setModoRecurso] = useState(false);
    const [motivo, setMotivo] = useState("");
    const [erro, setErro] = useState("");
    const [aCarregar, setACarregar] = useState(false);

    const aceitar = async () => {
        setErro("");
        setACarregar(true);
        try {
            await api.post(`/evaluations/${evaluationId}/accept`);
            aoAgir();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao aceitar.");
        } finally {
            setACarregar(false);
        }
    };

    const recorrer = async () => {
        setErro("");
        setACarregar(true);
        try {
            await api.post(`/evaluations/${evaluationId}/appeal`, { reason: motivo });
            aoAgir();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao submeter recurso.");
        } finally {
            setACarregar(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Aceitar */}
            <Cartao className="border-ok">
                <h3 className="text-[14.5px] mb-2">Concordo com a avaliação</h3>
                <p className="text-dim text-[12.3px] mb-3">
                    A avaliação fecha com a nota do director e segue para validação da Administração.
                </p>
                <button
                    onClick={aceitar}
                    disabled={aCarregar}
                    className="bg-ok text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                    {aCarregar ? "A processar..." : "Aceitar a avaliação"}
                </button>
            </Cartao>

            {/* Recorrer */}
            <Cartao className="border-warn">
                <h3 className="text-[14.5px] mb-2">Não concordo — apresentar recurso</h3>
                {!modoRecurso ? (
                    <>
                        <p className="text-dim text-[12.3px] mb-3">
                            Pode recorrer, por escrito e fundamentadamente, para a Comissão de Avaliação.
                        </p>
                        <button
                            onClick={() => setModoRecurso(true)}
                            className="bg-bad text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:opacity-90 transition-opacity"
                        >
                            Quero recorrer
                        </button>
                    </>
                ) : (
                    <>
                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">
                            Fundamento do recurso
                        </label>
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            rows={3}
                            placeholder="Ex.: os objetivos foram afetados por fatores externos documentados…"
                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-2 focus:outline-none focus:border-pri"
                        />
                        <button
                            onClick={recorrer}
                            disabled={aCarregar || motivo.length < 3}
                            className="bg-bad text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                            {aCarregar ? "A submeter..." : "Submeter recurso à Comissão"}
                        </button>
                    </>
                )}
            </Cartao>

            {erro && <p className="text-bad text-sm md:col-span-2">{erro}</p>}
        </div>
    );
}