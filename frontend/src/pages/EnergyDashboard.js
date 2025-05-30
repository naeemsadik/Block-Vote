import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Container,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import { ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core';
import { toast } from 'react-toastify';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { NationalTallyABI } from '../contracts/abis';
import EnergyConsumptionABI from '../contracts/EnergyConsumptionABI.json';

const EnergyDashboard = () => {
  const { account, library } = useWeb3React();
  const [loading, setLoading] = useState(true);
  const [energyData, setEnergyData] = useState({
    totalConsumption: 0,
    averageConsumption: 0,
    peakConsumption: 0,
    offPeakConsumption: 0,
    renewablePercentage: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);

  const loadEnergyData = useCallback(async () => {
    if (!library || !account) return;

    try {
      setLoading(true);
      const energyContract = new ethers.Contract(
        process.env.REACT_APP_ENERGY_CONTRACT_ADDRESS,
        EnergyConsumptionABI,
        library.getSigner()
      );

      // Get total gas used and transactions
      const totalGasUsed = await energyContract.getTotalGasUsed();
      const totalTransactions = await energyContract.getTotalTransactions();

      // Get recent transactions
      const recentTransactions = await energyContract.queryFilter(
        energyContract.filters.TransactionExecuted()
      );

      // Format transaction data
      const formattedTransactions = await Promise.all(
        recentTransactions.map(async (tx) => {
          const receipt = await library.getTransactionReceipt(tx.transactionHash);
          return {
            hash: tx.transactionHash,
            gasUsed: receipt.gasUsed.toString(),
            timestamp: (await library.getBlock(receipt.blockNumber)).timestamp,
            type: tx.args[0], // Transaction type
            status: receipt.status === 1 ? 'Success' : 'Failed'
          };
        })
      );

      setEnergyData({
        totalConsumption: ethers.utils.formatEther(totalGasUsed),
        averageConsumption: totalTransactions.gt(0)
          ? ethers.utils.formatEther(totalGasUsed.div(totalTransactions))
          : '0',
        peakConsumption: 0,
        offPeakConsumption: 0,
        renewablePercentage: 0,
      });

      setRecentTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error loading energy data:', error);
      toast.error('Failed to load energy data');
    } finally {
      setLoading(false);
    }
  }, [library, account]);

  useEffect(() => {
    loadEnergyData();
  }, [loadEnergyData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
          Energy Consumption Dashboard
        </Typography>

        <Grid container spacing={3}>
          {/* Energy Stats Cards */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total Gas Used
                </Typography>
                <Typography variant="h4">
                  {ethers.utils.formatUnits(energyData.totalConsumption, 'gwei')} Gwei
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={70} 
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total Transactions
                </Typography>
                <Typography variant="h4">
                  {energyData.totalConsumption}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={50} 
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Average Gas per Transaction
                </Typography>
                <Typography variant="h4">
                  {ethers.utils.formatUnits(energyData.averageConsumption, 'gwei')} Gwei
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={30} 
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Gas Usage Chart */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Gas Usage Over Time
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recentTransactions}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(time) => time.toLocaleTimeString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(time) => new Date(time).toLocaleString()}
                        formatter={(value) => `${ethers.utils.formatUnits(value, 'gwei')} Gwei`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="gasUsed" 
                        stroke="#4caf50" 
                        name="Gas Used"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Transaction Distribution */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Transaction Distribution
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Division Results', value: 60 },
                          { name: 'Vote Casting', value: 30 },
                          { name: 'Verification', value: 10 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: 'Division Results', value: 60 },
                          { name: 'Vote Casting', value: 30 },
                          { name: 'Verification', value: 10 }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
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

export default EnergyDashboard; 