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

      {/* Cabeçalho Editorial */}
      <div className="serif-card p-6 sm:p-8 rounded-xl border border-[#E8E4DF] border-t-2 border-t-[#B8860B] bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-mono font-semibold tracking-widest text-[#B8860B] uppercase">
            <Settings className="w-4 h-4" />
            <span>Configuração do Pleito Oficial</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A1A1A] tracking-tight">
            Painel Administrativo
          </h1>
          <p className="text-sm text-[#6B6B6B] mt-1 font-sans">
            Gerencie candidatos, urnas físicas credenciadas, pacotes criptográficos de carga e parâmetros eleitorais.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={handleDownloadCargaPackage} className="serif-btn-primary rounded-lg text-xs px-4 py-2.5">
            <Download className="w-4 h-4" />
            <span>EXPORTAR CARGA</span>
          </button>
          <button
            onClick={handleResetDemoVotes}
            className="serif-btn-outline rounded-lg text-xs px-4 py-2.5 text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300"
            title="Limpar votos para reiniciar demonstração"
          >
            <RotateCcw className="w-4 h-4 text-red-600" />
            <span>RESET DEMO</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {successNotice && (
        <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#B8860B]/40 text-xs font-mono text-[#1A1A1A] flex items-center gap-2.5 shadow-xs animate-fade-in">
          <CheckCircle className="w-4 h-4 text-[#B8860B] shrink-0" />
          <span className="font-semibold">{successNotice}</span>
        </div>
      )}

      {/* Seletor de Abas Editorial */}
      <div className="flex gap-2 border-b border-[#E8E4DF] pb-3">
        <button
          onClick={() => setActiveTab('geral')}
          className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
            activeTab === 'geral'
              ? 'bg-[#1A1A1A] text-white shadow-xs'
              : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F3F0] border border-transparent'
          }`}
        >
          PARÂMETROS
        </button>
        <button
          onClick={() => setActiveTab('candidatos')}
          className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
            activeTab === 'candidatos'
              ? 'bg-[#1A1A1A] text-white shadow-xs'
              : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F3F0] border border-transparent'
          }`}
        >
          CANDIDATOS ({election.candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('urnas')}
          className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
            activeTab === 'urnas'
              ? 'bg-[#1A1A1A] text-white shadow-xs'
              : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F3F0] border border-transparent'
          }`}
        >
          URNAS ({election.urnas.length})
        </button>
      </div>

      {/* ABA GERAL */}
      {activeTab === 'geral' && (
        <div className="space-y-6">

          {/* Predefinições em Cartões Editoriais */}
          <div className="serif-card p-6 sm:p-8 rounded-xl border border-[#E8E4DF] bg-white shadow-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#B8860B] mb-1">
              MODELOS PRONTOS PARA DEMONSTRAÇÃO
            </h3>
            <p className="text-sm text-[#6B6B6B] mb-6 font-sans">
              Alterne rapidamente entre cenários práticos com candidatos e eleitores pré-configurados:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <button
                onClick={handlePresetCondo}
                className="p-6 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] hover:border-[#B8860B] hover:shadow-sm transition-all text-left group"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-11 h-11 rounded-lg bg-white border border-[#E8E4DF] flex items-center justify-center text-[#B8860B] group-hover:scale-105 transition-transform shadow-xs">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-serif font-bold text-[#1A1A1A] group-hover:text-[#B8860B] transition-colors">
                      Eleição de Condomínio
                    </h4>
                    <span className="text-xs text-[#6B6B6B] font-mono">Síndico Geral & Moradores</span>
                  </div>
                </div>
                <p className="text-xs text-[#6B6B6B] leading-relaxed font-sans">
                  Eleitores organizados por número de apartamento e bloco residencial com credenciais individuais.
                </p>
              </button>

              <button
                onClick={handlePresetSchool}
                className="p-6 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] hover:border-[#B8860B] hover:shadow-sm transition-all text-left group"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-11 h-11 rounded-lg bg-white border border-[#E8E4DF] flex items-center justify-center text-[#B8860B] group-hover:scale-105 transition-transform shadow-xs">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-serif font-bold text-[#1A1A1A] group-hover:text-[#B8860B] transition-colors">
                      Eleição Escolar / Grêmio
                    </h4>
                    <span className="text-xs text-[#6B6B6B] font-mono">Diretoria & Representantes</span>
                  </div>
                </div>
                <p className="text-xs text-[#6B6B6B] leading-relaxed font-sans">
                  Eleitores cadastrados por matrícula estudantil e turmas ativas da comunidade escolar.
                </p>
              </button>
            </div>
          </div>

          {/* Dados On-Chain */}
          <div className="serif-card p-6 sm:p-8 rounded-xl border border-[#E8E4DF] bg-white shadow-xs space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#B8860B]">
              <Key className="w-4 h-4" />
              <span>Contas PDA On-Chain na Solana</span>
            </h3>

            <div className="space-y-3 text-xs font-mono text-[#6B6B6B]">
              <div className="flex flex-col sm:flex-row sm:justify-between py-2.5 border-b border-[#E8E4DF]">
                <span className="text-[#1A1A1A] font-medium">PROGRAM ID (ANCHOR):</span>
                <span className="text-[#1A1A1A] font-bold break-all">{election.solanaProgramId}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2.5 border-b border-[#E8E4DF]">
                <span className="text-[#1A1A1A] font-medium">ID DA ELEIÇÃO (SEED):</span>
                <span className="text-[#1A1A1A] font-bold">{election.id}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2.5">
                <span className="text-[#1A1A1A] font-medium">CLUSTER ALVO:</span>
                <span className="text-[#B8860B] font-bold">SOLANA DEVNET (CONFIRMED)</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ABA CANDIDATOS */}
      {activeTab === 'candidatos' && (
        <div className="space-y-6">

          {/* Formulário de Novo Candidato */}
          <div className="serif-card p-6 sm:p-8 rounded-xl border border-[#E8E4DF] bg-white shadow-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#B8860B] mb-4">
              CADASTRAR NOVO CANDIDATO
            </h3>
            <form onSubmit={handleAddCandidate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#6B6B6B] mb-1.5 font-medium">
                  NÚMERO (2 DIG.) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 40"
                  value={candNumber}
                  onChange={(e) => setCandNumber(e.target.value)}
                  className="serif-input w-full px-3.5 py-2.5 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#6B6B6B] mb-1.5 font-medium">
                  NOME COMPLETO *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Paula Martins"
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  className="serif-input w-full px-3.5 py-2.5 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#6B6B6B] mb-1.5 font-medium">
                  CHAPA / PARTIDO
                </label>
                <input
                  type="text"
                  placeholder="Ex: Chapa 4 - Renovação"
                  value={candSlate}
                  onChange={(e) => setCandSlate(e.target.value)}
                  className="serif-input w-full px-3.5 py-2.5 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="flex items-end">
                <button type="submit" className="serif-btn-primary rounded-lg w-full h-[40px] text-xs">
                  <Plus className="w-4 h-4" />
                  <span>ADICIONAR</span>
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Candidatos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {election.candidates.map((c) => (
              <div
                key={c.number}
                className="serif-card p-5 rounded-xl border border-[#E8E4DF] bg-white flex gap-4 items-center shadow-xs hover:border-[#B8860B] transition-all"
              >
                <img
                  src={c.photoUrl}
                  alt={c.name}
                  className="w-16 h-16 rounded-xl object-cover border border-[#E8E4DF] shadow-xs shrink-0"
                />
                <div>
                  <div className="text-xl font-mono font-bold text-[#B8860B]">
                    Nº {c.number}
                  </div>
                  <div className="text-base font-serif font-bold text-[#1A1A1A] tracking-tight">
                    {c.name}
                  </div>
                  <div className="text-xs text-[#6B6B6B] font-mono mt-0.5">
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
          <div className="serif-card p-6 sm:p-8 rounded-xl border border-[#E8E4DF] bg-white shadow-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#B8860B] mb-4">
              CREDENCIAR NOVA URNA FÍSICA (ED25519)
            </h3>
            <form onSubmit={handleAddUrna} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#6B6B6B] mb-1.5 font-medium">
                  IDENTIFICADOR *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: URNA-03"
                  value={urnaIdInput}
                  onChange={(e) => setUrnaIdInput(e.target.value)}
                  className="serif-input w-full px-3.5 py-2.5 rounded-lg text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#6B6B6B] mb-1.5 font-medium">
                  NOME DESCRITIVO *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Urna 03 - Auditório"
                  value={urnaNameInput}
                  onChange={(e) => setUrnaNameInput(e.target.value)}
                  className="serif-input w-full px-3.5 py-2.5 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="flex items-end">
                <button type="submit" className="serif-btn-primary rounded-lg w-full h-[40px] text-xs">
                  <Plus className="w-4 h-4" />
                  <span>GERAR & CREDENCIAR</span>
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Urnas Credenciadas */}
          <div className="space-y-3">
            {election.urnas.map((u) => (
              <div
                key={u.id}
                className="serif-card p-5 rounded-xl border border-[#E8E4DF] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-[#B8860B] transition-all text-xs font-mono"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] flex items-center justify-center text-[#B8860B] shrink-0 shadow-xs">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-serif font-bold text-[#1A1A1A] text-base">{u.name}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#FAF8F5] border border-[#E8E4DF] text-[#1A1A1A]">
                        {u.id}
                      </span>
                    </div>
                    <div className="text-[#6B6B6B] text-xs font-sans">LOCALIZAÇÃO: {u.location}</div>
                    <div className="text-[#6B6B6B]/80 text-[11px] mt-0.5 break-all font-mono">
                      ED25519: {u.publicKey}
                    </div>
                  </div>
                </div>

                <div className="self-end sm:self-center shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium bg-[#FAF8F5] border border-[#B8860B]/40 text-[#B8860B]">
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
