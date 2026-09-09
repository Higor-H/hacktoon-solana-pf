import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import type { TabType } from './components/Navbar';
import { UrnaTerminal } from './components/UrnaTerminal';
import { MesarioTerminal } from './components/MesarioTerminal';
import { BoletimUrnaView } from './components/BoletimUrnaView';
import { AuditoriaPortal } from './components/AuditoriaPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { createDefaultElection } from './lib/electionPresets';
import type { Election } from './lib/types';
import { offlineUrnaService } from './lib/offlineUrna';
import { solanaService, TARGET_WALLET_PUBKEY } from './lib/solanaService';
import { ShieldCheck, HardDrive, Cpu, Terminal } from 'lucide-react';

export type ThemeType = 'night' | 'day' | 'coffee' | 'sakura' | 'cyberpunk';

export const App: React.FC = () => {
  const [election, setElection] = useState<Election>(() => {
    const saved = localStorage.getItem('urnasol_election_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Sanitiza os pins: se não houver votos gravados nas urnas, desmarca isUsed residual
        const totalVotes = (parsed.urnas || []).flatMap((u: { id: string }) => offlineUrnaService.getVotes(u.id)).length;
        if (totalVotes === 0 && parsed.voterPins) {
          parsed.voterPins = parsed.voterPins.map((v: { pin: string }) => ({
            ...v,
            isUsed: false,
            usedAt: undefined,
          }));
        }
        return parsed;
      } catch {
        // Fallback
      }
    }
    return createDefaultElection();
  });

  const [currentTab, setCurrentTab] = useState<TabType>('urna');
  const [selectedUrnaId, setSelectedUrnaId] = useState<string>(election.urnas[0]?.id || 'URNA-01');
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(true);
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [auditReceiptCode, setAuditReceiptCode] = useState<string>('');
  const [theme, setTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('urnasol_theme') as ThemeType) || 'night';
  });

  // Persiste mudanças na eleição e sincroniza a carteira fixa
  useEffect(() => {
    localStorage.setItem('urnasol_election_data', JSON.stringify(election));

    // Sincroniza a chave fixa caso esteja presente nas urnas da eleição
    const targetUrna = (election.urnas || []).find((u) => u.publicKey === TARGET_WALLET_PUBKEY);
    if (targetUrna && targetUrna.secretKey) {
      localStorage.setItem('urnasol_fixed_secret', targetUrna.secretKey);
      localStorage.setItem('urnasol_organizer_key', targetUrna.secretKey);
      solanaService.ensurePreferredKey();
    }
  }, [election]);

  // Persiste o tema
  useEffect(() => {
    localStorage.setItem('urnasol_theme', theme);
  }, [theme]);

  // Urna selecionada ativa
  const currentUrna = election.urnas.find((u) => u.id === selectedUrnaId) || election.urnas[0];

  // Callback de redirecionamento para auditoria com o código preenchido
  const handleGoToAuditoria = (receiptCode: string) => {
    setAuditReceiptCode(receiptCode);
    setCurrentTab('auditoria');
  };

  // Callback quando o mesário libera cabine para um eleitor
  const handleSelectVoterToVote = (_pin: string) => {
    setCurrentTab('urna');
  };

  // Alterna encerramento oficial da eleição
  const handleToggleCloseElection = async () => {
    if (election.status === 'active') {
      for (const u of election.urnas) {
        await offlineUrnaService.closeUrnaAndGenerateBU(election, u);
      }
      setElection((prev) => ({ ...prev, status: 'closed' }));
      setCurrentTab('auditoria');
    } else {
      setElection((prev) => ({ ...prev, status: 'active' }));
    }
  };

  return (
    <div
      data-theme={theme}
      className="min-h-screen flex flex-col antialiased selection:bg-emerald-500/30 selection:text-emerald-300"
    >
      {/* Barra de Navegação Superior em Ilha Flutuante */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOfflineMode={isOfflineMode}
        setIsOfflineMode={setIsOfflineMode}
        audioMuted={audioMuted}
        setAudioMuted={setAudioMuted}
        electionTitle={election.title}
        electionStatus={election.status}
        onToggleCloseElection={handleToggleCloseElection}
        theme={theme}
        setTheme={setTheme}
      />

      {/* Seletor Rápido de Urna Físico (Ilha flutuante quando há múltiplas urnas) */}
      {election.urnas.length > 1 && (currentTab === 'urna' || currentTab === 'bu') && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 my-2 w-full">
          <div className="rounded-2xl bg-zinc-950/70 border border-zinc-800/80 px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs backdrop-blur-md">
            <div className="flex items-center gap-2 text-zinc-400">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Terminal Físico em Operação:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {election.urnas.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUrnaId(u.id)}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-medium transition-all ${
                    selectedUrnaId === u.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                      : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  {u.id} ({u.location.split('-')[0].trim()})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal Renderizado por Aba */}
      <main className="flex-1 py-4">
        {currentTab === 'urna' && (
          <UrnaTerminal
            election={election}
            selectedUrna={currentUrna}
            onUpdateElection={setElection}
            audioMuted={audioMuted}
            onGoToAuditoria={handleGoToAuditoria}
          />
        )}

        {currentTab === 'mesario' && (
          <MesarioTerminal
            election={election}
            onUpdateElection={setElection}
            onSelectVoterToVote={handleSelectVoterToVote}
          />
        )}

        {currentTab === 'bu' && (
          <BoletimUrnaView
            election={election}
            selectedUrna={currentUrna}
            onUrnaSubmitted={() => {}}
            onGoToAuditoria={() => setCurrentTab('auditoria')}
            onUpdateElection={setElection}
          />
        )}

        {currentTab === 'auditoria' && (
          <AuditoriaPortal
            election={election}
            initialReceiptCode={auditReceiptCode}
            onUpdateElection={setElection}
          />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard
            election={election}
            onUpdateElection={setElection}
          />
        )}
      </main>

      {/* Rodapé Informativo em Ilha Suspensa Minimalista */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 mt-12">
        <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/60 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-white font-bold tracking-wider">URNASOL</span>
            <span className="text-zinc-600">//</span>
            <span>HACKATHON SOLANA 2026</span>
            <span className="text-zinc-600">--</span>
            <span className="text-emerald-400 font-medium">RDV + AIR-GAP + MERKLE</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 bg-zinc-900/60 px-2.5 py-1 rounded-full border border-zinc-800">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              <span>ANCHOR 0.30</span>
            </span>
            <span className="flex items-center gap-1.5 bg-zinc-900/60 px-2.5 py-1 rounded-full border border-zinc-800">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>SOLANA DEVNET</span>
            </span>
            <span className="flex items-center gap-1.5 bg-zinc-900/60 px-2.5 py-1 rounded-full border border-zinc-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>TSE INSPIRED</span>
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
