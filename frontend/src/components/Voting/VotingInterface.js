import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Avatar,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
} from '@mui/material';
import {
  HowToVote as VoteIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  EnergySavingsLeaf as EcoIcon,
  Visibility as ViewIcon,
  VerifiedUser as VerifiedIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import web3Service from '../../services/web3Service';
import apiService from '../../services/apiService';

const VotingInterface = () => {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [votingPeriod, setVotingPeriod] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [candidateDetailsOpen, setCandidateDetailsOpen] = useState(false);
  const [selectedCandidateDetails, setSelectedCandidateDetails] = useState(null);
  const [votingStats, setVotingStats] = useState(null);
  const [userVote, setUserVote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);

  const votingSteps = [
    'Select Candidate',
    'Confirm Vote',
    'Submit to Blockchain',
    'Vote Recorded'
  ];

  // Mock candidates data - replace with actual API call
  const mockCandidates = [
    {
      id: 1,
      name: 'Alice Johnson',
      party: 'Green Progressive Party',
      avatar: '/avatars/alice.jpg',
      description: 'Environmental advocate with 15 years of public service experience.',
      platform: [
        'Renewable Energy Transition',
        'Digital Infrastructure',
        'Education Reform',
        'Healthcare Access'
      ],
      experience: '15 years in public service',
      endorsements: ['Environmental Coalition', 'Teachers Union', 'Tech Workers Alliance'],
      votes: 1247,
      percentage: 42.3
    },
    {
      id: 2,
      name: 'Robert Chen',
      party: 'Innovation Forward',
      avatar: '/avatars/robert.jpg',
      description: 'Technology entrepreneur focused on sustainable innovation.',
      platform: [
        'Tech Innovation Hub',
        'Green Transportation',
        'Small Business Support',
        'Digital Privacy Rights'
      ],
      experience: '10 years in tech industry',
      endorsements: ['Innovation Council', 'Small Business Association', 'Privacy Rights Group'],
      votes: 987,
      percentage: 33.5
    },
    {
      id: 3,
      name: 'Maria Rodriguez',
      party: 'Community First',
      avatar: '/avatars/maria.jpg',
      description: 'Community organizer with focus on social justice and equality.',
      platform: [
        'Affordable Housing',
        'Community Health Centers',
        'Worker Rights',
        'Immigration Reform'
      ],
      experience: '12 years in community organizing',
      endorsements: ['Labor Union', 'Community Health Alliance', 'Housing Rights Coalition'],
      votes: 712,
      percentage: 24.2
    }
  ];

  useEffect(() => {
    loadVotingData();
  }, []);

  const loadVotingData = async () => {
    try {
      setLoading(true);
      
      // Load candidates
      setCandidates(mockCandidates);
      
      // Check if user has already voted
      const account = await web3Service.getCurrentAccount();
      if (account) {
        const voted = await web3Service.hasVoted(account);
        setHasVoted(voted);
        
        if (voted) {
          // Get user's vote details
          const voteDetails = await web3Service.getVoteDetails(account);
          setUserVote(voteDetails);
        }
      }
      
      // Load voting period info
      const period = await web3Service.getVotingPeriod();
      setVotingPeriod(period);
      
      // Load voting statistics
      const stats = await apiService.getVotingStats();
      setVotingStats(stats);
      
    } catch (error) {
      console.error('Error loading voting data:', error);
      toast.error('Failed to load voting data');
    } finally {
      setLoading(false);
    }
  };

  const handleVoteSubmit = async () => {
    if (!selectedCandidate) {
      toast.error('Please select a candidate');
      return;
    }

    try {
      setIsVoting(true);
      setActiveStep(2);
      
      // Submit vote to blockchain
      const tx = await web3Service.castVote(selectedCandidate);
      
      setActiveStep(3);
      
      // Wait for transaction confirmation
      await tx.wait();
      
      // Update local state
      setHasVoted(true);
      setUserVote({
        candidateId: selectedCandidate,
        candidateName: candidates.find(c => c.id === parseInt(selectedCandidate))?.name,
        timestamp: new Date().toISOString(),
        transactionHash: tx.hash
      });
      
      // Log vote to backend
      await apiService.logVote({
        candidateId: selectedCandidate,
        transactionHash: tx.hash,
        timestamp: new Date().toISOString()
      });
      
      toast.success('Vote submitted successfully!');
      setConfirmDialogOpen(false);
      
      // Reload voting data
      await loadVotingData();
      
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast.error('Failed to submit vote: ' + error.message);
      setActiveStep(0);
    } finally {
      setIsVoting(false);
    }
  };

  const handleCandidateSelect = (candidateId) => {
    setSelectedCandidate(candidateId);
    setActiveStep(1);
  };

  const handleConfirmVote = () => {
    setConfirmDialogOpen(true);
  };

  const handleViewCandidateDetails = (candidate) => {
    setSelectedCandidateDetails(candidate);
    setCandidateDetailsOpen(true);
  };

  const isVotingActive = () => {
    if (!votingPeriod) return false;
    const now = new Date();
    return now >= new Date(votingPeriod.startTime) && now <= new Date(votingPeriod.endTime);
  };

  const getTimeRemaining = () => {
    if (!votingPeriod) return null;
    const now = new Date();
    const endTime = new Date(votingPeriod.endTime);
    const diff = endTime - now;
    
    if (diff <= 0) return 'Voting has ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m remaining`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Voting Status Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                🗳️ Constituency Voting
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                {isVotingActive() ? 'Voting is Active' : 'Voting Period Closed'}
              </Typography>
              {getTimeRemaining() && (
                <Typography variant="body1" sx={{ mt: 1, opacity: 0.8 }}>
                  ⏰ {getTimeRemaining()}
                </Typography>
              )}
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip icon={<EcoIcon />} label="95% Energy Efficient" color="success" />
                <Chip icon={<SecurityIcon />} label="Blockchain Secured" color="primary" />
                <Chip icon={<SpeedIcon />} label="Instant Results" color="info" />
              </Box>
              {votingStats && (
                <Typography variant="h6">
                  {votingStats.totalVotes} votes cast
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Voting Progress Stepper */}
      {!hasVoted && isVotingActive() && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stepper activeStep={activeStep} alternativeLabel>
              {votingSteps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>
      )}

      {/* User Vote Status */}
      {hasVoted && userVote && (
        <Alert 
          severity="success" 
          icon={<CheckIcon />}
          sx={{ mb: 3 }}
          action={
            <Tooltip title="View on blockchain">
              <IconButton
                color="inherit"
                size="small"
                onClick={() => window.open(`https://etherscan.io/tx/${userVote.transactionHash}`, '_blank')}
              >
                <ViewIcon />
              </IconButton>
            </Tooltip>
          }
        >
          <Typography variant="h6">Vote Successfully Recorded!</Typography>
          <Typography variant="body2">
            You voted for: <strong>{userVote.candidateName}</strong>
          </Typography>
          <Typography variant="caption" display="block">
            Transaction: {userVote.transactionHash?.substring(0, 20)}...
          </Typography>
        </Alert>
      )}

      {/* Voting Not Active Alert */}
      {!isVotingActive() && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6">Voting Period Not Active</Typography>
          <Typography variant="body2">
            {votingPeriod ? 
              `Voting period: ${new Date(votingPeriod.startTime).toLocaleDateString()} - ${new Date(votingPeriod.endTime).toLocaleDateString()}` :
              'No active voting period'
            }
          </Typography>
        </Alert>
      )}

      {/* Candidates Grid */}
      <Grid container spacing={3}>
        {candidates.map((candidate) => (
          <Grid item xs={12} md={4} key={candidate.id}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: isVotingActive() && !hasVoted ? 'pointer' : 'default',
                border: selectedCandidate === candidate.id.toString() ? 2 : 1,
                borderColor: selectedCandidate === candidate.id.toString() ? 'primary.main' : 'divider',
                '&:hover': {
                  boxShadow: isVotingActive() && !hasVoted ? 6 : 1,
                  transform: isVotingActive() && !hasVoted ? 'translateY(-2px)' : 'none',
                },
                transition: 'all 0.3s ease',
              }}
              onClick={() => isVotingActive() && !hasVoted && handleCandidateSelect(candidate.id.toString())}
            >
              <CardContent>
                {/* Candidate Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    src={candidate.avatar}
                    sx={{ width: 60, height: 60, mr: 2 }}
                  >
                    <PersonIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {candidate.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {candidate.party}
                    </Typography>
                    {userVote?.candidateId === candidate.id.toString() && (
                      <Chip 
                        icon={<VerifiedIcon />} 
                        label="Your Vote" 
                        color="success" 
                        size="small" 
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Candidate Description */}
                <Typography variant="body2" sx={{ mb: 2, minHeight: 40 }}>
                  {candidate.description}
                </Typography>

                {/* Key Platform Points */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Key Platform:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {candidate.platform.slice(0, 2).map((point, index) => (
                      <Chip 
                        key={index} 
                        label={point} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                    {candidate.platform.length > 2 && (
                      <Chip 
                        label={`+${candidate.platform.length - 2} more`} 
                        size="small" 
                        variant="outlined"
                        color="primary"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Vote Progress */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Current Votes
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {candidate.votes} ({candidate.percentage}%)
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={candidate.percentage} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<InfoIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewCandidateDetails(candidate);
                    }}
                    sx={{ flex: 1 }}
                  >
                    Details
                  </Button>
                  {isVotingActive() && !hasVoted && (
                    <Button
                      variant={selectedCandidate === candidate.id.toString() ? "contained" : "outlined"}
                      size="small"
                      startIcon={<VoteIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCandidateSelect(candidate.id.toString());
                      }}
                      sx={{ flex: 1 }}
                    >
                      {selectedCandidate === candidate.id.toString() ? 'Selected' : 'Select'}
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Vote Confirmation Button */}
      {isVotingActive() && !hasVoted && selectedCandidate && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<VoteIcon />}
            onClick={handleConfirmVote}
            sx={{ 
              px: 4, 
              py: 1.5,
              background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1b5e20 30%, #388e3c 90%)',
              }
            }}
          >
            Confirm Vote for {candidates.find(c => c.id === parseInt(selectedCandidate))?.name}
          </Button>
        </Box>
      )}

      {/* Vote Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: 'center' }}>
          <VoteIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h5">Confirm Your Vote</Typography>
        </DialogTitle>
        <DialogContent>
          {selectedCandidate && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                You are about to vote for:
              </Typography>
              <Card sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {candidates.find(c => c.id === parseInt(selectedCandidate))?.name}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {candidates.find(c => c.id === parseInt(selectedCandidate))?.party}
                </Typography>
              </Card>
              <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                <Typography variant="body2">
                  <strong>Important:</strong> This action cannot be undone. Your vote will be permanently recorded on the blockchain.
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button 
            onClick={() => setConfirmDialogOpen(false)} 
            variant="outlined"
            startIcon={<CancelIcon />}
            disabled={isVoting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleVoteSubmit} 
            variant="contained" 
            startIcon={isVoting ? <CircularProgress size={20} /> : <CheckIcon />}
            disabled={isVoting}
            sx={{ ml: 2 }}
          >
            {isVoting ? 'Submitting...' : 'Confirm Vote'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Candidate Details Dialog */}
      <Dialog 
        open={candidateDetailsOpen} 
        onClose={() => setCandidateDetailsOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        {selectedCandidateDetails && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  src={selectedCandidateDetails.avatar}
                  sx={{ width: 60, height: 60, mr: 2 }}
                >
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5">{selectedCandidateDetails.name}</Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    {selectedCandidateDetails.party}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  {selectedCandidateDetails.description}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="h6" sx={{ mb: 2 }}>Platform & Policies</Typography>
                <Grid container spacing={1} sx={{ mb: 3 }}>
                  {selectedCandidateDetails.platform.map((point, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Chip 
                        label={point} 
                        variant="outlined" 
                        sx={{ width: '100%', justifyContent: 'flex-start' }}
                      />
                    </Grid>
                  ))}
                </Grid>
                
                <Typography variant="h6" sx={{ mb: 1 }}>Experience</Typography>
                <Typography variant="body2" sx={{ mb: 3 }}>
                  {selectedCandidateDetails.experience}
                </Typography>
                
                <Typography variant="h6" sx={{ mb: 1 }}>Endorsements</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedCandidateDetails.endorsements.map((endorsement, index) => (
                    <Chip key={index} label={endorsement} color="primary" variant="outlined" />
                  ))}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCandidateDetailsOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default VotingInterface;