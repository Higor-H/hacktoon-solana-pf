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
  CheckCircle2,
  Lock
} from 'lucide-react';

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
    <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-emerald-400 p-[2px] flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Vote className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight font-display bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
                  UrnaSol
                </span>
                {isClosed ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 uppercase tracking-wider flex items-center gap-1">
                    <Ban className="w-3 h-3" />
                    Encerrada
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Votação Aberta
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block truncate max-w-xs font-mono">
                {electionTitle}
              </p>
            </div>
          </div>

          {/* Navegação Principal */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setCurrentTab('urna')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'urna'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Vote className="w-4 h-4" />
              <span>Cabine (Urna)</span>
            </button>

            <button
              onClick={() => setCurrentTab('mesario')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'mesario'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Mesário</span>
            </button>

            <button
              onClick={() => setCurrentTab('bu')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'bu'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Boletim (BU)</span>
              {!isClosed && (
                <Lock className="w-3 h-3 text-amber-400 opacity-80" />
              )}
            </button>

            <button
              onClick={() => setCurrentTab('auditoria')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'auditoria'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Apuração & Auditoria</span>
              {!isClosed && (
                <Lock className="w-3 h-3 text-amber-400 opacity-80" />
              )}
            </button>

            <button
              onClick={() => setCurrentTab('admin')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'admin'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </nav>

          {/* Controles de Ambiente: Encerramento / Offline / Áudio */}
          <div className="flex items-center gap-2">
            
            {/* Botão de Encerramento Rápido de Eleição */}
            {onToggleCloseElection && (
              <button
                onClick={onToggleCloseElection}
                className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  isClosed
                    ? 'bg-slate-800 text-slate-300 border-white/20 hover:bg-slate-700'
                    : 'bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25'
                }`}
                title={isClosed ? "Reabrir eleição" : "Encerrar votação oficial e lacrar urnas"}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{isClosed ? 'Reabrir Pleito' : 'Encerrar Votação'}</span>
              </button>
            )}

            {/* Toggle Modo Offline Air-Gap */}
            <button
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              title={isOfflineMode ? "Modo Offline Ativo (Air-Gap seguro)" : "Modo Online (Sincronizado)"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isOfflineMode
                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {isOfflineMode ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Urna Offline</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Solana Devnet</span>
                </>
              )}
            </button>

            {/* Toggle de Som */}
            <button
              onClick={() => setAudioMuted(!audioMuted)}
              title={audioMuted ? "Ativar som da urna" : "Silenciar som da urna"}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-white/5"
            >
              {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>

        </div>

        {/* Menu Mobile */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-white/5 text-xs">
          <button
            onClick={() => setCurrentTab('urna')}
            className={`px-3 py-1 rounded-md shrink-0 ${currentTab === 'urna' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-300'}`}
          >
            Cabine
          </button>
          <button
            onClick={() => setCurrentTab('mesario')}
            className={`px-3 py-1 rounded-md shrink-0 ${currentTab === 'mesario' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-300'}`}
          >
            Mesário
          </button>
          <button
            onClick={() => setCurrentTab('bu')}
            className={`px-3 py-1 rounded-md shrink-0 flex items-center gap-1 ${currentTab === 'bu' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-300'}`}
          >
            <span>Boletim (BU)</span>
            {!isClosed && <Lock className="w-2.5 h-2.5 text-amber-400" />}
          </button>
          <button
            onClick={() => setCurrentTab('auditoria')}
            className={`px-3 py-1 rounded-md shrink-0 flex items-center gap-1 ${currentTab === 'auditoria' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-300'}`}
          >
            <span>Apuração</span>
            {!isClosed && <Lock className="w-2.5 h-2.5 text-amber-400" />}
          </button>
          <button
            onClick={() => setCurrentTab('admin')}
            className={`px-3 py-1 rounded-md shrink-0 ${currentTab === 'admin' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-300'}`}
          >
            Admin
          </button>
        </div>
      </div>
    </header>
  );
};
