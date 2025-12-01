import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CalendarPage from './CalendarPage';
import useAuthStore from '../stores/authStore';
import { attendanceApi } from '../api/attendanceApi';

// Mock setup
jest.mock('../stores/authStore');
jest.mock('../api/attendanceApi');

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return <div data-testid="error-boundary">{this.state.error.toString()}</div>;
        }
        return this.props.children;
    }
}

describe('CalendarPage', () => {
    beforeEach(() => {
        useAuthStore.mockReturnValue({
            user: { id: 1, name: 'Test User' },
            isAuthenticated: true
        });

        // API mock default return
        attendanceApi.getAttendanceRecords.mockResolvedValue({
            success: true,
            data: {
                records: [
                    {
                        id: 1,
                        date: '2025-11-01',
                        status: 'present',
                        check_in_time: '09:00:00',
                        check_out_time: '18:00:00'
                    }
                ]
            }
        });
        attendanceApi.getMonthlyReport.mockResolvedValue({
            success: true,
            data: {
                records: []
            }
        });
        attendanceApi.getEvents.mockResolvedValue({
            success: true,
            data: {
                events: []
            }
        });
    });

    test('renders calendar page', async () => {
        render(
            <ErrorBoundary>
                <CalendarPage />
            </ErrorBoundary>
        );

        if (screen.queryByTestId('error-boundary')) {
            console.log('Error caught:', screen.getByTestId('error-boundary').textContent);
        }

        // Check header "出欠カレンダー" using regex
        expect(screen.getByText(/出欠カレンダー/)).toBeInTheDocument();
    });

    test('renders in dashboard mode', async () => {
        render(
            <ErrorBoundary>
                <CalendarPage isDashboardMode={true} />
            </ErrorBoundary>
        );

        if (screen.queryByTestId('error-boundary')) {
            console.log('Error caught:', screen.getByTestId('error-boundary').textContent);
        }

        const today = new Date();
        expect(screen.getByText(new RegExp(today.getFullYear().toString()))).toBeInTheDocument();
    });
});
