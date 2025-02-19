const WebSocket = require('ws');
const { promisify } = require('util');
const fs = require('fs');
const readline = require('readline');
const HttpsProxyAgent = require('https-proxy-agent');
const chalk = require('chalk');

// 解析代理格式
function parseProxy(proxyString) {
    if (!proxyString) return null;
    
    try {
        // 尝试解析URL格式 (例如: http://user:pass@host:port 或 socks5://user:pass@host:port)
        if (proxyString.includes('://')) {
            return new HttpsProxyAgent(proxyString);
        }

        // 解析其他格式
        let host, port, username, password;
        
        // 格式1: host:port
        // 格式2: host:port:username:password
        // 格式3: username:password@host:port
        if (proxyString.includes('@')) {
            const [credentials, hostPort] = proxyString.split('@');
            [username, password] = credentials.split(':');
            [host, port] = hostPort.split(':');
        } else {
            const parts = proxyString.split(':');
            if (parts.length === 2) {
                [host, port] = parts;
            } else if (parts.length === 4) {
                [host, port, username, password] = parts;
            }
        }

        if (!host || !port) {
            throw new Error('无效的代理格式');
        }

        const proxyUrl = username && password 
            ? `http://${username}:${password}@${host}:${port}`
            : `http://${host}:${port}`;
            
        return new HttpsProxyAgent(proxyUrl);
    } catch (error) {
        console.error(`代理解析错误: ${error.message}`);
        return null;
    }
}

// 显示LOGO
const banner = `
██╗ ██╗██╗ █████╗ ██████╗ ██╗ ██╗███╗   ██╗
╚██╗██╔╝██║██╔══██╗██╔═══██╗██║ ██║████╗  ██║
 ╚███╔╝ ██║███████║██║   ██║██║ ██║██╔██╗ ██║
 ██╔██╗ ██║██╔══██║██║   ██║██║ ██║██║╚██╗██║
██╔╝ ██╗██║██║  ██║╚██████╔╝███████║██║ ╚████║
╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝

    === teneo 自动化工具 ===
** ====================================== **
*         此脚本仅供免费使用              *
*         禁止出售或用于盈利              *
** ====================================== **


* 作者: @YOYOMYOYOA
* 空投玩家 | 现货玩家 | meme收藏
* Github: github.com/mumumusf

** ====================================== **
*            免责声明                      *
* 此脚本仅供学习交流使用                  *
* 使用本脚本所产生的任何后果由用户自行承担 *
* 如果因使用本脚本造成任何损失，作者概不负责*
** ====================================== **
`;

console.log(chalk.cyan(banner));

// 全局变量
let sockets = new Map(); // 存储多个WebSocket连接
let pingIntervals = new Map(); // 存储多个心跳检测定时器
let countdownIntervals = new Map(); // 存储多个倒计时定时器
let potentialPoints = new Map(); // 存储多个潜在积分
let countdowns = new Map(); // 存储多个倒计时
let pointsTotals = new Map(); // 存储多个总积分
let pointsTodays = new Map(); // 存储多个今日积分

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 获取本地存储数据
async function getLocalStorage() {
    try {
        const data = await readFileAsync('localStorage.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// 更新本地存储数据
async function setLocalStorage(data) {
    const currentData = await getLocalStorage();
    const newData = { ...currentData, ...data };
    await writeFileAsync('localStorage.json', JSON.stringify(newData));
}

// 建立WebSocket连接
async function connectWebSocket(token, proxy, accountIndex) {
    if (sockets.has(token)) return;
    const version = "v0.2";
    const url = "wss://secure.ws.teneo.pro";
    const wsUrl = `${url}/websocket?accessToken=${encodeURIComponent(token)}&version=${encodeURIComponent(version)}`;

    console.log(`正在连接账号 ${accountIndex + 1}...`);

    const options = {};
    if (proxy) {
        console.log(`账号 ${accountIndex + 1} 正在配置代理...`);
        const proxyAgent = parseProxy(proxy);
        if (proxyAgent) {
            options.agent = proxyAgent;
            console.log(`账号 ${accountIndex + 1} 代理配置成功`);
        } else {
            console.error(`账号 ${accountIndex + 1} 代理配置失败`);
        }
    }

    try {
        const socket = new WebSocket(wsUrl, options);
        sockets.set(token, socket);

        socket.onopen = async () => {
            const connectionTime = new Date().toISOString();
            console.log(`账号 ${accountIndex + 1} 节点连接成功，时间:`, connectionTime);
            startPinging(token);
            startCountdownAndPoints(token, accountIndex);
        };

        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.message === 'Connected successfully') {
                    console.log(`账号 ${accountIndex + 1} 节点连接成功！`);
                } else {
                    console.log(`账号 ${accountIndex + 1} 收到服务器消息:`, {
                        日期: data.date,
                        今日积分: data.pointsToday,
                        总积分: data.pointsTotal,
                        消息: data.message,
                        是否新用户: data.isNewUser
                    });
                }
                if (data.pointsTotal !== undefined && data.pointsToday !== undefined) {
                    pointsTotals.set(token, data.pointsTotal);
                    pointsTodays.set(token, data.pointsToday);
                }
            } catch (error) {
                console.error(`账号 ${accountIndex + 1} 处理消息错误:`, error);
            }
        };

        let reconnectAttempts = 0;
        socket.onclose = () => {
            console.log(`账号 ${accountIndex + 1} 节点连接断开`);
            sockets.delete(token);
            stopPinging(token);
            const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
            console.log(`账号 ${accountIndex + 1} 将在 ${delay/1000} 秒后重新连接`);
            setTimeout(() => connectWebSocket(token, proxy, accountIndex), delay);
            reconnectAttempts++;
        };

        socket.onerror = (error) => {
            console.error(`账号 ${accountIndex + 1} 节点连接错误:`, error);
        };

        return new Promise((resolve) => {
            socket.once('open', () => {
                resolve();
            });
        });
    } catch (error) {
        console.error(`账号 ${accountIndex + 1} 创建连接失败:`, error);
        return Promise.reject(error);
    }
}

// 断开WebSocket连接
function disconnectWebSocket(token) {
    const socket = sockets.get(token);
    if (socket) {
        socket.close();
        sockets.delete(token);
        stopPinging(token);
    }
}

// 开始心跳检测
function startPinging(token) {
    stopPinging(token);
    const interval = setInterval(async () => {
        const socket = sockets.get(token);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "PING" }));
        }
    }, 10000);
    pingIntervals.set(token, interval);
}

// 停止心跳检测
function stopPinging(token) {
    const interval = pingIntervals.get(token);
    if (interval) {
        clearInterval(interval);
        pingIntervals.delete(token);
    }
}

// 处理程序退出
process.on('SIGINT', () => {
    console.log('收到退出信号，正在关闭所有节点...');
    for (const token of sockets.keys()) {
        stopPinging(token);
        disconnectWebSocket(token);
    }
    process.exit(0);
});

// 开始倒计时和积分计算
function startCountdownAndPoints(token, accountIndex) {
    const interval = setInterval(() => updateCountdownAndPoints(token, accountIndex), 60 * 1000);
    countdownIntervals.set(token, interval);
    updateCountdownAndPoints(token, accountIndex);
}

// 更新倒计时和积分信息
async function updateCountdownAndPoints(token, accountIndex) {
    const now = new Date();
    const lastUpdated = now;
    const nextHeartbeat = new Date(lastUpdated);
    nextHeartbeat.setMinutes(nextHeartbeat.getMinutes() + 15);
    const diff = nextHeartbeat.getTime() - now.getTime();

    if (diff > 0) {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        countdowns.set(token, `${minutes}分 ${seconds}秒`);
    } else {
        countdowns.set(token, "计算中...");
    }

    console.log(`账号 ${accountIndex + 1} | 总积分: ${pointsTotals.get(token) || 0} | 今日积分: ${pointsTodays.get(token) || 0} | 下次领取倒计时: ${countdowns.get(token)}`);
}

// 主函数
async function main() {
    // 询问是否使用代理
    rl.question('是否使用代理? (y/n): ', async (useProxy) => {
        let proxies = [];
        if (useProxy.toLowerCase() === 'y') {
            const getProxy = async (index) => {
                return new Promise((resolve) => {
                    rl.question(`请输入第 ${index + 1} 个代理URL (输入'skip'跳过此账号代理): `, (inputProxy) => {
                        resolve(inputProxy === 'skip' ? null : inputProxy);
                    });
                });
            };

            console.log('请按顺序输入代理，每个账号一个代理。输入skip可跳过该账号的代理设置。');
            let proxy;
            let proxyIndex = 0;
            while ((proxy = await getProxy(proxyIndex)) !== 'done') {
                proxies.push(proxy);
                proxyIndex++;
            }
        }

        const tokens = [];
        const getToken = async () => {
            return new Promise((resolve) => {
                rl.question(`请输入第 ${tokens.length + 1} 个access token (输入'done'结束): `, (token) => {
                    resolve(token);
                });
            });
        };

        let token;
        while ((token = await getToken()) !== 'done') {
            if (token.trim()) {
                tokens.push(token.trim());
            }
        }

        console.log(`共添加 ${tokens.length} 个账号`);
        if (proxies.length > 0) {
            console.log(`共添加 ${proxies.filter(p => p !== null).length} 个代理`);
        }
        
        // 串行启动所有账号
        for (let i = 0; i < tokens.length; i++) {
            const currentProxy = i < proxies.length ? proxies[i] : null;
            if (currentProxy) {
                console.log(`账号 ${i + 1} 使用代理: ${currentProxy}`);
            } else {
                console.log(`账号 ${i + 1} 不使用代理`);
            }
            try {
                await connectWebSocket(tokens[i], currentProxy, i);
                console.log(`账号 ${i + 1} 启动完成`);
                // 等待10秒再启动下一个账号
                if (i < tokens.length - 1) {
                    console.log(`等待10秒后启动下一个账号...`);
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            } catch (error) {
                console.error(`账号 ${i + 1} 启动失败:`, error);
            }
        }
    });
}

// 运行程序
main();
