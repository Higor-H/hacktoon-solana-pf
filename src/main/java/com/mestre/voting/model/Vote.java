package com.mestre.voting.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "votes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"poll_id", "cpf_hash"})
})
public class Vote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "poll_id", nullable = false)
    private Poll poll;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_id", nullable = false)
    private PollOption option;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user; // Null if anonymous vote

    @Column(name = "cpf_hash")
    private String cpfHash; // Used for offline kiosk validation

    @Column(name = "tx_hash")
    private String txHash; // Solana transaction hash

    @Column(nullable = false)
    private Boolean synced = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Poll getPoll() { return poll; }
    public void setPoll(Poll poll) { this.poll = poll; }

    public PollOption getOption() { return option; }
    public void setOption(PollOption option) { this.option = option; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getCpfHash() { return cpfHash; }
    public void setCpfHash(String cpfHash) { this.cpfHash = cpfHash; }

    public String getTxHash() { return txHash; }
    public void setTxHash(String txHash) { this.txHash = txHash; }

    public Boolean getSynced() { return synced; }
    public void setSynced(Boolean synced) { this.synced = synced; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
