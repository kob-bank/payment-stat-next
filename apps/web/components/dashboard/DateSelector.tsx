'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface DateSelectorProps {
    selectedDate: string;
    onDateChange: (date: string) => void;
}

export default function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
    const [date, setDate] = useState(selectedDate);

    useEffect(() => {
        setDate(selectedDate);
    }, [selectedDate]);

    const handleDateChange = (newDate: string) => {
        setDate(newDate);
        onDateChange(newDate);
    };

    const handlePrevDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() - 1);
        handleDateChange(d.toISOString().split('T')[0] as string);
    };

    const handleNextDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        const today = new Date().toISOString().split('T')[0] as string;
        const nextDay = d.toISOString().split('T')[0] as string;
        if (nextDay <= today) {
            handleDateChange(nextDay);
        }
    };

    const isToday = date === new Date().toISOString().split('T')[0];

    return (
        <div className="flex items-center space-x-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-2">
                <button
                    onClick={handlePrevDay}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>

                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="date"
                        value={date}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-gray-900 dark:text-white"
                    />
                </div>

                <button
                    onClick={handleNextDay}
                    disabled={isToday}
                    className={`p-2 rounded-lg transition-colors ${isToday
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                >
                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
            </div>

            <div className="flex space-x-2">
                <button
                    onClick={() => handleDateChange(new Date().toISOString().split('T')[0] as string)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${isToday
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-medium'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                >
                    Today
                </button>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium hidden sm:block">
                {formatDate(date)}
            </div>
        </div>
    );
}
