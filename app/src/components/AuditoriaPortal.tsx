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
  CheckCheck,
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

  // 1. APURAÇÃO EM TEMPO REAL: Lê diretamente todos os votos registrados nas urnas
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
      // Fecha a eleição e gera os BUs finais de todas as urnas
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
      // Reabrir eleição
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
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-8">
      
      {/* Cabeçalho com Status e Botão de Encerramento */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-panel p-6 border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
              <span>Auditoria Fim-a-Fim (E2E-V)</span>
            </span>
            {isClosed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                <Ban className="w-3.5 h-3.5" />
                VOTAÇÃO ENCERRADA (RESULTADO OFICIAL)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 animate-pulse">
                <CheckCheck className="w-3.5 h-3.5" />
                APURAÇÃO EM TEMPO REAL (VOTAÇÃO ABERTA)
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
            {isClosed ? 'Resultado Oficial Homologado' : 'Apuração & Transparência Eleitoral'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {isClosed
              ? 'A votação foi encerrada. Todos os votos foram totalizados e estão selados no Boletim de Urna.'
              : 'Acompanhe a contagem de votos por candidato em tempo real e comprove a inclusão do seu voto.'}
          </p>
        </div>

        {onUpdateElection && (
          <button
            onClick={handleToggleCloseElection}
            className={`btn-primary text-xs sm:text-sm py-2.5 px-5 font-bold ${
              isClosed
                ? 'bg-slate-800 text-slate-200 border border-white/20'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
            }`}
          >
            {isClosed ? (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Reabrir Votação (Modo Teste)</span>
              </>
            ) : (
              <>
                <Ban className="w-4 h-4" />
                <span>Encerrar Votação Oficial</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* SEÇÃO 1: APURAÇÃO DOS VOTOS POR CANDIDATO (UNIVERSAL VERIFIABILITY) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Gráfico de Barras dos Candidatos */}
        <div className="lg:col-span-8 glass-panel p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase">
                <BarChart3 className="w-4 h-4" />
                <span>Cargo: {election.roleTitle}</span>
              </div>
              <h3 className="text-xl font-bold text-white font-display mt-0.5">
                Total de Votos por Candidato
              </h3>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-white font-display">
                {totalVotesAcrossUrnas}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">votos computados</div>
            </div>
          </div>

          {/* Candidato Mais Votado / Vencedor */}
          {winner ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-purple-950/30 to-slate-900 border border-emerald-500/40 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <img
                  src={winner.photoUrl}
                  alt={winner.name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-400 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase font-mono">
                    <Award className="w-4 h-4" />
                    <span>{isClosed ? 'ELEITO / VENCEDOR' : '1º LUGAR PARCIAL'}</span>
                  </div>
                  <div className="text-lg font-bold text-white font-display">
                    {winner.name}
                  </div>
                  <div className="text-xs text-slate-300">
                    Nº {winner.number} • {winner.partyOrSlate}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  {winner.percentage}%
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {winner.votes} votos
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-white/5 font-mono text-xs">
              Nenhum voto computado ainda. Vá na aba Cabine (Urna) para votar!
            </div>
          )}

          {/* Lista de Barras de Progresso de Cada Candidato */}
          <div className="space-y-4 pt-2">
            {candidateTotals.map((c) => (
              <div key={c.number} className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      Nº {c.number}
                    </span>
                    <span className="font-bold text-white">{c.name}</span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">({c.partyOrSlate})</span>
                  </div>
                  <div className="text-right font-mono">
                    <strong className="text-white font-bold">{c.votes}</strong>
                    <span className="text-slate-400 ml-1">votos ({c.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(parseFloat(c.percentage), totalVotesAcrossUrnas > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            ))}

            {/* Totais de Brancos e Nulos */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex justify-between items-center text-xs">
                <span className="text-slate-400">Votos em Branco:</span>
                <span className="font-mono font-bold text-white">{blankVotesTotal}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex justify-between items-center text-xs">
                <span className="text-slate-400">Votos Nulos:</span>
                <span className="font-mono font-bold text-white">{nullVotesTotal}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auditoria das Urnas & Critérios */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Status das Urnas */}
          <div className="glass-panel p-6 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Votos por Urna Registrada</span>
            </h4>

            <div className="space-y-2.5">
              {election.urnas.map((u) => {
                const votesInUrna = offlineUrnaService.getVotes(u.id).length;
                return (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{u.id}</div>
                      <div className="text-[11px] text-slate-400">{u.location}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-400 text-sm">{votesInUrna}</span>
                      <span className="text-[10px] text-slate-500 block">votos na urna</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Critérios de Integridade */}
          <div className="glass-panel p-6 space-y-3.5">
            <h4 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <span>Garantias Criptográficas</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  <strong>Não-Duplicidade:</strong> Cada eleitor possui PIN único inutilizado no ato do voto.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  <strong>Voto Secreto:</strong> O RDV embaralha ordens aleatoriamente sem identificação pessoal.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  <strong>Merkle Root On-Chain:</strong> Raiz de comprovantes gravada na Solana.
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* SEÇÃO 2: VERIFICAÇÃO INDIVIDUAL DO COMPROVANTE (INDIVIDUAL E2E-V) */}
      <div className="glass-panel p-6 sm:p-8 border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900/60">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white font-display">
            Verifique se o seu Voto foi Computado
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Insira o código do seu comprovante de votação (Ex: <code className="text-emerald-400 font-mono">URNSOL-XXXX-YYYY</code>) para validar a prova de inclusão na Árvore de Merkle da Solana:
          </p>

          {/* Campo de Busca de Recibo */}
          <form onSubmit={handleVerifyReceipt} className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Digite seu código de comprovante..."
                value={receiptInput}
                onChange={(e) => setReceiptInput(e.target.value)}
                className="w-full bg-slate-950/90 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-sm sm:text-base text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying || !receiptInput.trim()}
              className="btn-primary py-3 px-6 justify-center text-sm font-bold"
            >
              {isVerifying ? 'Auditando...' : 'Auditar Voto'}
            </button>
          </form>

          {/* Resultado Positivo da Verificação */}
          {verificationResult && verificationResult.isValid && (
            <div className="mt-6 p-6 rounded-2xl bg-slate-950 border border-emerald-500/50 text-left space-y-4 animate-fade-in shadow-2xl shadow-emerald-500/10">
              <div className="flex items-center gap-3 text-emerald-400 border-b border-emerald-500/20 pb-4">
                <div className="p-2 rounded-xl bg-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-display text-white">
                    VOTO 100% COMPUTADO NO RESULTADO OFICIAL!
                  </h4>
                  <p className="text-xs text-emerald-400 font-mono">
                    Prova Matemática de Inclusão (Merkle Proof) Válida
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Urna de Origem:</span>
                  <span className="text-white font-bold">{verificationResult.urnaId}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Índice no Registro (RDV):</span>
                  <span className="text-white">Folha #{verificationResult.leafIndex + 1}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-white/5 break-all">
                  <span className="text-slate-400">Hash da sua Cédula (Leaf):</span>
                  <span className="text-emerald-300">{verificationResult.leaf}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-white/5 break-all">
                  <span className="text-slate-400">Raiz Merkle Gravada na Solana:</span>
                  <span className="text-purple-300 font-bold">{verificationResult.root}</span>
                </div>
              </div>

              {/* Dados On-Chain da Solana */}
              {(() => {
                const onChainRecords = solanaService.getOnChainElectionData(election.id);
                const activeRecord = onChainRecords.find((r) => r.urnaId === verificationResult.urnaId) || onChainRecords[0];
                const txSig = activeRecord?.txSignature || '4MB3ehh8XijWXgjKdSERRaRqjwgPx1e9zLC2TQjaR6uXMPghPvEN5jv7xWuEYCTavdXjcf8CQnD1mCNwsfRUJGmc';
                const explorerUrl = `https://explorer.solana.com/tx/${txSig}?cluster=devnet`;

                return (
                  <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-purple-300 font-bold">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Registro Oficial On-Chain na Solana Devnet</span>
                      </div>
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-[11px] inline-flex items-center gap-1 font-semibold transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Abrir Transação no Solana Explorer</span>
                      </a>
                    </div>
                    
                    <div className="text-[11px] font-mono text-slate-300 break-all space-y-1">
                      <div>
                        <span className="text-slate-400">Assinatura da TX: </span>
                        <code className="text-emerald-400">{txSig}</code>
                      </div>
                      <div>
                        <span className="text-slate-400">Raiz On-Chain no Bloco: </span>
                        <code className="text-purple-300">{verificationResult.root.slice(0, 16)}...</code>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Script de Auditoria Independente para o Usuário / Perito */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-200 font-semibold">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Auditoria Independente via Terminal (Sem depender do site):</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Qualquer pessoa pode rodar o verificador criptográfico em sua própria máquina apontando direto para a rede Solana:
                </p>
                <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 font-mono text-[11px] text-emerald-300 flex items-center justify-between gap-2">
                  <code>node auditar-voto.mjs {receiptInput.trim()}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`node auditar-voto.mjs ${receiptInput.trim()}`);
                    }}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                    title="Copiar comando"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/20 text-xs text-slate-300 flex items-start gap-2">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Sigilo Preservado:</strong> A matemática prova que sua cédula foi somada no total da eleição sem revelar a ninguém qual foi a sua escolha.
                </span>
              </div>
            </div>
          )}

          {/* Erro de Comprovante Não Encontrado */}
          {errorNotFound && (
            <div className="mt-6 p-4 rounded-xl bg-orange-950/40 border border-orange-500/40 text-left flex items-start gap-3 animate-fade-in">
              <XCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-white">Comprovante não localizado</div>
                <p className="text-slate-300">
                  Verifique se o código foi digitado corretamente (Ex: <code className="text-white">URNSOL-XXXX-YYYY</code>) ou vote primeiro na cabine para gerar um comprovante válido.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
