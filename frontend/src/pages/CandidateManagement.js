import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container,
  CircularProgress,
  Grid,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip
} from '@mui/material';
import { ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core';
import { toast } from 'react-toastify';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { NationalTallyABI } from '../contracts/abis';

const CandidateManagement = () => {
  const { account, library } = useWeb3React();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    party: '',
    constituency: '',
    manifesto: ''
  });

  const loadCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const contract = new ethers.Contract(
        process.env.REACT_APP_NATIONAL_TALLY_CONTRACT_ADDRESS,
        NationalTallyABI,
        library.getSigner()
      );

      // Get all candidates
      const candidatesList = await contract.getAllCandidates();
      setCandidates(candidatesList);

    } catch (error) {
      console.error('Error loading candidates:', error);
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, [library]);

  useEffect(() => {
    if (account && library) {
      loadCandidates();
    }
  }, [account, library, loadCandidates]);

  const handleOpenDialog = (candidate = null) => {
    if (candidate) {
      setEditingCandidate(candidate);
      setFormData({
        name: candidate.name,
        party: candidate.party,
        constituency: candidate.constituency,
        manifesto: candidate.manifesto || ''
      });
    } else {
      setEditingCandidate(null);
      setFormData({
        name: '',
        party: '',
        constituency: '',
        manifesto: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCandidate(null);
    setFormData({
      name: '',
      party: '',
      constituency: '',
      manifesto: ''
    });
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const contract = new ethers.Contract(
        process.env.REACT_APP_NATIONAL_TALLY_CONTRACT_ADDRESS,
        NationalTallyABI,
        library.getSigner()
      );

      if (editingCandidate) {
        // Update existing candidate
        const tx = await contract.updateCandidate(
          editingCandidate.id,
          formData.name,
          formData.party,
          formData.constituency,
          formData.manifesto
        );
        await tx.wait();
        toast.success('Candidate updated successfully');
      } else {
        // Add new candidate
        const tx = await contract.addCandidate(
          formData.name,
          formData.party,
          formData.constituency,
          formData.manifesto
        );
        await tx.wait();
        toast.success('Candidate added successfully');
      }

      handleCloseDialog();
      loadCandidates();
    } catch (error) {
      console.error('Error managing candidate:', error);
      toast.error(editingCandidate ? 'Failed to update candidate' : 'Failed to add candidate');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) {
      return;
    }

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        process.env.REACT_APP_NATIONAL_TALLY_CONTRACT_ADDRESS,
        NationalTallyABI,
        library.getSigner()
      );

      const tx = await contract.removeCandidate(candidateId);
      await tx.wait();
      
      toast.success('Candidate removed successfully');
      loadCandidates();
    } catch (error) {
      console.error('Error removing candidate:', error);
      toast.error('Failed to remove candidate');
    } finally {
      setLoading(false);
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
          Candidate Management
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleOpenDialog()}
          >
            Add New Candidate
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Party</TableCell>
                <TableCell>Constituency</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Vote Count</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {candidates.map((candidate) => (
                <TableRow key={candidate.id.toString()}>
                  <TableCell>{candidate.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={candidate.party} 
                      color="primary" 
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{candidate.constituency}</TableCell>
                  <TableCell>
                    <Chip
                      label={candidate.isActive ? 'Active' : 'Inactive'}
                      color={candidate.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{candidate.voteCount.toString()}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(candidate)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteCandidate(candidate.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Party"
                  name="party"
                  value={formData.party}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Constituency"
                  name="constituency"
                  value={formData.constituency}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Manifesto"
                  name="manifesto"
                  multiline
                  rows={4}
                  value={formData.manifesto}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : (editingCandidate ? 'Update' : 'Add')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default CandidateManagement; 