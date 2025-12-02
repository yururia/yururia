const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
    let connection;

    try {
        // データベース接続を作成
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'attendance_db',
            multipleStatements: true
        });

        console.log('✅ データベースに接続しました');

        // SQLファイルを読み込む
        const sqlPath = path.join(__dirname, 'add_group_icon_and_status.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('📂 マイグレーションスクリプトを読み込みました');
        console.log('🚀 マイグレーションを実行中...\n');

        // マイグレーションを実行
        await connection.query(sql);

        console.log('✅ マイグレーション成功！\n');

        // 変更確認
        console.log('📊 変更確認:\n');

        const [groupsSchema] = await connection.query('DESCRIBE `groups`');
        console.log('groups テーブル:');
        console.table(groupsSchema.filter(col => col.Field === 'icon' || col.Field === 'name'));

        const [membersSchema] = await connection.query('DESCRIBE `group_members`');
        console.log('\ngroup_members テーブル:');
        console.table(membersSchema.filter(col => col.Field === 'status'));

    } catch (error) {
        console.error('❌ マイグレーションエラー:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✅ データベース接続を閉じました');
        }
    }
}

runMigration();
