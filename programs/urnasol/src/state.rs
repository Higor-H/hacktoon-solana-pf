use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct CandidateState {
    pub candidate_id: u16,
    pub votes_count: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct CandidateTally {
    pub candidate_id: u16,
    pub votes: u32,
}

#[account]
pub struct Election {
    pub authority: Pubkey,
    pub election_id: String,
    pub title: String,
    pub registered_voters: u32,
    pub total_votes_cast: u32,
    pub blank_votes: u32,
    pub null_votes: u32,
    pub candidates: Vec<CandidateState>,
    pub urnas_count: u16,
    pub bus_submitted_count: u16,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl Election {
    pub const MAX_ID_LEN: usize = 32;
    pub const MAX_TITLE_LEN: usize = 64;
    pub const MAX_CANDIDATES: usize = 16;

    pub const SPACE: usize = 8 // discriminator
        + 32 // authority
        + (4 + Self::MAX_ID_LEN) // election_id
        + (4 + Self::MAX_TITLE_LEN) // title
        + 4 // registered_voters
        + 4 // total_votes_cast
        + 4 // blank_votes
        + 4 // null_votes
        + (4 + Self::MAX_CANDIDATES * (2 + 4)) // candidates vector
        + 2 // urnas_count
        + 2 // bus_submitted_count
        + 1 // is_active
        + 8 // created_at
        + 1 // bump
        + 64; // buffer
}

#[account]
pub struct UrnaRegistry {
    pub election: Pubkey,
    pub urna_id: String,
    pub urna_pubkey: Pubkey,
    pub is_active: bool,
    pub has_submitted_bu: bool,
    pub registered_at: i64,
    pub bump: u8,
}

impl UrnaRegistry {
    pub const MAX_ID_LEN: usize = 32;

    pub const SPACE: usize = 8 // discriminator
        + 32 // election
        + (4 + Self::MAX_ID_LEN) // urna_id
        + 32 // urna_pubkey
        + 1 // is_active
        + 1 // has_submitted_bu
        + 8 // registered_at
        + 1 // bump
        + 32; // buffer
}

#[account]
pub struct BoletimDeUrna {
    pub election: Pubkey,
    pub urna: Pubkey,
    pub urna_id: String,
    pub total_votes: u32,
    pub blank_votes: u32,
    pub null_votes: u32,
    pub candidate_votes: Vec<CandidateTally>,
    pub merkle_root: [u8; 32],
    pub ed25519_signature: [u8; 64],
    pub submitted_at: i64,
    pub bump: u8,
}

impl BoletimDeUrna {
    pub const MAX_ID_LEN: usize = 32;
    pub const MAX_CANDIDATES: usize = 16;

    pub const SPACE: usize = 8 // discriminator
        + 32 // election
        + 32 // urna
        + (4 + Self::MAX_ID_LEN) // urna_id
        + 4 // total_votes
        + 4 // blank_votes
        + 4 // null_votes
        + (4 + Self::MAX_CANDIDATES * (2 + 4)) // candidate_votes
        + 32 // merkle_root
        + 64 // ed25519_signature
        + 8 // submitted_at
        + 1 // bump
        + 64; // buffer
}
