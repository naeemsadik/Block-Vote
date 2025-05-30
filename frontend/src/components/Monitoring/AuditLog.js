import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  TextField,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Tooltip,
  Collapse,
  Alert,
  Grid,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ErrorOutline as ErrorIcon,
  CheckCircleOutline as SuccessIcon,
  InfoOutlined as InfoIcon,
  WarningAmberOutlined as WarningIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import apiService from '../../services/apiService';
import { format } from 'date-fns';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('timestamp');
  const [order, setOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ eventType: '', user: '', dateRange: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Mock audit log data
  const mockAuditLogs = [
    {
      id: 'log_001',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      eventType: 'VOTE_CAST',
      user: '0x123...abc',
      details: { candidateId: 'CAND_A', constituency: 'North', tier: 'Constituency' },
      status: 'SUCCESS',
      ipAddress: '192.168.1.101',
      component: 'VotingService',
    },
    {
      id: 'log_002',
      timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      eventType: 'LOGIN_SUCCESS',
      user: 'admin@blockvote.com',
      details: { role: 'Admin' },
      status: 'SUCCESS',
      ipAddress: '10.0.0.5',
      component: 'AuthService',
    },
    {
      id: 'log_003',
      timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
      eventType: 'CONFIG_UPDATE',
      user: 'validator_node_1',
      details: { setting: 'gasPrice', oldValue: '20', newValue: '25' },
      status: 'SUCCESS',
      ipAddress: 'N/A (System)',
      component: 'BlockchainService',
    },
    {
      id: 'log_004',
      timestamp: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
      eventType: 'ROLLUP_PROCESS_START',
      user: 'System',
      details: { tier: 'Constituency to Division' },
      status: 'INFO',
      ipAddress: 'N/A (System)',
      component: 'RollupService',
    },
    {
      id: 'log_005',
      timestamp: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
      eventType: 'ENERGY_SAVING_MODE_ACTIVATED',
      user: 'System',
      details: { threshold: '70%', current: '72%' },
      status: 'INFO',
      ipAddress: 'N/A (System)',
      component: 'EnergyService',
    },
    {
      id: 'log_006',
      timestamp: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
      eventType: 'VOTE_VALIDATION_FAILED',
      user: '0x456...def',
      details: { reason: 'Invalid signature', voteId: 'VOTE_XYZ' },
      status: 'WARNING',
      ipAddress: '192.168.1.102',
      component: 'ValidationService',
    },
    {
      id: 'log_007',
      timestamp: new Date(Date.now() - 25200000).toISOString(), // 7 hours ago
      eventType: 'DB_CONNECTION_ERROR',
      user: 'System',
      details: { error: 'Timeout', attempts: 3 },
      status: 'ERROR',
      ipAddress: 'N/A (System)',
      component: 'DatabaseService',
    },
  ];

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      // const response = await apiService.getAuditLogs({ page, rowsPerPage, orderBy, order, searchTerm, ...filters });
      // setLogs(response.data.logs);
      // setTotalLogs(response.data.total);
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLogs(mockAuditLogs.map(log => ({...log, timestamp: new Date(log.timestamp)}))); // Ensure timestamp is Date object
      setLastUpdated(new Date());
      toast.success('Audit logs loaded successfully');
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to fetch audit logs. Please try again.');
      toast.error('Failed to fetch audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    // Call fetchAuditLogs with new sort params (if backend handles sorting)
    // For client-side sorting, this will be handled by useMemo
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    // Call fetchAuditLogs with new page param
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    // Call fetchAuditLogs with new rowsPerPage param
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleFilterChange = (event) => {
    setFilters({ ...filters, [event.target.name]: event.target.value });
  };

  const applyFiltersAndSearch = () => {
    setPage(0);
    fetchAuditLogs(); // Or apply client-side filtering if data is small
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ eventType: '', user: '', dateRange: '' });
    setPage(0);
    fetchAuditLogs(); // Or clear client-side filtering
  };

  const exportLogs = async (formatType) => {
    try {
      // const blob = await apiService.exportAuditLogs({ format: formatType, searchTerm, ...filters });
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `audit-logs-${new Date().toISOString()}.${formatType}`;
      // document.body.appendChild(a);
      // a.click();
      // window.URL.revokeObjectURL(url);
      // document.body.removeChild(a);
      toast.success(`Audit logs exported as ${formatType.toUpperCase()}`);
    } catch (err) {
      console.error('Error exporting audit logs:', err);
      toast.error('Failed to export audit logs.');
    }
  };

  const getStatusChip = (status) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
        return <Chip label={status} color="success" size="small" icon={<SuccessIcon />} />;
      case 'INFO':
        return <Chip label={status} color="info" size="small" icon={<InfoIcon />} />;
      case 'WARNING':
        return <Chip label={status} color="warning" size="small" icon={<WarningIcon />} />;
      case 'ERROR':
        return <Chip label={status} color="error" size="small" icon={<ErrorIcon />} />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const headCells = [
    { id: 'timestamp', numeric: false, disablePadding: false, label: 'Timestamp' },
    { id: 'eventType', numeric: false, disablePadding: false, label: 'Event Type' },
    { id: 'user', numeric: false, disablePadding: false, label: 'User/Actor' },
    { id: 'component', numeric: false, disablePadding: false, label: 'Component' },
    { id: 'status', numeric: false, disablePadding: false, label: 'Status' },
    { id: 'details', numeric: false, disablePadding: false, label: 'Details' },
  ];

  const sortedAndFilteredLogs = useMemo(() => {
    let processedLogs = [...logs];

    // Filtering (client-side example, ideally backend handles this)
    if (searchTerm) {
      processedLogs = processedLogs.filter(log =>
        Object.values(log).some(val =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    if (filters.eventType) {
      processedLogs = processedLogs.filter(log => log.eventType.toLowerCase().includes(filters.eventType.toLowerCase()));
    }
    if (filters.user) {
      processedLogs = processedLogs.filter(log => log.user.toLowerCase().includes(filters.user.toLowerCase()));
    }
    // Add dateRange filtering if implemented

    // Sorting (client-side example)
    processedLogs.sort((a, b) => {
      const valA = a[orderBy];
      const valB = b[orderBy];
      if (order === 'asc') {
        return valA < valB ? -1 : valA > valB ? 1 : 0;
      }
      return valA > valB ? -1 : valA < valB ? 1 : 0;
    });

    return processedLogs;
  }, [logs, order, orderBy, searchTerm, filters]);

  const paginatedLogs = useMemo(() => {
    return sortedAndFilteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedAndFilteredLogs, page, rowsPerPage]);

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #673ab7 0%, #9575cd 100%)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                🛡️ Audit Log Trail
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Comprehensive system activity records
              </Typography>
              {lastUpdated && (
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                  Last updated: {format(lastUpdated, 'PPpp')}
                </Typography>
              )}
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Button 
                variant="contained" 
                color="secondary" 
                startIcon={<RefreshIcon />} 
                onClick={fetchAuditLogs}
                disabled={loading}
                sx={{ mr: 1}}
              >
                Refresh Logs
              </Button>
              <Chip label={`${sortedAndFilteredLogs.length} Logs`} color="default" sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }} />
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <TextField
            label="Search Logs"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ flexGrow: 1, minWidth: '250px' }}
          />
          <Box>
            <Tooltip title={showFilters ? 'Hide Filters' : 'Show Filters'}>
              <IconButton onClick={() => setShowFilters(!showFilters)} color="primary">
                {showFilters ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </Tooltip>
            <Button 
              variant="outlined" 
              startIcon={<FilterListIcon />} 
              onClick={applyFiltersAndSearch} 
              sx={{ mr: 1 }}
            >
              Apply
            </Button>
            <Button variant="text" onClick={clearFilters} sx={{ mr: 1 }}>
              Clear
            </Button>
            <Button 
              variant="contained" 
              startIcon={<DownloadIcon />} 
              onClick={() => exportLogs('csv')} 
              color="secondary"
            >
              Export CSV
            </Button>
          </Box>
        </Box>
        <Collapse in={showFilters}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Filter by Event Type"
                name="eventType"
                value={filters.eventType}
                onChange={handleFilterChange}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Filter by User/Actor"
                name="user"
                value={filters.user}
                onChange={handleFilterChange}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              {/* Date Range Picker can be added here */}
              <TextField
                fullWidth
                label="Filter by Date Range (e.g., YYYY-MM-DD)"
                name="dateRange"
                value={filters.dateRange}
                onChange={handleFilterChange}
                size="small"
                placeholder="YYYY-MM-DD to YYYY-MM-DD"
              />
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                {headCells.map((headCell) => (
                  <TableCell
                    key={headCell.id}
                    align={headCell.numeric ? 'right' : 'left'}
                    padding={headCell.disablePadding ? 'none' : 'normal'}
                    sortDirection={orderBy === headCell.id ? order : false}
                  >
                    <TableSortLabel
                      active={orderBy === headCell.id}
                      direction={orderBy === headCell.id ? order : 'asc'}
                      onClick={() => handleSort(headCell.id)}
                    >
                      {headCell.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedLogs.map((log) => (
                <TableRow hover key={log.id}>
                  <TableCell>{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                  <TableCell>{log.eventType}</TableCell>
                  <TableCell>
                    <Tooltip title={`IP: ${log.ipAddress || 'N/A'}`}>
                      <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.user}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{log.component}</TableCell>
                  <TableCell>{getStatusChip(log.status)}</TableCell>
                  <TableCell>
                    <Tooltip title={JSON.stringify(log.details, null, 2)}>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {JSON.stringify(log.details)}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={headCells.length} align="center">
                    No audit logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={sortedAndFilteredLogs.length} // Should be totalLogs from backend if paginating server-side
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      )}
    </Box>
  );
};

export default AuditLog;