import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Sparkles,
  Lock,
  AlertTriangle,
  KeyRound,
  UserCheck,
  Ban
} from 'lucide-react';
import QRCodeSVG from 'qrcode';
import type { Election, UrnaDevice, VoterPin } from '../lib/types';
import { offlineUrnaService } from '../lib/offlineUrna';
import { urnaAudio } from '../lib/audio';

interface UrnaTerminalProps {
  election: Election;
  selectedUrna: UrnaDevice;
  onUpdateElection: (updated: Election) => void;
  onVoteSuccess?: (receiptCode: string, receiptHash: string) => void;
  audioMuted: boolean;
  onGoToAuditoria: (receiptCode: string) => void;
}

export const UrnaTerminal: React.FC<UrnaTerminalProps> = ({
  election,
  selectedUrna,
  onUpdateElection,
  onVoteSuccess,
  audioMuted,
  onGoToAuditoria,
}) => {
  // Estados da Urna:
  // 'locked' = aguardando o eleitor digitar o PIN de 6 dígitos gerado pelo mesário
  // 'voting' = cabine liberada para o eleitor digitar o candidato
  // 'fim'    = voto computado, exibindo tela de FIM e comprovante
  const [screenState, setScreenState] = useState<'locked' | 'voting' | 'fim'>('locked');
  
  // PIN de autenticação do eleitor (6 dígitos)
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [authorizedVoter, setAuthorizedVoter] = useState<VoterPin | null>(null);

  // Dígitos do candidato (2 dígitos)
  const [digits, setDigits] = useState<string[]>([]);
  const [isBranco, setIsBranco] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    code: string;
    hash: string;
    qrUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const PIN_LENGTH = 6;
  const DIGITS_COUNT = 2;

  // Candidato correspondente
  const typedNumber = digits.length === DIGITS_COUNT ? parseInt(digits.join(''), 10) : null;
  const matchedCandidate = typedNumber !== null ? election.candidates.find((c) => c.number === typedNumber) : null;
  const isNulo = digits.length === DIGITS_COUNT && !matchedCandidate && !isBranco;

  // Efeitos sonoros
  const playBeep = useCallback(() => {
    if (!audioMuted) urnaAudio.playKeypress();
  }, [audioMuted]);

  const playAlertSound = useCallback(() => {
    if (!audioMuted) urnaAudio.playAlert();
  }, [audioMuted]);

  const playConfirmSound = useCallback(() => {
    if (!audioMuted) urnaAudio.playConfirm();
  }, [audioMuted]);

  // Se a eleição foi encerrada, bloqueia a cabine
  const isElectionClosed = election.status === 'closed';

  // Digitação de números (serve tanto para o PIN quanto para o número do candidato)
  const handleDigit = useCallback((d: number) => {
    if (isElectionClosed) return;

    // Fase 1: Digitação do PIN (6 dígitos)
    if (screenState === 'locked') {
      if (pinDigits.length < PIN_LENGTH) {
        playBeep();
        setPinError(null);
        setPinDigits((prev) => [...prev, d.toString()]);
      }
      return;
    }

    // Fase 2: Digitação do Candidato (2 dígitos)
    if (screenState === 'voting') {
      if (isBranco) return;
      if (digits.length < DIGITS_COUNT) {
        playBeep();
        setDigits((prev) => [...prev, d.toString()]);
      }
    }
  }, [isElectionClosed, screenState, pinDigits.length, isBranco, digits.length, playBeep]);

  // Tecla CORRIGE
  const handleCorrige = useCallback(() => {
    if (isElectionClosed) return;
    playBeep();

    if (screenState === 'locked') {
      setPinDigits([]);
      setPinError(null);
      return;
    }

    if (screenState === 'voting') {
      setDigits([]);
      setIsBranco(false);
    }
  }, [isElectionClosed, playBeep, screenState]);

  // Tecla BRANCO
  const handleBranco = useCallback(() => {
    if (isElectionClosed || screenState !== 'voting') return;
    playBeep();
    setDigits([]);
    setIsBranco(true);
  }, [isElectionClosed, screenState, playBeep]);

  // Validação do PIN do eleitor
  const handleAuthorizeWithPin = useCallback((pinToValidate: string) => {
    const voter = election.voterPins.find((v) => v.pin === pinToValidate);

    if (!voter) {
      playAlertSound();
      setPinError('PIN NÃO ENCONTRADO. Solicite ao mesário a liberação da sua seção.');
      setPinDigits([]);
      return;
    }

    if (voter.isUsed) {
      playAlertSound();
      setPinError('ESTE PIN JÁ FOI UTILIZADO. Cada eleitor só pode votar uma única vez.');
      setPinDigits([]);
      return;
    }

    // Sucesso na autorização: libera a cabine para o eleitor votar
    playConfirmSound();
    setAuthorizedVoter(voter);
    setScreenState('voting');
    setPinError(null);
  }, [election.voterPins, playAlertSound, playConfirmSound]);

  // Tecla CONFIRMA
  const handleConfirma = useCallback(async () => {
    if (isElectionClosed) return;

    // Se estiver na tela de PIN bloqueada
    if (screenState === 'locked') {
      if (pinDigits.length === PIN_LENGTH) {
        handleAuthorizeWithPin(pinDigits.join(''));
      } else {
        playAlertSound();
        setPinError(`DIGITE OS ${PIN_LENGTH} NÚMEROS DO SEU PIN PARA LIBERAR A CABINE.`);
      }
      return;
    }

    // Se estiver na tela de votação do candidato
    if (screenState === 'voting') {
      let candidateChoice: number | 'BRANCO' | 'NULO';

      if (isBranco) {
        candidateChoice = 'BRANCO';
      } else if (digits.length === DIGITS_COUNT) {
        candidateChoice = matchedCandidate ? matchedCandidate.number : 'NULO';
      } else {
        playAlertSound();
        return;
      }

      // Toca o som oficial da Urna
      playConfirmSound();
      setScreenState('fim');

      try {
        // 1. Grava voto no RDV offline da Urna
        const { receiptCode, receiptHash } = await offlineUrnaService.castVote(
          election,
          selectedUrna,
          candidateChoice
        );

        // 2. CRÍTICO: Marca o PIN do eleitor como USADO (impede duplicidade permanentemente)
        if (authorizedVoter) {
          const updatedVoterPins = election.voterPins.map((v) =>
            v.pin === authorizedVoter.pin
              ? { ...v, isUsed: true, usedAt: Date.now() }
              : v
          );

          onUpdateElection({
            ...election,
            totalVotesCast: election.totalVotesCast + 1,
            voterPins: updatedVoterPins,
          });
        }

        // 3. Gera QR Code do comprovante individual
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
    }
  }, [
    isElectionClosed,
    screenState,
    pinDigits,
    handleAuthorizeWithPin,
    playAlertSound,
    isBranco,
    digits.length,
    matchedCandidate,
    playConfirmSound,
    election,
    selectedUrna,
    authorizedVoter,
    onUpdateElection,
    onVoteSuccess,
  ]);

  // Suporte a teclado do computador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isElectionClosed || screenState === 'fim') return;

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
  }, [handleDigit, handleConfirma, handleCorrige, isElectionClosed, screenState]);

  // Próximo Eleitor (bloqueia a cabine e aguarda novo PIN)
  const handleNextVoter = () => {
    setDigits([]);
    setIsBranco(false);
    setReceiptData(null);
    setPinDigits([]);
    setAuthorizedVoter(null);
    setPinError(null);
    setScreenState('locked');
  };

  const handleCopyCode = () => {
    if (receiptData?.code) {
      navigator.clipboard.writeText(receiptData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const pendingVoters = election.voterPins.filter((v) => !v.isUsed);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      
      {/* Barra de Status do Terminal em Ilha */}
      <div className="mb-4 p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                {selectedUrna.name}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-semibold">
                {selectedUrna.id}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              {selectedUrna.location} • Ed25519: <span className="text-zinc-300">{selectedUrna.publicKey.slice(0, 10)}...</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isElectionClosed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-red-500/10 border border-red-500/30 text-red-400">
              <Ban className="w-3.5 h-3.5" />
              ELEIÇÃO ENCERRADA
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Lock className="w-3.5 h-3.5" />
              ANTI-DUPLICIDADE ATIVO
            </span>
          )}
        </div>
      </div>

      {/* SELETOR DE ELEITOR PARA TESTE RÁPIDO (MODO DEMO DO HACKATHON) */}
      {!isElectionClosed && screenState === 'locked' && (
        <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-mono">
              <strong className="text-emerald-400">ATALHO DO MESÁRIO:</strong> Selecione um eleitor apto para liberar a cabine:
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pendingVoters.slice(0, 4).map((v) => (
              <button
                key={v.pin}
                onClick={() => handleAuthorizeWithPin(v.pin)}
                className="px-2.5 py-1 rounded-full bg-zinc-900/80 border border-zinc-700 hover:border-emerald-400 hover:bg-emerald-500/10 text-zinc-300 hover:text-emerald-300 font-mono text-xs transition-all shadow-sm"
                title={`Liberar para ${v.voterIdentifier} (PIN: ${v.pin})`}
              >
                {v.voterIdentifier}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gabinete Físico da Urna Eletrônica (Hardware Chassis Island) */}
      <div className="urna-chassis grid grid-cols-1 lg:grid-cols-12 gap-6 items-start shadow-2xl">

        {/* TELA DA URNA (À Esquerda) */}
        <div className="lg:col-span-7 urna-screen min-h-[460px] flex flex-col justify-between p-6 sm:p-8 relative">

          {/* CASO 1: ELEIÇÃO ENCERRADA */}
          {isElectionClosed ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/20">
                <Ban className="w-8 h-8" />
              </div>
              <div className="font-bold text-2xl text-white tracking-tight">
                VOTAÇÃO ENCERRADA
              </div>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                A seção eleitoral foi finalizada. O Boletim de Urna (BU) com a apuração está disponível para auditoria pública.
              </p>
              <button
                onClick={() => onGoToAuditoria('')}
                className="island-btn-primary rounded-xl text-xs mt-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>VER APURAÇÃO</span>
              </button>
            </div>
          ) : screenState === 'locked' ? (
            /* CASO 2: CABINE BLOQUEADA - AGUARDANDO PIN DO ELEITOR */
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-6 border-b border-zinc-800">
                  <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                    JUSTIÇA ELEITORAL • {election.institutionName.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">SEÇÃO 01</span>
                </div>

                <div className="text-center py-4 space-y-4">
                  <div className="inline-flex p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/20">
                    <Lock className="w-7 h-7" />
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg text-white tracking-tight">
                      CABINE AGUARDANDO ELEITOR
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                      Digite seu <strong className="text-white">PIN de 6 dígitos</strong> emitido pelo mesário no teclado ao lado:
                    </p>
                  </div>

                  {/* Caixas dos 6 dígitos do PIN com cantos arredondados */}
                  <div className="flex justify-center gap-2 pt-2">
                    {[...Array(PIN_LENGTH)].map((_, idx) => {
                      const isFilled = pinDigits[idx] !== undefined;
                      const isCurrent = idx === pinDigits.length;
                      return (
                        <div
                          key={idx}
                          className={`w-10 sm:w-12 h-14 sm:h-16 rounded-xl border-2 flex items-center justify-center font-mono text-xl sm:text-2xl font-bold transition-all shadow-inner ${
                            isFilled
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-emerald-500/20'
                              : isCurrent
                              ? 'border-emerald-400/60 bg-zinc-900/90 text-white animate-pulse'
                              : 'border-zinc-800 bg-zinc-900/60 text-zinc-600'
                          }`}
                        >
                          {isFilled ? '●' : isCurrent ? '_' : ''}
                        </div>
                      );
                    })}
                  </div>

                  {/* Mensagem de Erro / Alerta de Duplicidade */}
                  {pinError && (
                    <div className="mt-4 p-3.5 rounded-xl text-left flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 animate-fade-in shadow-sm">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300 font-mono leading-relaxed">
                        {pinError}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 text-center border-t border-zinc-800 text-xs text-zinc-400 font-mono">
                Digite os 6 números e tecle{' '}
                <span className="text-emerald-400 font-bold">CONFIRMA</span>{' '}
                ou{' '}
                <span className="text-orange-400 font-bold">CORRIGE</span>{' '}
                para reiniciar.
              </div>
            </div>
          ) : screenState === 'voting' ? (
            /* CASO 3: CABINE LIBERADA - ELEITOR VOTANDO */
            <>
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
                  <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                    JUSTIÇA ELEITORAL • {election.institutionName.toUpperCase()}
                  </span>
                  {authorizedVoter && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                      <UserCheck className="w-3 h-3" />
                      <span>{authorizedVoter.voterIdentifier}</span>
                    </span>
                  )}
                </div>

                <div className="text-xs uppercase tracking-wider font-mono text-zinc-400 mb-1">
                  SEU VOTO PARA
                </div>
                <div className="font-extrabold text-xl text-white tracking-tight mb-6">
                  {election.roleTitle}
                </div>

                {/* Campos de Dígitos ou Mensagem de Branco */}
                {isBranco ? (
                  <div className="my-6 py-6 px-4 text-center rounded-2xl border-2 border-white/20 bg-white/5 shadow-lg">
                    <span className="font-mono font-black text-2xl tracking-widest text-white">
                      VOTO EM BRANCO
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-xs uppercase font-mono text-zinc-400">
                      NÚMERO:
                    </span>
                    <div className="flex gap-2.5">
                      {[...Array(DIGITS_COUNT)].map((_, idx) => {
                        const isFilled = digits[idx] !== undefined;
                        const isCurrent = idx === digits.length;
                        return (
                          <div
                            key={idx}
                            className={`w-12 sm:w-14 h-16 sm:h-20 rounded-2xl border-2 flex items-center justify-center font-mono text-2xl sm:text-3xl font-bold transition-all shadow-inner ${
                              isFilled
                                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-emerald-500/20'
                                : isCurrent
                                ? 'border-emerald-400/60 bg-zinc-900/90 text-white animate-pulse'
                                : 'border-zinc-800 bg-zinc-900/60 text-zinc-600'
                            }`}
                          >
                            {digits[idx] || (isCurrent ? '_' : '')}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dados do Candidato Encontrado */}
                {matchedCandidate && !isBranco && (
                  <div className="animate-fade-in p-4 rounded-2xl bg-zinc-900/80 border border-zinc-700/80 flex gap-4 items-center shadow-lg">
                    <img
                      src={matchedCandidate.photoUrl}
                      alt={matchedCandidate.name}
                      className="w-16 h-16 rounded-xl object-cover border border-zinc-700 shadow-md"
                    />
                    <div className="font-mono">
                      <div className="text-[10px] uppercase text-emerald-400 font-bold tracking-wider mb-1">
                        CANDIDATO OFICIAL
                      </div>
                      <div className="font-bold text-base text-white">
                        {matchedCandidate.name}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {matchedCandidate.partyOrSlate}
                      </div>
                    </div>
                  </div>
                )}

                {/* Voto Nulo */}
                {isNulo && (
                  <div className="animate-fade-in p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-center shadow-md">
                    <div className="text-xs font-bold text-amber-400 uppercase font-mono mb-1">
                      NÚMERO NÃO LOCALIZADO
                    </div>
                    <div className="font-mono font-black text-xl text-amber-300">
                      VOTO NULO
                    </div>
                  </div>
                )}
              </div>

              {/* Instruções de rodapé da tela */}
              <div className="pt-4 mt-4 border-t border-zinc-800 text-xs font-mono text-zinc-400 space-y-1">
                <div className="text-zinc-500 text-[11px]">APERTE A TECLA:</div>
                <div>
                  <span className="font-bold text-emerald-400">CONFIRMA (VERDE)</span> para computar este voto
                </div>
                <div>
                  <span className="font-bold text-orange-400">CORRIGE (LARANJA)</span> para reiniciar
                </div>
              </div>
            </>
          ) : (
            /* CASO 4: TELA DE "FIM" DA URNA */
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <div className="text-6xl sm:text-7xl font-mono font-black tracking-widest text-emerald-400 mb-2 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                FIM
              </div>
              <div className="text-xs font-mono tracking-widest text-zinc-300 uppercase font-semibold">
                VOTO GRAVADO COM SUCESSO
              </div>
              <p className="text-xs text-zinc-400 mt-2 max-w-xs leading-relaxed">
                Seu voto foi criptografado e anonimizado no Registro Digital do Voto (RDV) desta urna.
              </p>
            </div>
          )}

        </div>

        {/* TECLADO FÍSICO DA URNA (Hardware Keypad Island) */}
        <div className="lg:col-span-5 urna-keypad flex flex-col justify-between space-y-4">

          <div className="text-center py-1 border-b border-zinc-800">
            <span className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase font-mono">
              JUSTIÇA ELEITORAL
            </span>
          </div>

          {/* Grade Numérica 1 a 9 */}
          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleDigit(num)}
                disabled={isElectionClosed || screenState === 'fim'}
                className="urna-key-num h-12 flex items-center justify-center"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Linha do Zero */}
          <div className="grid grid-cols-3 gap-2.5">
            <div />
            <button
              onClick={() => handleDigit(0)}
              disabled={isElectionClosed || screenState === 'fim'}
              className="urna-key-num h-12 flex items-center justify-center"
            >
              0
            </button>
            <div />
          </div>

          {/* Teclas Oficiais: BRANCO, CORRIGE, CONFIRMA */}
          <div className="grid grid-cols-3 gap-2.5 pt-2 items-end">
            <button
              onClick={handleBranco}
              disabled={isElectionClosed || screenState !== 'voting'}
              className="urna-key-branco h-12 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>BRANCO</span>
            </button>

            <button
              onClick={handleCorrige}
              disabled={isElectionClosed || screenState === 'fim'}
              className="urna-key-corrige h-12 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>CORRIGE</span>
            </button>

            <button
              onClick={handleConfirma}
              disabled={isElectionClosed || screenState === 'fim'}
              className="urna-key-confirma h-14 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>CONFIRMA</span>
            </button>
          </div>

          <div className="text-center pt-1 text-[11px] text-zinc-500 font-mono">
            {screenState === 'locked'
              ? 'INSIRA PIN DE 6 DÍGITOS'
              : 'INSIRA NÚMERO DO CANDIDATO (2 DÍGITOS)'}
          </div>
        </div>

      </div>

      {/* MODAL DO COMPROVANTE DE VOTAÇÃO (E2E-V) */}
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/80 animate-fade-in">

            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-zinc-800">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white tracking-tight">
                  COMPROVANTE DE VOTAÇÃO
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Prova Criptográfica de Inclusão Eleitoral
                </p>
              </div>
            </div>

            {/* QR Code e Código de Auditoria */}
            <div className="text-center p-5 mb-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
              <img
                src={receiptData.qrUrl}
                alt="QR Code do Comprovante"
                className="w-40 h-40 rounded-xl mx-auto mb-3 bg-white p-2 shadow-md"
              />

              <div className="text-[11px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">
                SEU CÓDIGO DE AUDITORIA:
              </div>
              <div className="font-mono text-lg font-bold text-emerald-400 flex items-center justify-center gap-2">
                <span>{receiptData.code}</span>
                <button
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Copiar código"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copied && (
                <span className="text-[11px] text-emerald-400 font-mono mt-1 inline-block">
                  ✓ Copiado para a área de transferência!
                </span>
              )}
            </div>

            {/* Garantias de Segurança */}
            <div className="p-3.5 mb-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 space-y-2 text-xs font-mono text-zinc-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Voto Secreto Garantido:</strong>{' '}
                  Este comprovante não revela em quem você votou.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Cédula Registrada:</strong>{' '}
                  Hash <code className="text-emerald-400">{receiptData.hash.slice(0, 10)}...</code> adicionado à Árvore de Merkle.
                </span>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => onGoToAuditoria(receiptData.code)}
                className="island-btn-primary rounded-xl w-full py-3"
              >
                <ExternalLink className="w-4 h-4" />
                <span>AUDITAR NO PORTAL DE TRANSPARÊNCIA</span>
              </button>

              <button
                onClick={handleNextVoter}
                className="island-btn rounded-xl w-full py-2.5"
              >
                <span>BLOQUEAR CABINE — PRÓXIMO ELEITOR</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
