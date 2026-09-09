import React from 'react';
import { 
  Vote, 
  ShieldCheck, 
  FileText, 
  Users, 
  Settings, 
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX,
  Ban,
  Lock
} from 'lucide-react';
import type { ThemeType } from '../App';

export type TabType = 'urna' | 'mesario' | 'bu' | 'auditoria' | 'admin';

interface NavbarProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  isOfflineMode: boolean;
  setIsOfflineMode: (offline: boolean) => void;
  audioMuted: boolean;
  setAudioMuted: (muted: boolean) => void;
  electionTitle: string;
  electionStatus?: 'draft' | 'active' | 'closed';
  onToggleCloseElection?: () => void;
  theme?: ThemeType;
  setTheme?: (t: ThemeType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  isOfflineMode,
  setIsOfflineMode,
  audioMuted,
  setAudioMuted,
  electionTitle,
  electionStatus = 'active',
  onToggleCloseElection,
}) => {
  const isClosed = electionStatus === 'closed';

  return (
    <header className="sticky top-0 z-50 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[#E8E4DF] transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Esquerda: Logo Editorial e Título da Eleição */}
        <div className="flex items-center justify-between md:justify-start gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#FFFFFF] border border-[#E8E4DF] flex items-center justify-center text-[#B8860B] shadow-sm">
              <Vote className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-serif font-bold text-xl tracking-tight text-[#1A1A1A]">
                  UrnaSol
                </span>
                {isClosed ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-[0.1em] uppercase bg-[#991B1B]/10 text-[#991B1B] border border-[#991B1B]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#991B1B]" />
                    ENCERRADA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-[0.1em] uppercase bg-[#166534]/10 text-[#166534] border border-[#166534]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
                    VOTAÇÃO ABERTA
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B6B6B] truncate max-w-[220px] sm:max-w-xs font-sans mt-0.5">
                {electionTitle}
              </p>
            </div>
          </div>

          {/* Botões Rápidos Mobile */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              title={isOfflineMode ? 'Air-gap ativo' : 'Conectado à Devnet'}
              className={`p-1.5 rounded-md border text-xs ${
                isOfflineMode 
                  ? 'border-[#B45309]/30 bg-[#B45309]/10 text-[#B45309]' 
                  : 'border-[#E8E4DF] bg-white text-[#1A1A1A]'
              }`}
            >
              {isOfflineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setAudioMuted(!audioMuted)}
              className="p-1.5 rounded-md border border-[#E8E4DF] bg-white text-[#6B6B6B]"
            >
              {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Centro: Navegação com Tipografia Editorial */}
        <nav className="flex items-center justify-center gap-1 overflow-x-auto py-0.5">
          <button
            onClick={() => setCurrentTab('urna')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-sans tracking-[0.04em] font-medium transition-all shrink-0 ${
              currentTab === 'urna'
                ? 'bg-white text-[#B8860B] border border-[#E8E4DF] shadow-sm font-semibold'
                : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white/60 border border-transparent'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span>Cabine</span>
          </button>

          <button
            onClick={() => setCurrentTab('mesario')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-sans tracking-[0.04em] font-medium transition-all shrink-0 ${
              currentTab === 'mesario'
                ? 'bg-white text-[#B8860B] border border-[#E8E4DF] shadow-sm font-semibold'
                : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white/60 border border-transparent'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mesário</span>
          </button>

          <button
            onClick={() => setCurrentTab('bu')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-sans tracking-[0.04em] font-medium transition-all shrink-0 ${
              currentTab === 'bu'
                ? 'bg-white text-[#B8860B] border border-[#E8E4DF] shadow-sm font-semibold'
                : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white/60 border border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Boletim</span>
            {!isClosed && <Lock className="w-2.5 h-2.5 text-[#B45309]" />}
          </button>

          <button
            onClick={() => setCurrentTab('auditoria')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-sans tracking-[0.04em] font-medium transition-all shrink-0 ${
              currentTab === 'auditoria'
                ? 'bg-white text-[#B8860B] border border-[#E8E4DF] shadow-sm font-semibold'
                : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white/60 border border-transparent'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Apuração</span>
            {!isClosed && <Lock className="w-2.5 h-2.5 text-[#B45309]" />}
          </button>

          <button
            onClick={() => setCurrentTab('admin')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-sans tracking-[0.04em] font-medium transition-all shrink-0 ${
              currentTab === 'admin'
                ? 'bg-white text-[#B8860B] border border-[#E8E4DF] shadow-sm font-semibold'
                : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white/60 border border-transparent'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </nav>

        {/* Direita: Controles de Sistema em Estilo Serif */}
        <div className="hidden md:flex items-center gap-2">
          {/* Botão Encerrar/Reabrir Eleição */}
          {onToggleCloseElection && (
            <button
              onClick={onToggleCloseElection}
              title={isClosed ? 'Reabrir eleição' : 'Encerrar votação oficial e lacrar urnas'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium tracking-[0.05em] uppercase transition-all ${
                isClosed
                  ? 'border border-[#E8E4DF] bg-white text-[#1A1A1A] hover:border-[#B8860B] hover:text-[#B8860B]'
                  : 'border border-[#991B1B]/30 bg-[#991B1B]/10 text-[#991B1B] hover:bg-[#991B1B]/20'
              }`}
            >
              <Ban className="w-3 h-3" />
              <span>{isClosed ? 'REABRIR' : 'ENCERRAR'}</span>
            </button>
          )}

          {/* Toggle Offline Air-Gap */}
          <button
            onClick={() => setIsOfflineMode(!isOfflineMode)}
            title={isOfflineMode ? 'Modo Offline Ativo (Air-Gap seguro)' : 'Modo Online (Sincronizado)'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono font-medium tracking-[0.05em] uppercase transition-all border ${
              isOfflineMode
                ? 'border-[#B45309]/30 bg-[#B45309]/10 text-[#B45309]'
                : 'border-[#E8E4DF] bg-white text-[#1A1A1A] hover:border-[#B8860B]'
            }`}
          >
            {isOfflineMode ? (
              <>
                <WifiOff className="w-3 h-3" />
                <span>AIR-GAP</span>
              </>
            ) : (
              <>
                <Wifi className="w-3 h-3 text-[#B8860B]" />
                <span>DEVNET</span>
              </>
            )}
          </button>

          {/* Toggle Som */}
          <button
            onClick={() => setAudioMuted(!audioMuted)}
            title={audioMuted ? 'Ativar som da urna' : 'Silenciar som da urna'}
            className="w-8 h-8 rounded-md flex items-center justify-center border border-[#E8E4DF] bg-white text-[#6B6B6B] hover:text-[#1A1A1A] hover:border-[#B8860B] transition-all"
          >
            {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>
    </header>
  );
};
