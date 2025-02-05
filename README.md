# XIAO LIN 自动化脚本

## 免责声明
- 此脚本仅供学习交流使用
- 请勿用于非法用途
- 使用本脚本带来的风险由使用者承担

## 获取账户信息
1. 使用邀请链接注册: [https://wallet.litas.io/invite/yoyomyoyoa](https://wallet.litas.io/invite/yoyomyoyoa)

2. 获取 token 和 refreshToken:
   - 打开浏览器，访问 [wallet.litas.io](https://wallet.litas.io)
   - 登录你的账户
   - 按 F12 打开开发者工具
   - 切换到 Application (应用程序) 标签
   - 在左侧找到 Local Storage
   - 点击 https://wallet.litas.io
   - 找到 `token` 和 `refreshToken` 并复制值

## VPS 环境配置教程

### 1. 安装 NVM (Node Version Manager)
```bash
# 下载并安装 NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# 根据你使用的终端，运行以下命令之一：
source ~/.bashrc   # 如果使用 bash
source ~/.zshrc    # 如果使用 zsh
```

### 2. 安装 Node.js
```bash
# 安装 Node.js 22 版本
nvm install 22

# 查看已安装的版本
nvm list
```

### 3. 设置默认 Node.js 版本
```bash
# 切换到 Node.js 22
nvm use 22

# 设置为默认版本
nvm alias default 22
```

### 4. 验证安装
```bash
# 检查 Node.js 版本
node -v   # 预期输出: v22.x.x

# 检查当前使用的 Node.js 版本
nvm current # 预期输出: v22.x.x

# 检查 npm 版本
npm -v    # 预期输出: 10.x.x
```

### 5. 运行脚本
```bash
# 克隆项目
git clone https://github.com/mumumusf/litas.git

# 进入项目目录
cd litas

# 安装依赖
npm install

# 运行脚本
node main.js
```

### 6. 输入说明
1. 账户信息：
   从浏览器开发者工具的 Local Storage 中获取：
   - 输入 token
   - 输入 refreshToken
   - 直接回车结束输入

2. 代理信息（可选）：
   支持以下格式：
   - ip:port
   - ip:port:username:password
   - username:password@ip:port
   - http://ip:port 或 socks5://ip:port

3. 检查间隔时间：
   - 输入小时数（默认为1小时）

### 7. 后台运行
```bash
# 使用 screen 创建新会话
screen -S xiaolin

# 运行脚本
node main.js

# 分离会话（按 Ctrl+A+D）

# 恢复会话
screen -r xiaolin
```

## 联系方式
- 推特：@yoyomyoyoa
- Github：https://github.com/mumumusf/litas

## 作者
小林