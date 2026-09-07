CREATE TABLE users (
    id UUID PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    cpf_hash VARCHAR(255) UNIQUE NOT NULL,
    data_nascimento DATE NOT NULL,
    wallet_address VARCHAR(255),
    wallet_private_key_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE groups (
    id UUID PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    criador_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE group_members (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

CREATE TABLE polls (
    id UUID PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    criador_id UUID REFERENCES users(id),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_encerramento TIMESTAMP WITH TIME ZONE NOT NULL,
    tipo_voto VARCHAR(50) NOT NULL, -- ANONIMO, NAO_ANONIMO
    status VARCHAR(50) NOT NULL, -- ABERTA, ENCERRADA
    tx_hash_criacao VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE poll_options (
    id UUID PRIMARY KEY,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    texto_opcao VARCHAR(255) NOT NULL
);

CREATE TABLE votes (
    id UUID PRIMARY KEY,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    cpf_hash VARCHAR(255),
    tx_hash VARCHAR(255),
    synced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, cpf_hash) -- Impede duplo voto
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    tipo VARCHAR(100) NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
