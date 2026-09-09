import type { Election } from './types';
import { generateUrnaKeypair } from './cryptoUtils';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { TARGET_WALLET_PUBKEY, TARGET_WALLET_SECRET_KEY } from './solanaService';

export function getUrna1Keypair() {
  const secretBytes = bs58.decode(TARGET_WALLET_SECRET_KEY);
  const pair = nacl.sign.keyPair.fromSecretKey(secretBytes);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('urnasol_fixed_secret', TARGET_WALLET_SECRET_KEY);
    localStorage.setItem('urnasol_organizer_key', TARGET_WALLET_SECRET_KEY);
  }
  return {
    publicKey: TARGET_WALLET_PUBKEY,
    secretKey: TARGET_WALLET_SECRET_KEY,
    publicKeyBytes: pair.publicKey,
    secretKeyBytes: secretBytes,
  };
}

export function createDefaultElection(): Election {
  const urna1Keys = getUrna1Keypair();
  const urna2Keys = generateUrnaKeypair();

  return {
    id: 'eleicao-sindico-2026',
    title: 'Eleição de Síndico e Corpo Diretivo (2026 - 2028)',
    description: 'Votação oficial para escolha do síndico do Condomínio Solar das Palmeiras. Votação por cabine offline com registro imutável na Solana.',
    institutionType: 'condo',
    institutionName: 'Condomínio Solar das Palmeiras',
    roleTitle: 'SÍNDICO',
    status: 'active',
    registeredVoters: 80,
    solanaProgramId: 'UrnaSoL111111111111111111111111111111111111',
    solanaElectionPda: '6n9vC...SolanaPDA',
    createdAt: Date.now() - 3600 * 1000 * 4,
    totalVotesCast: 0,
    blankVotes: 0,
    nullVotes: 0,
    candidates: [
      {
        id: 1,
        number: 10,
        name: 'Carlos Eduardo Silva',
        role: 'Síndico Geral',
        partyOrSlate: 'Chapa 1 - Transparência & Gestão Moderna',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      },
      {
        id: 2,
        number: 20,
        name: 'Dra. Beatriz Albuquerque',
        role: 'Síndico Geral',
        partyOrSlate: 'Chapa 2 - Reformas, Segurança & Lazer',
        photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
      },
      {
        id: 3,
        number: 30,
        name: 'Marcos Vinícius Mendes',
        role: 'Síndico Geral',
        partyOrSlate: 'Chapa 3 - Sustentabilidade & Redução de Custos',
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      },
    ],
    urnas: [
      {
        id: 'URNA-01',
        name: 'Urna 01 - Portaria Principal (Bloco A/B)',
        location: 'Hall de Entrada Principal',
        publicKey: urna1Keys.publicKey,
        secretKey: urna1Keys.secretKey,
        isActive: true,
        hasSubmittedBu: false,
        votesCount: 0,
      },
      {
        id: 'URNA-02',
        name: 'Urna 02 - Salão de Festas (Bloco C/D)',
        location: 'Área Comum Térrea',
        publicKey: urna2Keys.publicKey,
        secretKey: urna2Keys.secretKey,
        isActive: true,
        hasSubmittedBu: false,
        votesCount: 0,
      },
    ],
    voterPins: [
      { pin: '482910', voterIdentifier: 'Apto 101 - Bloco A', voterName: 'Mariana Costa', isUsed: false, createdAt: Date.now() },
      { pin: '719304', voterIdentifier: 'Apto 102 - Bloco A', voterName: 'Fernando Ramos', isUsed: false, createdAt: Date.now() },
      { pin: '395182', voterIdentifier: 'Apto 201 - Bloco A', voterName: 'Renata Peixoto', isUsed: false, createdAt: Date.now() },
      { pin: '820471', voterIdentifier: 'Apto 202 - Bloco A', voterName: 'Lucas Albuquerque', isUsed: false, createdAt: Date.now() },
      { pin: '516293', voterIdentifier: 'Apto 301 - Bloco B', voterName: 'Juliana Castro', isUsed: false, createdAt: Date.now() },
      { pin: '948201', voterIdentifier: 'Apto 302 - Bloco B', voterName: 'Thiago Martins', isUsed: false, createdAt: Date.now() },
      { pin: '127394', voterIdentifier: 'Apto 401 - Bloco B', voterName: 'Camila Duarte', isUsed: false, createdAt: Date.now() },
      { pin: '638102', voterIdentifier: 'Apto 402 - Bloco B', voterName: 'Rodrigo Nogueira', isUsed: false, createdAt: Date.now() },
    ],
  };
}
