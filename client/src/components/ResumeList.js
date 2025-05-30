import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ResumeList = ({ onSelectResume, onRefresh, refreshTrigger }) => {
    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false
    });
    const [filters, setFilters] = useState({
        status: '',
        search: '',
        page: 1,
        limit: 10
    });

    // Load resumes when component mounts or filters change
    useEffect(() => {
        loadResumes();
    }, [filters, refreshTrigger]);

    const loadResumes = async () => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.search) params.append('search', filters.search);
            params.append('page', filters.page);
            params.append('limit', filters.limit);

            const response = await axios.get(`/api/resume?${params.toString()}`);

            if (response.data && response.data.data) {
                setResumes(response.data.data);
                setPagination(response.data.pagination);
            }
        } catch (err) {
            console.error('Error loading resumes:', err);
            setError(`Failed to load resumes: ${err.response?.data?.message || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (resumeId, candidateName) => {
        try {
            setError('');
            const response = await axios.get(`/api/resume/${resumeId}/download`, {
                responseType: 'blob'
            });

            // Create download link
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });

            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;

            // Get filename from response headers or create one
            const contentDisposition = response.headers['content-disposition'];
            let filename = `${candidateName || 'Resume'}_Resume.docx`;

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            link.download = filename;
            link.click();

            // Clean up
            window.URL.revokeObjectURL(downloadUrl);
            link.remove();

            console.log(`Downloaded resume ${resumeId} as ${filename}`);
        } catch (err) {
            console.error('Error downloading resume:', err);
            setError(`Failed to download resume: ${err.response?.data?.message || err.message}`);
        }
    };

    const handleDelete = async (resumeId, fileName) => {
        if (!window.confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            setError('');
            await axios.delete(`/api/resume/${resumeId}`);

            // Refresh the list
            loadResumes();

            if (onRefresh) {
                onRefresh();
            }

            console.log(`Deleted resume ${resumeId}`);
        } catch (err) {
            console.error('Error deleting resume:', err);
            setError(`Failed to delete resume: ${err.response?.data?.message || err.message}`);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: key !== 'page' ? 1 : value // Reset to page 1 when changing filters
        }));
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'processed':
                return '#27ae60';
            case 'processing':
                return '#f39c12';
            case 'failed':
                return '#e74c3c';
            case 'reviewed':
                return '#3498db';
            default:
                return '#95a5a6';
        }
    };

    const containerStyle = {
        maxWidth: '1200px',
        margin: '20px auto',
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    };

    const headerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '25px',
        paddingBottom: '15px',
        borderBottom: '2px solid #e0e0e0'
    };

    const filtersStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '25px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
    };

    const inputStyle = {
        padding: '8px 12px',
        border: '1px solid #bdc3c7',
        borderRadius: '5px',
        fontSize: '14px'
    };

    const buttonStyle = {
        padding: '8px 15px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '500',
        transition: 'all 0.2s ease-in-out'
    };

    const primaryButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#3498db',
        color: 'white'
    };

    const successButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#27ae60',
        color: 'white'
    };

    const dangerButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#e74c3c',
        color: 'white'
    };

    const cardStyle = {
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        marginBottom: '15px',
        backgroundColor: '#ffffff',
        transition: 'all 0.2s ease-in-out',
        ':hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }
    };

    const cardHeaderStyle = {
        padding: '15px 20px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    const cardBodyStyle = {
        padding: '15px 20px'
    };

    const actionButtonsStyle = {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    };

    const paginationStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px',
        marginTop: '25px',
        padding: '20px',
        borderTop: '1px solid #e0e0e0'
    };

    const errorStyle = {
        color: '#e74c3c',
        backgroundColor: '#ffebee',
        padding: '15px',
        borderRadius: '5px',
        marginBottom: '20px',
        border: '1px solid #e74c3c'
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2 style={{ margin: 0, color: '#2c3e50' }}>Resume Library</h2>
                <div style={{ color: '#7f8c8d' }}>
                    {pagination.totalCount} resume{pagination.totalCount !== 1 ? 's' : ''} found
                </div>
            </div>

            {/* Filters */}
            <div style={filtersStyle}>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Search:
                    </label>
                    <input
                        type="text"
                        placeholder="Search by filename..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Status:
                    </label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        style={inputStyle}
                    >
                        <option value="">All Status</option>
                        <option value="processed">Processed</option>
                        <option value="processing">Processing</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Per Page:
                    </label>
                    <select
                        value={filters.limit}
                        onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                        style={inputStyle}
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'end' }}>
                    <button
                        onClick={loadResumes}
                        style={primaryButtonStyle}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div style={errorStyle}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                    <p>⏳ Loading resumes...</p>
                </div>
            )}

            {/* Resume List */}
            {!loading && resumes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                    <p>No resumes found. Upload some resumes to get started!</p>
                </div>
            ) : (
                resumes.map((resume) => (
                    <div key={resume.id} style={cardStyle}>
                        <div style={cardHeaderStyle}>
                            <div>
                                <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50', fontSize: '16px' }}>
                                    {resume.fileName}
                                </h3>
                                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                                    ID: {resume.id} | Created: {formatDate(resume.createdAt)}
                                    {resume.updatedAt !== resume.createdAt && (
                                        <> | Updated: {formatDate(resume.updatedAt)}</>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        fontSize: '10px',
                                        fontWeight: '500',
                                        color: 'white',
                                        backgroundColor: getStatusColor(resume.status),
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    {resume.status}
                                </span>
                                <span style={{ fontSize: '12px', color: '#7f8c8d' }}>
                                    {resume.hasData ? `${Math.round(resume.dataSize / 1024)}KB` : 'No data'}
                                </span>
                            </div>
                        </div>
                        <div style={cardBodyStyle}>
                            <div style={actionButtonsStyle}>
                                <button
                                    onClick={() => onSelectResume(resume.id)}
                                    style={primaryButtonStyle}
                                >
                                    📄 View/Edit
                                </button>
                                <button
                                    onClick={() => handleDownload(resume.id, resume.fileName.replace('.pdf', ''))}
                                    style={successButtonStyle}
                                    disabled={!resume.hasData}
                                >
                                    📥 Download DOCX
                                </button>
                                <button
                                    onClick={() => handleDelete(resume.id, resume.fileName)}
                                    style={dangerButtonStyle}
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div style={paginationStyle}>
                    <button
                        onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                        disabled={!pagination.hasPreviousPage}
                        style={{
                            ...buttonStyle,
                            backgroundColor: pagination.hasPreviousPage ? '#3498db' : '#bdc3c7',
                            color: 'white'
                        }}
                    >
                        ← Previous
                    </button>

                    <span style={{ margin: '0 15px', color: '#7f8c8d' }}>
                        Page {pagination.currentPage} of {pagination.totalPages}
                    </span>

                    <button
                        onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                        style={{
                            ...buttonStyle,
                            backgroundColor: pagination.hasNextPage ? '#3498db' : '#bdc3c7',
                            color: 'white'
                        }}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
};

export default ResumeList; 