# 🚀 TENEO 节点挖矿程序

这是一个 TENEO 节点的命令行版本程序。通过运行节点，您可以获得 $TENEO 代币奖励。

## 🔥 功能特点

- ✨ 支持多账号管理
- 🔄 自动重连功能
- 🌐 支持代理配置
- 💰 每15分钟自动领取积分
- 📊 实时显示积分统计

## 📌 免责声明

⚠️ 本程序仅供学习交流使用，使用本程序所产生的任何后果由用户自行承担。
如果因使用本程序造成任何损失，作者概不负责。

## 🛠️ VPS 部署教程

### 1. 系统要求
- 操作系统：Ubuntu/Debian/CentOS
- Node.js 版本：v22 或以上
- 内存：至少 1GB RAM
- 存储：至少 20GB 硬盘空间

### 2. 环境配置

```bash
# 1. 安装 nvm（Node Version Manager）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# 2. 重新加载环境变量
source ~/.bashrc   # 如果使用 bash
# 或
source ~/.zshrc    # 如果使用 zsh

# 3. 安装 Node.js 22
nvm install 22

# 4. 设置默认版本
nvm use 22
nvm alias default 22

# 5. 验证安装
node -v   # 应显示 v22.x.x
nvm current # 应显示 v22.x.x
npm -v    # 应显示 10.x.x

# 6. 安装 screen（用于后台运行）
sudo apt-get update
sudo apt-get install -y screen
```

### 3. 部署步骤

1. 下载程序
```bash
git clone https://github.com/mumumusf/TENEO.git
cd TENEO
```

2. 安装依赖
```bash
npm install
```

3. 获取 Token
- 访问 [Teneo 官方网站](https://teneo.so)
- 使用邮箱注册并登录
- 进入 [仪表盘](https://dashboard.teneo.pro/referrals)
- 在页面上可以找到你的 Access Token
- 复制 Access Token 备用

4. 使用 Screen 后台运行
```bash
# 创建新的 screen 会话
screen -S teneo

# 运行程序
node main.js

# 程序运行后会出现以下交互步骤：

1) 选择是否使用代理
   输入 'y' 使用代理
   输入 'n' 不使用代理

2) 如果选择使用代理 (输入 'y')：
   - 程序会提示输入第 1 个代理
   - 输入代理格式可以是：
     host:port
     host:port:username:password
     username:password@host:port
   - 输入 'skip' 可以跳过当前账号的代理设置
   - ⚠️ 重要：输入 'done' 来结束代理输入过程
   - 例如：
     第 1 个代理：115.126.25.246:49111:user:pass
     第 2 个代理：skip
     第 3 个代理：done

3) 输入 Access Token：
   - 程序会提示输入第 1 个 token
   - 粘贴你的 Access Token
   - 继续输入更多 token 或输入 'done' 结束

4) 程序开始运行：
   - 显示连接状态
   - 显示积分信息
   - 每15分钟自动领取积分

# 分离 screen 会话（按 Ctrl+A+D）
```

### 4. 常用命令

```bash
# 查看所有 screen 会话
screen -ls

# 重新连接到 screen 会话
screen -r teneo

# 结束程序
# 1. 重新连接到 screen 会话
# 2. 按 Ctrl+C 停止程序
# 3. 输入 exit 关闭会话
```

### 5. 代理格式说明

支持以下格式：
- `host:port`
- `host:port:username:password`
- `username:password@host:port`
- `http://host:port`
- `http://username:password@host:port`
- `socks5://host:port`

### 6. 常见问题

1. 如何检查程序是否正常运行？
```bash
# 查看程序日志
tail -f nohup.out
```

2. 如何在断开 SSH 后保持程序运行？
- 使用 screen 或 tmux
- 使用 nohup 命令：`nohup node main.js &`

3. 如何处理网络问题？
- 确保 VPS 能够访问外网
- 尝试使用代理
- 检查防火墙设置

## 📊 积分说明

- 每15分钟可领取一次积分
- 每次最多可获得 25 积分
- 每日最高可得 2400 积分



## 📝 许可证

本项目采用 MIT 许可证