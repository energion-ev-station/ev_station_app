import React from 'react';

export default function LoadingSpinner({ message = 'Loading...' }) {
    return (
        <div style={styles.container}>
            <div style={styles.spinner}></div>
            {message && <p style={styles.text}>{message}</p>}
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        minHeight: '200px'
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid rgba(255,255,255,0.08)',
        borderTopColor: '#4ecca3',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '1rem'
    },
    text: {
        color: '#8a8a8a',
        fontSize: '1rem',
        fontWeight: 500,
        margin: 0
    }
};
