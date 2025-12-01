@echo off
REM ==========================================
REM データベーススキーマ検証スクリプト
REM ==========================================

echo ======================================
echo データベーススキーマ検証
echo ======================================
echo.

set DB_USER=server
set DB_NAME=sotsuken

echo [検証1] 新規テーブルの存在確認...
echo.

mysql -u %DB_USER% -p -e "USE %DB_NAME%; SHOW TABLES LIKE 'organizations';" > nul 2>&1
if errorlevel 1 (
    echo [NG] organizations テーブルが見つかりません
) else (
    echo [OK] organizations
)

mysql -u %DB_USER% -p -e "USE %DB_NAME%; SHOW TABLES LIKE 'groups';" > nul 2>&1
if errorlevel 1 (
    echo [NG] groups テーブルが見つかりません
) else (
    echo [OK] groups
)

mysql -u %DB_USER% -p -e "USE %DB_NAME%; SHOW TABLES LIKE 'group_members';" > nul 2>&1
if errorlevel 1 (
    echo [NG] group_members テーブルが見つかりません
) else (
    echo [OK] group_members
)

mysql -u %DB_USER% -p -e "USE %DB_NAME%; SHOW TABLES LIKE 'group_teachers';" > nul 2>&1
if errorlevel 1 (
    echo [NG] group_teachers テーブルが見つかりません
) else (
    echo [OK] group_teachers
)

mysql -u %DB_USER% -p -e "USE %DB_NAME%; SHOW TABLES LIKE 'qr_codes';" > nul 2>&1
if errorlevel 1 (
    echo [NG] qr_codes テーブルが見つかりません
) else (
    echo [OK] qr_codes
)

mysql -u %DB_USER% -p -e "USE %DB_NAME%; SHOW TABLES LIKE 'allowed_ip_ranges';" > nul 2>&1
if errorlevel 1 (
    echo [NG] allowed_ip_ranges テーブルが見つかりません
) else (
    echo [OK] allowed_ip_ranges
)

mysql -u %DB_USER% -p -e "USE %DB_NAME%; SHOW TABLES LIKE 'scan_logs';" > nul 2>&1
if errorlevel 1 (
    echo [NG] scan_logs テーブルが見つかりません
) else (
    echo [OK] scan_logs
)

mysql -u %DB_USER% -p -e "USE %DB_NAME%; SHOW TABLES LIKE 'timetables';" > nul 2>&1
if errorlevel 1 (
    echo [NG] timetables テーブルが見つかりません
) else (
    echo [OK] timetables
)

mysql -u %DB_USER% -p -e "USE %DB_NAME%; SHOW TABLES LIKE 'class_sessions';" > nul 2>&1
if errorlevel 1 (
    echo [NG] class_sessions テーブルが見つかりません
) else (
    echo [OK] class_sessions
)

mysql -u %DB_USER% -p -e "USE %DB_NAME%; SHOW TABLES LIKE 'schedule_templates';" > nul 2>&1
if errorlevel 1 (
    echo [NG] schedule_templates テーブルが見つかりません
) else (
    echo [OK] schedule_templates
)

mysql -u %DB_USER% -p -e "USE %DB_NAME%; SHOW TABLES LIKE 'absence_requests';" > nul 2>&1
if errorlevel 1 (
    echo [NG] absence_requests テーブルが見つかりません
) else (
    echo [OK] absence_requests
)

mysql -u %DB_USER% -p -e "USE %DB_NAME%; SHOW TABLES LIKE 'request_approvals';" > nul 2>&1
if errorlevel 1 (
    echo [NG] request_approvals テーブルが見つかりません
) else (
    echo [OK] request_approvals
)

echo.
echo [検証2] デフォルトデータ確認...
echo.

echo organizations テーブルのレコード数:
mysql -u %DB_USER% -p -e "USE %DB_NAME%; SELECT COUNT(*) as count FROM organizations;"

echo.
echo allowed_ip_ranges テーブルのレコード数:
mysql -u %DB_USER% -p -e "USE %DB_NAME%; SELECT COUNT(*) as count FROM allowed_ip_ranges;"

echo.
echo [検証3] users.role の拡張確認...
mysql -u %DB_USER% -p -e "USE %DB_NAME%; SHOW COLUMNS FROM users LIKE 'role';"

echo.
echo ======================================
echo 検証完了
echo ======================================
echo.
echo 詳細なスキーマ情報を確認する場合:
echo mysql -u %DB_USER% -p %DB_NAME%
echo その後、DESCRIBE テーブル名; で各テーブルの構造を確認できます。
echo.
pause
