import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Sparkles,
  Lock
} from 'lucide-react';
import QRCodeSVG from 'qrcode';
import type { Election, UrnaDevice } from '../lib/types';
import { offlineUrnaService } from '../lib/offlineUrna';
import { urnaAudio } from '../lib/audio';

interface UrnaTerminalProps {
  election: Election;
  selectedUrna: UrnaDevice;
  onVoteSuccess?: (receiptCode: string, receiptHash: string) => void;
  audioMuted: boolean;
  onGoToAuditoria: (receiptCode: string) => void;
}

export const UrnaTerminal: React.FC<UrnaTerminalProps> = ({
  election,
  selectedUrna,
  onVoteSuccess,
  audioMuted,
  onGoToAuditoria,
}) => {
  // Estado dos dígitos digitados (geralmente 2 dígitos)
  const [digits, setDigits] = useState<string[]>([]);
  const [isBranco, setIsBranco] = useState(false);
  const [screenState, setScreenState] = useState<'voting' | 'fim'>('voting');
  const [receiptData, setReceiptData] = useState<{
    code: string;
    hash: string;
    qrUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Voto requer 2 dígitos para este cargo
  const DIGITS_COUNT = 2;

  // Encontra o candidato correspondente aos dígitos informados
  const typedNumber = digits.length === DIGITS_COUNT ? parseInt(digits.join(''), 10) : null;
  const matchedCandidate = typedNumber !== null ? election.candidates.find((c) => c.number === typedNumber) : null;
  const isNulo = digits.length === DIGITS_COUNT && !matchedCandidate && !isBranco;

  // Efeito sonoro do clique de teclado
  const playBeep = useCallback(() => {
    if (!audioMuted) {
      urnaAudio.playKeypress();
    }
  }, [audioMuted]);

  const playAlertSound = useCallback(() => {
    if (!audioMuted) {
      urnaAudio.playAlert();
    }
  }, [audioMuted]);

  const playConfirmSound = useCallback(() => {
    if (!audioMuted) {
      urnaAudio.playConfirm();
    }
  }, [audioMuted]);

  // Manipulação de dígitos numéricos
  const handleDigit = useCallback((d: number) => {
    if (screenState === 'fim') return;
    if (isBranco) {
      setIsBranco(false);
    }
    if (digits.length < DIGITS_COUNT) {
      playBeep();
      setDigits((prev) => [...prev, d.toString()]);
    } else {
      playAlertSound();
    }
  }, [digits.length, isBranco, screenState, playBeep, playAlertSound]);

  // Tecla BRANCO
  const handleBranco = useCallback(() => {
    if (screenState === 'fim') return;
    if (digits.length === 0) {
      playBeep();
      setIsBranco(true);
    } else {
      playAlertSound();
    }
  }, [digits.length, screenState, playBeep, playAlertSound]);

  // Tecla CORRIGE
  const handleCorrige = useCallback(() => {
    if (screenState === 'fim') return;
    playAlertSound();
    setDigits([]);
    setIsBranco(false);
  }, [screenState, playAlertSound]);

  // Tecla CONFIRMA
  const handleConfirma = useCallback(async () => {
    if (screenState === 'fim') return;

    let candidateChoice: number | 'BRANCO' | 'NULO' | null = null;

    if (isBranco) {
      candidateChoice = 'BRANCO';
    } else if (digits.length === DIGITS_COUNT) {
      candidateChoice = matchedCandidate ? matchedCandidate.number : 'NULO';
    }

    if (candidateChoice === null) {
      playAlertSound();
      return;
    }

    // Toca o famoso som de confirmação da urna
    playConfirmSound();
    setScreenState('fim');

    try {
      // Grava no RDV offline com comprovante criptográfico
      const { receiptCode, receiptHash } = await offlineUrnaService.castVote(
        election,
        selectedUrna,
        candidateChoice
      );

      // Gera QR Code do comprovante
      const qrDataUrl = await QRCodeSVG.toDataURL(
        JSON.stringify({
          tipo: 'COMPROVANTE_URNASOL',
          eleicao: election.id,
          urna: selectedUrna.id,
          recibo: receiptCode,
          hash: receiptHash,
        }),
        { width: 220, margin: 1 }
      );

      setReceiptData({
        code: receiptCode,
        hash: receiptHash,
        qrUrl: qrDataUrl,
      });

      if (onVoteSuccess) {
        onVoteSuccess(receiptCode, receiptHash);
      }
    } catch (err) {
      console.error('Erro ao gravar voto offline:', err);
    }
  }, [
    screenState,
    isBranco,
    digits.length,
    matchedCandidate,
    election,
    selectedUrna,
    playConfirmSound,
    playAlertSound,
    onVoteSuccess,
  ]);

  // Suporte a teclado físico do computador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screenState === 'fim') return;

      if (e.key >= '0' && e.key <= '9') {
        handleDigit(parseInt(e.key, 10));
      } else if (e.key === 'Enter') {
        handleConfirma();
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        handleCorrige();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleConfirma, handleCorrige, screenState]);

  // Próximo Eleitor (reinicia a cabine)
  const handleNextVoter = () => {
    setDigits([]);
    setIsBranco(false);
    setReceiptData(null);
    setScreenState('voting');
  };

  const handleCopyCode = () => {
    if (receiptData?.code) {
      navigator.clipboard.writeText(receiptData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-4 px-2 sm:px-4">
      
      {/* Informações da Urna e Status de Segurança */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-slate-900/60 p-3 rounded-xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{selectedUrna.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                {selectedUrna.id}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {selectedUrna.location} • Chave Ed25519: <span className="font-mono">{selectedUrna.publicKey.slice(0, 10)}...</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge-offline">
            <Lock className="w-3 h-3" />
            Voto Secreto RDV Ativo
          </span>
          <span className="text-xs text-slate-400 font-mono hidden md:inline">
            Local: 100% Desconectado
          </span>
        </div>
      </div>

      {/* Gabinete Físico da Urna Eletrônica */}
      <div className="urna-chassis grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* TELA DA URNA (À Esquerda) */}
        <div className="lg:col-span-7 urna-screen min-h-[440px] flex flex-col justify-between p-6 relative">
          
          {screenState === 'voting' ? (
            <>
              {/* Cabeçalho da Tela */}
              <div>
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-4">
                  <span className="text-xs tracking-widest uppercase font-mono text-emerald-400 font-bold">
                    JUSTIÇA ELEITORAL • {election.institutionName.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    SEÇÃO 01
                  </span>
                </div>

                <div className="text-xs uppercase font-mono text-slate-400 mb-1">
                  SEU VOTO PARA
                </div>
                <div className="text-2xl font-bold font-display text-white tracking-wide mb-6">
                  {election.roleTitle}
                </div>

                {/* Campos de Dígitos ou Mensagem de Branco */}
                {isBranco ? (
                  <div className="my-8 py-6 text-center border-2 border-dashed border-white/20 rounded-xl bg-white/5">
                    <span className="text-2xl sm:text-3xl font-extrabold font-display tracking-widest text-white animate-pulse">
                      VOTO EM BRANCO
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-xs uppercase font-mono text-slate-400">Número:</span>
                    <div className="flex gap-2">
                      {[...Array(DIGITS_COUNT)].map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-12 h-16 rounded-lg border-2 flex items-center justify-center font-mono text-3xl font-bold transition-all ${
                            digits[idx] !== undefined
                              ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300 shadow-lg shadow-emerald-500/20'
                              : idx === digits.length
                              ? 'border-white/50 bg-white/5 text-white animate-pulse'
                              : 'border-white/15 bg-black/30 text-transparent'
                          }`}
                        >
                          {digits[idx] || (idx === digits.length ? '_' : '')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dados do Candidato Encontrado */}
                {matchedCandidate && !isBranco && (
                  <div className="animate-fade-in bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 flex gap-4 items-center">
                    <img
                      src={matchedCandidate.photoUrl}
                      alt={matchedCandidate.name}
                      className="w-20 h-20 rounded-lg object-cover border-2 border-emerald-400/50 shadow-md"
                    />
                    <div className="space-y-1">
                      <div className="text-xs uppercase font-mono text-emerald-400 font-bold">
                        Candidato Oficial
                      </div>
                      <div className="text-lg font-bold text-white font-display">
                        {matchedCandidate.name}
                      </div>
                      <div className="text-xs text-slate-300">
                        {matchedCandidate.partyOrSlate}
                      </div>
                    </div>
                  </div>
                )}

                {/* Voto Nulo */}
                {isNulo && (
                  <div className="animate-fade-in bg-orange-950/40 border border-orange-500/30 rounded-xl p-4 text-center">
                    <div className="text-sm font-bold text-orange-400 uppercase font-mono">
                      NÚMERO ERRADO
                    </div>
                    <div className="text-xl font-black text-white font-display mt-1">
                      VOTO NULO
                    </div>
                  </div>
                )}
              </div>

              {/* Instruções Oficiais no Rodapé da Tela */}
              <div className="border-t border-emerald-500/20 pt-3 mt-4 text-[11px] font-mono text-slate-300 space-y-1">
                <div>Aperte a tecla:</div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400">VERDE</span> para CONFIRMAR este voto
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-orange-400">LARANJA</span> para REINICIAR este voto
                </div>
              </div>
            </>
          ) : (
            /* TELA DE "FIM" DA URNA */
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <div className="urna-fim-text mb-2">FIM</div>
              <div className="text-sm font-mono text-emerald-400 uppercase tracking-widest">
                VOTO GRAVADO COM SUCESSO
              </div>
              <p className="text-xs text-slate-400 mt-2 max-w-xs">
                Seu voto foi inserido no log criptográfico anonimizado (RDV) desta urna.
              </p>
            </div>
          )}

        </div>

        {/* TECLADO FÍSICO DA URNA (À Direita) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          
          {/* Logo da Justiça Eleitoral / UrnaSol no teclado */}
          <div className="text-center py-1 border-b border-slate-700/50">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase font-display">
              JUSTIÇA ELEITORAL
            </span>
          </div>

          {/* Grade Numérica 1 a 9 */}
          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleDigit(num)}
                disabled={screenState === 'fim'}
                className="urna-key-num"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Linha do Zero centralizado */}
          <div className="grid grid-cols-3 gap-2.5">
            <div />
            <button
              onClick={() => handleDigit(0)}
              disabled={screenState === 'fim'}
              className="urna-key-num"
            >
              0
            </button>
            <div />
          </div>

          {/* Teclas de Comando Oficiais: BRANCO, CORRIGE, CONFIRMA */}
          <div className="grid grid-cols-3 gap-2.5 pt-3 items-end">
            <button
              onClick={handleBranco}
              disabled={screenState === 'fim'}
              className="urna-key-action key-branco h-[52px]"
            >
              <span>BRANCO</span>
            </button>

            <button
              onClick={handleCorrige}
              disabled={screenState === 'fim'}
              className="urna-key-action key-corrige h-[52px]"
            >
              <span>CORRIGE</span>
            </button>

            <button
              onClick={handleConfirma}
              disabled={screenState === 'fim'}
              className="urna-key-action key-confirma"
            >
              <span>CONFIRMA</span>
            </button>
          </div>

          <div className="text-[11px] text-center text-slate-500 font-mono pt-1">
            Dica: você também pode usar o teclado numérico do seu computador (Enter = Confirma, Backspace = Corrige).
          </div>
        </div>

      </div>

      {/* MODAL / RECIBO DE COMPROVAÇÃO DE VOTAÇÃO (E2E-V) */}
      {receiptData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in relative">
            
            <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  Comprovante de Votação
                </h3>
                <p className="text-xs text-slate-400">
                  Prova Criptográfica de Inclusão Eleitoral
                </p>
              </div>
            </div>

            {/* QR Code e Código */}
            <div className="text-center bg-slate-950 p-4 rounded-xl border border-white/10 mb-4">
              <img
                src={receiptData.qrUrl}
                alt="QR Code do Comprovante"
                className="w-44 h-44 mx-auto rounded-lg bg-white p-2 mb-3 shadow-md"
              />

              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-mono">
                Seu Código de Auditoria:
              </div>
              <div className="font-mono text-xl font-extrabold text-emerald-400 tracking-wider flex items-center justify-center gap-2">
                <span>{receiptData.code}</span>
                <button
                  onClick={handleCopyCode}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  title="Copiar código"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copied && <span className="text-[10px] text-emerald-400 font-mono">Copiado para a área de transferência!</span>}
            </div>

            {/* Explicação da Garantia das Premissas */}
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 mb-4 text-xs text-slate-300 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Voto Secreto Garantido:</strong> Este comprovante não revela em quem você votou.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Inclusão no Resultado:</strong> O hash <code className="text-emerald-300">{receiptData.hash.slice(0, 10)}...</code> é uma folha da Árvore de Merkle enviada para a Solana.
                </span>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onGoToAuditoria(receiptData.code)}
                className="btn-primary w-full justify-center"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Auditar no Portal de Transparência</span>
              </button>

              <button
                onClick={handleNextVoter}
                className="btn-secondary w-full justify-center"
              >
                <span>Concluir e Liberar Próximo Votante</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
