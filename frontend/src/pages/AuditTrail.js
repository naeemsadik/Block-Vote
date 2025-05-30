import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment
} from '@mui/material';
import { ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core';
import { toast } from 'react-toastify';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningIcon from '@mui/icons-material/Warning';
import { NationalTallyABI } from '../contracts/abis';

const AuditTrail = () => {
  const { account, library } = useWeb3React();
  const [loading, setLoading] = useState(true);
  const [auditRecords, setAuditRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAuditTrail = useCallback(async () => {
    try {
      setLoading(true);
      const contract = new ethers.Contract(
        process.env.REACT_APP_NATIONAL_TALLY_CONTRACT_ADDRESS,
        NationalTallyABI,
        library.getSigner()
      );

      // Get audit records
      const filter = contract.filters.AuditRecordAdded();
      const events = await contract.queryFilter(filter, -10000, 'latest');
      
      const records = await Promise.all(events.map(async (event) => {
        const record = await contract.auditTrail(event.args.recordId);
        return {
          id: event.args.recordId.toString(),
          timestamp: new Date(record.timestamp.toNumber() * 1000),
          auditor: record.auditor,
          action: record.action,
          dataHash: record.dataHash,
          verified: record.verified
        };
      }));

      setAuditRecords(records.reverse()); // Most recent first

    } catch (error) {
      console.error('Error loading audit trail:', error);
      toast.error('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  }, [library]);

  useEffect(() => {
    if (account && library) {
      loadAuditTrail();
    }
  }, [account, library, loadAuditTrail]);

  const getActionColor = (action) => {
    switch (action) {
      case 'VOTE_CAST':
        return 'success';
      case 'DIVISION_RESULT_SUBMITTED':
        return 'primary';
      case 'DIVISION_RESULT_VERIFIED':
        return 'info';
      case 'NATIONAL_RESULT_FINALIZED':
        return 'warning';
      default:
        return 'default';
    }
  };

  const filteredRecords = auditRecords.filter(record => 
    record.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.auditor.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          Audit Trail
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by action or auditor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Auditor</TableCell>
                <TableCell>Data Hash</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {record.timestamp.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={record.action} 
                      color={getActionColor(record.action)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={record.auditor}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {record.auditor}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={record.dataHash}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {record.dataHash}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={record.verified ? 'Verified' : 'Pending Verification'}>
                      <IconButton size="small">
                        {record.verified ? (
                          <VerifiedIcon color="success" />
                        ) : (
                          <WarningIcon color="warning" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
};

export default AuditTrail; 