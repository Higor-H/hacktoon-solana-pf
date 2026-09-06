# 🗳️ UrnaSol: Sistema de Votação Eletrônica Auditável & Offline na Solana

> **Projeto de Hackathon Solana**: Sistema de votação eletrônica de alta integridade, inspirado na arquitetura da **Urna Eletrônica Brasileira (TSE)** e potencializado pela imutabilidade e alta performance da blockchain **Solana**.

---

## 🌟 Resumo do Projeto

O **UrnaSol** foi concebido para resolver o dilema entre **sigilo do voto**, **auditabilidade fim a fim (End-to-End Verifiability - E2E-V)** e **operação segura em ambientes desconectados (Air-Gap)**. 

Ele atende tanto a pleitos tradicionais quanto a cenários práticos de mercado B2B sem exigir conhecimento prévio de Web3 dos eleitores:
- **Eleições de Condomínio**: Escolha de síndico e conselho com votantes organizados por apartamentos/blocos.
- **Eleições Escolares e Universitárias**: Escolha de diretores, coordenadores e grêmios estudantis com votantes identificados por matrícula.
- **Clubes, Associações e Cooperativas**: Assembleias gerais com apuração rápida e transparente.

---

## 🛡️ Como as 3 Premissas são Resolvidas

### 1. O Voto é Secreto
- **Registro Digital do Voto (RDV)**: Inspirado no sistema do TSE, a cabine de votação grava cada voto em um vetor desordenado com embaralhamento pseudoaleatório (*Fisher-Yates Shuffle* com entropia criptográfica).
- **Desvinculação de Identidade**: O mesário realiza o check-in do votante para garantir que ele só vote uma vez, mas a cabine de votação **nunca armazena o nome, CPF, apartamento ou carteira do votante vinculado à sua escolha**.
- **Resultado Agregado**: Na blockchain Solana, são gravados apenas a soma dos votos do Boletim de Urna (BU) e a raiz da Árvore de Merkle dos comprovantes emitidos.

### 2. Comprovação de Voto no Resultado (E2E-V)
- **Individual Verifiability ("Meu voto foi computado?")**:
  - Ao confirmar o voto, a urna emite um **Comprovante de Votação** com código legível (`URNSOL-XXXX-YYYY`) e hash criptográfico (`Leaf`).
  - O comprovante não revela o candidato escolhido, mas o seu hash é uma folha da **Árvore de Merkle** daquela urna.
  - No **Portal de Transparência**, o eleitor insere seu código e o sistema computa a **Merkle Proof** contra a raiz gravada de forma imutável na conta PDA da Solana.
- **Universal Verifiability ("A eleição foi íntegra?")**:
  - A apuração total da eleição é computada on-chain a partir da soma dos BUs válidos.
  - Qualquer auditor independente ou fiscal de chapa pode verificar:
    - A assinatura Ed25519 de cada Urna;
    - Que a soma de votos confere com o total de cédulas no Merkle Tree;
    - Que nenhuma Urna transmitiu duas vezes (prevenção de replay);
    - A Zerésima inicial (0 votos em todos os contadores no início).

### 3. Operação 100% Offline na Cabine com Integridade Garantida
- **Air-Gap Seguro**: Durante todo o período de votação, a Urna Eletrônica opera **desconectada de qualquer rede**.
- **Criptografia Assimétrica (Ed25519)**: Cada Urna física possui um par de chaves próprio, registrado no contrato inteligente durante a fase de carga.
- **Boletim de Urna (BU) via QR Code**: No fechamento da seção (17h), a urna gera o BU assinado digitalmente e o exibe em um **QR Code de alta densidade**. Qualquer smartphone com internet escaneia o QR Code e transmite a transação para a Solana. A Urna física **nunca precisa tocar a internet**.

---

## 🏗️ Arquitetura do Sistema

```
hacktoon-solana-pf/
├── programs/
│   └── urnasol/                     # Programa Anchor em Rust
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs               # Entrypoint Anchor: initialize, register_urna, submit_bu, verify_receipt
│           ├── state.rs             # Contas PDAs (Election, UrnaRegistry, BoletimDeUrna)
│           ├── errors.rs            # Códigos de erro customizados
│           └── crypto.rs            # Verificação de Merkle Leaf e Digest do BU
├── app/                             # Aplicação Web (React + TypeScript + Vite + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   ├── UrnaTerminal.tsx     # Gabinete Físico da Urna (Tela LCD, Teclado, Sons, Comprovante)
│   │   │   ├── MesarioTerminal.tsx  # Check-in de votantes, caderno e liberação de cabine
│   │   │   ├── BoletimUrnaView.tsx  # Fita térmica oficial do BU, QR Code e envio para Solana
│   │   │   ├── AuditoriaPortal.tsx  # Verificador E2E-V de Merkle Proof e apuração pública
│   │   │   ├── AdminDashboard.tsx   # Configuração de eleições, candidatos e geração de chaves Ed25519
│   │   │   └── Navbar.tsx           # Navegação, alternância de Urnas e status offline/online
│   │   ├── lib/
│   │   │   ├── audio.ts             # Síntese Web Audio API dos sons oficiais ("Pi-pi-pi-PÓ!")
│   │   │   ├── cryptoUtils.ts       # Árvore de Merkle, Ed25519, SHA-256 e Fisher-Yates RDV
│   │   │   ├── offlineUrna.ts       # Motor local da Urna (Zerésima, RDV, fechamento de BU)
│   │   │   ├── solanaService.ts     # Integração Solana Devnet, PDAs e verificação on-chain
│   │   │   ├── electionPresets.ts   # Modelos prontos para demonstração (Condomínio / Escola)
│   │   │   └── types.ts             # Definições de tipos TypeScript
│   │   ├── App.tsx
│   │   └── index.css                # Design system refinado com estética de hardware e Solana
├── tests/
│   └── test-crypto-flow.mjs         # Testes automatizados das propriedades criptográficas
├── target/idl/
│   └── urnasol.json                 # Interface IDL Anchor oficial
└── Anchor.toml                      # Configuração do workspace Anchor para Devnet/Localnet
```

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js (v20+ recomendado; testado no Node v24)
- npm (v10+)

### 1. Rodar a Aplicação Web
```bash
cd app
npm install
npm run dev
```
Acesse `http://localhost:5173` no navegador.

### 2. Rodar os Testes Criptográficos Automatizados
```bash
cd app
npm test
```
Saída esperada:
```
✔ 1. Merkle Tree & Proof verification matches cryptographic standard
✔ 2. Ed25519 signature of Boletim de Urna (BU)
✔ 3. RDV (Registro Digital do Voto) Shuffling preserves elements and breaks order
```

### 3. Compilar para Produção
```bash
cd app
npm run build
```

---

## 🎯 Roteiro de Demonstração para Jurados do Hackathon

1. **Check-in no Mesário**:
   - Vá na aba **Mesário**, busque pelo "Apto 101" ou "Mariana Costa" e clique em **Liberar Voto**.
   - O mesário autoriza e gera o PIN de votação.
2. **Votação na Cabine (Urna)**:
   - Vá na aba **Cabine (Urna)**.
   - Digite o número do candidato (ex: `10` para Carlos Eduardo ou `20` para Dra. Beatriz) usando os botões na tela ou o teclado do computador.
   - Veja a foto e os dados do candidato na tela.
   - Clique em **CONFIRMA** e ouça o som clássico da Urna Eletrônica ("*pi-pi-pi-PÓ!*").
   - A tela exibirá **FIM** e abrirá o **Comprovante de Votação com QR Code** e Código de Auditoria (ex: `URNSOL-4F2A-89BC`).
   - Copie o código gerado.
3. **Fechamento & Boletim de Urna**:
   - Vá na aba **Boletim (BU)**.
   - Veja a fita térmica oficial impressa com a apuração, a Zerésima auditada, a raiz Merkle e a assinatura Ed25519.
   - Clique em **Transmitir para a Solana Devnet**. Os dados são registrados on-chain com link para o Solana Explorer!
4. **Auditoria no Portal de Transparência**:
   - Vá na aba **Auditoria On-Chain**.
   - Cole o código do seu comprovante no campo de busca e clique em **Auditar Voto**.
   - Veja a validação matemática da **Merkle Proof**, confirmando que sua folha faz parte da raiz gravada na Solana com chuva de confetes!

---

## 👥 Tecnologias Utilizadas
- **Blockchain**: Solana (Anchor Framework 0.30, Solana Web3.js, `@solana/kit` ready)
- **Criptografia**: Ed25519 (TweetNaCl), SHA-256 (Web Crypto API / Subtle), Árvore de Merkle binária canonizada, Fisher-Yates RDV
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4, Lucide Icons, Canvas-Confetti, QRCode
- **Áudio**: Web Audio API (síntese analógica sem dependências de arquivos externos)