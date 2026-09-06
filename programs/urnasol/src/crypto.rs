use solana_program::hash::hashv;

/// Verifica se uma folha (leaf) pertence a uma raiz Merkle dada uma prova (proof).
/// Usa ordenacao canonica (menor hash primeiro) para evitar ataques de segundo pre-imagem.
pub fn verify_merkle_leaf(leaf: &[u8; 32], root: &[u8; 32], proof: &[[u8; 32]]) -> bool {
    let mut computed_hash = *leaf;

    for sibling in proof {
        if computed_hash <= *sibling {
            let combined = hashv(&[&computed_hash, sibling]);
            computed_hash.copy_from_slice(combined.as_ref());
        } else {
            let combined = hashv(&[sibling, &computed_hash]);
            computed_hash.copy_from_slice(combined.as_ref());
        }
    }

    &computed_hash == root
}

/// Cria o digest de verificacao de integridade do Boletim de Urna:
/// SHA256(election_id || urna_id || total_votes || blank_votes || null_votes || merkle_root)
pub fn compute_bu_digest(
    election_id: &str,
    urna_id: &str,
    total_votes: u32,
    blank_votes: u32,
    null_votes: u32,
    merkle_root: &[u8; 32],
) -> [u8; 32] {
    let total_bytes = total_votes.to_le_bytes();
    let blank_bytes = blank_votes.to_le_bytes();
    let null_bytes = null_votes.to_le_bytes();

    let digest = hashv(&[
        b"URNASOL_BU_V1",
        election_id.as_bytes(),
        urna_id.as_bytes(),
        &total_bytes,
        &blank_bytes,
        &null_bytes,
        merkle_root,
    ]);

    let mut out = [0u8; 32];
    out.copy_from_slice(digest.as_ref());
    out
}
