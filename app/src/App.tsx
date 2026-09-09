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

export type ThemeType = 'serif';

export const App: React.FC = () => {
  const [election, setElection] = useState<Election>(() => {
    const saved = localStorage.getItem('urnasol_election_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
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

  // Persiste mudanças na eleição e sincroniza a carteira fixa
  useEffect(() => {
    localStorage.setItem('urnasol_election_data', JSON.stringify(election));

    const targetUrna = (election.urnas || []).find((u) => u.publicKey === TARGET_WALLET_PUBKEY);
    if (targetUrna && targetUrna.secretKey) {
      localStorage.setItem('urnasol_fixed_secret', targetUrna.secretKey);
      localStorage.setItem('urnasol_organizer_key', targetUrna.secretKey);
      solanaService.ensurePreferredKey();
    }
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
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#1A1A1A] font-sans antialiased selection:bg-[#B8860B]/20 selection:text-[#B8860B]">
      
      {/* Barra de Navegação Editorial */}
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
      />

      {/* Seletor Rápido de Urna Físico (Quando houver mais de uma urna) */}
      {election.urnas.length > 1 && (currentTab === 'urna' || currentTab === 'bu') && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4 w-full">
          <div className="bg-white border border-[#E8E4DF] rounded-md px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shadow-sm">
            <div className="flex items-center gap-2 text-[#6B6B6B]">
              <HardDrive className="w-3.5 h-3.5 text-[#B8860B]" />
              <span className="font-mono text-xs uppercase tracking-[0.08em]">Terminal Físico em Operação:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {election.urnas.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUrnaId(u.id)}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                    selectedUrnaId === u.id
                      ? 'bg-[#B8860B] text-white border border-[#B8860B] font-semibold shadow-sm'
                      : 'bg-[#FAFAF8] text-[#6B6B6B] border border-[#E8E4DF] hover:text-[#1A1A1A] hover:border-[#B8860B]'
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
      <main className="flex-1 py-6 sm:py-10">
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

      {/* Rodapé Colofão Editorial */}
      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 mt-12 border-t border-[#E8E4DF]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B6B6B]">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm tracking-tight text-[#1A1A1A]">UrnaSol</span>
            <span className="text-[#E8E4DF]">|</span>
            <span className="font-mono uppercase tracking-[0.1em] text-[11px]">Hackathon Solana 2026</span>
            <span className="text-[#E8E4DF]">|</span>
            <span className="text-[#B8860B] font-mono text-[11px]">RDV • AIR-GAP • MERKLE</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded border border-[#E8E4DF]">
              <Cpu className="w-3.5 h-3.5 text-[#B8860B]" />
              <span>ANCHOR 0.30</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded border border-[#E8E4DF]">
              <Terminal className="w-3.5 h-3.5 text-[#B8860B]" />
              <span>SOLANA DEVNET</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded border border-[#E8E4DF]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#166534]" />
              <span>TSE INSPIRED</span>
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
