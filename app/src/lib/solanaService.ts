import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from '@solana/web3.js';
import bs58 from 'bs58';
import type { BoletimDeUrnaPayload, Election } from './types';
import { verifySignature } from './cryptoUtils';

export const SOLANA_DEVNET_RPC = clusterApiUrl('devnet');
export const PROGRAM_ID = new PublicKey('UrnaSoL111111111111111111111111111111111111');
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export interface OnChainSubmissionResult {
  success: boolean;
  txSignature: string;
  slot: number;
  blockTime: number;
  electionPda: string;
  urnaPda: string;
  buPda: string;
  merkleRootRecorded: string;
  explorerUrl: string;
  isSimulated: boolean;
  isLiveOnChain: boolean;
  faucetNotice?: string;
  organizerPubkey: string;
}

export const TARGET_WALLET_PUBKEY = 'BCxEDMyGm8msF8nprbUyG85dvTnjDWBLBXAXtzW7DEpG';

function resolveInitialKeypair(): Keypair {
  if (typeof localStorage !== 'undefined') {
    // 1. Verifica se já temos o segredo fixo registrado
    const fixedSecret = localStorage.getItem('urnasol_fixed_secret');
    if (fixedSecret) {
      try {
        const kp = Keypair.fromSecretKey(bs58.decode(fixedSecret));
        if (kp.publicKey.toBase58() === TARGET_WALLET_PUBKEY) {
          localStorage.setItem('urnasol_organizer_key', fixedSecret);
          return kp;
        }
      } catch {}
    }

    // 2. Busca na eleição salva se a URNA-01 (ou outra) possui essa chave
    try {
      const savedElec = localStorage.getItem('urnasol_election_data');
      if (savedElec) {
        const parsed = JSON.parse(savedElec);
        const match = (parsed.urnas || []).find(
          (u: { publicKey?: string; secretKey?: string }) =>
            u.publicKey === TARGET_WALLET_PUBKEY && u.secretKey
        );
        if (match && match.secretKey) {
          const kp = Keypair.fromSecretKey(bs58.decode(match.secretKey));
          localStorage.setItem('urnasol_fixed_secret', match.secretKey);
          localStorage.setItem('urnasol_organizer_key', match.secretKey);
          return kp;
        }
      }
    } catch {}

    // 3. Procura em todas as chaves do localStorage para encontrar o segredo da chave alvo
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        const val = localStorage.getItem(k);
        if (val && val.includes(TARGET_WALLET_PUBKEY)) {
          try {
            const parsed = JSON.parse(val);
            if (parsed.secretKey) {
              const kp = Keypair.fromSecretKey(bs58.decode(parsed.secretKey));
              if (kp.publicKey.toBase58() === TARGET_WALLET_PUBKEY) {
                localStorage.setItem('urnasol_fixed_secret', parsed.secretKey);
                localStorage.setItem('urnasol_organizer_key', parsed.secretKey);
                return kp;
              }
            }
          } catch {}
        }
      }
    }

    // 4. Se já havia uma chave qualquer em urnasol_organizer_key
    const savedSecret = localStorage.getItem('urnasol_organizer_key');
    if (savedSecret) {
      try {
        return Keypair.fromSecretKey(bs58.decode(savedSecret));
      } catch {}
    }
  }

  // 5. Fallback padrão: gera um novo
  const gen = Keypair.generate();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('urnasol_organizer_key', bs58.encode(gen.secretKey));
  }
  return gen;
}

export class SolanaService {
  private connection: Connection;
  private organizerKeypair: Keypair;

  constructor() {
    this.connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');
    this.organizerKeypair = resolveInitialKeypair();
  }

  ensurePreferredKey(): void {
    if (typeof localStorage === 'undefined') return;
    if (this.organizerKeypair.publicKey.toBase58() === TARGET_WALLET_PUBKEY) return;

    const kp = resolveInitialKeypair();
    if (kp.publicKey.toBase58() === TARGET_WALLET_PUBKEY) {
      this.organizerKeypair = kp;
    }
  }

  getOrganizerPublicKey(): string {
    return this.organizerKeypair.publicKey.toBase58();
  }

  async getOrganizerBalance(): Promise<number> {
    try {
      const bal = await this.connection.getBalance(this.organizerKeypair.publicKey);
      return bal / 1_000_000_000;
    } catch {
      return 0;
    }
  }

  /**
   * Tenta solicitar fundos no Faucet da Devnet
   */
  async requestAirdrop(): Promise<{ success: boolean; message: string }> {
    try {
      const sig = await this.connection.requestAirdrop(
        this.organizerKeypair.publicKey,
        1_000_000_000
      );
      await this.connection.confirmTransaction(sig, 'confirmed');
      return {
        success: true,
        message: '1 SOL recebido com sucesso na Devnet!',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha no airdrop da Devnet';
      if (msg.includes('429') || msg.includes('limit') || msg.includes('dry')) {
        return {
          success: false,
          message:
            'O faucet público RPC da Solana atingiu o limite de requisições por IP (HTTP 429). Utilize https://faucet.solana.com para transferir SOL para a carteira da eleição.',
        };
      }
      return { success: false, message: msg };
    }
  }

  /**
   * Deriva o PDA da Eleição: seeds = ["election", election_id.as_bytes()]
   */
  deriveElectionPda(electionId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('election'), Buffer.from(electionId)],
      PROGRAM_ID
    );
  }

  /**
   * Deriva o PDA da Urna: seeds = ["urna", election_pda, urna_id.as_bytes()]
   */
  deriveUrnaPda(electionPda: PublicKey, urnaId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('urna'), electionPda.toBuffer(), Buffer.from(urnaId)],
      PROGRAM_ID
    );
  }

  /**
   * Deriva o PDA do Boletim de Urna: seeds = ["bu", election_pda, urna_pda]
   */
  deriveBuPda(electionPda: PublicKey, urnaPda: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('bu'), electionPda.toBuffer(), urnaPda.toBuffer()],
      PROGRAM_ID
    );
  }

  /**
   * Verifica a conectividade com a rede Solana
   */
  async checkNetworkHealth(): Promise<{ online: boolean; slot?: number; error?: string }> {
    try {
      const slot = await this.connection.getSlot();
      return { online: true, slot };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao conectar na Solana';
      return { online: false, error: message };
    }
  }

  /**
   * Envia o Boletim de Urna assinado para a Solana.
   * Se a carteira tiver saldo na Devnet, envia uma transação REAL on-chain registrando
   * o hash do BU e a raiz de Merkle na Solana Devnet via SPL Memo Program.
   * Se não houver saldo ou o faucet estiver bloqueado, registra em modo Air-Gap Local com integridade criptográfica.
   */
  async submitBoletimUrnaToSolana(
    election: Election,
    bu: BoletimDeUrnaPayload
  ): Promise<OnChainSubmissionResult> {
    // 1. Validação prévia de integridade criptográfica
    const isSigValid = verifySignature(bu.urnaPubkey, bu.digest, bu.ed25519Signature);
    if (!isSigValid) {
      throw new Error('Assinatura Ed25519 da Urna inválida! O Boletim pode ter sido corrompido.');
    }

    const [electionPda] = this.deriveElectionPda(election.id);
    const [urnaPda] = this.deriveUrnaPda(electionPda, bu.urnaId);
    const [buPda] = this.deriveBuPda(electionPda, urnaPda);

    let currentSlot = 320914820;
    try {
      currentSlot = await this.connection.getSlot('confirmed');
    } catch {
      // Slot fallback
    }

    let txSignature = '';
    let isLiveOnChain = false;
    let faucetNotice = '';

    // Verifica se a carteira tem saldo na Devnet
    let balance = 0;
    try {
      balance = await this.connection.getBalance(this.organizerKeypair.publicKey);
    } catch {
      // Ignora erro de consulta se offline
    }

    // Se tiver saldo de pelo menos 5.000 lamports (taxa de rede), envia transação REAL
    if (balance >= 5000) {
      try {
        const memoPayload = `URNASOL:BU:${election.id}:${bu.urnaId}:TOTAL:${bu.totalVotes}:ROOT:${bu.merkleRoot.slice(0, 16)}:SIG:${bu.ed25519Signature.slice(0, 16)}`;
        const memoInstruction = new TransactionInstruction({
          keys: [{ pubkey: this.organizerKeypair.publicKey, isSigner: true, isWritable: true }],
          programId: MEMO_PROGRAM_ID,
          data: Buffer.from(memoPayload, 'utf-8'),
        });

        const tx = new Transaction().add(memoInstruction);
        const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        tx.feePayer = this.organizerKeypair.publicKey;

        txSignature = await sendAndConfirmTransaction(
          this.connection,
          tx,
          [this.organizerKeypair],
          { commitment: 'confirmed' }
        );

        isLiveOnChain = true;
      } catch (e) {
        console.warn('Falha ao enviar transação ao vivo para Devnet, usando fallback local:', e);
      }
    }

    // Se não enviou na Devnet (sem fundos ou faucet rate-limited), gera registro de fallback e avisa
    if (!isLiveOnChain) {
      const mockTxBuffer = new Uint8Array(64);
      crypto.getRandomValues(mockTxBuffer);
      txSignature = bs58.encode(mockTxBuffer);
      faucetNotice =
        'A carteira da eleição ainda não possui SOL de taxa na Devnet pública (o faucet padrão rate-limitou). O BU foi registrado e verificado localmente com criptografia Ed25519 e Merkle Tree. Para publicar uma transação visível no Solana Explorer, transfira 0.01 SOL de teste no faucet oficial para a carteira da eleição.';
    }

    // Persiste o estado on-chain localmente para auditoria contínua
    const onChainRecord = {
      electionId: election.id,
      electionPda: electionPda.toBase58(),
      urnaPda: urnaPda.toBase58(),
      buPda: buPda.toBase58(),
      urnaId: bu.urnaId,
      merkleRoot: bu.merkleRoot,
      totalVotes: bu.totalVotes,
      blankVotes: bu.blankVotes,
      nullVotes: bu.nullVotes,
      candidateTallies: bu.candidateTallies,
      ed25519Signature: bu.ed25519Signature,
      receiptLeaves: bu.receiptLeaves,
      txSignature,
      slot: currentSlot,
      timestamp: Date.now(),
      isLiveOnChain,
    };

    localStorage.setItem(
      `urnasol_onchain_bu_${election.id}_${bu.urnaId}`,
      JSON.stringify(onChainRecord)
    );

    return {
      success: true,
      txSignature,
      slot: currentSlot,
      blockTime: Math.floor(Date.now() / 1000),
      electionPda: electionPda.toBase58(),
      urnaPda: urnaPda.toBase58(),
      buPda: buPda.toBase58(),
      merkleRootRecorded: bu.merkleRoot,
      explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
      isSimulated: !isLiveOnChain,
      isLiveOnChain,
      faucetNotice: isLiveOnChain ? undefined : faucetNotice,
      organizerPubkey: this.organizerKeypair.publicKey.toBase58(),
    };
  }

  /**
   * Consulta os BUs registrados on-chain para uma dada eleição
   */
  getOnChainElectionData(electionId: string) {
    const records: Array<{
      electionId: string;
      electionPda: string;
      urnaId: string;
      merkleRoot: string;
      totalVotes: number;
      blankVotes: number;
      nullVotes: number;
      candidateTallies: Array<{ candidateId: number; votes: number; candidateName: string; candidateNumber: number }>;
      txSignature: string;
      slot: number;
      timestamp: number;
      receiptLeaves: string[];
      isLiveOnChain?: boolean;
    }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`urnasol_onchain_bu_${electionId}_`)) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          records.push(item);
        } catch {
          // Ignora
        }
      }
    }

    return records;
  }
}

export const solanaService = new SolanaService();
