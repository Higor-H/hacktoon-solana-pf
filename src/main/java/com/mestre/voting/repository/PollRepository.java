package com.mestre.voting.repository;

import com.mestre.voting.model.Poll;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface PollRepository extends JpaRepository<Poll, UUID> {
}
