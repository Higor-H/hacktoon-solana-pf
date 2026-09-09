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
    <div className="max-w-5xl mx-auto py-4 px-4 sm:px-6">

      {/* Cabeçalho do Terminal do Mesário Editorial */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-6 rounded-md bg-white border border-[#E8E4DF] border-t-2 border-t-[#B8860B] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-mono uppercase tracking-[0.12em] text-[#B8860B]">
            <FileCheck className="w-4 h-4" />
            <span>TERMINAL DE IDENTIFICAÇÃO DO ELEITOR</span>
          </div>
          <h1 className="font-serif font-bold text-2xl text-[#1A1A1A] tracking-tight">
            Caderno de Votação
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1 font-sans">
            Valide a identidade do eleitor antes de emitir o PIN e liberar a cabine de votação.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="serif-btn-primary rounded-md self-start md:self-auto text-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>NOVO ELEITOR</span>
        </button>
      </div>

      {/* Cartões de Estatísticas com Números em Playfair Display */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

        <div className="p-5 rounded-md bg-white border border-[#E8E4DF] flex items-center justify-between shadow-sm">
          <div>
            <div className="small-caps text-[#6B6B6B] mb-1">
              TOTAL DE APTOS
            </div>
            <div className="font-serif text-3xl font-bold text-[#1A1A1A]">
              {votersCount}
            </div>
            <div className="text-xs text-[#8C8883] mt-1 font-sans">Registrados no sistema</div>
          </div>
          <div className="w-12 h-12 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex items-center justify-center text-[#B8860B]">
            {election.institutionType === 'condo' ? <Building className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
          </div>
        </div>

        <div className="p-5 rounded-md bg-white border border-[#E8E4DF] flex items-center justify-between shadow-sm">
          <div>
            <div className="small-caps text-[#6B6B6B] mb-1">
              COMPARECERAM
            </div>
            <div className="font-serif text-3xl font-bold text-[#1A1A1A]">
              {votedCount}
            </div>
            <div className="text-xs text-[#8C8883] mt-1 font-sans">Votaram até o momento</div>
          </div>
          <div className="w-12 h-12 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex items-center justify-center text-[#166534]">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-md bg-white border border-[#E8E4DF] flex items-center justify-between shadow-sm">
          <div>
            <div className="small-caps text-[#6B6B6B] mb-1">
              QUÓRUM ELEITORAL
            </div>
            <div className="font-serif text-3xl font-bold text-[#B8860B]">
              {turnoutPercentage}%
            </div>
            <div className="text-xs text-[#8C8883] mt-1 font-sans">Participação total</div>
          </div>
          <div className="w-12 h-12 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex items-center justify-center text-[#B8860B]">
            <Users className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Barra de Busca */}
      <div className="p-3 mb-4 rounded-md bg-white border border-[#E8E4DF] shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8883]" />
          <input
            type="text"
            placeholder="BUSCAR POR APARTAMENTO, NOME OU IDENTIFICADOR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] text-[#1A1A1A] placeholder-[#8C8883] text-xs font-mono focus:outline-none focus:border-[#B8860B] focus:ring-1 focus:ring-[#B8860B]/30 transition-all"
          />
        </div>
      </div>

      {/* Tabela do Caderno de Eleitores com Linhas Finas */}
      <div className="rounded-md bg-white border border-[#E8E4DF] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#FAFAF8] border-b border-[#E8E4DF] text-[#6B6B6B]">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-[0.1em] text-[11px]">
                  IDENTIFICAÇÃO / UNIDADE
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-[0.1em] text-[11px]">
                  NOME DO ELEITOR
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-[0.1em] text-[11px]">
                  PIN
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-[0.1em] text-[11px]">
                  STATUS
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-[0.1em] text-[11px] text-right">
                  AÇÃO
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DF]">
              {filteredVoters.map((voter) => (
                <tr
                  key={voter.pin}
                  className={`transition-colors ${
                    voter.isUsed ? 'bg-[#FAFAF8]/60 text-[#8C8883]' : 'hover:bg-[#FAFAF8] text-[#1A1A1A]'
                  }`}
                >
                  <td className="py-3.5 px-4 font-semibold text-[#1A1A1A]">
                    {voter.voterIdentifier}
                  </td>
                  <td className="py-3.5 px-4 text-[#6B6B6B] font-sans">
                    {voter.voterName || '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-[#FAFAF8] border border-[#E8E4DF] text-[#1A1A1A] text-xs font-mono">
                      {voter.pin}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {voter.isUsed ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAFAF8] text-[#8C8883] border border-[#E8E4DF]">
                        <CheckCircle className="w-3 h-3 text-[#166534]" />
                        JÁ VOTOU
                      </span>
                    ) : voter.isAuthorized ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#B8860B]/10 text-[#B8860B] border border-[#B8860B]/30">
                        CABINE LIBERADA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAFAF8] text-[#6B6B6B] border border-[#E8E4DF]">
                        APTO A VOTAR
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {voter.isUsed ? (
                      <span className="text-[11px] text-[#8C8883] font-mono">
                        VOTOU ÀS {voter.usedAt ? new Date(voter.usedAt).toLocaleTimeString() : '--:--'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleReleaseBooth(voter)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition-all ${
                          voter.isAuthorized
                            ? 'bg-[#B8860B] text-white border border-[#B8860B] font-semibold shadow-sm'
                            : 'bg-white border border-[#E8E4DF] text-[#1A1A1A] hover:border-[#B8860B] hover:text-[#B8860B]'
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

      {/* Modal de Cabine Liberada em Estilo Editorial */}
      {activeReleasedPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/60 backdrop-blur-sm">
          <div className="max-w-md w-full p-8 rounded-lg bg-white border border-[#E8E4DF] border-t-4 border-t-[#B8860B] shadow-2xl animate-fade-in text-center">
            
            <div className="w-14 h-14 mx-auto mb-4 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex items-center justify-center text-[#166534] shadow-sm">
              <CheckCircle className="w-7 h-7" />
            </div>

            <h3 className="font-serif font-bold text-xl text-[#1A1A1A] tracking-tight mb-1">
              Cabine Liberada
            </h3>
            <p className="text-xs text-[#6B6B6B] mb-6 font-sans">
              O eleitor <strong className="text-[#1A1A1A]">{activeReleasedPin.voterIdentifier}</strong> foi autenticado e está apto a votar com sigilo.
            </p>

            <div className="p-5 mb-6 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] text-center">
              <div className="small-caps text-[#6B6B6B] mb-2">
                PIN DE AUTORIZAÇÃO ÚNICO:
              </div>
              <div className="font-mono text-4xl font-bold tracking-widest text-[#B8860B]">
                {activeReleasedPin.pin}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  onSelectVoterToVote(activeReleasedPin.pin);
                  setActiveReleasedPin(null);
                }}
                className="serif-btn-primary rounded-md w-full py-3"
              >
                <span>IR PARA A CABINE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveReleasedPin(null)}
                className="serif-btn-outline rounded-md w-full py-2.5"
              >
                <span>FECHAR — CONTINUAR NO MESÁRIO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Novo Eleitor */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/60 backdrop-blur-sm">
          <div className="max-w-md w-full p-8 rounded-lg bg-white border border-[#E8E4DF] border-t-4 border-t-[#B8860B] shadow-2xl animate-fade-in">
            <h3 className="font-serif font-bold text-lg text-[#1A1A1A] tracking-tight mb-4">
              Adicionar Eleitor ao Caderno
            </h3>
            <form onSubmit={handleAddVoter} className="space-y-4">
              <div>
                <label className="block small-caps text-[#6B6B6B] mb-1.5">
                  IDENTIFICADOR / APARTAMENTO / MATRÍCULA *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: APTO 502 - BLOCO C"
                  value={newIdentifier}
                  onChange={(e) => setNewIdentifier(e.target.value)}
                  className="serif-input text-xs font-mono"
                />
              </div>

              <div>
                <label className="block small-caps text-[#6B6B6B] mb-1.5">
                  NOME DO ELEITOR (OPCIONAL)
                </label>
                <input
                  type="text"
                  placeholder="Ex: ROBERTO CARLOS PEREIRA"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="serif-input text-xs font-sans"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="serif-btn-outline rounded-md flex-1 justify-center text-xs"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="serif-btn-primary rounded-md flex-1 justify-center text-xs"
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
