export type InstitutionType = 'condo' | 'school' | 'association' | 'general';

export interface Candidate {
  id: number;
  number: number;
  name: string;
  role: string;
  partyOrSlate: string;
  photoUrl: string;
}

export interface UrnaDevice {
  id: string;
  name: string;
  location: string;
  publicKey: string;
  secretKey: string; // Base58 or hex Ed25519 private key
  isActive: boolean;
  hasSubmittedBu: boolean;
  votesCount: number;
}

export interface VoterPin {
  pin: string;
  voterIdentifier: string; // Ex: "Apto 102 - Torre A" ou "Matrícula 20241029"
  voterName?: string;
  isUsed: boolean;
  usedAt?: number;
  createdAt: number;
}

export interface VoteRecord {
  id: string;
  urnaId: string;
  electionId: string;
  candidateNumber: number | 'BRANCO' | 'NULO';
  receiptCode: string;
  receiptHash: string; // SHA-256 da folha Merkle
  timestamp: number;
}

export interface CandidateTally {
  candidateId: number;
  candidateNumber: number;
  candidateName: string;
  votes: number;
}

export interface BoletimDeUrnaPayload {
  electionId: string;
  urnaId: string;
  urnaName: string;
  totalVotes: number;
  blankVotes: number;
  nullVotes: number;
  candidateTallies: CandidateTally[];
  merkleRoot: string;
  receiptLeaves: string[];
  ed25519Signature: string;
  urnaPubkey: string;
  digest: string;
  timestamp: number;
  solanaTxSignature?: string;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  institutionType: InstitutionType;
  institutionName: string;
  roleTitle: string; // Ex: "SÍNDICO", "DIRETOR", "REPRESENTANTE"
  candidates: Candidate[];
  registeredVoters: number;
  status: 'draft' | 'active' | 'closed';
  solanaProgramId: string;
  solanaElectionPda: string;
  urnas: UrnaDevice[];
  voterPins: VoterPin[];
  createdAt: number;
  totalVotesCast: number;
  blankVotes: number;
  nullVotes: number;
}

export interface MerkleProofResult {
  isValid: boolean;
  leaf: string;
  root: string;
  proof: string[];
  leafIndex: number;
  urnaId: string;
  timestamp: number;
  solanaConfirmed: boolean;
}
