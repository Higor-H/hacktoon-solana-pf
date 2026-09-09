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

  // Carrega ou gera o BU da urna selecionada
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

  // Encerramento de eleição
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

  // Transmissão para a Solana
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

  // Solicitar airdrop de teste
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

      {/* Título & Ações Principais em Ilha */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs font-mono font-semibold tracking-wider text-emerald-400 uppercase">
            <FileText className="w-4 h-4" />
            <span>FECHAMENTO DA SEÇÃO ELEITORAL</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            BOLETIM DE URNA (BU) DIGITAL
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {isClosed
              ? 'Relatório oficial emitido após o término da votação, assinado com Ed25519 pela urna.'
              : 'O BU com a contagem oficial de votos só é liberado após o encerramento da eleição.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isClosed && onUpdateElection && (
            <button
              onClick={handleCloseElection}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 shadow-sm shadow-red-500/20 transition-all"
            >
              <Ban className="w-4 h-4" />
              <span>ENCERRAR VOTAÇÃO</span>
            </button>
          )}

          {isClosed && (
            <>
              <button onClick={loadOrGenerateBU} className="island-btn rounded-xl text-xs">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>RECALCULAR</span>
              </button>
              <button onClick={() => window.print()} className="island-btn rounded-xl text-xs">
                <Printer className="w-3.5 h-3.5" />
                <span>IMPRIMIR</span>
              </button>
            </>
          )}
        </div>
      </div>

      {!isClosed ? (
        /* ESTADO BLOQUEADO — votação em aberto (Regra de Sigilo) */
        <div className="p-8 sm:p-12 rounded-3xl bg-zinc-950/70 border border-amber-500/30 backdrop-blur-md text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
            <Lock className="w-8 h-8" />
          </div>

          <div className="max-w-xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Lock className="w-3.5 h-3.5" />
              <span>BOLETIM BLOQUEADO • VOTAÇÃO EM ABERTO</span>
            </div>
            
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              BOLETIM DE URNA (BU) INDISPONÍVEL
            </h3>
            
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              O BU com a totalização de votos{' '}
              <strong className="text-white">não pode ser emitido enquanto a votação estiver em andamento</strong>,
              garantindo o sigilo absoluto do voto e a lisura do pleito.
            </p>
            <p className="text-xs text-zinc-500 font-mono">
              A urna só consolida os votos e assina o BU digitalmente com Ed25519 após o encerramento da seção.
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
                className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1"
              >
                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  {item.label}
                </div>
                <div className={`text-sm font-bold font-mono ${item.warn ? 'text-amber-400' : 'text-white'}`}>
                  {item.warn && <Lock className="w-3.5 h-3.5 inline mr-1" />}
                  {item.value}
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">{item.sub}</div>
              </div>
            ))}
          </div>

          {onUpdateElection && (
            <div className="pt-3">
              <button
                onClick={handleCloseElection}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 shadow-lg shadow-red-500/20 transition-all"
              >
                <Ban className="w-4 h-4" />
                <span>ENCERRAR VOTAÇÃO OFICIAL PARA EMITIR O BU</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Banner de Status de Transmissão Solana em Ilha */}
          {submissionResult ? (
            <div className="p-6 rounded-2xl bg-zinc-950/70 border border-emerald-500/30 backdrop-blur-md shadow-xl animate-fade-in space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      BU REGISTRADO COM SUCESSO!
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                      {submissionResult.isLiveOnChain ? 'AO VIVO NA SOLANA DEVNET' : 'CRIPTOGRAFIA AIR-GAP LOCAL'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 font-mono">
                    A Raiz de Merkle e a apuração foram validadas criptograficamente contra a chave Ed25519 da Urna.
                  </p>

                  <div className="pt-1 flex flex-wrap gap-4 text-xs font-mono text-zinc-400">
                    <div>
                      <span>SLOT SOLANA: </span>
                      <strong className="text-white">#{submissionResult.slot}</strong>
                    </div>
                    <div>
                      <span>TX ID: </span>
                      <strong className="text-emerald-400">{submissionResult.txSignature.slice(0, 24)}...</strong>
                    </div>
                  </div>

                  {submissionResult.isLiveOnChain ? (
                    <div className="pt-2 flex flex-wrap gap-3">
                      <a
                        href={submissionResult.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="island-btn-primary rounded-xl text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>VER NO SOLANA EXPLORER</span>
                      </a>
                      <button onClick={onGoToAuditoria} className="island-btn rounded-xl text-xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>AUDITAR VOTOS</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3 text-xs font-mono">
                      <p className="text-zinc-400">
                        O BU foi gravado em modo seguro local porque a carteira não possuía taxa de rede na Devnet pública.
                      </p>

                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-zinc-400">CARTEIRA DA ELEIÇÃO:</span>
                          <code className="text-emerald-400 px-2 py-0.5 rounded bg-black/40 border border-zinc-800">
                            {submissionResult.organizerPubkey}
                          </code>
                          <button
                            onClick={handleCopyKey}
                            className="island-btn rounded-lg text-xs py-1 px-2"
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
                          className="island-btn-primary rounded-xl text-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSubmitting ? 'TRANSMITINDO...' : 'TRANSMITIR NOVAMENTE'}</span>
                        </button>
                        <button onClick={onGoToAuditoria} className="island-btn rounded-xl text-xs">
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
            <div className="p-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      BOLETIM ASSINADO OFFLINE PELA URNA (ED25519)
                    </h4>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                      Pronto para transmissão. Qualquer dispositivo com acesso à internet pode enviar para a Solana.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleTransmitToSolana}
                    disabled={isSubmitting || !buPayload}
                    className="island-btn-primary rounded-xl text-xs w-full sm:w-auto"
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
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-zinc-400">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">Payer Solana:</span>
                    <span className="text-emerald-400 px-2 py-0.5 rounded bg-black/40 border border-zinc-800 text-[11px] max-w-[240px] sm:max-w-xs truncate">
                      {organizerPubkey}
                    </span>
                    <button onClick={handleCopyKey} className="island-btn rounded-lg text-xs py-0.5 px-2">
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey ? 'COPIADO' : 'COPIAR'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-zinc-400 text-[11px]">
                    <span>SALDO DEVNET:</span>
                    <span className={`font-bold ${organizerBalance && organizerBalance > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {loadingBalance ? 'CONSULTANDO...' : organizerBalance !== null ? `${organizerBalance.toFixed(4)} SOL` : '0.0000 SOL'}
                    </span>
                    <button
                      onClick={refreshBalance}
                      disabled={loadingBalance}
                      className="text-zinc-500 hover:text-zinc-300 underline text-[11px]"
                    >
                      (atualizar)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={handleRequestAirdrop}
                    disabled={isAirdropping}
                    className="island-btn rounded-xl text-xs flex-1 md:flex-initial"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>{isAirdropping ? 'SOLICITANDO...' : 'AIRDROP RÁPIDO'}</span>
                  </button>
                  <a
                    href="https://faucet.solana.com"
                    target="_blank"
                    rel="noreferrer"
                    className="island-btn rounded-xl text-xs flex-1 md:flex-initial"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>FAUCET</span>
                  </a>
                </div>
              </div>

              {airdropMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300">
                  {airdropMsg}
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs font-mono text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Grid: Fita Térmica + QR Code em Ilhas Flutuantes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* FITA TÉRMICA OFICIAL DO BOLETIM DE URNA */}
            <div className="lg:col-span-7 rounded-2xl bg-zinc-950/85 border border-zinc-800/80 p-6 sm:p-8 font-mono text-xs leading-relaxed shadow-xl">

              <div className="text-center pb-4 mb-4 border-b border-dashed border-zinc-800">
                <div className="font-bold tracking-widest text-zinc-300 text-sm">
                  REPÚBLICA FEDERATIVA DO BRASIL
                </div>
                <div className="font-semibold text-zinc-400 mt-0.5">
                  JUSTIÇA ELEITORAL DIGITAL • URNASOL
                </div>
                <div className="mt-2 font-bold text-white uppercase">
                  {election.institutionName}
                </div>
                <div className="text-[11px] text-zinc-500">{election.title}</div>
                {isClosed && (
                  <div className="mt-2 font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                    [ ELEIÇÃO ENCERRADA E HOMOLOGADA ]
                  </div>
                )}
              </div>

              <div className="pb-3 mb-3 space-y-1.5 border-b border-zinc-800 text-[11px]">
                {[
                  { label: 'IDENTIFICAÇÃO DA URNA:', value: selectedUrna.id, bold: true },
                  { label: 'LOCAL DE VOTAÇÃO:', value: selectedUrna.location },
                  { label: 'DATA DA APURAÇÃO:', value: new Date(buPayload?.timestamp || Date.now()).toLocaleDateString('pt-BR') },
                  { label: 'HORA DO FECHAMENTO:', value: new Date(buPayload?.timestamp || Date.now()).toLocaleTimeString('pt-BR') },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-zinc-500">{row.label}</span>
                    <span className={row.bold ? 'font-bold text-white' : 'text-zinc-300'}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="pb-3 mb-3 space-y-1.5 border-b border-zinc-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">ZERÉSIMA INICIAL:</span>
                  <span className="font-bold text-emerald-400">AUDITADA (0 VOTOS)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ELEITORES APTOS CADASTRADOS:</span>
                  <span className="font-bold text-white">{election.registeredVoters}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">COMPARECIMENTO NESTA URNA:</span>
                  <span className="font-bold text-white">{buPayload?.totalVotes || 0}</span>
                </div>
              </div>

              {/* Apuração dos Votos por Cargo */}
              <div className="pb-4 mb-4 border-b border-dashed border-zinc-800">
                <div className="font-bold text-center uppercase tracking-wider text-xs mb-3 text-emerald-400">
                  APURAÇÃO DO CARGO: {election.roleTitle}
                </div>

                <div className="space-y-2">
                  {buPayload?.candidateTallies.map((c) => (
                    <div
                      key={c.candidateNumber}
                      className="flex justify-between items-center py-1 border-b border-zinc-900"
                    >
                      <div>
                        <span className="font-bold text-white mr-2">Nº {c.candidateNumber}</span>
                        <span className="text-zinc-400">{c.candidateName}</span>
                      </div>
                      <span className="font-bold text-sm text-emerald-400">{c.votes}</span>
                    </div>
                  ))}

                  <div className="flex justify-between py-1 border-b border-zinc-900">
                    <span className="text-zinc-400">VOTOS EM BRANCO</span>
                    <span className="font-bold text-white">{buPayload?.blankVotes || 0}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-zinc-900">
                    <span className="text-zinc-400">VOTOS NULOS</span>
                    <span className="font-bold text-white">{buPayload?.nullVotes || 0}</span>
                  </div>

                  <div className="flex justify-between pt-2 text-sm font-bold text-white">
                    <span>TOTAL DE VOTOS:</span>
                    <span className="text-emerald-400">{buPayload?.totalVotes || 0}</span>
                  </div>
                </div>
              </div>

              {/* Auditoria Criptográfica */}
              <div className="space-y-2 text-[10px] text-zinc-400 break-all">
                <div className="font-bold text-center uppercase tracking-widest text-zinc-300 mb-2">
                  GARANTIA DE INTEGRIDADE CRIPTOGRÁFICA
                </div>

                <div>
                  <span className="font-bold text-white block">RAIZ DE MERKLE DOS RECIBOS (32 BYTES):</span>
                  <span className="block mt-1 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400 text-[10px]">
                    {buPayload?.merkleRoot || '...'}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-white block">ASSINATURA ED25519 DA URNA:</span>
                  <span className="block mt-1 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px]">
                    {buPayload?.ed25519Signature.slice(0, 56)}...
                  </span>
                </div>

                <div>
                  <span className="font-bold text-white block">CHAVE PÚBLICA DA URNA (SOLANA PUBKEY):</span>
                  <span className="block mt-1 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px]">
                    {selectedUrna.publicKey}
                  </span>
                </div>
              </div>

              <div className="text-center pt-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                FIM DO BOLETIM DE URNA • URNASOL
              </div>
            </div>

            {/* PAINEL DO QR CODE EM ILHA */}
            <div className="lg:col-span-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 p-6 space-y-5 shadow-xl">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-white tracking-tight">
                  QR CODE DO BOLETIM DE URNA
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  Escaneie com qualquer leitor para validar e transmitir o BU para a Solana.
                </p>
              </div>

              <div className="max-w-[260px] mx-auto p-4 rounded-2xl bg-white shadow-xl">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code do Boletim de Urna"
                    className="w-full h-auto rounded-lg"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-xs font-mono text-zinc-600">
                    GERANDO QR CODE...
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs font-mono text-zinc-400">
                <div className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>COMO FUNCIONA O AIR-GAP:</span>
                </div>
                <p>1. A Urna nunca se conecta à internet durante a votação.</p>
                <p>2. O QR Code contém a apuração oficial, a raiz da Árvore de Merkle e a assinatura Ed25519.</p>
                <p>3. Qualquer cidadão com conexão pode transmitir os dados para a Solana sem poder alterá-los.</p>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
};
