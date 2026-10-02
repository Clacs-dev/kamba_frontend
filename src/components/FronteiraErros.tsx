import { Component, type ErrorInfo, type ReactNode } from "react";

interface Estado {
    erro: Error | null;
}

interface Props {
    children: ReactNode;
}

/**
 * Fronteira de erros da aplicacao.
 *
 * Sem isto, qualquer excepcao durante o render deixa a pagina completamente
 * em branco e nao da nenhuma pista da causa. Aqui mostramos a mensagem e
 * enriquecemos o utilizador com os ficheiros afectados.
 */
export default class FronteiraErros extends Component<Props, Estado> {
    state: Estado = { erro: null };

    static getDerivedStateFromError(erro: Error): Estado {
        return { erro };
    }

    componentDidCatch(erro: Error, info: ErrorInfo) {
        // eslint-disable-next-line no-console
        console.error("Erro ao desenhar a pagina:", erro, info.componentStack);
    }

    render() {
        const { erro } = this.state;
        if (!erro) return this.props.children;

        return (
            <div style={{ padding: 28, fontFamily: "system-ui, sans-serif", color: "#22323a" }}>
                <h1 style={{ fontSize: 19, marginBottom: 8 }}>Ocorreu um erro ao mostrar esta página</h1>
                <p style={{ fontSize: 13.5, marginBottom: 14, color: "#5a6a72" }}>
                    A página não pôde ser desenhada. Recarregue; se persistir, envie a mensagem abaixo.
                </p>
                <pre
                    style={{
                        background: "#f4f6f7",
                        border: "1px solid #dfe5e8",
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 12.5,
                        whiteSpace: "pre-wrap",
                        overflowX: "auto",
                    }}
                >
                    {erro.message}
                </pre>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: 14,
                        background: "#43808c",
                        color: "#fff",
                        border: 0,
                        borderRadius: 8,
                        padding: "9px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    Recarregar
                </button>
            </div>
        );
    }
}