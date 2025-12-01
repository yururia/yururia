#!/bin/bash
# バックエンド配置スクリプト

echo "=== バックエンド配置を開始します ==="

# 1. ディレクトリの作成
echo "ディレクトリを作成中..."
sudo mkdir -p /var/www/html/backend-php

# 2. APIシンボリックリンクの作成
echo "APIシンボリックリンクを作成中..."
sudo rm -rf /var/www/html/api
sudo ln -s /var/www/html/backend-php/api /var/www/html/api

# 3. 権限の設定
echo "ファイル権限を設定中..."
sudo chown -R www-data:www-data /var/www/html/backend-php
sudo chown -h www-data:www-data /var/www/html/api
sudo chmod -R 755 /var/www/html/backend-php

# 4. Apacheモジュールの有効化
echo "Apacheモジュールを有効化中..."
sudo a2enmod rewrite
sudo a2enmod headers

# 5. Apacheの再起動
echo "Apacheを再起動中..."
sudo systemctl restart apache2

# 6. 確認
echo ""
echo "=== 配置完了 ==="
echo ""
echo "ディレクトリ構造:"
ls -la /var/www/html/ | grep -E "api|backend-php"
echo ""
echo "シンボリックリンクの確認:"
ls -l /var/www/html/api
echo ""
echo "Apacheステータス:"
sudo systemctl status apache2 --no-pager -l
echo ""
echo "次のステップ:"
echo "1. backend-php フォルダを /var/www/html/backend-php/ にアップロード"
echo "2. ブラウザで http://192.168.12.200/api/auth.php にアクセスして確認"

