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
    <div className="max-w-6xl mx-auto py-4 px-4 sm:px-6 space-y-6">

      {/* Cabeçalho em Ilha */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs font-mono font-semibold tracking-wider text-emerald-400 uppercase">
            <Settings className="w-4 h-4" />
            <span>CONFIGURAÇÃO DO PLEITO</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            PAINEL ADMINISTRATIVO
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gerencie candidatos, urnas físicas, pacotes de carga e parâmetros da eleição.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button onClick={handleDownloadCargaPackage} className="island-btn-primary rounded-xl text-xs">
            <Download className="w-3.5 h-3.5" />
            <span>EXPORTAR CARGA</span>
          </button>
          <button
            onClick={handleResetDemoVotes}
            className="island-btn rounded-xl text-xs text-red-400 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10"
            title="Limpar votos para reiniciar demonstração"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET DEMO</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Seletor de Abas em Formato Pill */}
      <div className="flex gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveTab('geral')}
          className={`px-4 py-1.5 rounded-full text-xs font-mono font-semibold transition-all ${
            activeTab === 'geral'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
          }`}
        >
          PARÂMETROS
        </button>
        <button
          onClick={() => setActiveTab('candidatos')}
          className={`px-4 py-1.5 rounded-full text-xs font-mono font-semibold transition-all ${
            activeTab === 'candidatos'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
          }`}
        >
          CANDIDATOS ({election.candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('urnas')}
          className={`px-4 py-1.5 rounded-full text-xs font-mono font-semibold transition-all ${
            activeTab === 'urnas'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
          }`}
        >
          URNAS ({election.urnas.length})
        </button>
      </div>

      {/* ABA GERAL */}
      {activeTab === 'geral' && (
        <div className="space-y-6">

          {/* Predefinições em Ilha */}
          <div className="p-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md shadow-xl">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-1">
              MODELOS PRONTOS PARA APRESENTAÇÃO
            </h3>
            <p className="text-xs text-zinc-400 mb-5">
              Alterne rapidamente entre cenários práticos com candidatos e eleitores pré-configurados:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handlePresetCondo}
                className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-900/80 transition-all text-left group shadow-md"
              >
                <div className="flex items-center gap-3.5 mb-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">ELEIÇÃO DE CONDOMÍNIO</h4>
                    <span className="text-xs text-zinc-400 font-mono">SÍNDICO GERAL & MORADORES</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Eleitores organizados por número de apartamento e bloco residencial.
                </p>
              </button>

              <button
                onClick={handlePresetSchool}
                className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-900/80 transition-all text-left group shadow-md"
              >
                <div className="flex items-center gap-3.5 mb-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">ELEIÇÃO ESCOLAR / GRÊMIO</h4>
                    <span className="text-xs text-zinc-400 font-mono">DIRETOR & REPRESENTANTES</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Eleitores cadastrados por matrícula estudantil e turmas ativas.
                </p>
              </button>
            </div>
          </div>

          {/* Dados On-Chain em Ilha */}
          <div className="p-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md shadow-xl space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              <Key className="w-4 h-4" />
              <span>CONTAS PDA ON-CHAIN NA SOLANA</span>
            </h3>

            <div className="space-y-2 text-xs font-mono text-zinc-400">
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-zinc-800/80">
                <span>PROGRAM ID (ANCHOR):</span>
                <span className="text-white font-bold">{election.solanaProgramId}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-zinc-800/80">
                <span>ID DA ELEIÇÃO (SEED):</span>
                <span className="text-white font-bold">{election.id}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2">
                <span>CLUSTER ALVO:</span>
                <span className="text-emerald-400 font-bold">SOLANA DEVNET (CONFIRMED)</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ABA CANDIDATOS */}
      {activeTab === 'candidatos' && (
        <div className="space-y-6">

          {/* Formulário de Novo Candidato em Ilha */}
          <div className="p-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md shadow-xl">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-4">
              CADASTRAR NOVO CANDIDATO
            </h3>
            <form onSubmit={handleAddCandidate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                  NÚMERO (2 DIG.) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 40"
                  value={candNumber}
                  onChange={(e) => setCandNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                  NOME COMPLETO *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Paula Martins"
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                  CHAPA / PARTIDO
                </label>
                <input
                  type="text"
                  placeholder="Ex: Chapa 4 - Renovação"
                  value={candSlate}
                  onChange={(e) => setCandSlate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all"
                />
              </div>

              <div className="flex items-end">
                <button type="submit" className="island-btn-primary rounded-xl w-full h-[38px] text-xs">
                  <Plus className="w-4 h-4" />
                  <span>ADICIONAR</span>
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Candidatos em Ilhas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {election.candidates.map((c) => (
              <div
                key={c.number}
                className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md flex gap-4 items-center shadow-lg hover:border-zinc-700 transition-all"
              >
                <img
                  src={c.photoUrl}
                  alt={c.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-zinc-700 shadow-md shrink-0"
                />
                <div>
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    Nº {c.number}
                  </div>
                  <div className="text-sm font-bold text-white tracking-tight">
                    {c.name}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
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

          {/* Formulário de Credenciamento de Nova Urna em Ilha */}
          <div className="p-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md shadow-xl">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-4">
              CREDENCIAR NOVA URNA FÍSICA (ED25519)
            </h3>
            <form onSubmit={handleAddUrna} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                  IDENTIFICADOR *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: URNA-03"
                  value={urnaIdInput}
                  onChange={(e) => setUrnaIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs font-mono uppercase focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                  NOME DESCRITIVO *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Urna 03 - Auditório"
                  value={urnaNameInput}
                  onChange={(e) => setUrnaNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all"
                />
              </div>

              <div className="flex items-end">
                <button type="submit" className="island-btn-primary rounded-xl w-full h-[38px] text-xs">
                  <Plus className="w-4 h-4" />
                  <span>GERAR & CREDENCIAR</span>
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Urnas Credenciadas em Ilhas */}
          <div className="space-y-3">
            {election.urnas.map((u) => (
              <div
                key={u.id}
                className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg hover:border-zinc-700 transition-all text-xs font-mono"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-sm">{u.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                        {u.id}
                      </span>
                    </div>
                    <div className="text-zinc-400 text-xs">LOCAL: {u.location}</div>
                    <div className="text-zinc-500 text-[11px] mt-0.5 break-all">
                      ED25519: {u.publicKey}
                    </div>
                  </div>
                </div>

                <div className="self-end sm:self-center shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
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
