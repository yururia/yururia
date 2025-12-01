import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Button from './Button';
import useToastStore from '../../stores/toastStore';

/**
 * エクスポートボタンコンポーネント
 * CSVファイルをダウンロードする
 */
const ExportButton = ({ onExport, filename, label = 'エクスポート', variant = 'secondary', size = 'medium', className = '' }) => {
    const [isExporting, setIsExporting] = useState(false);
    const addToast = useToastStore((state) => state.addToast);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            // onExport関数を呼び出してBlobデータを取得
            const blob = await onExport();

            if (!blob) {
                addToast('エクスポートするデータがありません', 'warning');
                return;
            }

            // Blob URLを作成
            const url = window.URL.createObjectURL(blob);

            // ダウンロードリンクを作成して自動クリック
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || `export_${new Date().getTime()}.csv`;
            document.body.appendChild(link);
            link.click();

            // クリーンアップ
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            addToast('エクスポートが完了しました', 'success');
        } catch (error) {
            console.error('Export error:', error);
            // エラーハンドリングはAPIクライアントでトースト表示されるため、ここでは表示しない
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button
            onClick={handleExport}
            variant={variant}
            size={size}
            loading={isExporting}
            disabled={isExporting}
            className={className}
        >
            {label}
        </Button>
    );
};

ExportButton.propTypes = {
    onExport: PropTypes.func.isRequired,
    filename: PropTypes.string,
    label: PropTypes.string,
    variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    className: PropTypes.string
};

export default ExportButton;
