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
  RefreshCw
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
}

export const BoletimUrnaView: React.FC<BoletimUrnaViewProps> = ({
  election,
  selectedUrna,
  onUrnaSubmitted,
  onGoToAuditoria,
}) => {
  const [buPayload, setBuPayload] = useState<BoletimDeUrnaPayload | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<OnChainSubmissionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Carrega ou gera o BU da urna selecionada
  useEffect(() => {
    loadOrGenerateBU();
  }, [selectedUrna.id]);

  const loadOrGenerateBU = async () => {
    // Verifica se já tem BU salvo
    let bu = offlineUrnaService.getSavedBU(selectedUrna.id);
    if (!bu) {
      // Gera fechamento da urna com os votos atuais
      bu = await offlineUrnaService.closeUrnaAndGenerateBU(election, selectedUrna);
    }
    setBuPayload(bu);

    // Gera QR Code do BU compacto para transmissão offline -> online
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

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      
      {/* Título & Ações Principais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
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

        <div className="flex gap-2">
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
        <div className="glass-panel p-5 mb-6 border-emerald-500/50 bg-emerald-950/20 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-base font-bold text-white font-display">
                Boletim de Urna Registrado On-Chain na Solana com Sucesso!
              </h3>
              <p className="text-xs text-slate-300">
                A Raiz de Merkle e a apuração foram gravadas de forma imutável no contrato inteligente da Solana.
              </p>
              
              <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Slot Solana: </span>
                  <span className="text-emerald-400 font-bold">#{submissionResult.slot}</span>
                </div>
                <div>
                  <span className="text-slate-400">Assinatura TX: </span>
                  <span className="text-white">{submissionResult.txSignature.slice(0, 16)}...</span>
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <a
                  href={submissionResult.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver no Solana Explorer</span>
                </a>
                <button
                  onClick={onGoToAuditoria}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auditar Votos e Comprovantes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-5 mb-6 border-purple-500/30 bg-purple-950/10">
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
                  <span>Transmitir para a Solana Devnet</span>
                </>
              )}
            </button>
          </div>
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
        
        {/* FITA TÉRMICA OFICIAL DO BOLETIM DE URNA (Estilo Papel TSE) */}
        <div className="lg:col-span-7 thermal-receipt p-6 sm:p-8 text-xs leading-relaxed">
          
          {/* Cabeçalho Oficial */}
          <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
            <div className="font-bold tracking-wider text-sm">REPÚBLICA FEDERATIVA DO BRASIL</div>
            <div className="font-bold">JUSTIÇA ELEITORAL DIGITAL • URNASOL</div>
            <div className="mt-2 text-[11px] font-bold uppercase">{election.institutionName}</div>
            <div className="text-[10px] text-gray-700">{election.title}</div>
          </div>

          {/* Dados da Urna e Seção */}
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

          {/* Dados da Zerésima */}
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

          {/* Auditoria Criptográfica On-Chain */}
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

          {/* Rodapé da Fita */}
          <div className="text-center pt-6 text-[10px] font-bold text-gray-500 font-mono uppercase">
            FIM DO BOLETIM DE URNA • URNASOL
          </div>
        </div>

        {/* PAINEL DO QR CODE PARA TRANSMISSÃO OFFLINE */}
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

          {/* QR Code Imagem */}
          <div className="bg-white p-4 rounded-2xl max-w-[300px] mx-auto shadow-xl">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="QR Code do Boletim de Urna"
                className="w-full h-auto rounded"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-slate-400 font-mono text-xs">
                Gerando QR Code...
              </div>
            )}
          </div>

          {/* Explicação da Arquitetura Air-Gap */}
          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 text-xs text-slate-300 space-y-2">
            <div className="font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Como funciona o Air-Gap:</span>
            </div>
            <p className="text-slate-400">
              1. A Urna nunca se conecta à internet durante o pleito.
            </p>
            <p className="text-slate-400">
              2. O QR Code contém todos os votos agregados, a raiz da Árvore de Merkle e a assinatura digital Ed25519.
            </p>
            <p className="text-slate-400">
              3. Qualquer cidadão ou fiscal com internet pode transmitir os dados para a Solana sem poder adulterar nenhum voto.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
