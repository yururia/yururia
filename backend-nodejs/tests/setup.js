// テストのタイムアウト設定（必要に応じて）
jest.setTimeout(10000);

// 環境変数のモックなど
process.env.JWT_SECRET = 'test_secret';
