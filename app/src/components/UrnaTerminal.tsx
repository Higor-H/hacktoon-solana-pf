import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
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

  // Desbloqueia a cabine com um PIN válido
  const handleAuthorizeWithPin = useCallback((pinString: string) => {
    setPinError(null);
    const voter = election.voterPins.find((v) => v.pin === pinString);

    if (!voter) {
      playAlertSound();
      setPinError('PIN NÃO ENCONTRADO! Solicite a autorização na mesa do mesário.');
      return;
    }

    // REGRA DE NÃO DUPLICIDADE: Eleitor já votou?
    if (voter.isUsed) {
      playAlertSound();
      const horaVoto = voter.usedAt ? new Date(voter.usedAt).toLocaleTimeString() : 'anteriormente';
      setPinError(
        `⛔ VOTO DUPLICADO REJEITADO! O eleitor ${voter.voterIdentifier} (${voter.voterName || 'Eleitor'}) já votou às ${horaVoto}. É estritamente proibido votar mais de uma vez.`
      );
      return;
    }

    // Eleitor apto: libera a cabine
    playBeep();
    setAuthorizedVoter(voter);
    setScreenState('voting');
    setPinDigits([]);
    setPinError(null);
  }, [election.voterPins, playAlertSound, playBeep]);

  // Digitação de dígitos (PIN ou Candidato)
  const handleDigit = useCallback((d: number) => {
    if (isElectionClosed || screenState === 'fim') return;

    if (screenState === 'locked') {
      // Digitou PIN
      if (pinDigits.length < PIN_LENGTH) {
        playBeep();
        const next = [...pinDigits, d.toString()];
        setPinDigits(next);
        if (next.length === PIN_LENGTH) {
          // Autoverifica quando atinge 6 dígitos
          handleAuthorizeWithPin(next.join(''));
        }
      } else {
        playAlertSound();
      }
    } else if (screenState === 'voting') {
      // Digitou candidato
      if (isBranco) setIsBranco(false);
      if (digits.length < DIGITS_COUNT) {
        playBeep();
        setDigits((prev) => [...prev, d.toString()]);
      } else {
        playAlertSound();
      }
    }
  }, [
    isElectionClosed,
    screenState,
    pinDigits,
    digits.length,
    isBranco,
    playBeep,
    playAlertSound,
    handleAuthorizeWithPin,
  ]);

  // Tecla BRANCO
  const handleBranco = useCallback(() => {
    if (isElectionClosed || screenState !== 'voting') return;
    if (digits.length === 0) {
      playBeep();
      setIsBranco(true);
    } else {
      playAlertSound();
    }
  }, [isElectionClosed, screenState, digits.length, playBeep, playAlertSound]);

  // Tecla CORRIGE
  const handleCorrige = useCallback(() => {
    if (isElectionClosed || screenState === 'fim') return;
    playAlertSound();

    if (screenState === 'locked') {
      setPinDigits([]);
      setPinError(null);
    } else if (screenState === 'voting') {
      setDigits([]);
      setIsBranco(false);
    }
  }, [isElectionClosed, screenState, playAlertSound]);

  // Tecla CONFIRMA
  const handleConfirma = useCallback(async () => {
    if (isElectionClosed) return;

    if (screenState === 'locked') {
      if (pinDigits.length === PIN_LENGTH) {
        handleAuthorizeWithPin(pinDigits.join(''));
      } else {
        playAlertSound();
        setPinError('Insira os 6 dígitos do PIN fornecido pelo mesário.');
      }
      return;
    }

    if (screenState === 'voting') {
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

      // Toca o som oficial da Urna do TSE
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

  // Eleitores aptos ainda pendentes de votação (para teste rápido)
  const pendingVoters = election.voterPins.filter((v) => !v.isUsed);

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
          {isElectionClosed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              <Ban className="w-3.5 h-3.5" />
              ELEIÇÃO ENCERRADA
            </span>
          ) : (
            <span className="badge-offline">
              <Lock className="w-3 h-3" />
              Anti-Duplicidade Ativo (1 Voto por Eleitor)
            </span>
          )}
        </div>
      </div>

      {/* SELETOR DE ELEITOR PARA TESTE RÁPIDO (MODO DEMO DO HACKATHON) */}
      {!isElectionClosed && screenState === 'locked' && (
        <div className="mb-4 p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-purple-300">
            <KeyRound className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>
              <strong>Atalho do Mesário:</strong> Selecione um eleitor apto abaixo para liberar a cabine com 1 clique:
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pendingVoters.slice(0, 4).map((v) => (
              <button
                key={v.pin}
                onClick={() => handleAuthorizeWithPin(v.pin)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono transition-all"
                title={`Liberar para ${v.voterIdentifier} (PIN: ${v.pin})`}
              >
                Liberar {v.voterIdentifier}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gabinete Físico da Urna Eletrônica */}
      <div className="urna-chassis grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* TELA DA URNA (À Esquerda) */}
        <div className="lg:col-span-7 urna-screen min-h-[460px] flex flex-col justify-between p-6 relative">
          
          {/* CASO 1: ELEIÇÃO ENCERRADA */}
          {isElectionClosed ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                <Ban className="w-8 h-8" />
              </div>
              <div className="text-3xl font-black font-display text-white">
                VOTAÇÃO ENCERRADA
              </div>
              <p className="text-xs text-slate-300 max-w-sm">
                A seção eleitoral foi finalizada. O Boletim de Urna (BU) com a apuração já está disponível para consulta e auditoria.
              </p>
              <button
                onClick={() => onGoToAuditoria('')}
                className="btn-primary text-xs py-2 px-4"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Ver Apuração & Votos por Candidato</span>
              </button>
            </div>
          ) : screenState === 'locked' ? (
            /* CASO 2: CABINE BLOQUEADA - AGUARDANDO AUTORIZAÇÃO / PIN DO ELEITOR */
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-4">
                  <span className="text-xs tracking-widest uppercase font-mono text-emerald-400 font-bold">
                    JUSTIÇA ELEITORAL • {election.institutionName.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    SEÇÃO 01
                  </span>
                </div>

                <div className="text-center py-4 space-y-3">
                  <div className="inline-flex p-3 rounded-2xl bg-slate-900 border border-white/10 text-emerald-400 shadow-inner">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-white">
                    Cabine Aguardando Eleitor
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Digite seu <strong>PIN de 6 dígitos</strong> fornecido na mesa do mesário para liberar a votação secreta:
                  </p>

                  {/* Caixas dos 6 dígitos do PIN */}
                  <div className="flex justify-center gap-2 pt-2">
                    {[...Array(PIN_LENGTH)].map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-10 h-14 rounded-lg border-2 flex items-center justify-center font-mono text-2xl font-bold transition-all ${
                          pinDigits[idx] !== undefined
                            ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300 shadow-lg shadow-emerald-500/20'
                            : idx === pinDigits.length
                            ? 'border-white/50 bg-white/5 text-white animate-pulse'
                            : 'border-white/15 bg-black/30 text-transparent'
                        }`}
                      >
                        {pinDigits[idx] || (idx === pinDigits.length ? '_' : '')}
                      </div>
                    ))}
                  </div>

                  {/* Mensagem de Erro / Alerta de Duplicidade */}
                  {pinError && (
                    <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-left flex items-start gap-2.5 animate-fade-in">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-200 font-sans leading-relaxed">
                        {pinError}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-emerald-500/20 pt-3 text-[11px] font-mono text-slate-400 text-center">
                Digite os 6 números no teclado e tecle <span className="text-emerald-400 font-bold">CONFIRMA</span> ou <span className="text-orange-400 font-bold">CORRIGE</span> para apagar.
              </div>
            </div>
          ) : screenState === 'voting' ? (
            /* CASO 3: CABINE LIBERADA - ELEITOR VOTANDO */
            <>
              <div>
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-3">
                  <span className="text-xs tracking-widest uppercase font-mono text-emerald-400 font-bold">
                    JUSTIÇA ELEITORAL • {election.institutionName.toUpperCase()}
                  </span>
                  {authorizedVoter && (
                    <span className="text-xs font-mono text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{authorizedVoter.voterIdentifier}</span>
                    </span>
                  )}
                </div>

                <div className="text-xs uppercase font-mono text-slate-400 mb-1">
                  SEU VOTO PARA
                </div>
                <div className="text-2xl font-bold font-display text-white tracking-wide mb-5">
                  {election.roleTitle}
                </div>

                {/* Campos de Dígitos ou Mensagem de Branco */}
                {isBranco ? (
                  <div className="my-6 py-6 text-center border-2 border-dashed border-white/20 rounded-xl bg-white/5">
                    <span className="text-2xl sm:text-3xl font-extrabold font-display tracking-widest text-white animate-pulse">
                      VOTO EM BRANCO
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mb-5">
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
                  <div className="animate-fade-in bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 flex gap-4 items-center">
                    <img
                      src={matchedCandidate.photoUrl}
                      alt={matchedCandidate.name}
                      className="w-16 h-16 rounded-lg object-cover border-2 border-emerald-400/50 shadow-md"
                    />
                    <div className="space-y-1">
                      <div className="text-[11px] uppercase font-mono text-emerald-400 font-bold">
                        Candidato Oficial
                      </div>
                      <div className="text-base font-bold text-white font-display">
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
                  <div className="animate-fade-in bg-orange-950/40 border border-orange-500/30 rounded-xl p-3 text-center">
                    <div className="text-xs font-bold text-orange-400 uppercase font-mono">
                      NÚMERO ERRADO
                    </div>
                    <div className="text-lg font-black text-white font-display mt-0.5">
                      VOTO NULO
                    </div>
                  </div>
                )}
              </div>

              {/* Instruções de rodapé */}
              <div className="border-t border-emerald-500/20 pt-3 mt-3 text-[11px] font-mono text-slate-300 space-y-1">
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
            /* CASO 4: TELA DE "FIM" DA URNA */
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
                disabled={isElectionClosed || screenState === 'fim'}
                className="urna-key-num"
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
              className="urna-key-num"
            >
              0
            </button>
            <div />
          </div>

          {/* Teclas Oficiais: BRANCO, CORRIGE, CONFIRMA */}
          <div className="grid grid-cols-3 gap-2.5 pt-3 items-end">
            <button
              onClick={handleBranco}
              disabled={isElectionClosed || screenState !== 'voting'}
              className="urna-key-action key-branco h-[52px]"
            >
              <span>BRANCO</span>
            </button>

            <button
              onClick={handleCorrige}
              disabled={isElectionClosed || screenState === 'fim'}
              className="urna-key-action key-corrige h-[52px]"
            >
              <span>CORRIGE</span>
            </button>

            <button
              onClick={handleConfirma}
              disabled={isElectionClosed || screenState === 'fim'}
              className="urna-key-action key-confirma"
            >
              <span>CONFIRMA</span>
            </button>
          </div>

          <div className="text-[11px] text-center text-slate-500 font-mono pt-1">
            {screenState === 'locked'
              ? 'Digite o PIN de 6 dígitos no teclado ou use os botões rápidos.'
              : 'Digite os 2 números do candidato e confirme.'}
          </div>
        </div>

      </div>

      {/* MODAL DO COMPROVANTE DE VOTAÇÃO (E2E-V) */}
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
                className="w-40 h-40 mx-auto rounded-lg bg-white p-2 mb-3 shadow-md"
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

            {/* Garantias de Segurança */}
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 mb-4 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Voto Secreto Garantido:</strong> Este comprovante não revela em quem você votou.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Cédula Registrada:</strong> Hash <code className="text-emerald-300">{receiptData.hash.slice(0, 10)}...</code> adicionado à Árvore de Merkle.
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
                <span>Bloquear Cabine para Próximo Eleitor</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
