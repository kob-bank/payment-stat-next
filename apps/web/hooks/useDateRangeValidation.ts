import { useMemo } from 'react';

export interface DateValidationResult {
  isValid: boolean;
  errors: {
    startDateToday?: boolean;
    endDateToday?: boolean;
    endBeforeStart?: boolean;
    futureDate?: boolean;
    invalidFormat?: boolean;
  };
  canCallAPI: boolean;
  errorMessages: string[];
}

export const useDateRangeValidation = (
  startDate: string,
  endDate: string
): DateValidationResult => {
  return useMemo(() => {
    const errors = {
      startDateToday: false,
      endDateToday: false,
      endBeforeStart: false,
      futureDate: false,
      invalidFormat: false,
    };

    const errorMessages: string[] = [];

    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      errors.invalidFormat = true;
      errorMessages.push('รูปแบบวันที่ไม่ถูกต้อง');
      return {
        isValid: false,
        errors,
        canCallAPI: false,
        errorMessages,
      };
    }

    // Get today's date (local timezone)
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]!;

    // Check if start date is today
    if (startDate === todayString) {
      errors.startDateToday = true;
      errorMessages.push('ไม่สามารถเลือกวันปัจจุบันเป็นวันเริ่มต้นได้');
    }

    // Check if end date is today
    if (endDate === todayString) {
      errors.endDateToday = true;
      errorMessages.push('ไม่สามารถเลือกวันปัจจุบันเป็นวันสิ้นสุดได้');
    }

    // Check if dates are in the future
    if (startDate > todayString || endDate > todayString) {
      errors.futureDate = true;
      errorMessages.push('ไม่สามารถเลือกวันในอนาคตได้');
    }

    // Check if end date is before start date
    if (endDate < startDate) {
      errors.endBeforeStart = true;
      errorMessages.push('วันสิ้นสุดต้องมาหลังวันเริ่มต้น');
    }

    const hasErrors = Object.values(errors).some(Boolean);
    const isValid = !hasErrors;

    return {
      isValid,
      errors,
      canCallAPI: isValid,
      errorMessages,
    };
  }, [startDate, endDate]);
};

// Helper function to get date string for date inputs (YYYY-MM-DD format)
export const getDateInputValue = (date: Date): string => {
  return date.toISOString().split('T')[0] || '';
};

// Helper function to get max date for date inputs (yesterday)
export const getMaxDate = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getDateInputValue(yesterday);
};

// Helper function to get default date range (last 7 days excluding today)
export const getDefaultDateRange = (): { startDate: string; endDate: string } => {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // Yesterday

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6); // 7 days before yesterday

  return {
    startDate: getDateInputValue(startDate),
    endDate: getDateInputValue(endDate),
  };
};

// Preset options for common date ranges
export const getPresetDateRanges = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return {
    last7: {
      label: '7 วันย้อนหลัง',
      startDate: getDateInputValue(new Date(yesterday.getTime() - 6 * 24 * 60 * 60 * 1000)),
      endDate: getDateInputValue(yesterday),
    },
    last14: {
      label: '14 วันย้อนหลัง',
      startDate: getDateInputValue(new Date(yesterday.getTime() - 13 * 24 * 60 * 60 * 1000)),
      endDate: getDateInputValue(yesterday),
    },
    last30: {
      label: '30 วันย้อนหลัง',
      startDate: getDateInputValue(new Date(yesterday.getTime() - 29 * 24 * 60 * 60 * 1000)),
      endDate: getDateInputValue(yesterday),
    },
    thisMonth: {
      label: 'เดือนนี้ (ไม่รวมวันนี้)',
      startDate: getDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: getDateInputValue(yesterday),
    },
    lastMonth: {
      label: 'เดือนที่แล้ว',
      startDate: getDateInputValue(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      endDate: getDateInputValue(new Date(today.getFullYear(), today.getMonth(), 0)),
    },
  };
};