import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { TransactionData, ExplorerApi } from '../../services/explorerApi';

interface VirtualizedTransactionTableProps {
  transactions: TransactionData[];
  expandedRows: Set<string>;
  onToggleRow: (signature: string) => void;
  onAddressClick: (address: string) => void;
}

// Memoized transaction row to prevent unnecessary re-renders
const TransactionRow: React.FC<{
  transaction: TransactionData;
  isExpanded: boolean;
  onToggle: () => void;
  onAddressClick: (address: string) => void;
}> = React.memo(({ transaction, isExpanded, onToggle, onAddressClick }) => {
  const theme = useTheme();

  // Extract complex expressions to separate variables for ESLint
  const recipientAddress = (transaction as any).recipient;
  const transactionType = transaction.txType;
  const creatorAddress = transaction.creatorAddress;
  const timestamp = transaction.timestamp;
  const blockHeight = transaction.blockHeight;
  const fee = transaction.fee;

  const formattedType = useMemo(() => 
    ExplorerApi.formatTransactionType(transactionType), 
    [transactionType]
  );

  const formattedFromAddress = useMemo(() => 
    ExplorerApi.formatAddress(creatorAddress), 
    [creatorAddress]
  );

  const formattedToAddress = useMemo(() => 
    recipientAddress ? ExplorerApi.formatAddress(recipientAddress) : null, 
    [recipientAddress]
  );

  const formattedTime = useMemo(() => 
    ExplorerApi.formatTimestamp(timestamp), 
    [timestamp]
  );

  const formattedBlockHeight = useMemo(() => 
    blockHeight ? blockHeight.toLocaleString() : 'Pending',
    [blockHeight]
  );

  const formattedFee = useMemo(() => 
    fee !== undefined ? `${fee} FRK` : '—',
    [fee]
  );

  return (
    <TableRow
      hover
      sx={{
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.02)
        }
      }}
    >
      <TableCell>
        <IconButton
          size="small"
          onClick={onToggle}
          sx={{
            color: 'primary.main',
            transition: 'transform 0.2s ease',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        >
          <KeyboardArrowDown />
        </IconButton>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
          {formattedBlockHeight}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={formattedType}
          size="small"
          color={transactionType ? "primary" : "default"}
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Tooltip title={creatorAddress}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              cursor: 'pointer',
              color: 'error.main',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={() => onAddressClick(creatorAddress)}
          >
            {formattedFromAddress}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell>
        {formattedToAddress ? (
          <Tooltip title={recipientAddress}>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                cursor: 'pointer',
                color: 'success.main',
                '&:hover': { textDecoration: 'underline' }
              }}
              onClick={() => onAddressClick(recipientAddress)}
            >
              {formattedToAddress}
            </Typography>
          </Tooltip>
        ) : (
          <Typography variant="body2" color="text.secondary">—</Typography>
        )}
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {formattedFee}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">{formattedTime}</Typography>
      </TableCell>
    </TableRow>
  );
});

TransactionRow.displayName = 'TransactionRow';

const VirtualizedTransactionTable: React.FC<VirtualizedTransactionTableProps> = ({
  transactions,
  expandedRows,
  onToggleRow,
  onAddressClick
}) => {
  const theme = useTheme();

  // Only render visible transactions (simple virtualization)
  const visibleTransactions = useMemo(() => {
    // For now, limit to first 100 transactions for performance
    // You can implement proper virtualization later if needed
    return transactions.slice(0, 100);
  }, [transactions]);

  const transactionCount = transactions.length;
  const visibleCount = visibleTransactions.length;

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
            <TableCell width="50">Details</TableCell>
            <TableCell>Block</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>From</TableCell>
            <TableCell>To</TableCell>
            <TableCell>Fee</TableCell>
            <TableCell>Time</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleCount === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography color="text.secondary" sx={{ py: 4 }}>
                  No transactions found. Try adjusting your search criteria.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            visibleTransactions.map((tx, index) => (
              <TransactionRow
                key={`${tx.signature}-${index}`}
                transaction={tx}
                isExpanded={expandedRows.has(tx.signature)}
                onToggle={() => onToggleRow(tx.signature)}
                onAddressClick={onAddressClick}
              />
            ))
          )}
        </TableBody>
      </Table>
      
      {transactionCount > 100 && (
        <Typography variant="caption" sx={{ p: 2, display: 'block' }}>
          Showing first 100 of {transactionCount} transactions for performance
        </Typography>
      )}
    </TableContainer>
  );
};

export default React.memo(VirtualizedTransactionTable);