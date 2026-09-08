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
    // Atualiza estado do votante como AUTORIZADO para votar (mas NÃO marca como usado ainda!)
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

  // Cadastrar novo eleitor na hora (reunião de condomínio/escola)
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
    <div className="max-w-6xl mx-auto py-6 px-4">
      
      {/* Cabeçalho do Terminal do Mesário */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider mb-1">
            <FileCheck className="w-4 h-4" />
            <span>Terminal de Identificação do Eleitor</span>
          </div>
          <h1 className="text-2xl font-black text-white font-display">
            Caderno de Votação (Check-in do Mesário)
          </h1>
          <p className="text-sm text-slate-400">
            Valide a identidade do morador/aluno antes de liberar a cabine de votação.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-secondary self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4 text-emerald-400" />
          <span>Novo Eleitor no Caderno</span>
        </button>
      </div>

      {/* Cartões de Estatísticas de Quórum / Comparecimento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase font-mono">Total de Aptos</div>
            <div className="text-2xl font-bold text-white font-display mt-1">
              {votersCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Registrados no sistema</div>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {election.institutionType === 'condo' ? <Building className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase font-mono">Compareceram</div>
            <div className="text-2xl font-bold text-emerald-400 font-display mt-1">
              {votedCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Votaram até o momento</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase font-mono">Quórum Eleitoral</div>
            <div className="text-2xl font-bold text-cyan-400 font-display mt-1">
              {turnoutPercentage}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Participação total</div>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="glass-panel p-4 mb-6">
        <div className="relative">
          <label htmlFor="search-voter" className="sr-only">Buscar por Apartamento, Aluno, Matrícula ou Nome</label>
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-voter"
            type="text"
            placeholder="Buscar por Apartamento, Aluno, Matrícula ou Nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Tabela do Caderno de Eleitores */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 border-b border-white/10 text-xs uppercase font-mono text-slate-400">
              <tr>
                <th className="py-3 px-4">Identificação / Unidade</th>
                <th className="py-3 px-4">Nome do Eleitor</th>
                <th className="py-3 px-4">PIN Autorizador</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ação do Mesário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredVoters.map((voter) => (
                <tr key={voter.pin} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    {voter.voterIdentifier}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {voter.voterName || '—'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                    <span className="bg-slate-800/80 px-2 py-1 rounded border border-white/5">
                      {voter.pin}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {voter.isUsed ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Já Votou (Concluído)
                      </span>
                    ) : voter.isAuthorized ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        Cabine Liberada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-white/5">
                        Apto a Votar
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {voter.isUsed ? (
                      <span className="text-xs text-slate-500 font-mono">
                        Votou às {voter.usedAt ? new Date(voter.usedAt).toLocaleTimeString() : '10:00'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleReleaseBooth(voter)}
                        className="btn-primary py-1.5 px-3 text-xs"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{voter.isAuthorized ? 'Ver PIN' : 'Liberar Voto'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cabine Liberada */}
      {activeReleasedPin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white font-display mb-1">
              Cabine Liberada!
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              O eleitor <strong className="text-white">{activeReleasedPin.voterIdentifier}</strong> foi identificado e está apto a votar em sigilo.
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-white/10 mb-6">
              <div className="text-xs uppercase font-mono text-slate-400 mb-1">
                PIN de Autorização Único:
              </div>
              <div className="text-3xl font-black font-mono text-emerald-400 tracking-widest">
                {activeReleasedPin.pin}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  onSelectVoterToVote(activeReleasedPin.pin);
                  setActiveReleasedPin(null);
                }}
                className="btn-primary w-full justify-center"
              >
                <span>Ir para a Urna com este Eleitor</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveReleasedPin(null)}
                className="btn-secondary w-full justify-center"
              >
                <span>Fechar e Continuar no Mesário</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Novo Eleitor */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-white font-display mb-4">
              Adicionar Eleitor ao Caderno
            </h3>
            <form onSubmit={handleAddVoter} className="space-y-4">
              <div>
                <label htmlFor="voter-id" className="block text-xs font-mono text-slate-400 uppercase mb-1">
                  Identificador / Apartamento / Matrícula *
                </label>
                <input
                  id="voter-id"
                  type="text"
                  required
                  placeholder="Ex: Apto 502 - Bloco C"
                  value={newIdentifier}
                  onChange={(e) => setNewIdentifier(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="voter-name" className="block text-xs font-mono text-slate-400 uppercase mb-1">
                  Nome do Eleitor (Opcional)
                </label>
                <input
                  id="voter-name"
                  type="text"
                  placeholder="Ex: Roberto Carlos Pereira"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1 justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 justify-center"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
