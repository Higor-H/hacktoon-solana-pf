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
  Ban
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

  const isClosed = election.status === 'closed';

  // Carrega ou gera o BU da urna selecionada
  useEffect(() => {
    loadOrGenerateBU();
  }, [selectedUrna.id]);

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
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      
      {/* Título & Ações Principais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Fechamento da Seção Eleitoral</span>
          </div>
          <h1 className="text-2xl font-black text-white font-display">
            Boletim de Urna (BU) Digital & Assinado
          </h1>
          <p className="text-sm text-slate-400">
            Relatório oficial emitido após o término da votação, assinado com Ed25519 e exportável para a Solana.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isClosed && onUpdateElection && (
            <button
              onClick={handleCloseElection}
              className="btn-primary text-xs bg-red-600 hover:bg-red-500 text-white"
            >
              <Ban className="w-4 h-4" />
              <span>Encerrar Votação Oficial</span>
            </button>
          )}

          <button
            onClick={loadOrGenerateBU}
            className="btn-secondary text-xs"
            title="Recalcular apuração com novos votos"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recalcular BU</span>
          </button>
          <button
            onClick={() => window.print()}
            className="btn-secondary text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir BU</span>
          </button>
        </div>
      </div>

      {/* Banner de Status de Transmissão para a Solana */}
      {submissionResult ? (
        <div className="glass-panel p-5 border-emerald-500/50 bg-emerald-950/20 animate-fade-in space-y-3">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-display">
                  Boletim de Urna Registrado com Sucesso!
                </h3>
                {submissionResult.isLiveOnChain ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                    Ao Vivo na Solana Devnet
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                    Criptografia Air-Gap Local
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                A Raiz de Merkle e a apuração da seção foram validadas criptograficamente contra a chave Ed25519 da Urna.
              </p>
              
              <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Slot Solana: </span>
                  <span className="text-emerald-400 font-bold">#{submissionResult.slot}</span>
                </div>
                <div>
                  <span className="text-slate-400">Identificador da TX: </span>
                  <span className="text-white">{submissionResult.txSignature.slice(0, 20)}...</span>
                </div>
              </div>

              {submissionResult.isLiveOnChain ? (
                <div className="pt-3 flex gap-3">
                  <a
                    href={submissionResult.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver no Solana Explorer Oficial</span>
                  </a>
                  <button
                    onClick={onGoToAuditoria}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Auditar Votos e Comprovantes</span>
                  </button>
                </div>
              ) : (
                <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-white/10 text-xs space-y-2">
                  <p className="text-slate-300">
                    ℹ️ <strong>Nota sobre o Solana Explorer:</strong> Para gerar uma transação indexada publicamente no Solana Explorer da Devnet pública, a carteira da eleição precisa de 0.01 SOL para a taxa de rede (o faucet público RPC da Solana frequentemente retorna rate limit 429).
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
                    <span className="text-slate-400">Carteira da Eleição:</span>
                    <code className="text-emerald-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                      {submissionResult.organizerPubkey}
                    </code>
                    <button
                      onClick={handleCopyKey}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors inline-flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                    <a
                      href="https://faucet.solana.com"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 inline-flex items-center gap-1"
                    >
                      <Coins className="w-3 h-3" />
                      <span>Abrir Faucet Oficial</span>
                    </a>
                  </div>
                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={onGoToAuditoria}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Ir para o Portal de Auditoria & Resultados</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-5 border-purple-500/30 bg-purple-950/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Boletim Assinado Offline pela Urna (Chave Ed25519)
                </h4>
                <p className="text-xs text-slate-400">
                  Pronto para transmissão. Qualquer celular com conexão pode enviar para a Solana.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={handleRequestAirdrop}
                disabled={isAirdropping}
                className="btn-secondary text-xs justify-center"
                title="Solicitar fundos de teste na Devnet"
              >
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAirdropping ? 'Solicitando...' : 'Airdrop Faucet'}</span>
              </button>

              <button
                onClick={handleTransmitToSolana}
                disabled={isSubmitting || !buPayload}
                className="btn-primary w-full sm:w-auto justify-center"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Registrando na Solana...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Transmitir para a Solana</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {airdropMsg && (
            <div className="mt-3 text-xs text-cyan-300 font-mono bg-cyan-950/40 p-2 rounded-lg border border-cyan-500/30">
              {airdropMsg}
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 text-xs text-orange-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Grid Principal: Fita Térmica do BU vs QR Code de Transmissão */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* FITA TÉRMICA OFICIAL DO BOLETIM DE URNA */}
        <div className="lg:col-span-7 thermal-receipt p-6 sm:p-8 text-xs leading-relaxed">
          
          <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
            <div className="font-bold tracking-wider text-sm">REPÚBLICA FEDERATIVA DO BRASIL</div>
            <div className="font-bold">JUSTIÇA ELEITORAL DIGITAL • URNASOL</div>
            <div className="mt-2 text-[11px] font-bold uppercase">{election.institutionName}</div>
            <div className="text-[10px] text-gray-700">{election.title}</div>
            {isClosed && (
              <div className="mt-1 font-bold text-red-700 uppercase tracking-widest text-[11px]">
                [ ELEIÇÃO ENCERRADA E HOMOLOGADA ]
              </div>
            )}
          </div>

          <div className="border-b border-gray-300 pb-3 mb-3 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span>IDENTIFICAÇÃO DA URNA:</span>
              <span className="font-bold">{selectedUrna.id}</span>
            </div>
            <div className="flex justify-between">
              <span>LOCAL DE VOTAÇÃO:</span>
              <span>{selectedUrna.location}</span>
            </div>
            <div className="flex justify-between">
              <span>DATA DA APURAÇÃO:</span>
              <span>{new Date(buPayload?.timestamp || Date.now()).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex justify-between">
              <span>HORA DO FECHAMENTO:</span>
              <span>{new Date(buPayload?.timestamp || Date.now()).toLocaleTimeString('pt-BR')}</span>
            </div>
          </div>

          <div className="border-b border-gray-300 pb-3 mb-3 font-mono text-[11px] space-y-1">
            <div className="flex justify-between text-gray-700">
              <span>ZERÉSIMA INICIAL:</span>
              <span className="font-bold text-green-700">AUDITADA (0 VOTOS)</span>
            </div>
            <div className="flex justify-between">
              <span>ELEITORES APTOS CADASTRADOS:</span>
              <span className="font-bold">{election.registeredVoters}</span>
            </div>
            <div className="flex justify-between">
              <span>COMPARECIMENTO NESTA URNA:</span>
              <span className="font-bold">{buPayload?.totalVotes || 0}</span>
            </div>
          </div>

          {/* Apuração dos Votos por Cargo */}
          <div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4">
            <div className="font-bold text-center uppercase tracking-widest text-[11px] mb-3">
              APURAÇÃO DO CARGO: {election.roleTitle}
            </div>

            <div className="space-y-2 font-mono">
              {buPayload?.candidateTallies.map((c) => (
                <div key={c.candidateNumber} className="flex justify-between items-center py-0.5 border-b border-gray-200">
                  <div>
                    <span className="font-bold text-gray-900 mr-2">Nº {c.candidateNumber}</span>
                    <span>{c.candidateName}</span>
                  </div>
                  <span className="font-bold text-sm">{c.votes}</span>
                </div>
              ))}

              <div className="flex justify-between py-0.5 border-b border-gray-200 text-gray-700">
                <span>VOTOS EM BRANCO</span>
                <span className="font-bold">{buPayload?.blankVotes || 0}</span>
              </div>

              <div className="flex justify-between py-0.5 border-b border-gray-200 text-gray-700">
                <span>VOTOS NULOS</span>
                <span className="font-bold">{buPayload?.nullVotes || 0}</span>
              </div>

              <div className="flex justify-between pt-2 text-sm font-black text-black">
                <span>TOTAL DE VOTOS COMPUTADOS:</span>
                <span>{buPayload?.totalVotes || 0}</span>
              </div>
            </div>
          </div>

          {/* Auditoria Criptográfica */}
          <div className="font-mono text-[10px] space-y-2 text-gray-800 break-all">
            <div className="font-bold text-center uppercase text-[10px] tracking-wider mb-2">
              GARANTIA DE INTEGRIDADE CRIPTOGRÁFICA
            </div>

            <div>
              <span className="font-bold block">RAIZ DE MERKLE DOS RECIBOS (32 BYTES):</span>
              <span className="bg-gray-200 px-1 py-0.5 rounded font-mono text-[9px] block mt-0.5">
                {buPayload?.merkleRoot || '...'}
              </span>
            </div>

            <div>
              <span className="font-bold block">ASSINATURA ED25519 DA URNA:</span>
              <span className="bg-gray-200 px-1 py-0.5 rounded font-mono text-[9px] block mt-0.5">
                {buPayload?.ed25519Signature.slice(0, 48)}...
              </span>
            </div>

            <div>
              <span className="font-bold block">CHAVE PÚBLICA DA URNA (SOLANA PUBKEY):</span>
              <span className="bg-gray-200 px-1 py-0.5 rounded font-mono text-[9px] block mt-0.5">
                {selectedUrna.publicKey}
              </span>
            </div>
          </div>

          <div className="text-center pt-6 text-[10px] font-bold text-gray-500 font-mono uppercase">
            FIM DO BOLETIM DE URNA • URNASOL
          </div>
        </div>

        {/* PAINEL DO QR CODE PARA TRANSMISSÃO */}
        <div className="lg:col-span-5 glass-panel p-6 space-y-5">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-2">
              <QrCode className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white font-display">
              QR Code do Boletim de Urna
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Escaneie este QR Code com qualquer smartphone para transmitir a apuração oficial para a Solana.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl max-w-[280px] mx-auto shadow-xl">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="QR Code do Boletim de Urna"
                className="w-full h-auto rounded"
              />
            ) : (
              <div className="w-60 h-60 flex items-center justify-center text-slate-400 font-mono text-xs">
                Gerando QR Code...
              </div>
            )}
          </div>

          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 text-xs text-slate-300 space-y-2">
            <div className="font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Como funciona o Air-Gap:</span>
            </div>
            <p className="text-slate-400">
              1. A Urna nunca se conecta à internet durante a votação.
            </p>
            <p className="text-slate-400">
              2. O QR Code contém a contagem agregada, a raiz da Árvore de Merkle e a assinatura digital Ed25519.
            </p>
            <p className="text-slate-400">
              3. Qualquer cidadão com internet pode transmitir os dados para a Solana sem conseguir alterar nenhum voto.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
