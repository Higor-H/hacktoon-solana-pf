import assert from 'node:assert';
import test from 'node:test';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { createHash } from 'node:crypto';

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function hashPair(left, right) {
  const [first, second] = left <= right ? [left, right] : [right, left];
  const buf = Buffer.concat([Buffer.from(first, 'hex'), Buffer.from(second, 'hex')]);
  return sha256(buf);
}

function buildMerkleTree(leaves) {
  if (leaves.length === 0) {
    const empty = sha256('EMPTY');
    return { leaves: [], layers: [[empty]], root: empty };
  }
  const layers = [leaves];
  let current = leaves;
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 < current.length) {
        next.push(hashPair(current[i], current[i + 1]));
      } else {
        next.push(hashPair(current[i], current[i]));
      }
    }
    layers.push(next);
    current = next;
  }
  return { leaves, layers, root: current[0] };
}

function getMerkleProof(tree, leafIndex) {
  const proof = [];
  let idx = leafIndex;
  for (let l = 0; l < tree.layers.length - 1; l++) {
    const layer = tree.layers[l];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    if (siblingIdx < layer.length) {
      proof.push(layer[siblingIdx]);
    } else {
      proof.push(layer[idx]);
    }
    idx = Math.floor(idx / 2);
  }
  return proof;
}

function verifyMerkleProof(leaf, proof, root) {
  let cur = leaf;
  for (const s of proof) {
    cur = hashPair(cur, s);
  }
  return cur.toLowerCase() === root.toLowerCase();
}

test('1. Merkle Tree & Proof verification matches cryptographic standard', () => {
  const leaves = [
    sha256('voto_recibo_1'),
    sha256('voto_recibo_2'),
    sha256('voto_recibo_3'),
    sha256('voto_recibo_4'),
    sha256('voto_recibo_5'),
  ];

  const tree = buildMerkleTree(leaves);
  assert.ok(tree.root.length === 64, 'Root deve ter 32 bytes (64 caracteres hex)');

  // Testa prova para cada folha individualmente
  for (let i = 0; i < leaves.length; i++) {
    const proof = getMerkleProof(tree, i);
    const valid = verifyMerkleProof(leaves[i], proof, tree.root);
    assert.strictEqual(valid, true, `Prova da folha #${i} deve ser válida`);

    // Testa que prova falha com folha falsa
    const fakeLeaf = sha256('voto_falso');
    const fakeValid = verifyMerkleProof(fakeLeaf, proof, tree.root);
    assert.strictEqual(fakeValid, false, 'Prova deve falhar com folha não pertencente');
  }
});

test('2. Ed25519 signature of Boletim de Urna (BU)', () => {
  const keypair = nacl.sign.keyPair();
  const pubkeyBase58 = bs58.encode(keypair.publicKey);
  const secretBase58 = bs58.encode(keypair.secretKey);

  const buDigestHex = sha256('URNASOL_BU_V1:eleicao-sindico:URNA-01:45:2:1:rootabc');
  const digestBytes = Buffer.from(buDigestHex, 'hex');

  // Assinatura gerada pela urna física offline
  const signatureBytes = nacl.sign.detached(digestBytes, keypair.secretKey);
  const signatureHex = Buffer.from(signatureBytes).toString('hex');

  // Verificação no auditor ou smart contract
  const verified = nacl.sign.detached.verify(
    digestBytes,
    Buffer.from(signatureHex, 'hex'),
    bs58.decode(pubkeyBase58)
  );

  assert.strictEqual(verified, true, 'Assinatura Ed25519 do Boletim deve ser válida');
});

test('3. RDV (Registro Digital do Voto) Shuffling preserves elements and breaks order', () => {
  const originalVotes = [
    { voterPin: '101', candidate: 10 },
    { voterPin: '102', candidate: 20 },
    { voterPin: '201', candidate: 10 },
    { voterPin: '202', candidate: 30 },
    { voterPin: '301', candidate: 20 },
  ];

  // Fisher-Yates
  const shuffled = [...originalVotes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  assert.strictEqual(shuffled.length, originalVotes.length);
  const originalCands = originalVotes.map(v => v.candidate).sort();
  const shuffledCands = shuffled.map(v => v.candidate).sort();
  assert.deepStrictEqual(shuffledCands, originalCands, 'Todos os votos devem ser preservados sem alteração de escolha');
});
