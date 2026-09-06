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
import { ShieldCheck, HardDrive, Cpu, Terminal } from 'lucide-react';

export const App: React.FC = () => {
  const [election, setElection] = useState<Election>(() => {
    const saved = localStorage.getItem('urnasol_election_data');
    if (saved) {
      try {
        return JSON.parse(saved);
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

  // Persiste mudanças na eleição
  useEffect(() => {
    localStorage.setItem('urnasol_election_data', JSON.stringify(election));
  }, [election]);

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

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-black">
      
      {/* Barra de Navegação Superior */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOfflineMode={isOfflineMode}
        setIsOfflineMode={setIsOfflineMode}
        audioMuted={audioMuted}
        setAudioMuted={setAudioMuted}
        electionTitle={election.title}
      />

      {/* Seletor Rápido de Urna Físico (Caso haja mais de uma urna) */}
      {election.urnas.length > 1 && (currentTab === 'urna' || currentTab === 'bu') && (
        <div className="bg-slate-900/90 border-b border-white/5 py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Terminal Físico em Operação:</span>
            </div>
            <div className="flex gap-2">
              {election.urnas.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUrnaId(u.id)}
                  className={`px-2.5 py-1 rounded-md font-mono transition-all ${
                    selectedUrnaId === u.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'text-slate-400 hover:text-white bg-white/5'
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
      <main className="flex-1">
        {currentTab === 'urna' && (
          <UrnaTerminal
            election={election}
            selectedUrna={currentUrna}
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
            onGoToAuditoria={() => setCurrentTab('auditoria')}
          />
        )}

        {currentTab === 'auditoria' && (
          <AuditoriaPortal
            election={election}
            initialReceiptCode={auditReceiptCode}
          />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard
            election={election}
            onUpdateElection={setElection}
          />
        )}
      </main>

      {/* Rodapé Informativo sobre a Arquitetura */}
      <footer className="border-t border-white/5 bg-slate-950 py-6 px-4 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300 font-display">UrnaSol</span>
            <span>•</span>
            <span>Hackathon Solana 2026</span>
            <span>•</span>
            <span className="text-emerald-400">Voto Secreto (RDV) + Offline Air-Gap + Árvore de Merkle</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Anchor 0.30</span>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Solana Devnet</span>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>TSE Inspired</span>
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
