import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-[80vh] justify-center items-center gap-12">
      <header className="text-center space-y-6">
        <h1 className="text-5xl md:text-8xl font-bold tracking-tighter mix-blend-difference">
          MESTRE
        </h1>
        <div className="bg-accent text-background px-4 py-2 inline-block transform -skew-x-12">
          <p className="font-mono font-bold uppercase tracking-widest text-sm md:text-base">
            Sistema de Votação com Blockchain
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <div className="brutalist-border p-6 bg-black/50 backdrop-blur-sm flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-accent">Modo Online</h2>
          <p className="text-muted font-mono text-sm leading-relaxed">
            Acesse enquetes de qualquer lugar. Seus votos são registrados de forma imutável na rede Solana Devnet, garantindo transparência total e auditoria em tempo real.
          </p>
          <div className="mt-auto pt-4">
            <Link href="/login">
              <button className="brutalist-button w-full">Entrar no Sistema</button>
            </Link>
          </div>
        </div>

        <div className="brutalist-border p-6 bg-black/50 backdrop-blur-sm flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-white">Modo Urna</h2>
          <p className="text-muted font-mono text-sm leading-relaxed">
            Kiosk mode offline-first. Registre votos localmente em dispositivos físicos. Sincronização automática com a blockchain quando a conexão for reestabelecida.
          </p>
          <div className="mt-auto pt-4">
            <Link href="/urna">
              <button className="brutalist-button w-full !bg-white !text-black hover:!bg-accent hover:!text-black">
                Acessar Urna
              </button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="mt-12 text-center text-muted font-mono text-xs">
        <p>CONECTADO A: <span className="text-accent">SOLANA DEVNET</span></p>
        <p className="mt-2">STATUS: <span className="animate-pulse text-white">SYSTEM ONLINE</span></p>
      </footer>
    </div>
  );
}
