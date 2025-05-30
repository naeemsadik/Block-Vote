import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core';
import { toast } from 'react-toastify';
import { VotingABI } from '../contracts/abis';

const VotingPage = () => {
  const { account, library } = useWeb3React();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingActive, setVotingActive] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [votingStats, setVotingStats] = useState(null);

  const loadVotingData = useCallback(async () => {
    try {
      setLoading(true);
      const contract = new ethers.Contract(
        process.env.REACT_APP_VOTING_CONTRACT_ADDRESS,
        VotingABI,
        library.getSigner()
      );

      // Get voting status
      const stats = await contract.getVotingStats();
      setVotingActive(stats._isActive);
      setVotingStats({
        totalVotes: stats._totalVotes.toString(),
        candidateCount: stats._candidateCount.toString(),
        startTime: new Date(stats._startTime.toNumber() * 1000),
        endTime: new Date(stats._endTime.toNumber() * 1000)
      });

      // Get candidates
      const allCandidates = await contract.getAllCandidates();
      setCandidates(allCandidates);

      // Check if user has voted
      const hasVoted = await contract.hasVoted(account);
      setHasVoted(hasVoted);

    } catch (error) {
      console.error('Error loading voting data:', error);
      toast.error('Failed to load voting data');
    } finally {
      setLoading(false);
    }
  }, [account, library]);

  useEffect(() => {
    if (account && library) {
      loadVotingData();
    }
  }, [account, library, loadVotingData]);

  const handleVote = async (candidateId) => {
    try {
      const contract = new ethers.Contract(
        process.env.REACT_APP_VOTING_CONTRACT_ADDRESS,
        VotingABI,
        library.getSigner()
      );

      const tx = await contract.castVote(candidateId);
      await tx.wait();

      toast.success('Vote cast successfully!');
      setHasVoted(true);
      loadVotingData(); // Refresh data
    } catch (error) {
      console.error('Error casting vote:', error);
      toast.error('Failed to cast vote');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!votingActive) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Alert severity="info">
            Voting is not currently active. Please check back later.
          </Alert>
        </Box>
      </Container>
    );
  }

  if (hasVoted) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Alert severity="success">
            You have already cast your vote. Thank you for participating!
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Cast Your Vote
        </Typography>
        
        {votingStats && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Voting Period: {votingStats.startTime.toLocaleString()} - {votingStats.endTime.toLocaleString()}
            </Typography>
            <Typography variant="subtitle1">
              Total Votes Cast: {votingStats.totalVotes}
            </Typography>
          </Paper>
        )}

        <Grid container spacing={3}>
          {candidates.map((candidate) => (
            <Grid item xs={12} sm={6} md={4} key={candidate.id.toString()}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {candidate.name}
                  </Typography>
                  <Chip 
                    label={candidate.party} 
                    color="primary" 
                    size="small" 
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Vote Count: {candidate.voteCount.toString()}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    color="primary"
                    onClick={() => handleVote(candidate.id)}
                  >
                    Vote
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default VotingPage; 