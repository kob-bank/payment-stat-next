'use client';

import { useState, useCallback } from 'react';

interface PendingDateChange {
  startDate?: string;
  endDate?: string;
  preset?: string;
  callback?: () => void;
}

interface TempDateRange {
  startDate: string;
  endDate: string;
}

export function useDateConfirmation(currentStartDate: string = '', currentEndDate: string = '') {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingChange, setPendingChange] = useState<PendingDateChange | null>(null);
  const [tempDateRange, setTempDateRange] = useState<TempDateRange>({
    startDate: currentStartDate,
    endDate: currentEndDate
  });

  // For preset selections - show confirmation immediately
  const requestPresetChange = useCallback((
    change: PendingDateChange
  ) => {
    setPendingChange(change);
    setShowConfirmation(true);
  }, []);

  // For individual date field changes - store temporarily
  const updateTempDate = useCallback((field: 'startDate' | 'endDate', value: string) => {
    setTempDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Request confirmation for temp date range
  const requestDateRangeConfirmation = useCallback((callback: () => void) => {
    setPendingChange({
      startDate: tempDateRange.startDate,
      endDate: tempDateRange.endDate,
      callback
    });
    setShowConfirmation(true);
  }, [tempDateRange]);

  const confirmDateChange = useCallback(() => {
    if (pendingChange?.callback) {
      pendingChange.callback();
    }
    // Update temp range to match confirmed values
    if (pendingChange?.startDate && pendingChange?.endDate) {
      setTempDateRange({
        startDate: pendingChange.startDate,
        endDate: pendingChange.endDate
      });
    }
    setPendingChange(null);
    setShowConfirmation(false);
  }, [pendingChange]);

  const cancelDateChange = useCallback(() => {
    // Reset temp range to current values
    setTempDateRange({
      startDate: currentStartDate,
      endDate: currentEndDate
    });
    setPendingChange(null);
    setShowConfirmation(false);
  }, [currentStartDate, currentEndDate]);

  const getConfirmationMessage = useCallback(() => {
    if (!pendingChange) return '';

    if (pendingChange.preset) {
      return `คุณต้องการเปลี่ยนช่วงเวลาเป็น "${pendingChange.preset}" หรือไม่?`;
    }

    if (pendingChange.startDate && pendingChange.endDate) {
      const startDate = new Date(pendingChange.startDate).toLocaleDateString('th-TH');
      const endDate = new Date(pendingChange.endDate).toLocaleDateString('th-TH');
      return `คุณต้องการเปลี่ยนช่วงเวลาเป็น ${startDate} - ${endDate} หรือไม่?`;
    }

    return 'คุณต้องการเปลี่ยนแปลงช่วงเวลาหรือไม่?';
  }, [pendingChange]);

  // Check if temp range is different from current range
  const hasTempChanges = useCallback(() => {
    return tempDateRange.startDate !== currentStartDate || tempDateRange.endDate !== currentEndDate;
  }, [tempDateRange, currentStartDate, currentEndDate]);

  return {
    showConfirmation,
    pendingChange,
    tempDateRange,
    requestPresetChange,
    updateTempDate,
    requestDateRangeConfirmation,
    confirmDateChange,
    cancelDateChange,
    getConfirmationMessage,
    hasTempChanges
  };
}
