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
      setPinError('PIN NÃO LOCALIZADO. Solicite ao mesário a liberação da sua seção.');
      setPinDigits([]);
      return;
    }

    if (voter.isUsed) {
      playAlertSound();
      setPinError('ESTE PIN JÁ FOI UTILIZADO. Cada eleitor só pode votar uma única vez.');
      setPinDigits([]);
      return;
    }

    playConfirmSound();
    setAuthorizedVoter(voter);
    setScreenState('voting');
    setPinError(null);
  }, [election.voterPins, playAlertSound, playConfirmSound]);

  // Tecla CONFIRMA
  const handleConfirma = useCallback(async () => {
    if (isElectionClosed) return;

    if (screenState === 'locked') {
      if (pinDigits.length === PIN_LENGTH) {
        handleAuthorizeWithPin(pinDigits.join(''));
      } else {
        playAlertSound();
        setPinError(`DIGITE OS ${PIN_LENGTH} NÚMEROS DO SEU PIN PARA LIBERAR A CABINE.`);
      }
      return;
    }

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

      playConfirmSound();
      setScreenState('fim');

      try {
        const { receiptCode, receiptHash } = await offlineUrnaService.castVote(
          election,
          selectedUrna,
          candidateChoice
        );

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
        console.error('Erro ao registrar voto:', err);
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      
      {/* Barra de Status do Terminal em Estilo Editorial */}
      <div className="mb-6 p-4 rounded-md bg-white border border-[#E8E4DF] border-t-2 border-t-[#B8860B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#B8860B]"></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-base text-[#1A1A1A]">
                {selectedUrna.name}
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#FAFAF8] border border-[#E8E4DF] text-[#B8860B]">
                {selectedUrna.id}
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] font-mono mt-0.5">
              {selectedUrna.location} • Ed25519: <span className="text-[#1A1A1A]">{selectedUrna.publicKey.slice(0, 10)}...</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isElectionClosed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-[0.08em] bg-[#991B1B]/10 border border-[#991B1B]/20 text-[#991B1B]">
              <Ban className="w-3.5 h-3.5" />
              ELEIÇÃO ENCERRADA
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-[0.08em] bg-[#166534]/10 border border-[#166534]/20 text-[#166534]">
              <Lock className="w-3.5 h-3.5" />
              ANTI-DUPLICIDADE ATIVO
            </span>
          )}
        </div>
      </div>

      {/* SELETOR DE ELEITOR PARA TESTE RÁPIDO (MODO DEMO DO HACKATHON) */}
      {!isElectionClosed && screenState === 'locked' && (
        <div className="mb-6 p-4 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] border-l-4 border-l-[#B8860B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#1A1A1A]">
            <KeyRound className="w-4 h-4 text-[#B8860B] shrink-0" />
            <span className="font-mono">
              <strong className="text-[#B8860B]">ATALHO DO MESÁRIO:</strong> Selecione um eleitor apto para liberar a cabine:
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pendingVoters.slice(0, 4).map((v) => (
              <button
                key={v.pin}
                onClick={() => handleAuthorizeWithPin(v.pin)}
                className="px-3 py-1 rounded-md bg-white border border-[#E8E4DF] hover:border-[#B8860B] text-[#1A1A1A] hover:text-[#B8860B] font-mono text-xs transition-all shadow-sm"
                title={`Liberar para ${v.voterIdentifier} (PIN: ${v.pin})`}
              >
                {v.voterIdentifier}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gabinete da Urna Eletrônica (Console Editorial de Votação) */}
      <div className="urna-chassis grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* TELA DA URNA (À Esquerda) */}
        <div className="lg:col-span-7 urna-screen min-h-[480px] flex flex-col justify-between p-6 sm:p-8 relative">

          {/* CASO 1: ELEIÇÃO ENCERRADA */}
          {isElectionClosed ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-md bg-[#991B1B]/10 border border-[#991B1B]/20 flex items-center justify-center text-[#991B1B] shadow-sm">
                <Ban className="w-8 h-8" />
              </div>
              <div className="font-serif font-bold text-2xl text-[#1A1A1A] tracking-tight">
                Votação Encerrada
              </div>
              <p className="text-sm text-[#6B6B6B] max-w-xs leading-relaxed font-sans">
                A seção eleitoral foi finalizada. O Boletim de Urna (BU) com a apuração oficial está disponível para auditoria pública.
              </p>
              <button
                onClick={() => onGoToAuditoria('')}
                className="serif-btn-primary rounded-md text-xs mt-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>VER APURAÇÃO OFICIAL</span>
              </button>
            </div>
          ) : screenState === 'locked' ? (
            /* CASO 2: CABINE BLOQUEADA - AGUARDANDO PIN DO ELEITOR */
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-6 border-b border-[#E8E4DF]">
                  <span className="small-caps text-[#B8860B]">
                    JUSTIÇA ELEITORAL • {election.institutionName.toUpperCase()}
                  </span>
                  <span className="font-mono text-xs text-[#6B6B6B]">SEÇÃO 01</span>
                </div>

                <div className="text-center py-6 space-y-4">
                  <div className="inline-flex p-3.5 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] text-[#B8860B] shadow-sm">
                    <Lock className="w-6 h-6" />
                  </div>
                  
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#1A1A1A] tracking-tight">
                      Cabine Aguardando Eleitor
                    </h3>
                    <p className="text-xs text-[#6B6B6B] max-w-xs mx-auto mt-1 leading-relaxed font-sans">
                      Insira o seu <strong className="text-[#1A1A1A]">PIN de 6 dígitos</strong> fornecido na mesa receptora para iniciar:
                    </p>
                  </div>

                  {/* Caixas dos 6 dígitos do PIN com Estilo Serif */}
                  <div className="flex justify-center gap-2 pt-2">
                    {[...Array(PIN_LENGTH)].map((_, idx) => {
                      const isFilled = pinDigits[idx] !== undefined;
                      const isCurrent = idx === pinDigits.length;
                      return (
                        <div
                          key={idx}
                          className={`w-10 sm:w-12 h-14 sm:h-16 rounded-md border flex items-center justify-center font-mono text-xl sm:text-2xl font-bold transition-all shadow-sm ${
                            isFilled
                              ? 'border-[#B8860B] bg-[#B8860B]/10 text-[#B8860B]'
                              : isCurrent
                              ? 'border-[#B8860B] bg-white text-[#1A1A1A] animate-pulse'
                              : 'border-[#E8E4DF] bg-white text-[#D1CBC3]'
                          }`}
                        >
                          {isFilled ? '●' : isCurrent ? '_' : ''}
                        </div>
                      );
                    })}
                  </div>

                  {/* Mensagem de Erro / Alerta de Duplicidade */}
                  {pinError && (
                    <div className="mt-4 p-3.5 rounded-md text-left flex items-start gap-2.5 bg-[#991B1B]/10 border border-[#991B1B]/20 animate-fade-in shadow-sm">
                      <AlertTriangle className="w-4 h-4 text-[#991B1B] shrink-0 mt-0.5" />
                      <p className="text-xs text-[#991B1B] font-mono leading-relaxed">
                        {pinError}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 text-center border-t border-[#E8E4DF] text-xs text-[#6B6B6B] font-mono">
                Digite os 6 números e tecle{' '}
                <span className="text-[#166534] font-bold">CONFIRMA</span>{' '}
                ou{' '}
                <span className="text-[#C2410C] font-bold">CORRIGE</span>{' '}
                para reiniciar.
              </div>
            </div>
          ) : screenState === 'voting' ? (
            /* CASO 3: CABINE LIBERADA - ELEITOR VOTANDO */
            <>
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E4DF]">
                  <span className="small-caps text-[#B8860B]">
                    JUSTIÇA ELEITORAL • {election.institutionName.toUpperCase()}
                  </span>
                  {authorizedVoter && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono bg-white border border-[#E8E4DF] text-[#1A1A1A]">
                      <UserCheck className="w-3.5 h-3.5 text-[#B8860B]" />
                      <span>{authorizedVoter.voterIdentifier}</span>
                    </span>
                  )}
                </div>

                <div className="small-caps text-[#6B6B6B] mb-1">
                  SEU VOTO PARA
                </div>
                <div className="font-serif font-bold text-2xl text-[#1A1A1A] tracking-tight mb-6">
                  {election.roleTitle}
                </div>

                {/* Campos de Dígitos ou Mensagem de Branco */}
                {isBranco ? (
                  <div className="my-6 py-6 px-4 text-center rounded-md border-2 border-[#E8E4DF] bg-white shadow-sm">
                    <span className="font-serif font-bold text-2xl tracking-wide text-[#1A1A1A]">
                      VOTO EM BRANCO
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 mb-6">
                    <span className="small-caps text-[#6B6B6B]">
                      NÚMERO:
                    </span>
                    <div className="flex gap-2.5">
                      {[...Array(DIGITS_COUNT)].map((_, idx) => {
                        const isFilled = digits[idx] !== undefined;
                        const isCurrent = idx === digits.length;
                        return (
                          <div
                            key={idx}
                            className={`w-12 sm:w-14 h-16 sm:h-20 rounded-md border flex items-center justify-center font-mono text-2xl sm:text-3xl font-bold transition-all shadow-sm ${
                              isFilled
                                ? 'border-[#B8860B] bg-[#B8860B]/10 text-[#B8860B]'
                                : isCurrent
                                ? 'border-[#B8860B] bg-white text-[#1A1A1A] animate-pulse'
                                : 'border-[#E8E4DF] bg-white text-[#D1CBC3]'
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
                  <div className="animate-fade-in p-4 rounded-md bg-white border border-[#E8E4DF] border-t-2 border-t-[#B8860B] flex gap-4 items-center shadow-sm">
                    <img
                      src={matchedCandidate.photoUrl}
                      alt={matchedCandidate.name}
                      className="w-16 h-16 rounded-md object-cover border border-[#E8E4DF] shadow-sm"
                    />
                    <div>
                      <div className="small-caps text-[#B8860B] mb-0.5">
                        CANDIDATO OFICIAL
                      </div>
                      <div className="font-serif font-bold text-lg text-[#1A1A1A]">
                        {matchedCandidate.name}
                      </div>
                      <div className="text-xs text-[#6B6B6B] font-sans">
                        {matchedCandidate.partyOrSlate}
                      </div>
                    </div>
                  </div>
                )}

                {/* Voto Nulo */}
                {isNulo && (
                  <div className="animate-fade-in p-4 rounded-md bg-[#B45309]/10 border border-[#B45309]/30 text-center shadow-sm">
                    <div className="small-caps text-[#B45309] mb-1">
                      NÚMERO NÃO LOCALIZADO
                    </div>
                    <div className="font-serif font-bold text-xl text-[#B45309]">
                      VOTO NULO
                    </div>
                  </div>
                )}
              </div>

              {/* Instruções de rodapé da tela */}
              <div className="pt-4 mt-4 border-t border-[#E8E4DF] text-xs font-mono text-[#6B6B6B] space-y-1">
                <div className="text-[#8C8883] text-[11px] uppercase tracking-[0.1em]">APERTE A TECLA:</div>
                <div>
                  <span className="font-bold text-[#166534]">CONFIRMA (VERDE)</span> para computar este voto
                </div>
                <div>
                  <span className="font-bold text-[#C2410C]">CORRIGE (LARANJA)</span> para reiniciar
                </div>
              </div>
            </>
          ) : (
            /* CASO 4: TELA DE "FIM" DA URNA */
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <div className="font-serif font-bold text-6xl text-[#1A1A1A] tracking-wider mb-2">
                FIM
              </div>
              <div className="small-caps text-[#166534] font-semibold">
                VOTO GRAVADO COM SUCESSO
              </div>
              <p className="text-xs text-[#6B6B6B] mt-2 max-w-xs leading-relaxed font-sans">
                Seu voto foi criptografado e registrado no Registro Digital do Voto (RDV) desta urna.
              </p>
            </div>
          )}

        </div>

        {/* TECLADO FÍSICO DA URNA (Keypad Editorial) */}
        <div className="lg:col-span-5 urna-keypad flex flex-col justify-between space-y-4">

          <div className="text-center py-1 border-b border-[#E8E4DF]">
            <span className="small-caps text-[#6B6B6B]">
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

          <div className="text-center pt-1 text-[11px] text-[#8C8883] font-mono">
            {screenState === 'locked'
              ? 'INSIRA PIN DE 6 DÍGITOS'
              : 'INSIRA NÚMERO DO CANDIDATO (2 DÍGITOS)'}
          </div>
        </div>

      </div>

      {/* MODAL DO COMPROVANTE DE VOTAÇÃO (E2E-V - CERTIFICADO OFICIAL) */}
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/60 backdrop-blur-sm">
          <div className="max-w-md w-full p-8 rounded-lg bg-white border border-[#E8E4DF] border-t-4 border-t-[#B8860B] shadow-2xl animate-fade-in">

            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#E8E4DF]">
              <div className="p-2.5 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] text-[#B8860B]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1A1A1A] tracking-tight">
                  Comprovante de Votação
                </h3>
                <p className="text-xs text-[#6B6B6B] font-mono">
                  Prova Criptográfica de Inclusão Eleitoral
                </p>
              </div>
            </div>

            {/* QR Code e Código de Auditoria */}
            <div className="text-center p-5 mb-5 rounded-md bg-[#FAFAF8] border border-[#E8E4DF]">
              <img
                src={receiptData.qrUrl}
                alt="QR Code do Comprovante"
                className="w-40 h-40 rounded-md mx-auto mb-3 bg-white p-2 border border-[#E8E4DF] shadow-sm"
              />

              <div className="small-caps text-[#6B6B6B] mb-1">
                SEU CÓDIGO DE AUDITORIA:
              </div>
              <div className="font-mono text-lg font-bold text-[#B8860B] flex items-center justify-center gap-2">
                <span>{receiptData.code}</span>
                <button
                  onClick={handleCopyCode}
                  className="p-1.5 rounded hover:bg-white text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  title="Copiar código"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copied && (
                <span className="text-[11px] text-[#166534] font-mono mt-1 inline-block">
                  ✓ Copiado para a área de transferência!
                </span>
              )}
            </div>

            {/* Garantias de Segurança */}
            <div className="p-3.5 mb-5 rounded-md bg-[#FAFAF8] border border-[#E8E4DF] space-y-2 text-xs font-mono text-[#6B6B6B]">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#1A1A1A]">Voto Secreto Garantido:</strong>{' '}
                  Este comprovante não revela o candidato escolhido.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#1A1A1A]">Cédula Registrada:</strong>{' '}
                  Hash <code className="text-[#B8860B]">{receiptData.hash.slice(0, 10)}...</code> gravado na Árvore de Merkle.
                </span>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => onGoToAuditoria(receiptData.code)}
                className="serif-btn-primary rounded-md w-full py-3"
              >
                <ExternalLink className="w-4 h-4" />
                <span>AUDITAR NO PORTAL DE TRANSPARÊNCIA</span>
              </button>

              <button
                onClick={handleNextVoter}
                className="serif-btn-outline rounded-md w-full py-2.5"
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
