const { query } = require('./config/database');

async function fixRoleColumn() {
    try {
        console.log('roleカラムにstudentを追加しています...');

        // まず現在のENUM値を確認
        const columns = await query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'attendancedb' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'role'
    `);

        console.log('現在のroleカラムの型:', columns[0]?.COLUMN_TYPE);

        // roleカラムを更新してstudentを追加
        await query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('admin', 'employee', 'teacher', 'student') 
      DEFAULT 'employee'
    `);

        console.log('✓ roleカラムにstudentを追加しました');

        // 確認
        const updatedColumns = await query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'attendancedb' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'role'
    `);

        console.log('更新後のroleカラムの型:', updatedColumns[0]?.COLUMN_TYPE);
        console.log('\nデータベーススキーマの修正が完了しました！');
        process.exit(0);
    } catch (error) {
        console.error('エラー:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

fixRoleColumn();
