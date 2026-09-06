import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Converte Uint8Array para hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converte hex string para Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Calcula SHA-256 via Web Crypto API nativa do navegador
 */
export async function sha256(input: string | Uint8Array): Promise<string> {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  return bytesToHex(new Uint8Array(hashBuffer));
}

export async function sha256Bytes(input: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', input as unknown as BufferSource);
  return new Uint8Array(hashBuffer);
}

/**
 * Hash de combinação de dois nós da árvore com ordenação canônica (menor hash primeiro).
 * Compatível exatamente com programs/urnasol/src/crypto.rs
 */
export async function hashPair(leftHex: string, rightHex: string): Promise<string> {
  const [first, second] = leftHex <= rightHex ? [leftHex, rightHex] : [rightHex, leftHex];
  const combinedBytes = new Uint8Array([...hexToBytes(first), ...hexToBytes(second)]);
  return await sha256(combinedBytes);
}

export interface MerkleTree {
  leaves: string[];
  layers: string[][];
  root: string;
}

/**
 * Constrói a árvore de Merkle a partir de uma lista de hashes das folhas (leaves)
 */
export async function buildMerkleTree(leaves: string[]): Promise<MerkleTree> {
  if (leaves.length === 0) {
    const emptyRoot = await sha256('EMPTY_MERKLE_TREE_URNASOL');
    return {
      leaves: [],
      layers: [[emptyRoot]],
      root: emptyRoot,
    };
  }

  const layers: string[][] = [leaves];
  let currentLayer = leaves;

  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      if (i + 1 < currentLayer.length) {
        const parent = await hashPair(currentLayer[i], currentLayer[i + 1]);
        nextLayer.push(parent);
      } else {
        // Se for ímpar, duplica o último nó para manter árvore completa
        const parent = await hashPair(currentLayer[i], currentLayer[i]);
        nextLayer.push(parent);
      }
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return {
    leaves,
    layers,
    root: currentLayer[0],
  };
}

/**
 * Gera a prova de inclusão (Merkle Proof) para uma folha específica
 */
export function getMerkleProof(tree: MerkleTree, leafIndex: number): string[] {
  if (leafIndex < 0 || leafIndex >= tree.leaves.length) {
    throw new Error('Índice da folha fora dos limites da árvore');
  }

  const proof: string[] = [];
  let index = leafIndex;

  for (let layerIndex = 0; layerIndex < tree.layers.length - 1; layerIndex++) {
    const layer = tree.layers[layerIndex];
    const isRight = index % 2 === 1;
    const siblingIndex = isRight ? index - 1 : index + 1;

    if (siblingIndex < layer.length) {
      proof.push(layer[siblingIndex]);
    } else {
      // Se não tem irmão ímpar, foi duplicado a si mesmo
      proof.push(layer[index]);
    }

    index = Math.floor(index / 2);
  }

  return proof;
}

/**
 * Verifica se a prova de Merkle é válida contra a raiz fornecida
 */
export async function verifyMerkleProof(
  leaf: string,
  proof: string[],
  root: string
): Promise<boolean> {
  let computedHash = leaf;

  for (const sibling of proof) {
    computedHash = await hashPair(computedHash, sibling);
  }

  return computedHash.toLowerCase() === root.toLowerCase();
}

/**
 * Gera um par de chaves assimétricas Ed25519 para uma nova Urna
 */
export function generateUrnaKeypair(): {
  publicKey: string;
  secretKey: string;
  publicKeyBytes: Uint8Array;
  secretKeyBytes: Uint8Array;
} {
  const pair = nacl.sign.keyPair();
  return {
    publicKey: bs58.encode(pair.publicKey),
    secretKey: bs58.encode(pair.secretKey),
    publicKeyBytes: pair.publicKey,
    secretKeyBytes: pair.secretKey,
  };
}

/**
 * Assina um digest com a chave privada Ed25519 da Urna
 */
export function signDigest(secretKeyBase58: string, digestHex: string): string {
  const secretKey = bs58.decode(secretKeyBase58);
  const digestBytes = hexToBytes(digestHex);
  const signature = nacl.sign.detached(digestBytes, secretKey);
  return bytesToHex(signature);
}

/**
 * Verifica a assinatura Ed25519 do Boletim de Urna
 */
export function verifySignature(
  publicKeyBase58: string,
  digestHex: string,
  signatureHex: string
): boolean {
  try {
    const publicKey = bs58.decode(publicKeyBase58);
    const digestBytes = hexToBytes(digestHex);
    const signatureBytes = hexToBytes(signatureHex);
    return nacl.sign.detached.verify(digestBytes, signatureBytes, publicKey);
  } catch {
    return false;
  }
}

/**
 * Gera um código de comprovante legível e o hash da folha da árvore de Merkle
 */
export async function generateVoterReceipt(
  electionId: string,
  urnaId: string
): Promise<{ receiptCode: string; receiptHash: string; salt: string }> {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const salt = bytesToHex(randomBytes);

  // Formato legível: URNSOL-XXXX-YYYY (ex: URNSOL-4F2A-89BC)
  const partA = salt.substring(0, 4).toUpperCase();
  const partB = salt.substring(4, 8).toUpperCase();
  const receiptCode = `URNSOL-${partA}-${partB}`;

  // Folha de Merkle: SHA256(URNASOL_LEAF || electionId || urnaId || receiptCode || salt)
  const leafData = `URNASOL_LEAF:${electionId}:${urnaId}:${receiptCode}:${salt}`;
  const receiptHash = await sha256(leafData);

  return {
    receiptCode,
    receiptHash,
    salt,
  };
}

/**
 * Calcula o digest de integridade do Boletim de Urna para assinatura
 */
export async function computeBuDigest(
  electionId: string,
  urnaId: string,
  totalVotes: number,
  blankVotes: number,
  nullVotes: number,
  merkleRoot: string
): Promise<string> {
  const data = `URNASOL_BU_V1:${electionId}:${urnaId}:${totalVotes}:${blankVotes}:${nullVotes}:${merkleRoot}`;
  return await sha256(data);
}

/**
 * Embaralhamento Fisher-Yates com criptoaleatoriedade para o RDV (Registro Digital do Voto).
 * Garante que a ordem temporal de chegada à cabine não revele o voto.
 */
export function shuffleArray<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const j = randomBuffer[0] % (i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
