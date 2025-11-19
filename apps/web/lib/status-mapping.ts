/**
 * Status mapping utilities for payment system
 * Maps user-friendly status labels to actual database values
 */

export interface StatusMapping {
  [key: string]: string[];
}

// Unified status mapping - UI labels to API-compatible values
// Backend will handle mapping these to actual database values
export const unifiedStatusMap: StatusMapping = {
  'Success': ['success'],
  'Failed': ['failed', 'create_failed'],
  'Pending': ['pending'],
  'Cancelled': ['cancelled']
};

// Keep old mappings for reference/migration (can be removed later)
export const transactionStatusMap: StatusMapping = {
  'Success': ['success', 'sended', 'complete'],
  'Failed': ['failed', 'create_failed', 'error'],
  'Pending': ['pending', 'processing', 'waiting'],
  'Cancelled': ['cancelled', 'canceled', 'void']
};

export const withdrawalStatusMap: StatusMapping = {
  'Success': ['SUCCESS', 'COMPLETED', 'APPROVED'],
  'Failed': ['FAILED', 'CREATE_FAILED', 'REJECTED', 'ERROR'],
  'Pending': ['PENDING', 'PROCESSING', 'WAITING', 'REVIEWING'],
  'Cancelled': ['CANCELLED', 'CANCELED', 'VOID']
};

// Get UI display labels - now unified
export const statusLabels = Object.keys(unifiedStatusMap);
export const transactionStatusLabels = Object.keys(transactionStatusMap);
export const withdrawalStatusLabels = Object.keys(withdrawalStatusMap);

/**
 * Get unified status values for filtering (new approach)
 * @param selectedLabels - Array of selected UI labels
 * @returns Array of API-compatible status values
 */
export function getUnifiedStatusValues(selectedLabels: string[]): string[] {
  const mappedValues: string[] = [];
  
  selectedLabels.forEach(label => {
    const values = unifiedStatusMap[label];
    if (values) {
      mappedValues.push(...values);
    }
  });
  
  return mappedValues;
}

/**
 * Get mapped status values for filtering (legacy - will be deprecated)
 * @param statusType - Type of status (transaction or withdrawal)
 * @param selectedLabels - Array of selected UI labels
 * @returns Array of mapped database values
 */
export function getMappedStatusValues(
  statusType: 'transaction' | 'withdrawal', 
  selectedLabels: string[]
): string[] {
  const statusMap = statusType === 'transaction' ? transactionStatusMap : withdrawalStatusMap;
  const mappedValues: string[] = [];
  
  selectedLabels.forEach(label => {
    const values = statusMap[label];
    if (values) {
      mappedValues.push(...values);
    }
  });
  
  return mappedValues;
}

/**
 * Get UI label from database value
 * @param statusType - Type of status (transaction or withdrawal)
 * @param dbValue - Database value
 * @returns UI label or the original value if no mapping found
 */
export function getStatusLabel(
  statusType: 'transaction' | 'withdrawal',
  dbValue: string
): string {
  const statusMap = statusType === 'transaction' ? transactionStatusMap : withdrawalStatusMap;
  
  for (const [label, values] of Object.entries(statusMap)) {
    if (values.includes(dbValue)) {
      return label;
    }
  }
  
  return dbValue; // Return original value if no mapping found
}

/**
 * Get all possible database values for a status type
 * @param statusType - Type of status (transaction or withdrawal)
 * @returns Array of all possible database values
 */
export function getAllStatusValues(statusType: 'transaction' | 'withdrawal'): string[] {
  const statusMap = statusType === 'transaction' ? transactionStatusMap : withdrawalStatusMap;
  const allValues: string[] = [];
  
  Object.values(statusMap).forEach(values => {
    allValues.push(...values);
  });
  
  return allValues;
}
