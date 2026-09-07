"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function UrnaPage() {
  const [cpf, setCpf] = useState("");
  const [dataNasc, setDataNasc] = useState("");
  const [voto, setVoto] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "voting" | "success" | "error">("idle");
  const [isOnline, setIsOnline] = useState(true);

  // Poll connection status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleVote = () => {
    if (!cpf || !dataNasc || !voto) return;
    
    // Simulating offline storage
    const offlineVotes = JSON.parse(localStorage.getItem("offline_votes") || "[]");
    offlineVotes.push({ cpf, dataNasc, voto, timestamp: new Date().toISOString() });
    localStorage.setItem("offline_votes", JSON.stringify(offlineVotes));
    
    setStatus("success");
    
    // Auto-reset for the next voter in Kiosk mode
    setTimeout(() => {
      setCpf("");
      setDataNasc("");
      setVoto(null);
      setStatus("idle");
    }, 5000);
  };

  return (
    <div className="flex flex-col min-h-[80vh] justify-center items-center gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-white text-black px-4 py-2 uppercase tracking-widest inline-block">
          Modo Urna
        </h1>
        <p className="font-mono mt-4 text-muted">
          Terminal Eleitoral {isOnline ? <span className="text-accent ml-2">[ONLINE]</span> : <span className="text-red-500 ml-2">[OFFLINE]</span>}
        </p>
      </div>

      <div className="brutalist-border p-8 bg-black w-full max-w-md space-y-6">
        {status === "success" ? (
          <div className="text-center space-y-4">
            <h2 className="text-3xl text-accent font-bold">VOTO REGISTRADO</h2>
            <p className="font-mono text-muted text-sm">
              {isOnline ? "Enviado para a Blockchain Solana" : "Salvo localmente. Sincronização pendente."}
            </p>
            <p className="text-xs text-muted mt-4">Reiniciando terminal em 5s...</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-sm mb-2 uppercase text-muted">CPF</label>
                <input 
                  type="text" 
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full bg-transparent border-2 border-border p-3 text-white font-mono focus:border-accent focus:outline-none transition-colors"
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="block font-mono text-sm mb-2 uppercase text-muted">Data de Nascimento</label>
                <input 
                  type="date" 
                  value={dataNasc}
                  onChange={(e) => setDataNasc(e.target.value)}
                  className="w-full bg-transparent border-2 border-border p-3 text-white font-mono focus:border-accent focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <label className="block font-mono text-sm mb-4 uppercase text-muted">Selecione sua Opção</label>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => setVoto("A")}
                  className={`border-2 p-4 font-mono font-bold uppercase transition-all ${voto === "A" ? "border-accent text-accent bg-accent/10" : "border-border text-white hover:border-white"}`}
                >
                  Opção A
                </button>
                <button 
                  onClick={() => setVoto("B")}
                  className={`border-2 p-4 font-mono font-bold uppercase transition-all ${voto === "B" ? "border-accent text-accent bg-accent/10" : "border-border text-white hover:border-white"}`}
                >
                  Opção B
                </button>
              </div>
            </div>

            <button 
              onClick={handleVote}
              disabled={!cpf || !dataNasc || !voto}
              className="brutalist-button w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CONFIRMAR VOTO
            </button>
          </>
        )}
      </div>
      
      <Link href="/" className="font-mono text-sm text-muted hover:text-white underline decoration-muted hover:decoration-white transition-colors">
        Sair do Modo Urna
      </Link>
    </div>
  );
}
