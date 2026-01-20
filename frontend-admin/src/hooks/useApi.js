import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../lib/apiInterceptor';

/**
 * Custom hook for API calls with loading, error, and data states
 * Replaces repetitive fetch logic throughout the app
 * 
 * Usage:
 * const { data, loading, error, refetch } = useApi('/api/points');
 */
export const useApi = (url, options = {}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!url) return;
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get(url);
            setData(Array.isArray(response.data) ? response.data : response.data || null);
        } catch (err) {
            setError(err.message || 'Lỗi khi tải dữ liệu');
            setData(options.defaultValue || null);
        } finally {
            setLoading(false);
        }
    }, [url, options.defaultValue]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
};

/**
 * Hook for POST/PUT requests
 * Usage:
 * const { mutate, loading, error } = useApiMutation();
 * await mutate({ url: '/api/settings', method: 'POST', data: {...} });
 */
export const useApiMutation = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const mutate = useCallback(async ({ url, method = 'POST', data }) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient({
                method,
                url,
                data,
            });
            return { success: true, data: response.data };
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Lỗi không xác định';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    }, []);

    return { mutate, loading, error };
};
