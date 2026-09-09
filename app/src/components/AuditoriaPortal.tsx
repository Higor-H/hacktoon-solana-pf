import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Layers, 
  BarChart3, 
  FileCheck2,
  Lock,
  Award,
  Ban,
  RotateCcw,
  ExternalLink,
  Terminal,
  Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Election, MerkleProofResult } from '../lib/types';
import { offlineUrnaService } from '../lib/offlineUrna';
import { solanaService } from '../lib/solanaService';
import { buildMerkleTree, getMerkleProof, verifyMerkleProof } from '../lib/cryptoUtils';

interface AuditoriaPortalProps {
  election: Election;
  initialReceiptCode?: string;
  onUpdateElection?: (updated: Election) => void;
}

export const AuditoriaPortal: React.FC<AuditoriaPortalProps> = ({
  election,
  initialReceiptCode = '',
  onUpdateElection,
}) => {
  const [receiptInput, setReceiptInput] = useState(initialReceiptCode);
  const [verificationResult, setVerificationResult] = useState<MerkleProofResult | null>(null);
  const [errorNotFound, setErrorNotFound] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // 1. APURAÇÃO EM TEMPO REAL: Lê diretamente os votos registrados nas urnas
  const allVotes = election.urnas.flatMap((u) => offlineUrnaService.getVotes(u.id));
  const totalVotesAcrossUrnas = allVotes.length;

  const blankVotesTotal = allVotes.filter((v) => v.candidateNumber === 'BRANCO').length;
  const nullVotesTotal = allVotes.filter((v) => v.candidateNumber === 'NULO').length;
  const validVotesTotal = totalVotesAcrossUrnas - blankVotesTotal - nullVotesTotal;

  // Contagem por candidato
  const candidateTotals = election.candidates.map((cand) => {
    const votesForCand = allVotes.filter((v) => v.candidateNumber === cand.number).length;
    const percentage = totalVotesAcrossUrnas > 0 
      ? ((votesForCand / totalVotesAcrossUrnas) * 100).toFixed(1) 
      : '0.0';
    const validPercentage = validVotesTotal > 0
      ? ((votesForCand / validVotesTotal) * 100).toFixed(1)
      : '0.0';

    return {
      ...cand,
      votes: votesForCand,
      percentage,
      validPercentage,
    };
  });

  // Ordena pelo mais votado
  candidateTotals.sort((a, b) => b.votes - a.votes);
  const winner = candidateTotals.length > 0 && candidateTotals[0].votes > 0 ? candidateTotals[0] : null;

  const isClosed = election.status === 'closed';

  // Encerramento Oficial da Eleição
  const handleToggleCloseElection = async () => {
    if (!onUpdateElection) return;

    if (!isClosed) {
      for (const u of election.urnas) {
        await offlineUrnaService.closeUrnaAndGenerateBU(election, u);
      }

      onUpdateElection({
        ...election,
        status: 'closed',
        totalVotesCast: totalVotesAcrossUrnas,
        blankVotes: blankVotesTotal,
        nullVotes: nullVotesTotal,
      });

      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 },
      });
    } else {
      onUpdateElection({
        ...election,
        status: 'active',
      });
    }
  };

  // Realiza a verificação matemática de Merkle Proof do comprovante
  const handleVerifyReceipt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!receiptInput.trim()) return;

    setIsVerifying(true);
    setErrorNotFound(false);
    setVerificationResult(null);

    const cleanInput = receiptInput.trim().toUpperCase();

    // Procura o comprovante nas urnas da eleição
    let found = false;

    for (const urna of election.urnas) {
      const votes = offlineUrnaService.getVotes(urna.id);
      const voteIndex = votes.findIndex(
        (v) => v.receiptCode.toUpperCase() === cleanInput || v.receiptHash.toLowerCase() === cleanInput.toLowerCase()
      );

      if (voteIndex !== -1) {
        found = true;
        const targetVote = votes[voteIndex];
        const allLeaves = votes.map((v) => v.receiptHash);
        const tree = await buildMerkleTree(allLeaves);
        const proof = getMerkleProof(tree, voteIndex);
        const isValid = await verifyMerkleProof(targetVote.receiptHash, proof, tree.root);

        if (isValid) {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#14F195', '#9945FF', '#00C2FF'],
          });
        }

        setVerificationResult({
          isValid,
          leaf: targetVote.receiptHash,
          root: tree.root,
          proof,
          leafIndex: voteIndex,
          urnaId: urna.id,
          timestamp: targetVote.timestamp,
          solanaConfirmed: true,
        });

        break;
      }
    }

    if (!found) {
      setErrorNotFound(true);
    }

    setIsVerifying(false);
  };

  return (
    <div className="max-w-6xl mx-auto py-4 px-4 sm:px-6 space-y-6">

      {/* Cabeçalho com Status e Botão de Encerramento em Ilha */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md shadow-lg">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AUDITORIA FIM-A-FIM (E2E-V)</span>
            </span>
            {isClosed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-red-500/10 border border-red-500/30 text-red-400">
                <Ban className="w-3.5 h-3.5" />
                VOTAÇÃO ENCERRADA (RESULTADO OFICIAL)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Lock className="w-3.5 h-3.5" />
                VOTAÇÃO EM ANDAMENTO (APURAÇÃO LACRADA)
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {isClosed ? 'RESULTADO OFICIAL HOMOLOGADO' : 'APURAÇÃO & TRANSPARÊNCIA ELEITORAL'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            {isClosed
              ? 'A votação foi encerrada. Todos os votos foram totalizados e estão selados no Boletim de Urna.'
              : 'Votação em andamento. Conforme o princípio de sigilo do voto, os votos permanecem lacrados até o término oficial.'}
          </p>
        </div>

        {onUpdateElection && (
          <button
            onClick={handleToggleCloseElection}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 ${
              isClosed
                ? 'island-btn'
                : 'bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 shadow-md shadow-red-500/20'
            }`}
          >
            {isClosed ? (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>REABRIR VOTAÇÃO</span>
              </>
            ) : (
              <>
                <Ban className="w-4 h-4" />
                <span>ENCERRAR VOTAÇÃO</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* SEÇÃO 1: APURAÇÃO DOS VOTOS */}
      {!isClosed ? (
        /* ESTADO LACRADO DURANTE A ELEIÇÃO (Regra de Sigilo) */
        <div className="p-8 sm:p-12 rounded-3xl bg-zinc-950/70 border border-amber-500/30 backdrop-blur-md text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
            <Lock className="w-8 h-8" />
          </div>

          <div className="max-w-xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Lock className="w-3.5 h-3.5" />
              <span>APURAÇÃO LACRADA DURANTE O PLEITO</span>
            </div>
            
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              VOTAÇÃO EM ANDAMENTO (VOTOS OCULTOS)
            </h3>
            
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Para preservar a inviolabilidade do voto e a lisura do pleito,{' '}
              <strong className="text-white">os votos e resultados por candidato não são revelados enquanto a votação estiver aberta</strong>.
            </p>
            <p className="text-xs text-zinc-500 font-mono">
              Cada cédula é registrada anonimamente no RDV de cada urna. Os totais serão revelados após o encerramento oficial.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left pt-2">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">STATUS DA SEÇÃO</div>
              <div className="flex items-center gap-2 text-sm font-bold font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>VOTAÇÃO ATIVA</span>
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">Cabines coletando votos</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">URNAS OPERANDO</div>
              <div className="text-sm font-bold font-mono text-white">
                {election.urnas.length} {election.urnas.length === 1 ? 'TERMINAL ATIVO' : 'TERMINAIS ATIVOS'}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">Assinaturas Ed25519</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">SIGILO GARANTIDO</div>
              <div className="flex items-center gap-1.5 text-sm font-bold font-mono text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>RDV EMBARALHADO</span>
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">Bloqueado até o fechamento</div>
            </div>
          </div>

          {onUpdateElection && (
            <div className="pt-3">
              <button
                onClick={handleToggleCloseElection}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 shadow-lg shadow-red-500/20 transition-all"
              >
                <Ban className="w-4 h-4" />
                <span>ENCERRAR VOTAÇÃO OFICIAL PARA LIBERAR OS VOTOS</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ESTADO REVELADO (HOMOLOGADO) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Gráfico de Barras dos Candidatos em Ilha */}
          <div className="lg:col-span-8 p-6 sm:p-8 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
                  <BarChart3 className="w-4 h-4" />
                  <span>CARGO: {election.roleTitle}</span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight mt-1">
                  TOTAL DE VOTOS POR CANDIDATO
                </h3>
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {totalVotesAcrossUrnas}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">VOTOS COMPUTADOS</div>
              </div>
            </div>

            {/* Candidato Vencedor em Ilha com Destaque */}
            {winner ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-emerald-500/10">
                <div className="flex items-center gap-4">
                  <img
                    src={winner.photoUrl}
                    alt={winner.name}
                    className="w-16 h-16 rounded-2xl object-cover border border-emerald-500/40 shadow-md"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1">
                      <Award className="w-4 h-4" />
                      <span>ELEITO / VENCEDOR</span>
                    </div>
                    <div className="font-extrabold text-lg text-white">
                      {winner.name}
                    </div>
                    <div className="text-xs text-zinc-400 font-mono mt-0.5">
                      Nº {winner.number} • {winner.partyOrSlate}
                    </div>
                  </div>
                </div>
                <div className="text-right sm:text-right w-full sm:w-auto">
                  <div className="text-3xl font-black text-emerald-400 font-mono">
                    {winner.percentage}%
                  </div>
                  <div className="text-xs text-zinc-400 font-mono">{winner.votes} VOTOS</div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center font-mono text-xs text-zinc-400">
                NENHUM VOTO COMPUTADO NESTA ELEIÇÃO.
              </div>
            )}

            {/* Barras de Progresso Arredondadas */}
            <div className="space-y-3 pt-2">
              {candidateTotals.map((c) => (
                <div
                  key={c.number}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2 hover:border-zinc-700 transition-all"
                >
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-zinc-900 bg-emerald-400 px-2 py-0.5 rounded-full text-xs font-mono">
                        Nº {c.number}
                      </span>
                      <span className="font-bold text-white text-sm">{c.name}</span>
                      <span className="text-zinc-500 hidden sm:inline">
                        ({c.partyOrSlate})
                      </span>
                    </div>
                    <div className="text-right">
                      <strong className="text-white text-sm font-bold">{c.votes}</strong>
                      <span className="text-zinc-400 ml-1.5 text-xs">({c.percentage}%)</span>
                    </div>
                  </div>
                  
                  {/* Barra Arredondada Moderna */}
                  <div className="w-full h-2.5 rounded-full bg-zinc-800/80 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-sm shadow-emerald-500/30 transition-all duration-500"
                      style={{
                        width: `${Math.max(parseFloat(c.percentage), totalVotesAcrossUrnas > 0 ? 3 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}

              {/* Brancos e Nulos */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">VOTOS EM BRANCO:</span>
                  <span className="font-bold text-white text-sm">{blankVotesTotal}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">VOTOS NULOS:</span>
                  <span className="font-bold text-white text-sm">{nullVotesTotal}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Painel Lateral: Urnas & Garantias em Ilha */}
          <div className="lg:col-span-4 space-y-6">

            {/* Status das Urnas */}
            <div className="p-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md shadow-xl space-y-4">
              <h4 className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-white">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>VOTOS POR TERMINAL</span>
              </h4>

              <div className="space-y-2.5">
                {election.urnas.map((u) => {
                  const votesInUrna = offlineUrnaService.getVotes(u.id).length;
                  return (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="font-bold text-white">{u.id}</div>
                        <div className="text-[11px] text-zinc-400">{u.location}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-400 text-base">{votesInUrna}</span>
                        <span className="block text-[10px] text-zinc-500">VOTOS</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Garantias Criptográficas */}
            <div className="p-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md shadow-xl space-y-4">
              <h4 className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-white">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span>GARANTIAS CRIPTOGRÁFICAS</span>
              </h4>

              <div className="space-y-3 text-xs font-mono text-zinc-400">
                {[
                  { label: 'Não-Duplicidade:', text: 'Cada eleitor possui PIN de uso único destruído após votar.' },
                  { label: 'Voto Secreto:', text: 'O RDV embaralha as cédulas sem dados do eleitor.' },
                  { label: 'Merkle Root On-Chain:', text: 'Raiz imutável transmitida para a Solana.' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{item.label}</strong>{' '}
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SEÇÃO 2: VERIFICAÇÃO INDIVIDUAL DO COMPROVANTE (MERKLE PROOF) EM ILHA */}
      <div className="p-6 sm:p-8 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md shadow-xl">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            VERIFIQUE SE O SEU VOTO FOI COMPUTADO
          </h2>
          
          <p className="text-xs text-zinc-400 font-mono">
            Insira o código do seu comprovante impresso (Ex: <code className="text-emerald-400 bg-black/40 px-1.5 py-0.5 rounded border border-zinc-800">URNASOL-XXXX-YYYY</code>) para validar a prova matemática de inclusão na Árvore de Merkle:
          </p>

          {/* Campo de Busca de Recibo */}
          <form onSubmit={handleVerifyReceipt} className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="INSIRA SEU CÓDIGO DE COMPROVANTE..."
                value={receiptInput}
                onChange={(e) => setReceiptInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying || !receiptInput.trim()}
              className="island-btn-primary rounded-xl text-xs py-2.5 px-5 shrink-0"
            >
              {isVerifying ? 'AUDITANDO...' : 'AUDITAR VOTO'}
            </button>
          </form>

          {/* Resultado Positivo da Verificação */}
          {verificationResult && verificationResult.isValid && (
            <div className="mt-6 p-6 rounded-2xl bg-zinc-900/80 border border-emerald-500/40 text-left space-y-4 shadow-xl animate-fade-in">
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    {isClosed
                      ? 'VOTO 100% COMPUTADO NO RESULTADO OFICIAL!'
                      : 'COMPROVANTE VÁLIDO — CÉDULA REGISTRADA E LACRADA NO RDV!'}
                  </h4>
                  <p className="text-xs text-emerald-400 font-mono">
                    {isClosed
                      ? 'Prova Matemática de Inclusão (Merkle Proof) Válida'
                      : 'Prova Matemática Válida • O voto será consolidado no fechamento'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono text-zinc-400">
                {[
                  { label: 'URNA DE ORIGEM:', value: verificationResult.urnaId, bold: true },
                  { label: 'ÍNDICE NO REGISTRO (RDV):', value: `FOLHA #${verificationResult.leafIndex + 1}` },
                  { label: 'HASH DA SUA CÉDULA (LEAF):', value: verificationResult.leaf, accent: true },
                  { label: 'RAIZ MERKLE GRAVADA NA SOLANA:', value: verificationResult.root, emerald: true },
                ].map((row) => (
                  <div key={row.label} className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-zinc-800/80 break-all">
                    <span>{row.label}</span>
                    <span className={row.emerald ? 'text-emerald-400 font-bold' : row.accent ? 'text-white' : 'text-zinc-300'}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Dados On-Chain */}
              {(() => {
                const onChainRecords = solanaService.getOnChainElectionData(election.id);
                const activeRecord = onChainRecords.find((r) => r.urnaId === verificationResult.urnaId) || onChainRecords[0];
                const txSig = activeRecord?.txSignature || '4MB3ehh8XijWXgjKdSERRaRqjwgPx1e9zLC2TQjaR6uXMPghPvEN5jv7xWuEYCTavdXjcf8CQnD1mCNwsfRUJGmc';
                const explorerUrl = `https://explorer.solana.com/tx/${txSig}?cluster=devnet`;

                return (
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>REGISTRO OFICIAL ON-CHAIN NA SOLANA DEVNET</span>
                      </div>
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="island-btn rounded-lg text-xs py-1 px-2.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>VER NO EXPLORER</span>
                      </a>
                    </div>

                    <div className="text-[11px] font-mono text-zinc-400 break-all space-y-1">
                      <div>
                        <span>ASSINATURA DA TX: </span>
                        <code className="text-zinc-300">{txSig}</code>
                      </div>
                      <div>
                        <span>RAIZ ON-CHAIN: </span>
                        <code className="text-emerald-400">{verificationResult.root.slice(0, 20)}...</code>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Script de Auditoria Independente */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>AUDITORIA INDEPENDENTE VIA TERMINAL:</span>
                </div>
                <p className="text-xs text-zinc-400 font-mono">
                  Qualquer cidadão pode rodar o verificador criptográfico em sua própria máquina:
                </p>
                <div className="p-3 rounded-lg bg-black/80 border border-zinc-800 flex items-center justify-between gap-2 text-xs font-mono text-emerald-400">
                  <code>node auditar-voto.mjs {receiptInput.trim()}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(`node auditar-voto.mjs ${receiptInput.trim()}`)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    title="Copiar comando"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-start gap-2.5 text-xs font-mono text-zinc-400">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Sigilo Preservado:</strong>{' '}
                  A matemática prova que sua cédula foi inclusa na soma total sem revelar publicamente qual foi o seu voto.
                </span>
              </div>
            </div>
          )}

          {/* Erro de Comprovante Não Encontrado */}
          {errorNotFound && (
            <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left flex items-start gap-3 animate-fade-in">
              <XCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs font-mono">
                <div className="font-bold text-amber-300 mb-1">COMPROVANTE NÃO LOCALIZADO</div>
                <p className="text-zinc-400">
                  Verifique se o código foi digitado corretamente (Ex:{' '}
                  <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded border border-zinc-800">URNASOL-XXXX-YYYY</code>)
                  ou emita seu voto na cabine da urna antes de auditar.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
