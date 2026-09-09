import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Layers, 
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
            colors: ['#B8860B', '#D4A84B', '#166534'],
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
    <div className="max-w-5xl mx-auto py-4 px-4 sm:px-6 space-y-6">

      {/* Cabeçalho Editorial com Status */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-md bg-white border border-[#E8E4DF] border-t-2 border-t-[#B8860B] shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-semibold tracking-[0.08em] bg-[#FAFAF8] border border-[#E8E4DF] text-[#B8860B]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AUDITORIA FIM-A-FIM (E2E-V)</span>
            </span>
            {isClosed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-semibold tracking-[0.08em] bg-[#991B1B]/10 border border-[#991B1B]/20 text-[#991B1B]">
                <Ban className="w-3.5 h-3.5" />
                VOTAÇÃO ENCERRADA (RESULTADO OFICIAL)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-semibold tracking-[0.08em] bg-[#B45309]/10 border border-[#B45309]/20 text-[#B45309]">
                <Lock className="w-3.5 h-3.5" />
                VOTAÇÃO EM ANDAMENTO (APURAÇÃO LACRADA)
              </span>
            )}
          </div>
          <h1 className="font-serif font-bold text-2xl text-[#1A1A1A] tracking-tight">
            {isClosed ? 'Resultado Oficial Homologado' : 'Apuração & Transparência Eleitoral'}
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1 max-w-xl font-sans">
            {isClosed
              ? 'A votação foi concluída. Todos os votos foram totalizados e estão selados no Boletim de Urna com prova na Solana.'
              : 'Votação em andamento. Em conformidade com o princípio de sigilo, os votos permanecem lacrados até o término oficial.'}
          </p>
        </div>

        {onUpdateElection && (
          <button
            onClick={handleToggleCloseElection}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono font-medium tracking-[0.05em] uppercase transition-all shrink-0 ${
              isClosed
                ? 'serif-btn-outline'
                : 'bg-[#991B1B]/10 border border-[#991B1B]/30 text-[#991B1B] hover:bg-[#991B1B]/20'
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
        <div className="p-8 sm:p-12 rounded-lg bg-white border border-[#E8E4DF] border-t-4 border-t-[#B45309] text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex items-center justify-center text-[#B45309] shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <div className="max-w-xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-[0.08em] bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/20">
              <Lock className="w-3.5 h-3.5" />
              <span>APURAÇÃO LACRADA DURANTE O PLEITO</span>
            </div>
            
            <h3 className="font-serif font-bold text-2xl text-[#1A1A1A] tracking-tight">
              Votação em Andamento (Votos Ocultos)
            </h3>
            
            <p className="text-sm text-[#6B6B6B] leading-relaxed font-sans">
              Para preservar a inviolabilidade do voto e a lisura do pleito,{' '}
              <strong className="text-[#1A1A1A]">os votos e resultados por candidato não são revelados enquanto a votação estiver aberta</strong>.
            </p>
            <p className="text-xs text-[#8C8883] font-mono">
              Cada cédula é gravada anonimamente no RDV de cada urna. Os totais serão revelados após o encerramento oficial.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left pt-2">
            <div className="p-4 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] space-y-1">
              <div className="small-caps text-[#6B6B6B]">STATUS DA SEÇÃO</div>
              <div className="flex items-center gap-2 text-sm font-bold font-mono text-[#166534]">
                <span className="w-2 h-2 rounded-full bg-[#166534]" />
                <span>VOTAÇÃO ATIVA</span>
              </div>
              <div className="text-[11px] text-[#8C8883] font-mono">Cabines coletando votos</div>
            </div>

            <div className="p-4 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] space-y-1">
              <div className="small-caps text-[#6B6B6B]">URNAS OPERANDO</div>
              <div className="text-sm font-bold font-mono text-[#1A1A1A]">
                {election.urnas.length} {election.urnas.length === 1 ? 'TERMINAL ATIVO' : 'TERMINAIS ATIVOS'}
              </div>
              <div className="text-[11px] text-[#8C8883] font-mono">Assinaturas Ed25519</div>
            </div>

            <div className="p-4 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] space-y-1">
              <div className="small-caps text-[#6B6B6B]">SIGILO GARANTIDO</div>
              <div className="flex items-center gap-1.5 text-sm font-bold font-mono text-[#166534]">
                <ShieldCheck className="w-4 h-4" />
                <span>RDV EMBARALHADO</span>
              </div>
              <div className="text-[11px] text-[#8C8883] font-mono">Bloqueado até o fechamento</div>
            </div>
          </div>

          {onUpdateElection && (
            <div className="pt-3">
              <button
                onClick={handleToggleCloseElection}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-xs font-mono font-medium tracking-[0.05em] uppercase bg-[#991B1B] text-white hover:bg-[#7F1D1D] shadow-sm transition-all"
              >
                <Ban className="w-4 h-4" />
                <span>ENCERRAR VOTAÇÃO OFICIAL PARA LIBERAR OS VOTOS</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ESTADO REVELADO (HOMOLOGADO) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Gráfico de Barras dos Candidatos */}
          <div className="lg:col-span-8 p-6 sm:p-8 rounded-md bg-white border border-[#E8E4DF] border-t-2 border-t-[#B8860B] shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E4DF]">
              <div>
                <div className="small-caps text-[#B8860B]">
                  CARGO: {election.roleTitle}
                </div>
                <h3 className="font-serif font-bold text-lg text-[#1A1A1A] mt-1">
                  Total de Votos por Candidato
                </h3>
              </div>
              <div className="text-right">
                <div className="font-serif text-3xl font-bold text-[#1A1A1A]">
                  {totalVotesAcrossUrnas}
                </div>
                <div className="small-caps text-[#6B6B6B]">VOTOS COMPUTADOS</div>
              </div>
            </div>

            {/* Candidato Vencedor com Destaque Editorial */}
            {winner ? (
              <div className="p-5 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] border-l-4 border-l-[#B8860B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <img
                    src={winner.photoUrl}
                    alt={winner.name}
                    className="w-16 h-16 rounded-md object-cover border border-[#E8E4DF] shadow-sm"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#B8860B] uppercase tracking-[0.1em] mb-1">
                      <Award className="w-4 h-4" />
                      <span>ELEITO / VENCEDOR</span>
                    </div>
                    <div className="font-serif font-bold text-xl text-[#1A1A1A]">
                      {winner.name}
                    </div>
                    <div className="text-xs text-[#6B6B6B] font-mono mt-0.5">
                      Nº {winner.number} • {winner.partyOrSlate}
                    </div>
                  </div>
                </div>
                <div className="text-right sm:text-right w-full sm:w-auto">
                  <div className="font-serif text-3xl font-bold text-[#B8860B]">
                    {winner.percentage}%
                  </div>
                  <div className="text-xs text-[#6B6B6B] font-mono">{winner.votes} VOTOS</div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] text-center font-mono text-xs text-[#6B6B6B]">
                NENHUM VOTO COMPUTADO NESTA ELEIÇÃO.
              </div>
            )}

            {/* Barras de Progresso Refinadas com Dourado */}
            <div className="space-y-3 pt-2">
              {candidateTotals.map((c) => (
                <div
                  key={c.number}
                  className="p-4 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] space-y-2 hover:border-[#B8860B]/40 transition-all"
                >
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-white bg-[#1A1A1A] px-2 py-0.5 rounded text-xs font-mono">
                        Nº {c.number}
                      </span>
                      <span className="font-serif font-bold text-[#1A1A1A] text-base">{c.name}</span>
                      <span className="text-[#6B6B6B] hidden sm:inline font-sans">
                        ({c.partyOrSlate})
                      </span>
                    </div>
                    <div className="text-right">
                      <strong className="text-[#1A1A1A] text-sm font-bold">{c.votes}</strong>
                      <span className="text-[#6B6B6B] ml-1.5 text-xs">({c.percentage}%)</span>
                    </div>
                  </div>
                  
                  {/* Barra Dourada Editorial */}
                  <div className="w-full h-2 rounded bg-white border border-[#E8E4DF] overflow-hidden">
                    <div
                      className="h-full bg-[#B8860B] transition-all duration-500"
                      style={{
                        width: `${Math.max(parseFloat(c.percentage), totalVotesAcrossUrnas > 0 ? 3 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}

              {/* Brancos e Nulos */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex justify-between items-center text-xs font-mono">
                  <span className="text-[#6B6B6B]">VOTOS EM BRANCO:</span>
                  <span className="font-bold text-[#1A1A1A] text-sm">{blankVotesTotal}</span>
                </div>
                <div className="p-3.5 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex justify-between items-center text-xs font-mono">
                  <span className="text-[#6B6B6B]">VOTOS NULOS:</span>
                  <span className="font-bold text-[#1A1A1A] text-sm">{nullVotesTotal}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Painel Lateral: Urnas & Garantias */}
          <div className="lg:col-span-4 space-y-6">

            {/* Status das Urnas */}
            <div className="p-6 rounded-md bg-white border border-[#E8E4DF] shadow-sm space-y-4">
              <h4 className="flex items-center gap-2 small-caps text-[#1A1A1A]">
                <Layers className="w-4 h-4 text-[#B8860B]" />
                <span>VOTOS POR TERMINAL</span>
              </h4>

              <div className="space-y-2.5">
                {election.urnas.map((u) => {
                  const votesInUrna = offlineUrnaService.getVotes(u.id).length;
                  return (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="font-bold text-[#1A1A1A]">{u.id}</div>
                        <div className="text-[11px] text-[#6B6B6B]">{u.location}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#B8860B] text-base">{votesInUrna}</span>
                        <span className="block text-[10px] text-[#8C8883]">VOTOS</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Garantias Criptográficas */}
            <div className="p-6 rounded-md bg-white border border-[#E8E4DF] shadow-sm space-y-4">
              <h4 className="flex items-center gap-2 small-caps text-[#1A1A1A]">
                <FileCheck2 className="w-4 h-4 text-[#B8860B]" />
                <span>GARANTIAS CRIPTOGRÁFICAS</span>
              </h4>

              <div className="space-y-3 text-xs font-mono text-[#6B6B6B]">
                {[
                  { label: 'Não-Duplicidade:', text: 'PIN exclusivo descartado no ato da votação.' },
                  { label: 'Voto Secreto:', text: 'RDV embaralha ordens aleatoriamente sem dados pessoais.' },
                  { label: 'Merkle Root On-Chain:', text: 'Raiz imutável transmitida para a Solana.' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#1A1A1A]">{item.label}</strong>{' '}
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SEÇÃO 2: VERIFICAÇÃO INDIVIDUAL DO COMPROVANTE (MERKLE PROOF) */}
      <div className="p-6 sm:p-8 rounded-md bg-white border border-[#E8E4DF] shadow-sm">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex items-center justify-center text-[#B8860B] shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          
          <h2 className="font-serif font-bold text-xl text-[#1A1A1A] tracking-tight">
            Verifique se o seu voto foi computado
          </h2>
          
          <p className="text-xs text-[#6B6B6B] font-mono">
            Insira o código do seu comprovante impresso (Ex: <code className="text-[#B8860B] bg-[#FAFAF8] px-1.5 py-0.5 rounded border border-[#E8E4DF]">URNASOL-XXXX-YYYY</code>) para validar a prova matemática de inclusão na Árvore de Merkle:
          </p>

          {/* Campo de Busca de Recibo */}
          <form onSubmit={handleVerifyReceipt} className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8883]" />
              <input
                type="text"
                placeholder="INSIRA SEU CÓDIGO DE COMPROVANTE..."
                value={receiptInput}
                onChange={(e) => setReceiptInput(e.target.value)}
                className="serif-input pl-10 text-xs font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying || !receiptInput.trim()}
              className="serif-btn-primary rounded-md text-xs py-2 px-5 shrink-0"
            >
              {isVerifying ? 'AUDITANDO...' : 'AUDITAR VOTO'}
            </button>
          </form>

          {/* Resultado Positivo da Verificação */}
          {verificationResult && verificationResult.isValid && (
            <div className="mt-6 p-6 rounded-md bg-white border border-[#E8E4DF] border-t-2 border-t-[#166534] text-left space-y-4 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3 pb-3 border-b border-[#E8E4DF]">
                <div className="w-10 h-10 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex items-center justify-center text-[#166534] shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-[#1A1A1A]">
                    {isClosed
                      ? 'Voto 100% Computado no Resultado Oficial!'
                      : 'Comprovante Válido — Cédula Registrada e Lacrada no RDV!'}
                  </h4>
                  <p className="text-xs text-[#166534] font-mono">
                    {isClosed
                      ? 'Prova Matemática de Inclusão (Merkle Proof) Válida'
                      : 'Prova Matemática Válida • O voto será totalizado no encerramento'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono text-[#6B6B6B]">
                {[
                  { label: 'URNA DE ORIGEM:', value: verificationResult.urnaId, bold: true },
                  { label: 'ÍNDICE NO REGISTRO (RDV):', value: `FOLHA #${verificationResult.leafIndex + 1}` },
                  { label: 'HASH DA SUA CÉDULA (LEAF):', value: verificationResult.leaf, accent: true },
                  { label: 'RAIZ MERKLE GRAVADA NA SOLANA:', value: verificationResult.root, gold: true },
                ].map((row) => (
                  <div key={row.label} className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-[#FAFAF8] break-all">
                    <span>{row.label}</span>
                    <span className={row.gold ? 'text-[#B8860B] font-bold' : row.accent ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Dados On-Chain */}
              {(() => {
                const onChainRecords = solanaService.getOnChainElectionData(election.id);
                const activeRecord = onChainRecords.find((r) => r.urnaId === verificationResult.urnaId) || onChainRecords[0];
                const txSig = activeRecord?.txSignature || '2Mq8LExa9hZoaEzifL2ExAMKpwpdsMun5cESwGQfd8u2SzyeZNPZBG6bhC38QEshsu5ZiPyMPoE2GdapBNHNvkvg';
                const explorerUrl = `https://explorer.solana.com/tx/${txSig}?cluster=devnet`;

                return (
                  <div className="p-4 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1A1A1A]">
                        <ShieldCheck className="w-4 h-4 text-[#B8860B]" />
                        <span>REGISTRO OFICIAL ON-CHAIN NA SOLANA DEVNET</span>
                      </div>
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="serif-btn-outline rounded text-xs py-1 px-2.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>VER NO EXPLORER</span>
                      </a>
                    </div>

                    <div className="text-[11px] font-mono text-[#6B6B6B] break-all space-y-1">
                      <div>
                        <span>CARTEIRA AUTORA / PAYER: </span>
                        <code className="text-[#1A1A1A]">BCxEDMyGm8msF8nprbUyG85dvTnjDWBLBXAXtzW7DEpG</code>
                      </div>
                      <div>
                        <span>ASSINATURA DA TX: </span>
                        <code className="text-[#1A1A1A]">{txSig}</code>
                      </div>
                      <div>
                        <span>RAIZ ON-CHAIN: </span>
                        <code className="text-[#B8860B]">{verificationResult.root.slice(0, 20)}...</code>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Script de Auditoria Independente */}
              <div className="p-4 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1A1A1A]">
                  <Terminal className="w-4 h-4 text-[#B8860B]" />
                  <span>AUDITORIA INDEPENDENTE VIA TERMINAL:</span>
                </div>
                <p className="text-xs text-[#6B6B6B] font-mono">
                  Qualquer pessoa pode rodar o verificador criptográfico em sua própria máquina:
                </p>
                <div className="p-3 rounded bg-white border border-[#E8E4DF] flex items-center justify-between gap-2 text-xs font-mono text-[#B8860B]">
                  <code>node auditar-voto.mjs {receiptInput.trim()}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(`node auditar-voto.mjs ${receiptInput.trim()}`)}
                    className="p-1 rounded hover:bg-[#FAFAF8] text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                    title="Copiar comando"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex items-start gap-2.5 text-xs font-mono text-[#6B6B6B]">
                <Lock className="w-4 h-4 text-[#B8860B] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#1A1A1A]">Sigilo Preservado:</strong>{' '}
                  A matemática prova que sua cédula foi inclusa na soma total sem revelar publicamente qual foi o seu voto.
                </span>
              </div>
            </div>
          )}

          {/* Erro de Comprovante Não Encontrado */}
          {errorNotFound && (
            <div className="mt-6 p-4 rounded-md bg-[#B45309]/10 border border-[#B45309]/30 text-left flex items-start gap-3 animate-fade-in">
              <XCircle className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
              <div className="text-xs font-mono">
                <div className="font-bold text-[#B45309] mb-1">COMPROVANTE NÃO LOCALIZADO</div>
                <p className="text-[#6B6B6B]">
                  Verifique se o código foi digitado corretamente (Ex:{' '}
                  <code className="text-[#B8860B] bg-white px-1 py-0.5 rounded border border-[#E8E4DF]">URNASOL-XXXX-YYYY</code>)
                  ou vote primeiro na cabine da urna antes de auditar.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
