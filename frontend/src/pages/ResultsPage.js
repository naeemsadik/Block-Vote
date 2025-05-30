import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core';
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { VotingABI } from '../contracts/abis';

const ResultsPage = () => {
  const { account, library } = useWeb3React();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [votingStats, setVotingStats] = useState(null);
  const [chartData, setChartData] = useState([]);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      const contract = new ethers.Contract(
        process.env.REACT_APP_VOTING_CONTRACT_ADDRESS,
        VotingABI,
        library.getSigner()
      );

      // Get voting stats
      const stats = await contract.getVotingStats();
      setVotingStats({
        totalVotes: stats._totalVotes.toString(),
        candidateCount: stats._candidateCount.toString(),
        isActive: stats._isActive,
        startTime: new Date(stats._startTime.toNumber() * 1000),
        endTime: new Date(stats._endTime.toNumber() * 1000)
      });

      // Get all candidates
      const candidates = await contract.getAllCandidates();
      
      // Get vote counts
      const [, voteCounts] = await contract.getResults();
      
      // Combine data
      const resultsData = candidates.map((candidate, index) => ({
        id: candidate.id.toString(),
        name: candidate.name,
        party: candidate.party,
        votes: voteCounts[index].toString()
      }));

      setResults(resultsData);

      // Prepare chart data
      const chartData = resultsData.map(result => ({
        name: result.name,
        votes: parseInt(result.votes)
      }));
      setChartData(chartData);

    } catch (error) {
      console.error('Error loading results:', error);
      toast.error('Failed to load election results');
    } finally {
      setLoading(false);
    }
  }, [library]);

  useEffect(() => {
    if (account && library) {
      loadResults();
    }
  }, [account, library, loadResults]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (votingStats?.isActive) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Alert severity="info">
            Results will be available after the voting period ends.
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Election Results
        </Typography>

        {votingStats && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Total Votes Cast: {votingStats.totalVotes}
            </Typography>
            <Typography variant="subtitle1">
              Voting Period: {votingStats.startTime.toLocaleString()} - {votingStats.endTime.toLocaleString()}
            </Typography>
          </Paper>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Results Table
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Candidate</TableCell>
                        <TableCell>Party</TableCell>
                        <TableCell align="right">Votes</TableCell>
                        <TableCell align="right">Percentage</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell>{result.name}</TableCell>
                          <TableCell>{result.party}</TableCell>
                          <TableCell align="right">{result.votes}</TableCell>
                          <TableCell align="right">
                            {((parseInt(result.votes) / parseInt(votingStats.totalVotes)) * 100).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Results Chart
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="votes" fill="#4caf50" name="Votes" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default ResultsPage; 