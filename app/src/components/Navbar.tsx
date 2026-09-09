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
  Lock,
  Sun,
  Moon
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
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
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
  theme,
  setTheme,
}) => {
  const isClosed = electionStatus === 'closed';

  return (
    <header className="sticky top-2 sm:top-3 z-50 px-3 sm:px-6 w-full max-w-7xl mx-auto">
      <div className="rounded-2xl md:rounded-full bg-zinc-950/85 backdrop-blur-xl border border-zinc-800/80 shadow-2xl shadow-black/60 px-4 sm:px-5 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 transition-all">
        
        {/* Esquerda: Logo + Status da Eleição */}
        <div className="flex items-center justify-between md:justify-start gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/20">
              <Vote className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base">
                  UrnaSol
                </span>
                {isClosed ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    ENCERRADA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    VOTAÇÃO ABERTA
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 truncate max-w-[200px] sm:max-w-xs font-mono">
                {electionTitle}
              </p>
            </div>
          </div>

          {/* Botões rápidos mobile para fechar / silenciar */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              title={isOfflineMode ? 'Air-gap ativo' : 'Conectado à Devnet'}
              className={`p-1.5 rounded-full border text-xs ${
                isOfflineMode 
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' 
                  : 'border-zinc-700 bg-zinc-800/50 text-zinc-300'
              }`}
            >
              {isOfflineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setAudioMuted(!audioMuted)}
              className="p-1.5 rounded-full border border-zinc-700 bg-zinc-800/50 text-zinc-300"
            >
              {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Centro: Abas de Navegação em Formato Pill Island */}
        <nav className="flex items-center justify-center gap-1 overflow-x-auto py-0.5">
          <button
            onClick={() => setCurrentTab('urna')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all shrink-0 ${
              currentTab === 'urna'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span>Cabine</span>
          </button>

          <button
            onClick={() => setCurrentTab('mesario')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all shrink-0 ${
              currentTab === 'mesario'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mesário</span>
          </button>

          <button
            onClick={() => setCurrentTab('bu')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all shrink-0 ${
              currentTab === 'bu'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>BU</span>
            {!isClosed && <Lock className="w-2.5 h-2.5 text-amber-400" />}
          </button>

          <button
            onClick={() => setCurrentTab('auditoria')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all shrink-0 ${
              currentTab === 'auditoria'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Apuração</span>
            {!isClosed && <Lock className="w-2.5 h-2.5 text-amber-400" />}
          </button>

          <button
            onClick={() => setCurrentTab('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all shrink-0 ${
              currentTab === 'admin'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </nav>

        {/* Direita: Controles de Sistema e Encerramento */}
        <div className="hidden md:flex items-center gap-2">
          {/* Botão Encerrar/Reabrir Eleição */}
          {onToggleCloseElection && (
            <button
              onClick={onToggleCloseElection}
              title={isClosed ? 'Reabrir eleição' : 'Encerrar votação oficial e gerar BUs'}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold transition-all ${
                isClosed
                  ? 'border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-500'
                  : 'border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 shadow-sm shadow-red-500/20'
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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold transition-all border ${
              isOfflineMode
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                : 'border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-500'
            }`}
          >
            {isOfflineMode ? (
              <>
                <WifiOff className="w-3 h-3" />
                <span>AIR-GAP</span>
              </>
            ) : (
              <>
                <Wifi className="w-3 h-3" />
                <span>DEVNET</span>
              </>
            )}
          </button>

          {/* Toggle Som */}
          <button
            onClick={() => setAudioMuted(!audioMuted)}
            title={audioMuted ? 'Ativar som da urna' : 'Silenciar som da urna'}
            className="w-7 h-7 rounded-full flex items-center justify-center border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:text-white hover:border-zinc-500 transition-all"
          >
            {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Toggle Tema Clean (Dark / Day) */}
          <button
            onClick={() => setTheme(theme === 'day' ? 'night' : 'day')}
            title={theme === 'day' ? 'Mudar para tema Dark' : 'Mudar para tema Claro'}
            className="w-7 h-7 rounded-full flex items-center justify-center border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:text-white hover:border-zinc-500 transition-all"
          >
            {theme === 'day' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>
    </header>
  );
};
