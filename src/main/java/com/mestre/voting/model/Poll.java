package com.mestre.voting.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;

@Entity
@Table(name = "polls")
public class Poll {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criador_id", nullable = false)
    private User criador;

    @Column(nullable = false)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(name = "data_encerramento", nullable = false)
    private LocalDateTime dataEncerramento;

    @Column(name = "tipo_voto", nullable = false)
    private String tipoVoto; // ANONIMO, NAO_ANONIMO

    @Column(nullable = false)
    private String status; // ABERTA, ENCERRADA

    @Column(name = "tx_hash_criacao")
    private String txHashCriacao;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PollOption> options;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Group getGroup() { return group; }
    public void setGroup(Group group) { this.group = group; }

    public User getCriador() { return criador; }
    public void setCriador(User criador) { this.criador = criador; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public LocalDateTime getDataEncerramento() { return dataEncerramento; }
    public void setDataEncerramento(LocalDateTime dataEncerramento) { this.dataEncerramento = dataEncerramento; }

    public String getTipoVoto() { return tipoVoto; }
    public void setTipoVoto(String tipoVoto) { this.tipoVoto = tipoVoto; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTxHashCriacao() { return txHashCriacao; }
    public void setTxHashCriacao(String txHashCriacao) { this.txHashCriacao = txHashCriacao; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public List<PollOption> getOptions() { return options; }
    public void setOptions(List<PollOption> options) { this.options = options; }
}
