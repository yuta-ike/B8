# 使い方
## 環境変数の設定
```bash
export $(cat .env| grep -v "#" | xargs)
```
