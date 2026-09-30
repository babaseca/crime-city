import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import Button from "./Button";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="app-error-screen">
        <section className="app-error-card">
          <p className="eyebrow"><AlertTriangle size={15} aria-hidden="true" /> Falha do módulo</p>
          <h1>A Central perdeu a renderização desta tela.</h1>
          <p>{this.state.error?.message ?? "Erro desconhecido ao montar o módulo."}</p>
          <Button icon={RotateCcw} onClick={() => window.location.reload()}>Recarregar</Button>
        </section>
      </main>
    );
  }
}
