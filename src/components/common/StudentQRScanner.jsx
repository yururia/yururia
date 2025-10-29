import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import './StudentQRScanner.css';

const StudentQRScanner = ({ onScan, onClose, isOpen }) => {
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const handleScan = (detectedCodes) => {
    if (detectedCodes && detectedCodes.length > 0) {
      setIsScanning(false);
      try {
        // QRコードデータを解析
        const result = detectedCodes[0].rawValue;
        const qrData = JSON.parse(result);
        if (qrData.groupId) {
          setScanResult({
            groupId: qrData.groupId,
            groupName: qrData.groupName || 'Unknown Group',
            timestamp: qrData.timestamp
          });
        } else {
          setError('無効なQRコードです。グループ用のQRコードをスキャンしてください。');
        }
      } catch (err) {
        setError('QRコードの解析に失敗しました。正しいQRコードをスキャンしてください。');
        console.error('QR解析エラー:', err);
      }
    }
  };

  const handleError = (error) => {
    console.error('QRスキャナーエラー:', error);
    setError('カメラへのアクセスに失敗しました。カメラの許可を確認してください。');
  };

  const handleStartScan = () => {
    setError(null);
    setScanResult(null);
    setIsScanning(true);
  };

  const handleStopScan = () => {
    setIsScanning(false);
  };

  const handleConfirmScan = () => {
    if (scanResult) {
      onScan(scanResult);
      setScanResult(null);
    }
  };

  const handleCancelScan = () => {
    setScanResult(null);
    setError(null);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="student-qr-scanner-overlay">
      <div className="student-qr-scanner-modal">
        <div className="student-qr-scanner-header">
          <h2>QRコードスキャン</h2>
          <button 
            className="close-button" 
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        
        <div className="student-qr-scanner-content">
          {error && (
            <div className="error-message">
              {error}
              <button 
                className="retry-button"
                onClick={handleStartScan}
              >
                再試行
              </button>
            </div>
          )}
          
          {scanResult ? (
            <div className="scan-result">
              <div className="scan-result-icon">✅</div>
              <h3>スキャン成功</h3>
              <div className="scan-result-info">
                <p><strong>グループ:</strong> {scanResult.groupName}</p>
                <p><strong>グループID:</strong> {scanResult.groupId}</p>
                <p><strong>スキャン時刻:</strong> {new Date().toLocaleString('ja-JP')}</p>
              </div>
              <div className="scan-result-actions">
                <button 
                  className="btn btn--secondary"
                  onClick={handleCancelScan}
                >
                  キャンセル
                </button>
                <button 
                  className="btn btn--primary"
                  onClick={handleConfirmScan}
                >
                  出欠記録を送信
                </button>
              </div>
            </div>
          ) : isScanning ? (
            <div className="scanner-container">
              <Scanner
                onScan={handleScan}
                onError={handleError}
                constraints={{
                  facingMode: 'environment' // 背面カメラを優先
                }}
              />
              <div className="scanner-instructions">
                <p>グループのQRコードをカメラの中央に合わせてください</p>
                <button 
                  className="btn btn--secondary"
                  onClick={handleStopScan}
                >
                  スキャン停止
                </button>
              </div>
            </div>
          ) : (
            <div className="scanner-start">
              <div className="scanner-icon">📱</div>
              <h3>QRコードスキャン</h3>
              <p>グループのQRコードをスキャンして出欠記録を行います</p>
              <div className="scanner-tips">
                <h4>スキャンのコツ:</h4>
                <ul>
                  <li>QRコードをカメラの中央に配置</li>
                  <li>適度な距離を保つ（30-50cm）</li>
                  <li>明るい場所でスキャン</li>
                  <li>カメラを安定させる</li>
                </ul>
              </div>
              <button 
                className="btn btn--primary"
                onClick={handleStartScan}
              >
                スキャン開始
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentQRScanner;
