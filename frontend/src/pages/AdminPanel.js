import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider
} from '@mui/material';
import { ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core';
import { toast } from 'react-toastify';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { NationalTallyABI } from '../contracts/abis';

const AdminPanel = () => {
  const { account, library } = useWeb3React();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [validators, setValidators] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [votingStatus, setVotingStatus] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    party: '',
    address: '',
    duration: ''
  });

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const contract = new ethers.Contract(
        process.env.REACT_APP_NATIONAL_TALLY_CONTRACT_ADDRESS,
        NationalTallyABI,
        library.getSigner()
      );

      // Get validators
      const validatorEvents = await contract.queryFilter(contract.filters.ValidatorAuthorized());
      const validatorsList = validatorEvents.map(event => ({
        address: event.args.validator,
        role: event.args.role
      }));
      setValidators(validatorsList);

      // Get candidates
      const candidatesList = await contract.getAllCandidates();
      setCandidates(candidatesList);

      // Get voting status
      const stats = await contract.getVotingStats();
      setVotingStatus({
        isActive: stats._isActive,
        startTime: new Date(stats._startTime.toNumber() * 1000),
        endTime: new Date(stats._endTime.toNumber() * 1000)
      });

    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load administrative data');
    } finally {
      setLoading(false);
    }
  }, [library]);

  useEffect(() => {
    if (account && library) {
      loadAdminData();
    }
  }, [account, library, loadAdminData]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleOpenDialog = (type) => {
    setDialogType(type);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      name: '',
      party: '',
      address: '',
      duration: ''
    });
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddCandidate = async () => {
    try {
      const contract = new ethers.Contract(
        process.env.REACT_APP_NATIONAL_TALLY_CONTRACT_ADDRESS,
        NationalTallyABI,
        library.getSigner()
      );

      const tx = await contract.addCandidate(formData.name, formData.party);
      await tx.wait();

      toast.success('Candidate added successfully');
      handleCloseDialog();
      loadAdminData();
    } catch (error) {
      console.error('Error adding candidate:', error);
      toast.error('Failed to add candidate');
    }
  };

  const handleAddValidator = async () => {
    try {
      const contract = new ethers.Contract(
        process.env.REACT_APP_NATIONAL_TALLY_CONTRACT_ADDRESS,
        NationalTallyABI,
        library.getSigner()
      );

      const tx = await contract.authorizeDivisionValidator(formData.address);
      await tx.wait();

      toast.success('Validator added successfully');
      handleCloseDialog();
      loadAdminData();
    } catch (error) {
      console.error('Error adding validator:', error);
      toast.error('Failed to add validator');
    }
  };

  const handleStartVoting = async () => {
    try {
      const contract = new ethers.Contract(
        process.env.REACT_APP_NATIONAL_TALLY_CONTRACT_ADDRESS,
        NationalTallyABI,
        library.getSigner()
      );

      const duration = parseInt(formData.duration) * 3600; // Convert hours to seconds
      const tx = await contract.startVoting(duration);
      await tx.wait();

      toast.success('Voting started successfully');
      handleCloseDialog();
      loadAdminData();
    } catch (error) {
      console.error('Error starting voting:', error);
      toast.error('Failed to start voting');
    }
  };

  const handleEndVoting = async () => {
    try {
      const contract = new ethers.Contract(
        process.env.REACT_APP_NATIONAL_TALLY_CONTRACT_ADDRESS,
        NationalTallyABI,
        library.getSigner()
      );

      const tx = await contract.endVoting();
      await tx.wait();

      toast.success('Voting ended successfully');
      loadAdminData();
    } catch (error) {
      console.error('Error ending voting:', error);
      toast.error('Failed to end voting');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Panel
        </Typography>

        <Grid container spacing={3}>
          {/* Voting Status Card */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Voting Status
                </Typography>
                <Alert severity={votingStatus?.isActive ? "success" : "info"}>
                  {votingStatus?.isActive 
                    ? `Voting is active until ${votingStatus.endTime.toLocaleString()}`
                    : "Voting is not currently active"}
                </Alert>
                <Box sx={{ mt: 2 }}>
                  {votingStatus?.isActive ? (
                    <Button 
                      variant="contained" 
                      color="error" 
                      onClick={handleEndVoting}
                    >
                      End Voting
                    </Button>
                  ) : (
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={() => handleOpenDialog('startVoting')}
                    >
                      Start Voting
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Admin Controls */}
          <Grid item xs={12}>
            <Paper sx={{ width: '100%' }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab label="Candidates" />
                <Tab label="Validators" />
              </Tabs>

              {/* Candidates Tab */}
              {activeTab === 0 && (
                <Box sx={{ p: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog('addCandidate')}
                    sx={{ mb: 2 }}
                  >
                    Add Candidate
                  </Button>
                  <List>
                    {candidates.map((candidate) => (
                      <React.Fragment key={candidate.id.toString()}>
                        <ListItem>
                          <ListItemText
                            primary={candidate.name}
                            secondary={`Party: ${candidate.party}`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="delete">
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              )}

              {/* Validators Tab */}
              {activeTab === 1 && (
                <Box sx={{ p: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog('addValidator')}
                    sx={{ mb: 2 }}
                  >
                    Add Validator
                  </Button>
                  <List>
                    {validators.map((validator, index) => (
                      <React.Fragment key={index}>
                        <ListItem>
                          <ListItemText
                            primary={validator.address}
                            secondary={`Role: ${validator.role}`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="delete">
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Add Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog}>
          <DialogTitle>
            {dialogType === 'addCandidate' && 'Add New Candidate'}
            {dialogType === 'addValidator' && 'Add New Validator'}
            {dialogType === 'startVoting' && 'Start Voting Period'}
          </DialogTitle>
          <DialogContent>
            {dialogType === 'addCandidate' && (
              <>
                <TextField
                  autoFocus
                  margin="dense"
                  name="name"
                  label="Candidate Name"
                  type="text"
                  fullWidth
                  value={formData.name}
                  onChange={handleInputChange}
                />
                <TextField
                  margin="dense"
                  name="party"
                  label="Party"
                  type="text"
                  fullWidth
                  value={formData.party}
                  onChange={handleInputChange}
                />
              </>
            )}
            {dialogType === 'addValidator' && (
              <TextField
                autoFocus
                margin="dense"
                name="address"
                label="Validator Address"
                type="text"
                fullWidth
                value={formData.address}
                onChange={handleInputChange}
              />
            )}
            {dialogType === 'startVoting' && (
              <TextField
                autoFocus
                margin="dense"
                name="duration"
                label="Duration (hours)"
                type="number"
                fullWidth
                value={formData.duration}
                onChange={handleInputChange}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={
                dialogType === 'addCandidate' ? handleAddCandidate :
                dialogType === 'addValidator' ? handleAddValidator :
                handleStartVoting
              }
              variant="contained"
            >
              {dialogType === 'addCandidate' && 'Add Candidate'}
              {dialogType === 'addValidator' && 'Add Validator'}
              {dialogType === 'startVoting' && 'Start Voting'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default AdminPanel; 