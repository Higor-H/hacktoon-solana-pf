package com.mestre.voting.service;

import com.mestre.voting.model.User;
import com.mestre.voting.repository.UserRepository;
import com.mestre.voting.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final CryptoUtils cryptoUtils;
    private final SolanaWalletService solanaWalletService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil, CryptoUtils cryptoUtils, SolanaWalletService solanaWalletService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.cryptoUtils = cryptoUtils;
        this.solanaWalletService = solanaWalletService;
    }

    public String register(User user, String rawPassword, String rawCpf) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email already in use");
        }
        
        String cpfHash = cryptoUtils.hashCpf(rawCpf);
        if (userRepository.findByCpfHash(cpfHash).isPresent()) {
            throw new RuntimeException("CPF already registered");
        }

        user.setSenhaHash(passwordEncoder.encode(rawPassword));
        user.setCpfHash(cpfHash);

        // Generate Solana Wallet
        SolanaWalletService.Wallet wallet = solanaWalletService.createCustodialWallet();
        user.setWalletAddress(wallet.address);
        user.setWalletPrivateKeyEncrypted(cryptoUtils.encrypt(wallet.base58PrivateKey));

        userRepository.save(user);

        return jwtUtil.generateToken(user.getEmail());
    }

    public String login(String email, String rawPassword) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty() || !passwordEncoder.matches(rawPassword, userOpt.get().getSenhaHash())) {
            throw new RuntimeException("Invalid email or password");
        }

        return jwtUtil.generateToken(email);
    }
}
