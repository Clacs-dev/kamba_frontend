import TabelaAusencias, { type PedidoAusencia } from "./TabelaAusencias";

interface Props {
    pedidos: PedidoAusencia[];
    subtitulo?: string;
    acoes?: (p: PedidoAusencia) => React.ReactNode;
}

// Os dois mapas nunca são apresentados juntos numa tabela única: as férias
// ficam à esquerda e as ausências (faltas, maternidade, doença) à direita,
// cada uma com a sua paginação. Ambos mostram 10 linhas por página e esticam
// para a mesma altura, para o tamanho dos cartões não mudar ao paginar.
const PASSO_MAPA = 10;

export default function MapasLado({ pedidos, subtitulo, acoes }: Props) {
    const ferias = pedidos.filter((p) => p.type === "ferias");
    const ausencias = pedidos.filter((p) => p.type !== "ferias");

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
                <h3 className="text-[13.5px] mb-1 text-pri">Mapa de férias</h3>
                <p className="text-[11.5px] text-dim mb-2 min-h-[36px] line-clamp-2">{subtitulo || "Pedidos de férias registados."}</p>
                <TabelaAusencias
                    pedidos={ferias}
                    mostrarColaborador
                    mostrarDocumento
                    vazio="Sem pedidos de férias."
                    acoes={acoes}
                    passo={PASSO_MAPA}
                    minLinhas={PASSO_MAPA}
                    barraSempre
                    crescer
                />
            </div>

            <div className="flex flex-col">
                <h3 className="text-[13.5px] mb-1 text-pri">Mapa de ausências</h3>
                <p className="text-[11.5px] text-dim mb-2 min-h-[36px] line-clamp-2">Faltas, maternidade e doença prolongada.</p>
                <TabelaAusencias
                    pedidos={ausencias}
                    mostrarColaborador
                    mostrarDocumento
                    vazio="Sem ausências registadas."
                    acoes={acoes}
                    passo={PASSO_MAPA}
                    minLinhas={PASSO_MAPA}
                    barraSempre
                    crescer
                />
            </div>
        </div>
    );
}
