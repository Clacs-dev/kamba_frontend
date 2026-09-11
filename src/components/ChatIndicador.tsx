import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function ChatIndicador() {
    const [naoLidas, setNaoLidas] = useState(0);

    useEffect(() => {
        const buscar = () => {
            api.get("/chat/unread-count")
                .then((r) => setNaoLidas(r.data.unread ?? 0))
                .catch(() => { });
        };
        buscar();
        const intervalo = setInterval(buscar, 30000);
        return () => clearInterval(intervalo);
    }, []);

    return (
        <Link
            to="/chat"
            className="relative w-9 h-9 rounded-lg bg-panel border border-line flex items-center justify-center hover:border-pri transition-colors"
            title="Mensagens"
        >
            <span className="text-[15px]">💬</span>
            {naoLidas > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-bad text-white text-[10px] font-bold flex items-center justify-center">
                    {naoLidas > 9 ? "9+" : naoLidas}
                </span>
            )}
        </Link>
    );
}