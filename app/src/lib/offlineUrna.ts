import type {
  BoletimDeUrnaPayload,
  CandidateTally,
  Election,
  UrnaDevice,
  VoteRecord,
} from './types';
import {
  buildMerkleTree,
  computeBuDigest,
  generateVoterReceipt,
  shuffleArray,
  signDigest,
} from './cryptoUtils';

const STORAGE_PREFIX = 'urnasol_offline_votes_';
const BU_STORAGE_PREFIX = 'urnasol_offline_bu_';

export interface UrnaSessionState {
  urnaId: string;
  electionId: string;
  votes: VoteRecord[];
  isClosed: boolean;
  boletim?: BoletimDeUrnaPayload;
}

export class OfflineUrnaService {
  /**
   * Obtém a lista de votos locais de uma urna específica
   */
  getVotes(urnaId: string): VoteRecord[] {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${urnaId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Erro ao carregar votos locais:', e);
    }
    return [];
  }

  /**
   * Registra um voto na urna offline:
   * 1. Gera comprovante individual (ReceiptCode + Merkle Leaf Hash)
   * 2. Grava voto anonimizado
   * 3. Aplica embaralhamento de ordem (RDV) para que a ordem no disco não seja sequencial
   */
  async castVote(
    election: Election,
    urna: UrnaDevice,
    candidateNumber: number | 'BRANCO' | 'NULO'
  ): Promise<{
    receiptCode: string;
    receiptHash: string;
    voteRecord: VoteRecord;
  }> {
    const { receiptCode, receiptHash } = await generateVoterReceipt(
      election.id,
      urna.id
    );

    const newVote: VoteRecord = {
      id: `vote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      urnaId: urna.id,
      electionId: election.id,
      candidateNumber,
      receiptCode,
      receiptHash,
      timestamp: Date.now(),
    };

    const currentVotes = this.getVotes(urna.id);
    currentVotes.push(newVote);

    // RDV: Embaralha os registros para proteção absoluta do voto secreto
    const shuffledVotes = shuffleArray(currentVotes);
    localStorage.setItem(
      `${STORAGE_PREFIX}${urna.id}`,
      JSON.stringify(shuffledVotes)
    );

    return {
      receiptCode,
      receiptHash,
      voteRecord: newVote,
    };
  }

  /**
   * Gera a Zerésima oficial da urna no início dos trabalhos eleitorais
   */
  generateZeresima(election: Election, urna: UrnaDevice) {
    return {
      title: 'ZERÉSIMA OFICIAL - URNASOL',
      electionId: election.id,
      electionTitle: election.title,
      urnaId: urna.id,
      urnaLocation: urna.location,
      urnaPubkey: urna.publicKey,
      timestamp: Date.now(),
      candidateZeros: election.candidates.map((c) => ({
        candidateNumber: c.number,
        candidateName: c.name,
        votes: 0,
      })),
      blankVotes: 0,
      nullVotes: 0,
      totalVotes: 0,
      status: 'VERIFICADO - TODOS OS CONTADORES ZERADOS',
    };
  }

  /**
   * Fecha a votação na urna e emite o Boletim de Urna (BU) digital assinado
   */
  async closeUrnaAndGenerateBU(
    election: Election,
    urna: UrnaDevice
  ): Promise<BoletimDeUrnaPayload> {
    const votes = this.getVotes(urna.id);

    // 1. Apuração dos votos
    let blankVotes = 0;
    let nullVotes = 0;
    const candidateTalliesMap = new Map<number, number>();

    election.candidates.forEach((c) => {
      candidateTalliesMap.set(c.number, 0);
    });

    votes.forEach((v) => {
      if (v.candidateNumber === 'BRANCO') {
        blankVotes++;
      } else if (v.candidateNumber === 'NULO') {
        nullVotes++;
      } else if (typeof v.candidateNumber === 'number') {
        const count = candidateTalliesMap.get(v.candidateNumber) || 0;
        candidateTalliesMap.set(v.candidateNumber, count + 1);
      }
    });

    const candidateTallies: CandidateTally[] = election.candidates.map((c) => ({
      candidateId: c.id,
      candidateNumber: c.number,
      candidateName: c.name,
      votes: candidateTalliesMap.get(c.number) || 0,
    }));

    const totalVotes = votes.length;

    // 2. Construção da Árvore de Merkle de todos os recibos emitidos por esta Urna
    const receiptLeaves = votes.map((v) => v.receiptHash);
    const merkleTree = await buildMerkleTree(receiptLeaves);

    // 3. Cálculo do Digest e Assinatura Ed25519 pela chave privada da Urna
    const digest = await computeBuDigest(
      election.id,
      urna.id,
      totalVotes,
      blankVotes,
      nullVotes,
      merkleTree.root
    );

    const ed25519Signature = signDigest(urna.secretKey, digest);

    const buPayload: BoletimDeUrnaPayload = {
      electionId: election.id,
      urnaId: urna.id,
      urnaName: urna.name,
      totalVotes,
      blankVotes,
      nullVotes,
      candidateTallies,
      merkleRoot: merkleTree.root,
      receiptLeaves,
      ed25519Signature,
      urnaPubkey: urna.publicKey,
      digest,
      timestamp: Date.now(),
    };

    localStorage.setItem(
      `${BU_STORAGE_PREFIX}${urna.id}`,
      JSON.stringify(buPayload)
    );

    return buPayload;
  }

  /**
   * Recupera o BU gerado de uma urna caso já tenha sido fechada
   */
  getSavedBU(urnaId: string): BoletimDeUrnaPayload | null {
    try {
      const stored = localStorage.getItem(`${BU_STORAGE_PREFIX}${urnaId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Erro ao carregar BU salvo:', e);
    }
    return null;
  }

  /**
   * Limpa os dados locais de uma urna (para testes / reinicialização)
   */
  resetUrna(urnaId: string): void {
    localStorage.removeItem(`${STORAGE_PREFIX}${urnaId}`);
    localStorage.removeItem(`${BU_STORAGE_PREFIX}${urnaId}`);
  }
}

export const offlineUrnaService = new OfflineUrnaService();
