import { Box, Skeleton, Table } from '@mantine/core';
import React from 'react';

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ columns, rows = 10 }) => {
  return (
    <Box>
      <Table verticalSpacing="sm" bg="app.8" bdrs="sm" style={{ tableLayout: 'fixed' }}>
        <Table.Thead bg="app.6">
          <Table.Tr>
            {Array.from({ length: columns }).map((_, i) => (
              <Table.Th key={i}>
                <Skeleton height={16} radius="sm" width="60%" opacity={0.3} />
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <Table.Tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Table.Td key={colIndex}>
                  <Skeleton height={20} radius="sm" width={colIndex === 0 ? '40%' : '80%'} />
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
};
