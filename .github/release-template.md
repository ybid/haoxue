## 口算小达人 v{version}

### 更新内容
<!-- 在此填写本次更新的主要内容 -->

### 部署方式

**方式一：Docker 一键部署**
```bash
# 在飞牛 NAS 上执行
cd /path/to/haoxue
docker-compose up -d
# 访问 http://NAS_IP:8080
```

**方式二：静态文件托管**
将 `index.html`、`manifest.json`、`service-worker.js`、`icons/` 放到 Web 目录即可。
