import React, { useState } from 'react';
import { 
  Settings, 
  Plus, 
  Building, 
  GraduationCap, 
  HardDrive, 
  Download, 
  RotateCcw, 
  CheckCircle,
  Key
} from 'lucide-react';
import type { Election, Candidate, UrnaDevice } from '../lib/types';
import { generateUrnaKeypair } from '../lib/cryptoUtils';
import { createDefaultElection } from '../lib/electionPresets';
import { offlineUrnaService } from '../lib/offlineUrna';

interface AdminDashboardProps {
  election: Election;
  onUpdateElection: (updated: Election) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  election,
  onUpdateElection,
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'candidatos' | 'urnas'>('geral');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form de novo candidato
  const [candNumber, setCandNumber] = useState('');
  const [candName, setCandName] = useState('');
  const [candSlate, setCandSlate] = useState('');
  const [candPhoto, setCandPhoto] = useState('');

  // Form de nova urna
  const [urnaIdInput, setUrnaIdInput] = useState('');
  const [urnaNameInput, setUrnaNameInput] = useState('');
  const [urnaLocationInput, setUrnaLocationInput] = useState('');

  const triggerNotice = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  // Carrega predefinição de Condomínio
  const handlePresetCondo = () => {
    const defaultElec = createDefaultElection();
    onUpdateElection(defaultElec);
    triggerNotice('Preset de Condomínio carregado!');
  };

  // Carrega predefinição de Escola
  const handlePresetSchool = () => {
    const urna1Keys = generateUrnaKeypair();
    const schoolElection: Election = {
      id: 'eleicao-escola-2026',
      title: 'Eleição para Diretor Pedagógico & Grêmio Estudantil',
      description: 'Eleição anual da comunidade escolar para coordenação e representação estudantil.',
      institutionType: 'school',
      institutionName: 'Colégio Santo Agostinho',
      roleTitle: 'DIRETOR PEDAGÓGICO',
      status: 'active',
      registeredVoters: 150,
      solanaProgramId: 'UrnaSoL111111111111111111111111111111111111',
      solanaElectionPda: '4w8p...SchoolPDA',
      createdAt: Date.now() - 3600 * 1000 * 2,
      totalVotesCast: 0,
      blankVotes: 0,
      nullVotes: 0,
      candidates: [
        {
          id: 1,
          number: 11,
          name: 'Profª Helena Ribeiro',
          role: 'Diretoria Pedagógica',
          partyOrSlate: 'Chapa 1 - Educação Integral & Inclusão',
          photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        },
        {
          id: 2,
          number: 22,
          name: 'Profº Roberto Guimarães',
          role: 'Diretoria Pedagógica',
          partyOrSlate: 'Chapa 2 - Tecnologia, Ciência & Humanismo',
          photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
        },
      ],
      urnas: [
        {
          id: 'URNA-ESCOLA-01',
          name: 'Urna 01 - Biblioteca Central',
          location: 'Piso 1 - Sala Multiuso',
          publicKey: urna1Keys.publicKey,
          secretKey: urna1Keys.secretKey,
          isActive: true,
          hasSubmittedBu: false,
          votesCount: 0,
        },
      ],
      voterPins: [
        { pin: '102938', voterIdentifier: 'Matrícula 2024-A01', voterName: 'Gabriel Souza', isUsed: false, createdAt: Date.now() },
        { pin: '495820', voterIdentifier: 'Matrícula 2024-A02', voterName: 'Sophia Lima', isUsed: false, createdAt: Date.now() },
        { pin: '938201', voterIdentifier: 'Matrícula 2024-B01', voterName: 'Matheus Vieira', isUsed: false, createdAt: Date.now() },
      ],
    };
    onUpdateElection(schoolElection);
    triggerNotice('Preset Escolar carregado!');
  };

  // Adicionar Candidato
  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(candNumber, 10);
    if (isNaN(num) || !candName) return;

    const newCandidate: Candidate = {
      id: Date.now(),
      number: num,
      name: candName,
      role: election.roleTitle,
      partyOrSlate: candSlate || 'Independente',
      photoUrl: candPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
    };

    onUpdateElection({
      ...election,
      candidates: [...election.candidates, newCandidate],
    });

    setCandNumber('');
    setCandName('');
    setCandSlate('');
    setCandPhoto('');
    triggerNotice('Candidato adicionado com sucesso!');
  };

  // Cadastrar Nova Urna com chave Ed25519
  const handleAddUrna = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urnaIdInput || !urnaNameInput) return;

    const keys = generateUrnaKeypair();
    const newUrna: UrnaDevice = {
      id: urnaIdInput.toUpperCase(),
      name: urnaNameInput,
      location: urnaLocationInput || 'Local Geral',
      publicKey: keys.publicKey,
      secretKey: keys.secretKey,
      isActive: true,
      hasSubmittedBu: false,
      votesCount: 0,
    };

    onUpdateElection({
      ...election,
      urnas: [...election.urnas, newUrna],
    });

    setUrnaIdInput('');
    setUrnaNameInput('');
    setUrnaLocationInput('');
    triggerNotice(`Urna ${newUrna.id} registrada com chave Ed25519!`);
  };

  // Baixar pacote de Carga da Urna
  const handleDownloadCargaPackage = () => {
    const cargaPayload = {
      tipo: 'CARGA_OFICIAL_URNA_SOLANA',
      eleicao: election,
      timestamp: Date.now(),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cargaPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `carga_urna_${election.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerNotice('Pacote criptográfico de carga exportado!');
  };

  // Limpar votos locais para reiniciar demonstração
  const handleResetDemoVotes = () => {
    if (window.confirm('Deseja limpar todos os votos locais das urnas para reiniciar o teste?')) {
      election.urnas.forEach((u) => offlineUrnaService.resetUrna(u.id));
      localStorage.clear();
      onUpdateElection(createDefaultElection());
      triggerNotice('Ambiente de demonstração resetado com sucesso!');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            <span>Configuração do Pleito</span>
          </div>
          <h1 className="text-2xl font-black text-white font-display">
            Painel Administrativo do Organizador
          </h1>
          <p className="text-sm text-slate-400">
            Gerencie candidatos, credenciamento de urnas físicas, pacotes de carga e parâmetros da eleição na Solana.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownloadCargaPackage}
            className="btn-primary text-xs"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Carga das Urnas</span>
          </button>
          <button
            onClick={handleResetDemoVotes}
            className="btn-secondary text-xs text-orange-400 hover:text-orange-300"
            title="Limpar votos para reiniciar demonstração"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {successNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Seletor de Abas */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('geral')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase font-mono transition-all ${
            activeTab === 'geral'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Parâmetros da Eleição
        </button>
        <button
          onClick={() => setActiveTab('candidatos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase font-mono transition-all ${
            activeTab === 'candidatos'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Candidatos ({election.candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('urnas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase font-mono transition-all ${
            activeTab === 'urnas'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Urnas Credenciadas ({election.urnas.length})
        </button>
      </div>

      {/* ABA GERAL */}
      {activeTab === 'geral' && (
        <div className="space-y-6">
          
          {/* Card de Predefinições Rápidas (Condomínio / Escola) */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold text-white uppercase font-mono mb-2">
              Modelos Prontos para Apresentação
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Alterne rapidamente entre cenários do mundo real (condomínio ou escola) com candidatos e eleitores pré-configurados:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handlePresetCondo}
                className="p-4 rounded-xl border border-white/10 hover:border-emerald-500/50 bg-slate-950/40 text-left transition-all hover:bg-white/5 group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:text-emerald-400">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Eleição de Condomínio</h4>
                    <span className="text-[11px] text-slate-400">Síndico Geral & Moradores</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Ideal para condomínios residenciais. Votantes identificados por número de apartamento.
                </p>
              </button>

              <button
                onClick={handlePresetSchool}
                className="p-4 rounded-xl border border-white/10 hover:border-emerald-500/50 bg-slate-950/40 text-left transition-all hover:bg-white/5 group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:text-emerald-400">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Eleição Escolar / Grêmio</h4>
                    <span className="text-[11px] text-slate-400">Diretor & Representantes</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Ideal para instituições de ensino e universidades. Votantes identificados por matrícula.
                </p>
              </button>
            </div>
          </div>

          {/* Dados On-Chain na Solana */}
          <div className="glass-panel p-6 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Contas PDA On-Chain na Solana</span>
            </h3>

            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Program ID (Anchor):</span>
                <span className="text-emerald-400 font-bold">{election.solanaProgramId}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">ID da Eleição (Seed):</span>
                <span className="text-white font-bold">{election.id}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2">
                <span className="text-slate-400">Cluster Alvo:</span>
                <span className="text-purple-400 font-bold">Solana Devnet (Confirmed)</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ABA CANDIDATOS */}
      {activeTab === 'candidatos' && (
        <div className="space-y-6">
          
          {/* Formulário de Novo Candidato */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold text-white uppercase font-mono mb-4">
              Cadastrar Novo Candidato
            </h3>
            <form onSubmit={handleAddCandidate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Número (2 Dígitos) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 40"
                  value={candNumber}
                  onChange={(e) => setCandNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Paula Martins"
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Chapa / Partido
                </label>
                <input
                  type="text"
                  placeholder="Ex: Chapa 4 - Renovação"
                  value={candSlate}
                  onChange={(e) => setCandSlate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="btn-primary w-full justify-center h-[38px] text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Candidatos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {election.candidates.map((c) => (
              <div key={c.number} className="glass-panel p-4 flex gap-4 items-center">
                <img
                  src={c.photoUrl}
                  alt={c.name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-white/10 shadow-md"
                />
                <div>
                  <div className="text-xl font-black font-mono text-emerald-400">
                    Nº {c.number}
                  </div>
                  <div className="text-sm font-bold text-white font-display">
                    {c.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {c.partyOrSlate}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ABA URNAS */}
      {activeTab === 'urnas' && (
        <div className="space-y-6">
          
          {/* Formulário de Credenciamento de Nova Urna */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold text-white uppercase font-mono mb-4">
              Credenciar Nova Urna Física (Geração de Chave Ed25519)
            </h3>
            <form onSubmit={handleAddUrna} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Identificador da Urna *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: URNA-03"
                  value={urnaIdInput}
                  onChange={(e) => setUrnaIdInput(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Nome Descritivo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Urna 03 - Auditório"
                  value={urnaNameInput}
                  onChange={(e) => setUrnaNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="btn-primary w-full justify-center h-[38px] text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Gerar & Credenciar</span>
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Urnas Credenciadas */}
          <div className="space-y-3">
            {election.urnas.map((u) => (
              <div key={u.id} className="glass-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <span>{u.name}</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                        {u.id}
                      </span>
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      Localização: {u.location}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 mt-1">
                      Chave Pública Ed25519: {u.publicKey}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="px-2.5 py-1 rounded-full font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    AUTORIZADA ON-CHAIN
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};
