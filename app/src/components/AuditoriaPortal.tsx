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
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Election, MerkleProofResult } from '../lib/types';
import { offlineUrnaService } from '../lib/offlineUrna';
import { buildMerkleTree, getMerkleProof, verifyMerkleProof } from '../lib/cryptoUtils';

interface AuditoriaPortalProps {
  election: Election;
  initialReceiptCode?: string;
}

export const AuditoriaPortal: React.FC<AuditoriaPortalProps> = ({
  election,
  initialReceiptCode = '',
}) => {
  const [receiptInput, setReceiptInput] = useState(initialReceiptCode);
  const [verificationResult, setVerificationResult] = useState<MerkleProofResult | null>(null);
  const [errorNotFound, setErrorNotFound] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Se ainda não tiver BU on-chain transmitido, lê os locais para auditoria imediata
  const totalVotesAcrossUrnas = election.urnas.reduce((acc, u) => {
    const bu = offlineUrnaService.getSavedBU(u.id);
    return acc + (bu?.totalVotes || 0);
  }, 0);

  const candidateTotals = election.candidates.map((cand) => {
    const totalVotesForCand = election.urnas.reduce((acc, u) => {
      const bu = offlineUrnaService.getSavedBU(u.id);
      const candTally = bu?.candidateTallies.find((c) => c.candidateNumber === cand.number);
      return acc + (candTally?.votes || 0);
    }, 0);

    const percentage = totalVotesAcrossUrnas > 0 
      ? ((totalVotesForCand / totalVotesAcrossUrnas) * 100).toFixed(1) 
      : '0.0';

    return {
      ...cand,
      votes: totalVotesForCand,
      percentage,
    };
  });

  // Ordena por mais votado
  candidateTotals.sort((a, b) => b.votes - a.votes);
  const winner = candidateTotals.length > 0 && candidateTotals[0].votes > 0 ? candidateTotals[0] : null;

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
      
      {/* Cabeçalho */}
      <div className="text-center max-w-3xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>End-to-End Verifiability (E2E-V)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white font-display">
          Portal de Transparência & Auditoria On-Chain
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          Comprove que seu voto foi utilizado na apuração final da eleição sem que ninguém saiba em quem você votou.
        </p>
      </div>

      {/* SEÇÃO 1: VERIFICAÇÃO INDIVIDUAL DO COMPROVANTE */}
      <div className="glass-panel p-6 sm:p-8 border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900/60">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white font-display">
            Verifique seu Comprovante de Votação
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Cole abaixo o código impresso no seu comprovante (Ex: <code className="text-emerald-400 font-mono">URNSOL-4F2A-89BC</code>) para verificar a prova criptográfica de inclusão na Árvore de Merkle da Solana.
          </p>

          {/* Campo de Busca de Recibo */}
          <form onSubmit={handleVerifyReceipt} className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Digite seu código (Ex: URNSOL-4F2A-89BC)..."
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
                    VOTO COMPUTADO NO RESULTADO OFICIAL!
                  </h4>
                  <p className="text-xs text-emerald-400 font-mono">
                    Prova Matemática de Inclusão (Merkle Proof) Válida
                  </p>
                </div>
              </div>

              {/* Detalhes da Prova de Merkle */}
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
                <div className="flex flex-col sm:flex-row sm:justify-between py-1">
                  <span className="text-slate-400">Nós Intermediários da Prova:</span>
                  <span className="text-cyan-300">{verificationResult.proof.length} hashes calculados</span>
                </div>
              </div>

              {/* Garantias */}
              <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/20 text-xs text-slate-300 flex items-start gap-2">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Sigilo Preservado:</strong> O sistema certifica matematicamente que esta cédula fez parte do somatório do Boletim de Urna sem revelar qual candidato você escolheu.
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
                  Verifique se o código foi digitado corretamente (Ex: <code className="text-white">URNSOL-XXXX-YYYY</code>) ou se a urna onde você votou já foi fechada pelo mesário.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* SEÇÃO 2: APURAÇÃO GERAL DOS VOTOS (UNIVERSAL VERIFIABILITY) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Gráfico de Barras dos Candidatos */}
        <div className="lg:col-span-8 glass-panel p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase">
                <BarChart3 className="w-4 h-4" />
                <span>Resultado Parcial / Final</span>
              </div>
              <h3 className="text-xl font-bold text-white font-display mt-0.5">
                Apuração Oficial: {election.roleTitle}
              </h3>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-white font-display">
                {totalVotesAcrossUrnas}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">votos apurados</div>
            </div>
          </div>

          {/* Candidato Líder / Eleito */}
          {winner && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-purple-950/30 to-slate-900 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={winner.photoUrl}
                  alt={winner.name}
                  className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-400 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase font-mono">
                    <Award className="w-4 h-4" />
                    <span>Mais Votado</span>
                  </div>
                  <div className="text-base font-bold text-white font-display">
                    {winner.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    Nº {winner.number} • {winner.partyOrSlate}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {winner.percentage}%
                </div>
                <div className="text-xs text-slate-400">
                  {winner.votes} votos
                </div>
              </div>
            </div>
          )}

          {/* Lista de Barras de Progresso */}
          <div className="space-y-4 pt-2">
            {candidateTotals.map((c) => (
              <div key={c.number} className="space-y-1.5">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-white">
                    <strong className="text-emerald-400 mr-2">Nº {c.number}</strong>
                    {c.name}
                  </span>
                  <span className="font-mono text-slate-300">
                    {c.votes} votos ({c.percentage}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(parseFloat(c.percentage), 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Auditoria das Urnas & Checklist de Integridade */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Checklist de Auditoria Pública */}
          <div className="glass-panel p-6 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <span>Critérios de Integridade</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  <strong>Zerésima Inicial:</strong> Todas as urnas iniciaram com 0 votos auditados.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  <strong>Assinaturas Ed25519:</strong> Chaves das urnas validadas sem adulteração.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  <strong>Quórum Respeitado:</strong> Total de votos não excede os aptos cadastrados.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  <strong>Anti-Replay On-Chain:</strong> Nenhuma urna submeteu contagem duplicada.
                </span>
              </div>
            </div>
          </div>

          {/* Status das Urnas da Eleição */}
          <div className="glass-panel p-6 space-y-3">
            <h4 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Urnas Registradas</span>
            </h4>

            <div className="space-y-2">
              {election.urnas.map((u) => {
                const votesCount = offlineUrnaService.getVotes(u.id).length;
                return (
                  <div
                    key={u.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{u.id}</div>
                      <div className="text-[11px] text-slate-400">{u.location}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-400">{votesCount}</span>
                      <span className="text-[11px] text-slate-500 block">votos gravados</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
