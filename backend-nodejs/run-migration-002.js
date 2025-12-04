const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// ハードコードされた設定（run-migration.jsに合わせる）
const config = {
    host: 'localhost',
    user: 'server',
    password: 'pass',
    database: 'sotsuken',
    multipleStatements: true
};

async function runMigration() {
    let connection;
    try {
        console.log('マイグレーションを開始します...');
        connection = await mysql.createConnection(config);

        const sqlPath = path.join(__dirname, 'migrations', '002_add_join_code.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('SQLを実行中...');
        await connection.query(sql);

        console.log('✅ マイグレーションが完了しました。');

    } catch (error) {
        console.error('❌ エラーが発生しました:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

runMigration();
