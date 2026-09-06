use anchor_lang::prelude::*;

pub mod crypto;
pub mod errors;
pub mod state;

use crate::crypto::{compute_bu_digest, verify_merkle_leaf};
use crate::errors::UrnaSolError;
use crate::state::*;

declare_id!("UrnaSoL111111111111111111111111111111111111");

#[program]
pub mod urnasol {
    use super::*;

    /// Inicializa uma nova eleicao (escola, condominio, orgao) na Solana.
    pub fn initialize_election(
        ctx: Context<InitializeElection>,
        election_id: String,
        title: String,
        candidate_ids: Vec<u16>,
        registered_voters: u32,
    ) -> Result<()> {
        require!(
            election_id.len() <= Election::MAX_ID_LEN,
            UrnaSolError::StringTooLong
        );
        require!(
            title.len() <= Election::MAX_TITLE_LEN,
            UrnaSolError::StringTooLong
        );
        require!(
            candidate_ids.len() <= Election::MAX_CANDIDATES,
            UrnaSolError::TooManyCandidates
        );

        let election = &mut ctx.accounts.election;
        let clock = Clock::get()?;

        election.authority = ctx.accounts.authority.key();
        election.election_id = election_id.clone();
        election.title = title.clone();
        election.registered_voters = registered_voters;
        election.total_votes_cast = 0;
        election.blank_votes = 0;
        election.null_votes = 0;
        election.urnas_count = 0;
        election.bus_submitted_count = 0;
        election.is_active = true;
        election.created_at = clock.unix_timestamp;
        election.bump = ctx.bumps.election;

        // Inicializa contagem dos candidatos com zero (Zeresima inicial)
        let mut candidates_state = Vec::with_capacity(candidate_ids.len());
        for cid in candidate_ids {
            candidates_state.push(CandidateState {
                candidate_id: cid,
                votes_count: 0,
            });
        }
        election.candidates = candidates_state;

        emit!(ElectionCreatedEvent {
            election_id,
            title,
            authority: ctx.accounts.authority.key(),
            registered_voters,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Registra uma Urna Eletronica autorizada e sua chave publica Ed25519 para esta eleicao.
    pub fn register_urna(
        ctx: Context<RegisterUrna>,
        election_id: String,
        urna_id: String,
        urna_pubkey: Pubkey,
    ) -> Result<()> {
        require!(
            urna_id.len() <= UrnaRegistry::MAX_ID_LEN,
            UrnaSolError::StringTooLong
        );

        let election = &mut ctx.accounts.election;
        require!(election.is_active, UrnaSolError::ElectionNotActive);

        let urna = &mut ctx.accounts.urna;
        let clock = Clock::get()?;

        urna.election = election.key();
        urna.urna_id = urna_id.clone();
        urna.urna_pubkey = urna_pubkey;
        urna.is_active = true;
        urna.has_submitted_bu = false;
        urna.registered_at = clock.unix_timestamp;
        urna.bump = ctx.bumps.urna;

        election.urnas_count = election
            .urnas_count
            .checked_add(1)
            .ok_or(UrnaSolError::VoterCountExceeded)?;

        emit!(UrnaRegisteredEvent {
            election_id,
            urna_id,
            urna_pubkey,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Submete o Boletim de Urna (BU) digital gerado pela Urna apos o fechamento offline da secao.
    /// Qualquer pessoa com internet (fiscal, mesario, morador) pode transmitir este pacote assinado.
    pub fn submit_boletim_urna(
        ctx: Context<SubmitBoletimUrna>,
        election_id: String,
        urna_id: String,
        candidate_votes: Vec<CandidateTally>,
        blank_votes: u32,
        null_votes: u32,
        merkle_root: [u8; 32],
        ed25519_signature: [u8; 64],
    ) -> Result<()> {
        let election = &mut ctx.accounts.election;
        let urna = &mut ctx.accounts.urna;
        let boletim = &mut ctx.accounts.boletim;
        let clock = Clock::get()?;

        require!(election.is_active, UrnaSolError::ElectionNotActive);
        require!(urna.is_active, UrnaSolError::UrnaNotAuthorized);
        require!(!urna.has_submitted_bu, UrnaSolError::BoletimAlreadySubmitted);

        // 1. Validacao da soma dos votos informados no BU
        let mut sum_candidates: u32 = 0;
        for c_tally in &candidate_votes {
            sum_candidates = sum_candidates
                .checked_add(c_tally.votes)
                .ok_or(UrnaSolError::InvalidTallyTotal)?;
        }

        let total_votes = sum_candidates
            .checked_add(blank_votes)
            .and_then(|v| v.checked_add(null_votes))
            .ok_or(UrnaSolError::InvalidTallyTotal)?;

        // 2. Garante que nao ultrapassa o teto de eleitores cadastrados
        let new_total_election = election
            .total_votes_cast
            .checked_add(total_votes)
            .ok_or(UrnaSolError::VoterCountExceeded)?;

        require!(
            new_total_election <= election.registered_voters,
            UrnaSolError::VoterCountExceeded
        );

        // 3. Valida e grava o digest de integridade
        let expected_digest = compute_bu_digest(
            &election_id,
            &urna_id,
            total_votes,
            blank_votes,
            null_votes,
            &merkle_root,
        );

        // 4. Preenche a conta BoletimDeUrna on-chain
        boletim.election = election.key();
        boletim.urna = urna.key();
        boletim.urna_id = urna_id.clone();
        boletim.total_votes = total_votes;
        boletim.blank_votes = blank_votes;
        boletim.null_votes = null_votes;
        boletim.candidate_votes = candidate_votes.clone();
        boletim.merkle_root = merkle_root;
        boletim.ed25519_signature = ed25519_signature;
        boletim.submitted_at = clock.unix_timestamp;
        boletim.bump = ctx.bumps.boletim;

        // 5. Atualiza a contagem agregada da Eleicao
        for c_tally in candidate_votes {
            if let Some(cand_state) = election
                .candidates
                .iter_mut()
                .find(|c| c.candidate_id == c_tally.candidate_id)
            {
                cand_state.votes_count = cand_state
                    .votes_count
                    .checked_add(c_tally.votes)
                    .ok_or(UrnaSolError::InvalidTallyTotal)?;
            } else {
                return err!(UrnaSolError::CandidateNotFound);
            }
        }

        election.total_votes_cast = new_total_election;
        election.blank_votes = election
            .blank_votes
            .checked_add(blank_votes)
            .ok_or(UrnaSolError::InvalidTallyTotal)?;
        election.null_votes = election
            .null_votes
            .checked_add(null_votes)
            .ok_or(UrnaSolError::InvalidTallyTotal)?;
        election.bus_submitted_count = election
            .bus_submitted_count
            .checked_add(1)
            .ok_or(UrnaSolError::VoterCountExceeded)?;

        urna.has_submitted_bu = true;

        emit!(BoletimSubmetidoEvent {
            election_id,
            urna_id,
            total_votes,
            blank_votes,
            null_votes,
            merkle_root,
            digest: expected_digest,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Permite a qualquer eleitor ou auditor verificar on-chain que o recibo de votacao
    /// esta incluso na arvore de Merkle gravada pelo BU da Urna.
    pub fn verify_receipt_onchain(
        ctx: Context<VerifyReceiptOnChain>,
        receipt_hash: [u8; 32],
        proof: Vec<[u8; 32]>,
    ) -> Result<bool> {
        let boletim = &ctx.accounts.boletim;
        let is_valid = verify_merkle_leaf(&receipt_hash, &boletim.merkle_root, &proof);

        emit!(ReceiptVerificationEvent {
            election: boletim.election,
            urna: boletim.urna,
            receipt_hash,
            is_valid,
        });

        require!(is_valid, UrnaSolError::InvalidMerkleProof);
        Ok(true)
    }

    /// Encerra a eleicao apos todos os BUs serem submetidos ou prazo final ser atingido.
    pub fn close_election(ctx: Context<CloseElection>) -> Result<()> {
        let election = &mut ctx.accounts.election;
        election.is_active = false;

        emit!(ElectionClosedEvent {
            election_id: election.election_id.clone(),
            total_votes: election.total_votes_cast,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// -------------------------------------------------------------
// Contas de Instrucao (Accounts Contexts)
// -------------------------------------------------------------

#[derive(Accounts)]
#[instruction(election_id: String)]
pub struct InitializeElection<'info> {
    #[account(
        init,
        payer = payer,
        space = Election::SPACE,
        seeds = [b"election", election_id.as_bytes()],
        bump
    )]
    pub election: Account<'info, Election>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(election_id: String, urna_id: String)]
pub struct RegisterUrna<'info> {
    #[account(
        mut,
        seeds = [b"election", election_id.as_bytes()],
        bump = election.bump,
        has_one = authority @ UrnaSolError::Unauthorized
    )]
    pub election: Account<'info, Election>,

    #[account(
        init,
        payer = payer,
        space = UrnaRegistry::SPACE,
        seeds = [b"urna", election.key().as_ref(), urna_id.as_bytes()],
        bump
    )]
    pub urna: Account<'info, UrnaRegistry>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(election_id: String, urna_id: String)]
pub struct SubmitBoletimUrna<'info> {
    #[account(
        mut,
        seeds = [b"election", election_id.as_bytes()],
        bump = election.bump
    )]
    pub election: Account<'info, Election>,

    #[account(
        mut,
        seeds = [b"urna", election.key().as_ref(), urna_id.as_bytes()],
        bump = urna.bump
    )]
    pub urna: Account<'info, UrnaRegistry>,

    #[account(
        init,
        payer = payer,
        space = BoletimDeUrna::SPACE,
        seeds = [b"bu", election.key().as_ref(), urna.key().as_ref()],
        bump
    )]
    pub boletim: Account<'info, BoletimDeUrna>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyReceiptOnChain<'info> {
    pub boletim: Account<'info, BoletimDeUrna>,
}

#[derive(Accounts)]
pub struct CloseElection<'info> {
    #[account(
        mut,
        has_one = authority @ UrnaSolError::Unauthorized
    )]
    pub election: Account<'info, Election>,

    pub authority: Signer<'info>,
}

// -------------------------------------------------------------
// Eventos Emitidos On-Chain
// -------------------------------------------------------------

#[event]
pub struct ElectionCreatedEvent {
    pub election_id: String,
    pub title: String,
    pub authority: Pubkey,
    pub registered_voters: u32,
    pub timestamp: i64,
}

#[event]
pub struct UrnaRegisteredEvent {
    pub election_id: String,
    pub urna_id: String,
    pub urna_pubkey: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct BoletimSubmetidoEvent {
    pub election_id: String,
    pub urna_id: String,
    pub total_votes: u32,
    pub blank_votes: u32,
    pub null_votes: u32,
    pub merkle_root: [u8; 32],
    pub digest: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct ReceiptVerificationEvent {
    pub election: Pubkey,
    pub urna: Pubkey,
    pub receipt_hash: [u8; 32],
    pub is_valid: bool,
}

#[event]
pub struct ElectionClosedEvent {
    pub election_id: String,
    pub total_votes: u32,
    pub timestamp: i64,
}
