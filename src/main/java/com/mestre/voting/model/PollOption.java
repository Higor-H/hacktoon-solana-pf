package com.mestre.voting.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "poll_options")
public class PollOption {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "poll_id", nullable = false)
    private Poll poll;

    @Column(name = "texto_opcao", nullable = false)
    private String textoOpcao;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Poll getPoll() { return poll; }
    public void setPoll(Poll poll) { this.poll = poll; }

    public String getTextoOpcao() { return textoOpcao; }
    public void setTextoOpcao(String textoOpcao) { this.textoOpcao = textoOpcao; }
}
