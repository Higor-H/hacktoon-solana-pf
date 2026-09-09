import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Send, 
  CheckCircle2, 
  ExternalLink, 
  QrCode, 
  Printer, 
  Lock, 
  ShieldCheck, 
  AlertCircle,
  RefreshCw,
  Copy,
  Coins,
  Ban,
  Wallet
} from 'lucide-react';
import QRCodeSVG from 'qrcode';
import type { Election, UrnaDevice, BoletimDeUrnaPayload } from '../lib/types';
import { offlineUrnaService } from '../lib/offlineUrna';
import { solanaService } from '../lib/solanaService';
import type { OnChainSubmissionResult } from '../lib/solanaService';

interface BoletimUrnaViewProps {
  election: Election;
  selectedUrna: UrnaDevice;
  onUrnaSubmitted?: (urnaId: string) => void;
  onGoToAuditoria: () => void;
  onUpdateElection?: (updated: Election) => void;
}

export const BoletimUrnaView: React.FC<BoletimUrnaViewProps> = ({
  election,
  selectedUrna,
  onUrnaSubmitted,
  onGoToAuditoria,
  onUpdateElection,
}) => {
  const [buPayload, setBuPayload] = useState<BoletimDeUrnaPayload | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<OnChainSubmissionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [airdropMsg, setAirdropMsg] = useState<string | null>(null);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [organizerBalance, setOrganizerBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);

  const [organizerPubkey, setOrganizerPubkey] = useState<string>(() => {
    solanaService.ensurePreferredKey();
    return solanaService.getOrganizerPublicKey();
  });

  const refreshBalance = async () => {
    setLoadingBalance(true);
    try {
      solanaService.ensurePreferredKey();
      setOrganizerPubkey(solanaService.getOrganizerPublicKey());
      const bal = await solanaService.getOrganizerBalance();
      setOrganizerBalance(bal);
    } catch {
      setOrganizerBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    refreshBalance();
  }, []);

  const isClosed = election.status === 'closed';

  useEffect(() => {
    if (isClosed) {
      loadOrGenerateBU();
    } else {
      setBuPayload(null);
      setQrCodeUrl('');
    }
  }, [selectedUrna.id, isClosed]);

  const loadOrGenerateBU = async () => {
    let bu = offlineUrnaService.getSavedBU(selectedUrna.id);
    if (!bu) {
      bu = await offlineUrnaService.closeUrnaAndGenerateBU(election, selectedUrna);
    }
    setBuPayload(bu);

    try {
      const qrPayload = JSON.stringify({
        protocol: 'URNASOL_BU_V1',
        eleicao: bu.electionId,
        urna: bu.urnaId,
        total: bu.totalVotes,
        brancos: bu.blankVotes,
        nulos: bu.nullVotes,
        tally: bu.candidateTallies.map((c) => ({ n: c.candidateNumber, v: c.votes })),
        root: bu.merkleRoot,
        sig: bu.ed25519Signature,
        pubkey: bu.urnaPubkey,
      });

      const url = await QRCodeSVG.toDataURL(qrPayload, { width: 280, margin: 1 });
      setQrCodeUrl(url);
    } catch (e) {
      console.error('Erro ao gerar QR Code do BU:', e);
    }
  };

  const handleCloseElection = async () => {
    if (!onUpdateElection) return;
    for (const u of election.urnas) {
      await offlineUrnaService.closeUrnaAndGenerateBU(election, u);
    }
    onUpdateElection({
      ...election,
      status: 'closed',
    });
    await loadOrGenerateBU();
  };

  const handleTransmitToSolana = async () => {
    if (!buPayload) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await solanaService.submitBoletimUrnaToSolana(election, buPayload);
      setSubmissionResult(result);
      if (onUrnaSubmitted) {
        onUrnaSubmitted(selectedUrna.id);
      }
      await refreshBalance();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao transmitir para a Solana';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestAirdrop = async () => {
    setIsAirdropping(true);
    setAirdropMsg(null);
    try {
      const res = await solanaService.requestAirdrop();
      setAirdropMsg(res.message);
      await refreshBalance();
    } catch {
      setAirdropMsg('Erro ao solicitar airdrop.');
    } finally {
      setIsAirdropping(false);
    }
  };

  const handleCopyKey = () => {
    const key = solanaService.getOrganizerPublicKey();
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto py-4 px-4 sm:px-6 space-y-6">

      {/* Título & Ações Principais em Estilo Editorial */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-md bg-white border border-[#E8E4DF] border-t-2 border-t-[#B8860B] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-mono uppercase tracking-[0.12em] text-[#B8860B]">
            <FileText className="w-4 h-4" />
            <span>FECHAMENTO DA SEÇÃO ELEITORAL</span>
          </div>
          <h1 className="font-serif font-bold text-2xl text-[#1A1A1A] tracking-tight">
            Boletim de Urna (BU) Digital
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1 font-sans">
            {isClosed
              ? 'Relatório oficial emitido após o término da votação, assinado com Ed25519 pela urna.'
              : 'O BU com a contagem oficial de votos só é emitido após o encerramento oficial da eleição.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isClosed && onUpdateElection && (
            <button
              onClick={handleCloseElection}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-mono font-medium tracking-[0.05em] uppercase bg-[#991B1B]/10 border border-[#991B1B]/20 text-[#991B1B] hover:bg-[#991B1B]/20 transition-all"
            >
              <Ban className="w-4 h-4" />
              <span>ENCERRAR VOTAÇÃO</span>
            </button>
          )}

          {isClosed && (
            <>
              <button onClick={loadOrGenerateBU} className="serif-btn-outline rounded-md text-xs">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>RECALCULAR</span>
              </button>
              <button onClick={() => window.print()} className="serif-btn-outline rounded-md text-xs">
                <Printer className="w-3.5 h-3.5" />
                <span>IMPRIMIR</span>
              </button>
            </>
          )}
        </div>
      </div>

      {!isClosed ? (
        /* ESTADO BLOQUEADO — votação em aberto (Regra de Sigilo) */
        <div className="p-8 sm:p-12 rounded-lg bg-white border border-[#E8E4DF] border-t-4 border-t-[#B45309] text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex items-center justify-center text-[#B45309] shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <div className="max-w-xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-[0.08em] bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/20">
              <Lock className="w-3.5 h-3.5" />
              <span>BOLETIM BLOQUEADO • VOTAÇÃO EM ABERTO</span>
            </div>
            
            <h3 className="font-serif font-bold text-2xl text-[#1A1A1A] tracking-tight">
              Boletim de Urna (BU) Indisponível
            </h3>
            
            <p className="text-sm text-[#6B6B6B] leading-relaxed font-sans">
              O Boletim de Urna com a contagem de votos{' '}
              <strong className="text-[#1A1A1A]">não pode ser emitido enquanto a votação estiver em andamento</strong>,
              garantindo o sigilo incondicional do voto e a lisura do pleito.
            </p>
            <p className="text-xs text-[#8C8883] font-mono">
              A urna só consolida os votos e assina o BU digitalmente com Ed25519 após o encerramento oficial da seção.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left pt-2">
            {[
              { label: 'SEÇÃO / URNA', value: selectedUrna.id, sub: selectedUrna.name },
              { label: 'LOCAL DE VOTAÇÃO', value: selectedUrna.location, sub: 'Cabine física em operação' },
              { label: 'STATUS DO RELATÓRIO', value: 'LACRADO NO RDV', sub: 'Aguardando encerramento', warn: true },
            ].map((item) => (
              <div
                key={item.label}
                className="p-4 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] space-y-1"
              >
                <div className="small-caps text-[#6B6B6B]">
                  {item.label}
                </div>
                <div className={`text-sm font-bold font-mono ${item.warn ? 'text-[#B45309]' : 'text-[#1A1A1A]'}`}>
                  {item.warn && <Lock className="w-3.5 h-3.5 inline mr-1" />}
                  {item.value}
                </div>
                <div className="text-[11px] text-[#8C8883] font-mono">{item.sub}</div>
              </div>
            ))}
          </div>

          {onUpdateElection && (
            <div className="pt-3">
              <button
                onClick={handleCloseElection}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-xs font-mono font-medium tracking-[0.05em] uppercase bg-[#991B1B] text-white hover:bg-[#7F1D1D] shadow-sm transition-all"
              >
                <Ban className="w-4 h-4" />
                <span>ENCERRAR VOTAÇÃO OFICIAL PARA EMITIR O BU</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Banner de Status de Transmissão Solana */}
          {submissionResult ? (
            <div className="p-6 rounded-md bg-white border border-[#E8E4DF] border-t-2 border-t-[#166534] shadow-sm space-y-4 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex items-center justify-center text-[#166534] shadow-sm shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-serif font-bold text-lg text-[#1A1A1A] tracking-tight">
                      Boletim de Urna Registrado com Sucesso
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold tracking-[0.08em] uppercase bg-[#166534]/10 border border-[#166534]/20 text-[#166534]">
                      {submissionResult.isLiveOnChain ? 'AO VIVO NA SOLANA DEVNET' : 'CRIPTOGRAFIA AIR-GAP LOCAL'}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6B6B] font-mono">
                    A Raiz de Merkle e a apuração foram validadas criptograficamente contra a chave Ed25519 da Urna.
                  </p>

                  <div className="pt-1 flex flex-wrap gap-4 text-xs font-mono text-[#6B6B6B]">
                    <div>
                      <span>SLOT SOLANA: </span>
                      <strong className="text-[#1A1A1A]">#{submissionResult.slot}</strong>
                    </div>
                    <div>
                      <span>TX ID: </span>
                      <strong className="text-[#B8860B]">{submissionResult.txSignature.slice(0, 24)}...</strong>
                    </div>
                  </div>

                  {submissionResult.isLiveOnChain ? (
                    <div className="pt-2 flex flex-wrap gap-3">
                      <a
                        href={submissionResult.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="serif-btn-primary rounded-md text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>VER NO SOLANA EXPLORER</span>
                      </a>
                      <button onClick={onGoToAuditoria} className="serif-btn-outline rounded-md text-xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#B8860B]" />
                        <span>AUDITAR VOTOS</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 p-4 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] space-y-3 text-xs font-mono">
                      <p className="text-[#6B6B6B]">
                        O BU foi registrado em modo seguro local porque a carteira não possuía taxa de rede na Devnet pública.
                      </p>

                      <div className="p-3 rounded-md bg-white border border-[#E8E4DF] space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-[#6B6B6B]">CARTEIRA DA ELEIÇÃO:</span>
                          <code className="text-[#B8860B] px-2 py-0.5 rounded bg-[#FAFAF8] border border-[#E8E4DF]">
                            {submissionResult.organizerPubkey}
                          </code>
                          <button
                            onClick={handleCopyKey}
                            className="serif-btn-outline rounded text-xs py-0.5 px-2"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedKey ? 'COPIADO!' : 'COPIAR'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-1 flex flex-wrap gap-2.5">
                        <button
                          onClick={handleTransmitToSolana}
                          disabled={isSubmitting}
                          className="serif-btn-primary rounded-md text-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSubmitting ? 'TRANSMITINDO...' : 'TRANSMITIR NOVAMENTE'}</span>
                        </button>
                        <button onClick={onGoToAuditoria} className="serif-btn-outline rounded-md text-xs">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>IR PARA AUDITORIA</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-md bg-white border border-[#E8E4DF] border-t-2 border-t-[#B8860B] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex items-center justify-center text-[#B8860B] shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#1A1A1A]">
                      Boletim Assinado Offline pela Urna (Ed25519)
                    </h4>
                    <p className="text-xs text-[#6B6B6B] font-mono mt-0.5">
                      Pronto para transmissão. Qualquer dispositivo com acesso à internet pode enviar para a Solana.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleTransmitToSolana}
                    disabled={isSubmitting || !buPayload}
                    className="serif-btn-primary rounded-md text-xs w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>REGISTRANDO NA SOLANA...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>TRANSMITIR PARA A SOLANA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Painel da Carteira */}
              <div className="p-4 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-[#6B6B6B]">
                    <Wallet className="w-4 h-4 text-[#B8860B]" />
                    <span className="font-bold text-[#1A1A1A]">Payer Solana:</span>
                    <span className="text-[#B8860B] px-2 py-0.5 rounded bg-white border border-[#E8E4DF] text-[11px] max-w-[240px] sm:max-w-xs truncate">
                      {organizerPubkey}
                    </span>
                    <button onClick={handleCopyKey} className="serif-btn-outline rounded text-xs py-0.5 px-2">
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey ? 'COPIADO' : 'COPIAR'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[#6B6B6B] text-[11px]">
                    <span>SALDO DEVNET:</span>
                    <span className={`font-bold ${organizerBalance && organizerBalance > 0 ? 'text-[#166534]' : 'text-[#B45309]'}`}>
                      {loadingBalance ? 'CONSULTANDO...' : organizerBalance !== null ? `${organizerBalance.toFixed(4)} SOL` : '0.0000 SOL'}
                    </span>
                    <button
                      onClick={refreshBalance}
                      disabled={loadingBalance}
                      className="text-[#8C8883] hover:text-[#1A1A1A] underline text-[11px]"
                    >
                      (atualizar)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={handleRequestAirdrop}
                    disabled={isAirdropping}
                    className="serif-btn-outline rounded-md text-xs flex-1 md:flex-initial"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>{isAirdropping ? 'SOLICITANDO...' : 'AIRDROP RÁPIDO'}</span>
                  </button>
                  <a
                    href="https://faucet.solana.com"
                    target="_blank"
                    rel="noreferrer"
                    className="serif-btn-outline rounded-md text-xs flex-1 md:flex-initial"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>FAUCET</span>
                  </a>
                </div>
              </div>

              {airdropMsg && (
                <div className="p-3 rounded-md bg-[#166534]/10 border border-[#166534]/20 text-xs font-mono text-[#166534]">
                  {airdropMsg}
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-md bg-[#B45309]/10 border border-[#B45309]/20 flex items-center gap-2 text-xs font-mono text-[#B45309]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Grid: Fita Térmica Editorial + QR Code */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* DOCUMENTO OFICIAL DO BOLETIM DE URNA */}
            <div className="lg:col-span-7 rounded-md bg-white border border-[#E8E4DF] p-6 sm:p-8 font-mono text-xs leading-relaxed shadow-sm">

              <div className="text-center pb-5 mb-4 border-b border-dashed border-[#E8E4DF]">
                <div className="font-serif font-bold text-base text-[#1A1A1A] tracking-wide">
                  República Federativa do Brasil
                </div>
                <div className="text-xs text-[#6B6B6B] mt-0.5">
                  JUSTIÇA ELEITORAL DIGITAL • URNASOL
                </div>
                <div className="mt-2 font-bold text-[#1A1A1A] uppercase">
                  {election.institutionName}
                </div>
                <div className="text-[11px] text-[#8C8883]">{election.title}</div>
                {isClosed && (
                  <div className="mt-2 font-bold text-[#B8860B] uppercase tracking-[0.1em] text-[11px]">
                    [ ELEIÇÃO ENCERRADA E HOMOLOGADA ]
                  </div>
                )}
              </div>

              <div className="pb-3 mb-3 space-y-1.5 border-b border-[#E8E4DF] text-[11px]">
                {[
                  { label: 'IDENTIFICAÇÃO DA URNA:', value: selectedUrna.id, bold: true },
                  { label: 'LOCAL DE VOTAÇÃO:', value: selectedUrna.location },
                  { label: 'DATA DA APURAÇÃO:', value: new Date(buPayload?.timestamp || Date.now()).toLocaleDateString('pt-BR') },
                  { label: 'HORA DO FECHAMENTO:', value: new Date(buPayload?.timestamp || Date.now()).toLocaleTimeString('pt-BR') },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-[#6B6B6B]">{row.label}</span>
                    <span className={row.bold ? 'font-bold text-[#1A1A1A]' : 'text-[#1A1A1A]'}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="pb-3 mb-3 space-y-1.5 border-b border-[#E8E4DF] text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">ZERÉSIMA INICIAL:</span>
                  <span className="font-bold text-[#166534]">AUDITADA (0 VOTOS)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">ELEITORES APTOS CADASTRADOS:</span>
                  <span className="font-bold text-[#1A1A1A]">{election.registeredVoters}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">COMPARECIMENTO NESTA URNA:</span>
                  <span className="font-bold text-[#1A1A1A]">{buPayload?.totalVotes || 0}</span>
                </div>
              </div>

              {/* Apuração dos Votos por Cargo */}
              <div className="pb-4 mb-4 border-b border-dashed border-[#E8E4DF]">
                <div className="font-serif font-bold text-center uppercase tracking-wide text-xs mb-3 text-[#B8860B]">
                  Apuração do Cargo: {election.roleTitle}
                </div>

                <div className="space-y-2">
                  {buPayload?.candidateTallies.map((c) => (
                    <div
                      key={c.candidateNumber}
                      className="flex justify-between items-center py-1 border-b border-[#FAFAF8]"
                    >
                      <div>
                        <span className="font-bold text-[#1A1A1A] mr-2">Nº {c.candidateNumber}</span>
                        <span className="text-[#6B6B6B]">{c.candidateName}</span>
                      </div>
                      <span className="font-bold text-sm text-[#1A1A1A]">{c.votes}</span>
                    </div>
                  ))}

                  <div className="flex justify-between py-1 border-b border-[#FAFAF8]">
                    <span className="text-[#6B6B6B]">VOTOS EM BRANCO</span>
                    <span className="font-bold text-[#1A1A1A]">{buPayload?.blankVotes || 0}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#FAFAF8]">
                    <span className="text-[#6B6B6B]">VOTOS NULOS</span>
                    <span className="font-bold text-[#1A1A1A]">{buPayload?.nullVotes || 0}</span>
                  </div>

                  <div className="flex justify-between pt-2 text-sm font-bold text-[#1A1A1A]">
                    <span>TOTAL DE VOTOS:</span>
                    <span className="text-[#B8860B]">{buPayload?.totalVotes || 0}</span>
                  </div>
                </div>
              </div>

              {/* Auditoria Criptográfica */}
              <div className="space-y-2 text-[10px] text-[#6B6B6B] break-all">
                <div className="small-caps text-center text-[#1A1A1A] mb-2">
                  GARANTIA DE INTEGRIDADE CRIPTOGRÁFICA
                </div>

                <div>
                  <span className="font-bold text-[#1A1A1A] block">RAIZ DE MERKLE DOS RECIBOS (32 BYTES):</span>
                  <span className="block mt-1 p-2 rounded bg-[#FAFAF8] border border-[#E8E4DF] text-[#B8860B] text-[10px]">
                    {buPayload?.merkleRoot || '...'}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-[#1A1A1A] block">ASSINATURA ED25519 DA URNA:</span>
                  <span className="block mt-1 p-2 rounded bg-[#FAFAF8] border border-[#E8E4DF] text-[#1A1A1A] text-[10px]">
                    {buPayload?.ed25519Signature.slice(0, 56)}...
                  </span>
                </div>

                <div>
                  <span className="font-bold text-[#1A1A1A] block">CHAVE PÚBLICA DA URNA (SOLANA PUBKEY):</span>
                  <span className="block mt-1 p-2 rounded bg-[#FAFAF8] border border-[#E8E4DF] text-[#1A1A1A] text-[10px]">
                    {selectedUrna.publicKey}
                  </span>
                </div>
              </div>

              <div className="text-center pt-6 text-[10px] font-mono font-bold text-[#8C8883] uppercase tracking-[0.1em]">
                FIM DO BOLETIM DE URNA • URNASOL
              </div>
            </div>

            {/* PAINEL DO QR CODE */}
            <div className="lg:col-span-5 rounded-md bg-white border border-[#E8E4DF] p-6 space-y-5 shadow-sm">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] flex items-center justify-center text-[#B8860B] shadow-sm">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#1A1A1A]">
                  QR Code do Boletim de Urna
                </h3>
                <p className="text-xs text-[#6B6B6B] mt-1 font-sans">
                  Escaneie com qualquer leitor para validar e transmitir o BU para a Solana.
                </p>
              </div>

              <div className="max-w-[260px] mx-auto p-4 rounded-md bg-white border border-[#E8E4DF] shadow-sm">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code do Boletim de Urna"
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-xs font-mono text-[#8C8883]">
                    GERANDO QR CODE...
                  </div>
                )}
              </div>

              <div className="p-4 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] space-y-2 text-xs font-mono text-[#6B6B6B]">
                <div className="font-bold text-[#1A1A1A] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#B8860B]" />
                  <span>COMO FUNCIONA O AIR-GAP:</span>
                </div>
                <p>1. A Urna nunca se conecta à internet durante a votação.</p>
                <p>2. O QR Code contém a apuração oficial, a raiz da Árvore de Merkle e a assinatura Ed25519.</p>
                <p>3. Qualquer cidadão com conexão pode transmitir os dados para a Solana sem poder adulterá-los.</p>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
};
