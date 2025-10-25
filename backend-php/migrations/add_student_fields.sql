-- 学生テーブルに追加フィールドを追加
ALTER TABLE students 
ADD COLUMN email VARCHAR(255) NULL,
ADD COLUMN phone VARCHAR(20) NULL,
ADD COLUMN grade VARCHAR(50) NULL,
ADD COLUMN class_name VARCHAR(100) NULL,
ADD COLUMN enrollment_date DATE NULL,
ADD COLUMN status ENUM('active', 'inactive', 'graduated', 'suspended') DEFAULT 'active',
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD INDEX idx_email (email),
ADD INDEX idx_status (status),
ADD INDEX idx_grade_class (grade, class_name);
