import { useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";

interface Props {
    evaluationId: number;
    aoAgir: () => void;
}

export default function BlocoValidacao({ evaluationId, aoAgir }: Props) {
    const [erro, setErro] = useState("");
    const [aCarregar, setACarregar] = useState(false);

    const validar = async () => {
        setErro("");
        setACarregar(true);
        try {
            await api.post(`/evaluations/${evaluationId}/validate`);
            aoAgir();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao validar.");
        } finally {
            setACarregar(false);
        }
    };

    return (
        <Cartao className="border-pri">
            <h3 className="text-[14.5px] mb-2">Validação da Administração</h3>
            <p className="text-dim text-[12.3px] mb-3">
                A avaliação está fechada. Valide-a para produzir efeitos (prémios, progressão)
                e integrar o relatório consolidado do ciclo.
            </p>
            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}
            <button
                onClick={validar}
                disabled={aCarregar}
                className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40"
            >
                {aCarregar ? "A validar..." : "Validar avaliação"}
            </button>
        </Cartao>
    );
}