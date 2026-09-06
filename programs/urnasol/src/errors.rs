use anchor_lang::prelude::*;

#[error_code]
pub enum UrnaSolError {
    #[msg("A eleicao nao esta ativa para votacao ou recebimento de BUs.")]
    ElectionNotActive,

    #[msg("A Urna informada ja foi registrada anteriormente.")]
    UrnaAlreadyRegistered,

    #[msg("A Urna nao esta autorizada para esta eleicao.")]
    UrnaNotAuthorized,

    #[msg("O Boletim de Urna (BU) desta urna ja foi submetido.")]
    BoletimAlreadySubmitted,

    #[msg("A soma dos votos dos candidatos, brancos e nulos nao confere com o total informado.")]
    InvalidTallyTotal,

    #[msg("A assinatura digital Ed25519 do Boletim de Urna e invalida.")]
    InvalidSignature,

    #[msg("O comprovante informado nao pertence a arvore de Merkle desta urna.")]
    InvalidMerkleProof,

    #[msg("O total de votos computados excede o numero de votantes aptos registrados.")]
    VoterCountExceeded,

    #[msg("Candidato nao cadastrado na eleicao.")]
    CandidateNotFound,

    #[msg("Voce nao tem autorizacao para executar esta acao.")]
    Unauthorized,

    #[msg("Tamanho de texto excedeu o limite maximo permitido.")]
    StringTooLong,

    #[msg("Numero maximo de candidatos excedido.")]
    TooManyCandidates,
}
