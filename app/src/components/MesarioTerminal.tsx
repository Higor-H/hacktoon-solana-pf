import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  CheckCircle, 
  KeyRound, 
  ArrowRight, 
  UserPlus, 
  FileCheck,
  Building,
  GraduationCap
} from 'lucide-react';
import type { Election, VoterPin } from '../lib/types';

interface MesarioTerminalProps {
  election: Election;
  onUpdateElection: (updated: Election) => void;
  onSelectVoterToVote: (pin: string) => void;
}

export const MesarioTerminal: React.FC<MesarioTerminalProps> = ({
  election,
  onUpdateElection,
  onSelectVoterToVote,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeReleasedPin, setActiveReleasedPin] = useState<VoterPin | null>(null);
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newName, setNewName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Filtra eleitores
  const filteredVoters = election.voterPins.filter(
    (v) =>
      v.voterIdentifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.voterName && v.voterName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const votersCount = election.voterPins.length;
  const votedCount = election.voterPins.filter((v) => v.isUsed).length;
  const turnoutPercentage = votersCount > 0 ? ((votedCount / votersCount) * 100).toFixed(1) : '0';

  // Mesário libera cabine para o eleitor
  const handleReleaseBooth = (voter: VoterPin) => {
    // Atualiza estado do votante como AUTORIZADO para votar
    const updatedVoters = election.voterPins.map((v) =>
      v.pin === voter.pin ? { ...v, isAuthorized: true } : v
    );

    const updatedElection: Election = {
      ...election,
      voterPins: updatedVoters,
    };

    onUpdateElection(updatedElection);
    setActiveReleasedPin(voter);
  };

  // Cadastrar novo eleitor na hora
  const handleAddVoter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdentifier) return;

    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    const newVoter: VoterPin = {
      pin: randomPin,
      voterIdentifier: newIdentifier,
      voterName: newName || undefined,
      isUsed: false,
      createdAt: Date.now(),
    };

    const updatedElection: Election = {
      ...election,
      registeredVoters: election.registeredVoters + 1,
      voterPins: [newVoter, ...election.voterPins],
    };

    onUpdateElection(updatedElection);
    setNewIdentifier('');
    setNewName('');
    setShowAddModal(false);
  };

  return (
    <div className="max-w-6xl mx-auto py-4 px-4 sm:px-6">

      {/* Cabeçalho do Terminal do Mesário em Ilha */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs font-mono font-semibold tracking-wider text-emerald-400 uppercase">
            <FileCheck className="w-4 h-4" />
            <span>TERMINAL DE IDENTIFICAÇÃO DO ELEITOR</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            CADERNO DE VOTAÇÃO
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Valide a identidade do eleitor antes de emitir o PIN e liberar a cabine de votação.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="island-btn-primary rounded-xl self-start md:self-auto text-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>NOVO ELEITOR</span>
        </button>
      </div>

      {/* Cartões de Estatísticas em Ilhas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

        <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md flex items-center justify-between shadow-lg">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
              TOTAL DE APTOS
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {votersCount}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Cadastrados no sistema</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shadow-inner">
            {election.institutionType === 'condo' ? <Building className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md flex items-center justify-between shadow-lg">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
              COMPARECERAM
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {votedCount}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Votaram até o momento</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md flex items-center justify-between shadow-lg">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
              QUÓRUM ELEITORAL
            </div>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono">
              {turnoutPercentage}%
            </div>
            <div className="text-xs text-zinc-500 mt-1">Participação total</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Users className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Barra de Busca em Ilha */}
      <div className="p-3 mb-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md shadow-lg">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="BUSCAR POR APARTAMENTO, NOME OU IDENTIFICADOR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all"
          />
        </div>
      </div>

      {/* Tabela do Caderno de Eleitores em Ilha Arredondada */}
      <div className="rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">
                  IDENTIFICAÇÃO / UNIDADE
                </th>
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">
                  NOME DO ELEITOR
                </th>
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">
                  PIN
                </th>
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">
                  STATUS
                </th>
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-right">
                  AÇÃO
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredVoters.map((voter) => (
                <tr
                  key={voter.pin}
                  className={`transition-colors ${
                    voter.isUsed ? 'bg-zinc-900/20 text-zinc-500' : 'hover:bg-zinc-900/40 text-zinc-300'
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-white">
                    {voter.voterIdentifier}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {voter.voterName || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono">
                      {voter.pin}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {voter.isUsed ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        JÁ VOTOU
                      </span>
                    ) : voter.isAuthorized ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        CABINE LIBERADA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
                        APTO A VOTAR
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {voter.isUsed ? (
                      <span className="text-[11px] text-zinc-500 font-mono">
                        VOTOU ÀS {voter.usedAt ? new Date(voter.usedAt).toLocaleTimeString() : '--:--'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleReleaseBooth(voter)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium transition-all ${
                          voter.isAuthorized
                            ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500'
                        }`}
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>{voter.isAuthorized ? 'VER PIN' : 'LIBERAR VOTO'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cabine Liberada em Ilha Arredondada */}
      {activeReleasedPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/80 animate-fade-in text-center">
            
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-lg text-white tracking-tight mb-1">
              CABINE LIBERADA!
            </h3>
            <p className="text-xs text-zinc-400 mb-6 font-mono">
              O eleitor <strong className="text-white">{activeReleasedPin.voterIdentifier}</strong> foi identificado e está apto a votar na urna.
            </p>

            <div className="p-5 mb-6 rounded-2xl bg-zinc-900/70 border border-emerald-500/30 text-center">
              <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
                PIN DE AUTORIZAÇÃO ÚNICO:
              </div>
              <div className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-emerald-400">
                {activeReleasedPin.pin}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  onSelectVoterToVote(activeReleasedPin.pin);
                  setActiveReleasedPin(null);
                }}
                className="island-btn-primary rounded-xl w-full py-3"
              >
                <span>IR PARA A CABINE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveReleasedPin(null)}
                className="island-btn rounded-xl w-full py-2.5"
              >
                <span>FECHAR — CONTINUAR NO MESÁRIO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Novo Eleitor em Ilha */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/80 animate-fade-in">
            <h3 className="font-bold text-base text-white tracking-tight mb-4">
              ADICIONAR ELEITOR AO CADERNO
            </h3>
            <form onSubmit={handleAddVoter} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                  IDENTIFICADOR / APARTAMENTO / MATRÍCULA *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: APTO 502 - BLOCO C"
                  value={newIdentifier}
                  onChange={(e) => setNewIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                  NOME DO ELEITOR (OPCIONAL)
                </label>
                <input
                  type="text"
                  placeholder="Ex: ROBERTO CARLOS PEREIRA"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="island-btn rounded-xl flex-1 justify-center"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="island-btn-primary rounded-xl flex-1 justify-center"
                >
                  SALVAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
