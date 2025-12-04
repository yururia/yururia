import React, { useRef } from 'react';
import './QRGenerator.css';

/**
 * QRコード表示・印刷・保存コンポーネント
 * @param {Object} props
 * @param {string} props.qrImage - QRコードの画像データURL
 * @param {string} props.locationName - 場所名
 * @param {string} props.description - 説明（オプション）
 * @param {string} props.expiresAt - 有効期限（オプション）
 * @param {Function} props.onClose - 閉じるボタンのハンドラ（オプション）
 */
const QRGenerator = ({ qrImage, locationName, description, expiresAt, onClose }) => {
    const printRef = useRef();

    // 印刷機能
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>QRコード印刷 - ${locationName}</title>
                    <style>
                        body {
                            font-family: 'Helvetica Neue', Arial, sans-serif;
                            text-align: center;
                            padding: 40px;
                        }
                        .qr-container {
                            border: 2px solid #000;
                            padding: 40px;
                            display: inline-block;
                            border-radius: 10px;
                        }
                        .location-name {
                            font-size: 32px;
                            font-weight: bold;
                            margin-bottom: 20px;
                        }
                        .qr-image {
                            width: 400px;
                            height: 400px;
                        }
                        .description {
                            margin-top: 20px;
                            font-size: 18px;
                            color: #555;
                        }
                        .footer {
                            margin-top: 40px;
                            font-size: 14px;
                            color: #999;
                        }
                        @media print {
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="qr-container">
                        <div class="location-name">${locationName}</div>
                        <img src="${qrImage}" class="qr-image" alt="QR Code" />
                        ${description ? `<div class="description">${description}</div>` : ''}
                        ${expiresAt ? `<div class="description">有効期限: ${new Date(expiresAt).toLocaleString()}</div>` : ''}
                    </div>
                    <div class="footer">
                        Attendance System Location QR
                    </div>
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    // 保存機能
    const handleSave = () => {
        const link = document.createElement('a');
        link.href = qrImage;
        link.download = `QR_${locationName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="qr-generator-container">
            <div className="qr-preview">
                <h3>{locationName}</h3>
                <img src={qrImage} alt="QR Code" className="qr-image-preview" />
                {description && <p className="qr-description">{description}</p>}
                {expiresAt && <p className="qr-expires">有効期限: {new Date(expiresAt).toLocaleString()}</p>}
            </div>

            <div className="qr-actions">
                <button onClick={handlePrint} className="btn btn--primary">
                    🖨️ 印刷
                </button>
                <button onClick={handleSave} className="btn btn--secondary">
                    💾 画像保存
                </button>
                {onClose && (
                    <button onClick={onClose} className="btn btn--outline">
                        閉じる
                    </button>
                )}
            </div>
        </div>
    );
};

export default QRGenerator;
