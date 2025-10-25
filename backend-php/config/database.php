<?php
/**
 * データベース接続設定
 */
class Database {
    private $host = DB_HOST;
    private $db_name = DB_NAME;
    private $username = DB_USER;
    private $password = DB_PASS;
    private $charset = 'utf8mb4';
    public $conn;

    /**
     * データベース接続を取得
     */
    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=" . $this->charset;
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $exception) {
            error_log("データベース接続エラー: " . $exception->getMessage());
            throw new Exception("データベース接続に失敗しました");
        }

        return $this->conn;
    }

    /**
     * データベーステーブルの初期化
     */
    public function initializeTables() {
        try {
            $conn = $this->getConnection();
            
            // 学生テーブルの作成（拡張版）
            $sql = "CREATE TABLE IF NOT EXISTS students (
                student_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                card_id VARCHAR(255) NULL,
                email VARCHAR(255) NULL,
                phone VARCHAR(20) NULL,
                grade VARCHAR(50) NULL,
                class_name VARCHAR(100) NULL,
                enrollment_date DATE NULL,
                status ENUM('active', 'inactive', 'graduated', 'suspended') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (student_id),
                UNIQUE KEY card_id_UNIQUE (card_id),
                INDEX idx_email (email),
                INDEX idx_status (status),
                INDEX idx_grade_class (grade, class_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $conn->exec($sql);

            // ユーザーテーブルの作成
            $sql = "CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                employee_id VARCHAR(50) UNIQUE NOT NULL,
                department VARCHAR(100),
                role ENUM('employee', 'admin') DEFAULT 'employee',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $conn->exec($sql);

            // 既存の出欠記録テーブル（ユーザー管理用）
            $sql = "CREATE TABLE IF NOT EXISTS user_attendance_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                date DATE NOT NULL,
                status ENUM('present', 'absent', 'late', 'early_departure') NOT NULL,
                check_in_time DATETIME NULL,
                check_out_time DATETIME NULL,
                reason TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_date (user_id, date),
                INDEX idx_user_date (user_id, date),
                INDEX idx_date (date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $conn->exec($sql);

            // 学生出欠記録テーブル（シンプル版）
            $sql = "CREATE TABLE IF NOT EXISTS student_attendance_records (
                id INT NOT NULL AUTO_INCREMENT,
                student_id VARCHAR(255) NOT NULL,
                timestamp DATETIME NOT NULL,
                PRIMARY KEY (id),
                FOREIGN KEY (student_id) REFERENCES students(student_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $conn->exec($sql);

            // 科目テーブルの作成
            $sql = "CREATE TABLE IF NOT EXISTS subjects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                subject_code VARCHAR(20) UNIQUE NOT NULL,
                subject_name VARCHAR(255) NOT NULL,
                description TEXT NULL,
                credits INT DEFAULT 1,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_subject_code (subject_code),
                INDEX idx_is_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $conn->exec($sql);

            // 授業テーブルの作成
            $sql = "CREATE TABLE IF NOT EXISTS classes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                class_code VARCHAR(50) UNIQUE NOT NULL,
                subject_id INT NOT NULL,
                teacher_name VARCHAR(255) NOT NULL,
                room VARCHAR(100) NULL,
                schedule_day ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                semester VARCHAR(20) NULL,
                academic_year VARCHAR(10) NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                INDEX idx_class_code (class_code),
                INDEX idx_schedule (schedule_day, start_time),
                INDEX idx_semester_year (semester, academic_year)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $conn->exec($sql);

            // 学生の科目登録テーブルの作成
            $sql = "CREATE TABLE IF NOT EXISTS enrollments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id VARCHAR(255) NOT NULL,
                class_id INT NOT NULL,
                enrollment_date DATE NOT NULL,
                status ENUM('enrolled', 'dropped', 'completed') DEFAULT 'enrolled',
                grade VARCHAR(5) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                UNIQUE KEY unique_student_class (student_id, class_id),
                INDEX idx_student_enrollment (student_id, status),
                INDEX idx_class_enrollment (class_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $conn->exec($sql);

            // 詳細な出欠記録テーブル（科目別）
            $sql = "CREATE TABLE IF NOT EXISTS detailed_attendance_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id VARCHAR(255) NOT NULL,
                class_id INT NOT NULL,
                attendance_date DATE NOT NULL,
                status ENUM('present', 'absent', 'late', 'excused') NOT NULL,
                check_in_time DATETIME NULL,
                check_out_time DATETIME NULL,
                notes TEXT NULL,
                created_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                UNIQUE KEY unique_student_class_date (student_id, class_id, attendance_date),
                INDEX idx_student_attendance (student_id, attendance_date),
                INDEX idx_class_attendance (class_id, attendance_date),
                INDEX idx_attendance_date (attendance_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $conn->exec($sql);

            // 通知テーブルの作成
            $sql = "CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                student_id VARCHAR(255) NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type ENUM('attendance', 'grade', 'general', 'alert') NOT NULL,
                priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
                is_read BOOLEAN DEFAULT FALSE,
                read_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
                INDEX idx_user_notifications (user_id, is_read),
                INDEX idx_student_notifications (student_id, is_read),
                INDEX idx_type_priority (type, priority),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $conn->exec($sql);

            // システム設定テーブルの作成
            $sql = "CREATE TABLE IF NOT EXISTS system_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT NULL,
                setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
                description TEXT NULL,
                is_public BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_setting_key (setting_key),
                INDEX idx_is_public (is_public)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $conn->exec($sql);

            // 監査ログテーブルの作成
            $sql = "CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                action VARCHAR(100) NOT NULL,
                table_name VARCHAR(100) NOT NULL,
                record_id VARCHAR(100) NULL,
                old_values JSON NULL,
                new_values JSON NULL,
                ip_address VARCHAR(45) NULL,
                user_agent TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_user_action (user_id, action),
                INDEX idx_table_record (table_name, record_id),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $conn->exec($sql);

            return true;
        } catch(PDOException $exception) {
            error_log("テーブル初期化エラー: " . $exception->getMessage());
            return false;
        }
    }

    /**
     * サンプルデータの挿入
     */
    public function insertSampleData() {
        try {
            $conn = $this->getConnection();
            
            // 管理者ユーザーの作成
            $adminPassword = password_hash('password123', PASSWORD_DEFAULT);
            $sql = "INSERT IGNORE INTO users (name, email, password, employee_id, department, role) 
                    VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->execute(['管理者', 'admin@example.com', $adminPassword, 'ADMIN001', '管理部', 'admin']);

            // 一般ユーザーの作成
            $userPassword = password_hash('password123', PASSWORD_DEFAULT);
            $sql = "INSERT IGNORE INTO users (name, email, password, employee_id, department, role) 
                    VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->execute(['田中太郎', 'tanaka@example.com', $userPassword, 'EMP001', '開発部', 'employee']);

            // サンプル学生の作成（拡張版）
            $sampleStudents = [
                ['STU001', '山田太郎', 'CARD001', 'yamada@example.com', '090-1234-5678', '1年', 'A組', '2024-04-01'],
                ['STU002', '佐藤花子', 'CARD002', 'sato@example.com', '090-2345-6789', '1年', 'A組', '2024-04-01'],
                ['STU003', '鈴木一郎', 'CARD003', 'suzuki@example.com', '090-3456-7890', '2年', 'B組', '2023-04-01'],
                ['STU004', '高橋美咲', null, 'takahashi@example.com', '090-4567-8901', '2年', 'B組', '2023-04-01'],
                ['STU005', '田中健太', 'CARD005', 'tanaka@example.com', '090-5678-9012', '3年', 'C組', '2022-04-01']
            ];
            
            foreach ($sampleStudents as $student) {
                $sql = "INSERT IGNORE INTO students (student_id, name, card_id, email, phone, grade, class_name, enrollment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->execute($student);
            }

            // サンプル科目の作成
            $sampleSubjects = [
                ['MATH101', '数学基礎', '基礎的な数学の概念を学ぶ', 3],
                ['ENG101', '英語基礎', '英語の基礎文法と語彙', 2],
                ['SCI101', '科学基礎', '物理・化学・生物の基礎', 3],
                ['HIST101', '歴史', '日本史と世界史', 2],
                ['PE101', '体育', '身体を動かす授業', 1]
            ];
            
            foreach ($sampleSubjects as $subject) {
                $sql = "INSERT IGNORE INTO subjects (subject_code, subject_name, description, credits) VALUES (?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->execute($subject);
            }

            // サンプル授業の作成
            $sampleClasses = [
                ['MATH101-A', 1, '田中先生', '101教室', 'monday', '09:00:00', '10:30:00', '前期', '2024'],
                ['ENG101-A', 2, '佐藤先生', '102教室', 'tuesday', '10:40:00', '12:10:00', '前期', '2024'],
                ['SCI101-A', 3, '鈴木先生', '実験室', 'wednesday', '13:00:00', '14:30:00', '前期', '2024'],
                ['HIST101-A', 4, '高橋先生', '103教室', 'thursday', '14:40:00', '16:10:00', '前期', '2024'],
                ['PE101-A', 5, '山田先生', '体育館', 'friday', '09:00:00', '10:30:00', '前期', '2024']
            ];
            
            foreach ($sampleClasses as $class) {
                $sql = "INSERT IGNORE INTO classes (class_code, subject_id, teacher_name, room, schedule_day, start_time, end_time, semester, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->execute($class);
            }

            // サンプル登録の作成
            $sampleEnrollments = [
                ['STU001', 1, '2024-04-01'],
                ['STU001', 2, '2024-04-01'],
                ['STU002', 1, '2024-04-01'],
                ['STU002', 3, '2024-04-01'],
                ['STU003', 2, '2024-04-01'],
                ['STU003', 4, '2024-04-01'],
                ['STU004', 1, '2024-04-01'],
                ['STU004', 5, '2024-04-01'],
                ['STU005', 3, '2024-04-01'],
                ['STU005', 4, '2024-04-01']
            ];
            
            foreach ($sampleEnrollments as $enrollment) {
                $sql = "INSERT IGNORE INTO enrollments (student_id, class_id, enrollment_date) VALUES (?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->execute($enrollment);
            }

            // デフォルトシステム設定の挿入
            $defaultSettings = [
                ['school_name', 'サンプル学校', 'string', '学校名', TRUE],
                ['attendance_threshold', '80', 'number', '出欠率の閾値（%）', FALSE],
                ['late_threshold_minutes', '15', 'number', '遅刻とみなす時間（分）', FALSE],
                ['auto_attendance_reminder', 'true', 'boolean', '出欠記録の自動リマインダー', FALSE],
                ['notification_enabled', 'true', 'boolean', '通知機能の有効/無効', FALSE]
            ];
            
            foreach ($defaultSettings as $setting) {
                $sql = "INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES (?, ?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->execute($setting);
            }

            // 既存のユーザー出欠記録の作成
            $today = new DateTime();
            for ($i = 0; $i < 30; $i++) {
                $date = clone $today;
                $date->modify("-{$i} days");
                $dateStr = $date->format('Y-m-d');
                
                $statuses = ['present', 'absent', 'late', 'early_departure'];
                $randomStatus = $statuses[array_rand($statuses)];
                
                $checkInTime = null;
                $checkOutTime = null;
                $reason = null;
                
                if ($randomStatus === 'present' || $randomStatus === 'late') {
                    $checkInTime = $date->format('Y-m-d') . ' ' . sprintf('%02d:%02d:00', 9 + rand(0, 2), rand(0, 59));
                }
                
                if ($randomStatus === 'present' || $randomStatus === 'early_departure') {
                    $checkOutTime = $date->format('Y-m-d') . ' ' . sprintf('%02d:%02d:00', 17 + rand(0, 2), rand(0, 59));
                }
                
                if ($randomStatus === 'absent') {
                    $reason = '体調不良';
                }
                
                $sql = "INSERT IGNORE INTO user_attendance_records (user_id, date, status, check_in_time, check_out_time, reason) 
                        VALUES (?, ?, ?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->execute([2, $dateStr, $randomStatus, $checkInTime, $checkOutTime, $reason]);
            }

            // 学生出欠記録の作成
            for ($i = 0; $i < 30; $i++) {
                $date = clone $today;
                $date->modify("-{$i} days");
                
                // 各学生に対してランダムに出欠記録を作成
                foreach ($sampleStudents as $student) {
                    $studentId = $student[0];
                    
                    // 70%の確率で出欠記録を作成
                    if (rand(1, 10) <= 7) {
                        // 出勤時間をランダムに設定（8:00-10:00の間）
                        $hour = 8 + rand(0, 2);
                        $minute = rand(0, 59);
                        $timestamp = $date->format('Y-m-d') . ' ' . sprintf('%02d:%02d:00', $hour, $minute);
                        
                        $sql = "INSERT IGNORE INTO student_attendance_records (student_id, timestamp) VALUES (?, ?)";
                        $stmt = $conn->prepare($sql);
                        $stmt->execute([$studentId, $timestamp]);
                    }
                }
            }

            return true;
        } catch(PDOException $exception) {
            error_log("サンプルデータ挿入エラー: " . $exception->getMessage());
            return false;
        }
    }
}
?>
