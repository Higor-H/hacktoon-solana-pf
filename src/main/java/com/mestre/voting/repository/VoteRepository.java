package com.mestre.voting.repository;

import com.mestre.voting.model.Vote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface VoteRepository extends JpaRepository<Vote, UUID> {
    boolean existsByPollIdAndCpfHash(UUID pollId, String cpfHash);
}
