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
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import { ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core';
import { toast } from 'react-toastify';
import QRCode from 'qrcode.react';
import { ConstituencyTokenABI } from '../contracts/abis';

const VoterRegistration = () => {
  const { account, library } = useWeb3React();
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    constituency: '',
    idNumber: '',
    address: ''
  });
  const [constituencies, setConstituencies] = useState([]);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [voterToken, setVoterToken] = useState(null);

  const loadConstituencies = useCallback(async () => {
    try {
      const contract = new ethers.Contract(
        process.env.REACT_APP_CONSTITUENCY_CONTRACT_ADDRESS,
        ConstituencyTokenABI,
        library.getSigner()
      );

      // Get list of constituencies
      const constituencyCount = await contract.getConstituencyCount();
      const constituenciesList = [];
      
      for (let i = 1; i <= constituencyCount; i++) {
        const constituency = await contract.getConstituency(i);
        constituenciesList.push({
          id: i,
          name: constituency.name
        });
      }

      setConstituencies(constituenciesList);
    } catch (error) {
      console.error('Error loading constituencies:', error);
      toast.error('Failed to load constituencies');
    }
  }, [library]);

  useEffect(() => {
    if (account && library) {
      loadConstituencies();
    }
  }, [account, library, loadConstituencies]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const contract = new ethers.Contract(
        process.env.REACT_APP_CONSTITUENCY_CONTRACT_ADDRESS,
        ConstituencyTokenABI,
        library.getSigner()
      );

      // Register voter
      await contract.registerVoter(
        formData.name,
        formData.email,
        formData.constituency,
        formData.idNumber,
        formData.address
      );
      
      // Get voter token
      const voterToken = await contract.getVoterToken(account);
      setVoterToken(voterToken);
      
      setRegistrationComplete(true);
      toast.success('Registration successful!');
    } catch (error) {
      console.error('Error registering voter:', error);
      toast.error('Failed to register voter');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Personal Information', 'Constituency Details', 'Verification'];

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="ID Number"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Constituency</InputLabel>
                <Select
                  name="constituency"
                  value={formData.constituency}
                  onChange={handleInputChange}
                  label="Constituency"
                >
                  {constituencies.map((constituency) => (
                    <MenuItem key={constituency.id} value={constituency.id}>
                      {constituency.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Select your voting constituency</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Address"
                name="address"
                multiline
                rows={3}
                value={formData.address}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Please verify your information before submitting
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1">Name: {formData.name}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1">Email: {formData.email}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1">ID Number: {formData.idNumber}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1">
                  Constituency: {constituencies.find(c => c.id === formData.constituency)?.name}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1">Address: {formData.address}</Typography>
              </Grid>
            </Grid>
          </Box>
        );
      default:
        return null;
    }
  };

  if (registrationComplete) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom align="center">
                Registration Complete!
              </Typography>
              <Box display="flex" flexDirection="column" alignItems="center" mt={3}>
                <QRCode value={voterToken} size={200} />
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Your Voter Token: {voterToken}
                </Typography>
                <Alert severity="success" sx={{ mt: 2 }}>
                  Please save your voter token. You will need it to cast your vote.
                </Alert>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Voter Registration
        </Typography>

        <Paper sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            {activeStep > 0 && (
              <Button onClick={handleBack} sx={{ mr: 1 }}>
                Back
              </Button>
            )}
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Submit Registration'}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default VoterRegistration; 