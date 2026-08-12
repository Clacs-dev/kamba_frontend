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

// Aba "Percurso" do Portal — histórico de carreira do colaborador (equivalente à aba `percurso` do protótipo).
export default function PercursoTab() {
    const { user } = useAuth();
    const [percurso, setPercurso] = useState<ItemPercurso[]>([]);
    const [aCarregar, setACarregar] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        api.get("/career/me/timeline")
            .then((r) => setPercurso(r.data))
            .catch(() => setPercurso([]))
            .finally(() => setACarregar(false));
    }, [user?.id]);

    return (
        <Cartao>
            <h3 className="text-[14.5px] mb-1">O seu percurso profissional</h3>
            <p className="text-dim text-[11.5px] mb-4">
                Promoções, nomeações, louvores e outros eventos registados ao longo do vínculo.
            </p>
            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : percurso.length === 0 ? (
                <p className="text-dim text-sm py-3 text-center">Ainda não há eventos registados no seu percurso.</p>
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
