# Node.jsバックエンドの起動方法

## 🎯 簡単な起動方法

### オプション1: 2つのターミナルで起動（推奨）

#### ターミナル1: Node.jsバックエンド

```powershell
cd backend-nodejs
npm start
```

または開発モード:
```powershell
npm run dev
```

#### ターミナル2: Reactアプリ

```powershell
# 別のターミナルを開いて
npm start
```

---

## 📋 現在の設定状況

✅ **完了済み:**
- backend-nodejsの依存関係インストール済み
- .envファイル作成済み（ローカル開発用設定）
- ReactアプリのAPI接続先を変更済み（src/api/attendanceApi.js）

⏳ **次のステップ:**
- ターミナルで `backend-nodejs` ディレクトリに移動
- `npm start` でNode.jsバックエンドを起動
- 別ターミナルでReactアプリ（`npm start`）を起動

---

## 🌐 サーバーへのデプロイ（後で実施）

1. backend-nodejsフォルダをサーバーにアップロード
2. サーバーで `npm install --production`
3. .envファイルを設定
4. PM2で起動: `pm2 start server.js --name attendance-backend`

詳細は `NODEJS_BACKEND_SETUP.md` を参照

---

## 💡 ローカルでテストしたい場合

新しいPowerShellターミナルを2つ開いて、それぞれ以下のコマンドを実行してください:

**ターミナル1**:
```powershell
cd C:\Users\yasud\attendance-app\backend-nodejs
npm start
```

**ターミナル2**:
```powershell
cd C:\Users\yasud\attendance-app
npm start
```

ブラウザで `http://localhost:3000` にアクセスして動作確認

