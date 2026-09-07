package com.mestre.voting.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SolanaRpcService {

    private static final String DEVNET_URL = "https://api.devnet.solana.com";
    private final RestTemplate restTemplate = new RestTemplate();

    public String getRecentBlockhash() {
        Map<String, Object> request = new HashMap<>();
        request.put("jsonrpc", "2.0");
        request.put("id", 1);
        request.put("method", "getLatestBlockhash");
        request.put("params", List.of(Map.of("commitment", "finalized")));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

        Map<String, Object> response = restTemplate.postForObject(DEVNET_URL, entity, Map.class);
        
        try {
            Map<String, Object> result = (Map<String, Object>) response.get("result");
            Map<String, Object> value = (Map<String, Object>) result.get("value");
            return (String) value.get("blockhash");
        } catch (Exception e) {
            throw new RuntimeException("Failed to get recent blockhash from Solana devnet", e);
        }
    }

    public String registerVoteOnChain(String voterAddress, String base58PrivateKey, String voteHash) {
        // In a full implementation without a dedicated Solana library (like solana4j), 
        // we would need to manually construct the Solana Message byte array,
        // sign it with the Ed25519 private key, and encode the final transaction to Base64.
        // For the sake of this setup, we simulate the RPC call for the transaction submission.
        
        String blockhash = getRecentBlockhash();
        System.out.println("Got blockhash for vote transaction: " + blockhash);
        
        // Simulated Transaction Hash (tx_hash)
        String simulatedTxHash = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        
        System.out.println("Simulating Vote On-Chain for voter: " + voterAddress + " with hash: " + voteHash);
        
        return simulatedTxHash; // Return the simulated tx_hash
    }
}
