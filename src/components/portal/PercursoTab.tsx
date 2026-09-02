import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import Cartao from "../Cartao";
import { Timeline, TimelineItem } from "../ui/Timeline";

interface ItemPercurso {
    date: string;
    source: string;
    title: string;
    detail?: string | null;
}

// Aba "Percurso" do Portal — histórico de carreira. Usa o id do colaborador
// quando é fornecido (CH a ver outro); caso contrário, o do próprio.
export default function PercursoTab({ colaboradorId }: { colaboradorId?: number }) {
    const { user } = useAuth();
    const id = colaboradorId ?? user?.id;
    const verOutro = typeof colaboradorId === "number";
    const [percurso, setPercurso] = useState<ItemPercurso[]>([]);
    const [aCarregar, setACarregar] = useState(true);

    useEffect(() => {
        if (!id) return;
        const url = verOutro ? `/career/collaborators/${id}/timeline` : "/career/me/timeline";
        api.get(url)
            .then((r) => setPercurso(r.data))
            .catch(() => setPercurso([]))
            .finally(() => setACarregar(false));
    }, [verOutro, id]);

    return (
        <Cartao>
            <h3 className="text-[14.5px] mb-1">Percurso profissional</h3>
            <p className="text-dim text-[11.5px] mb-4">
                Promoções, nomeações, louvores e outros eventos registados ao longo do vínculo.
            </p>
            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : percurso.length === 0 ? (
                <p className="text-dim text-sm py-3 text-center">Ainda não há eventos registados no percurso.</p>
            ) : (
                <Timeline>
                    {percurso.map((p, i) => (
                        <TimelineItem key={i} data={p.date} titulo={p.title} texto={p.detail} />
                    ))}
                </Timeline>
            )}
        </Cartao>
    );
}
