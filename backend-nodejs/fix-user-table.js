const { query } = require('./config/database');

async function fixUserTable() {
    try {
        console.log('employee_idとstudent_idをNULL許可に変更しています...');

        await query('ALTER TABLE users MODIFY COLUMN employee_id VARCHAR(50) NULL');
        console.log('✓ employee_idをNULL許可に変更しました');

        await query('ALTER TABLE users MODIFY COLUMN student_id VARCHAR(255) NULL');
        console.log('✓ student_idをNULL許可に変更しました');

        console.log('\nデータベーススキーマの修正が完了しました！');
        process.exit(0);
    } catch (error) {
        console.error('エラー:', error.message);
        process.exit(1);
    }
}

fixUserTable();
