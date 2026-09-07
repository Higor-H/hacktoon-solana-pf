package com.mestre.voting.service;

import io.github.novacrypto.base58.Base58;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.crypto.generators.Ed25519KeyPairGenerator;
import org.bouncycastle.crypto.params.Ed25519KeyGenerationParameters;
import org.bouncycastle.crypto.params.Ed25519PrivateKeyParameters;
import org.bouncycastle.crypto.params.Ed25519PublicKeyParameters;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
public class SolanaWalletService {

    public static class Wallet {
        public String address;
        public String base58PrivateKey; // Contains 64 bytes (secret + public)
    }

    public Wallet createCustodialWallet() {
        Ed25519KeyPairGenerator generator = new Ed25519KeyPairGenerator();
        generator.init(new Ed25519KeyGenerationParameters(new SecureRandom()));
        AsymmetricCipherKeyPair keyPair = generator.generateKeyPair();
        
        Ed25519PrivateKeyParameters privateKey = (Ed25519PrivateKeyParameters) keyPair.getPrivate();
        Ed25519PublicKeyParameters publicKey = (Ed25519PublicKeyParameters) keyPair.getPublic();

        byte[] pubKeyBytes = publicKey.getEncoded();
        byte[] privKeyBytes = privateKey.getEncoded(); // This is 32 bytes

        // Solana requires the 64-byte private key format (32 bytes secret + 32 bytes public)
        byte[] solanaPrivateKey = new byte[64];
        System.arraycopy(privKeyBytes, 0, solanaPrivateKey, 0, 32);
        System.arraycopy(pubKeyBytes, 0, solanaPrivateKey, 32, 32);

        Wallet wallet = new Wallet();
        wallet.address = Base58.base58Encode(pubKeyBytes);
        wallet.base58PrivateKey = Base58.base58Encode(solanaPrivateKey);
        
        return wallet;
    }
}
