import React, { useEffect } from 'react';
import './Toast.css';

const Toast = ({ id, message, type, onClose }) => {
    return (
        <div className={`toast toast--${type}`}>
            <div className="toast__message">{message}</div>
            <button className="toast__close" onClick={() => onClose(id)}>
                ×
            </button>
        </div>
    );
};

export default Toast;
