import log from "./utils/logger.js"
import bedduSalama from "./utils/banner.js"
import { delay, readAccountsFromFile, readFile } from './utils/helper.js';
import { claimMining, getNewToken, getUserFarm, activateMining } from './utils/api.js';
import fs from 'fs/promises';
import readline from 'readline';

// 创建readline接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 封装问题函数
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// 刷新访问令牌的函数
async function refreshAccessToken(token, refreshToken, proxy) {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        const refresh = await getNewToken(token, refreshToken, proxy);
        
        if (refresh === "invalid_token") {
            log.error('刷新令牌已失效，需要重新登录');
            return null;
        }
        
        if (refresh && refresh.accessToken && refresh.refreshToken) {
            log.info('令牌刷新成功');
            return refresh;
        }

        retryCount++;
        if (retryCount >= maxRetries) {
            log.error('令牌刷新失败次数过多，跳过当前账户');
            return null;
        }

        log.info(`令牌刷新失败，正在重试... (${retryCount}/${maxRetries})`);
        await delay(3);
    }

    return null;
}

// 激活挖矿进程的函数
async function activateMiningProcess(token, refreshToken, proxy) {
    let activate;
    let retryCount = 0;
    const maxRetries = 3;

    do {
        activate = await activateMining(token, proxy);
        if (activate === "unauth") {
            log.warn('未授权，正在刷新令牌...');
            const refreshedTokens = await refreshAccessToken(token, refreshToken, proxy);
            if (!refreshedTokens) {
                throw new Error('无法刷新令牌，请检查账户信息');
            }
            token = refreshedTokens.accessToken;
            refreshToken = refreshedTokens.refreshToken;
        } else if (activate === "activated") {
            return token;  // 如果已经激活，直接返回
        } else if (!activate) {
            retryCount++;
            if (retryCount >= maxRetries) {
                throw new Error('激活失败次数过多');
            }
            log.info(`激活失败，正在重试... (${retryCount}/${maxRetries})`);
            await delay(3);
        }
    } while (!activate || activate === "unauth");

    log.info('挖矿已成功激活');
    return token;
}

// 获取用户农场信息的函数
async function getUserFarmInfo(accessToken, refreshToken, proxy, index) {
    let userFarmInfo;
    let currentToken = accessToken;
    let currentRefreshToken = refreshToken;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        userFarmInfo = await getUserFarm(currentToken, proxy);
        
        if (userFarmInfo === "unauth") {
            log.info('令牌已过期，正在刷新...');
            const refreshedTokens = await refreshAccessToken(currentToken, currentRefreshToken, proxy);
            if (!refreshedTokens) {
                throw new Error('无法刷新令牌，请检查账户信息');
            }
            currentToken = refreshedTokens.accessToken;
            currentRefreshToken = refreshedTokens.refreshToken;
            continue;  // 使用新令牌重试
        }
        
        if (userFarmInfo) {
            const { status, totalMined } = userFarmInfo;
            log.info(`账户 ${index} 农场信息:`, { status, totalMined });
            return {
                userFarmInfo,
                accessToken: currentToken,
                refreshToken: currentRefreshToken
            };
        }

        retryCount++;
        if (retryCount >= maxRetries) {
            throw new Error(`账户 ${index} 获取农场信息失败，已达到最大重试次数`);
        }
        log.warn(`账户 ${index} 获取农场信息失败，正在重试... (${retryCount}/${maxRetries})`);
        await delay(3);
    }

    throw new Error(`账户 ${index} 获取农场信息失败`);
}

// 处理挖矿奖励的函数
async function handleFarming(userFarmInfo, token, refreshToken, proxy) {
    const canBeClaimedAt = new Date(userFarmInfo.canBeClaimedAt).getTime();
    const timeNow = new Date().getTime();

    if (canBeClaimedAt < timeNow) {
        log.info('挖矿奖励可以领取，正在尝试领取...');
        let claimResponse;

        do {
            claimResponse = await claimMining(token, proxy);
            if (!claimResponse) log.info('领取挖矿奖励失败，正在重试...');
            await delay(3);
        } while (!claimResponse);

        log.info('挖矿奖励领取响应:', claimResponse);
        await activateMiningProcess(token, refreshToken, proxy)
    } else {
        log.info('挖矿奖励可在以下时间领取:', new Date(canBeClaimedAt).toLocaleString())
    }
}

// 主函数
async function main() {
    log.info(bedduSalama);
    
    // 用户输入多个账户信息
    log.info('请输入账户信息 (输入空行结束)');
    const accounts = [];
    
    while (true) {
        const accountNum = accounts.length + 1;
        log.info(`\n正在输入第 ${accountNum} 个账户:`);
        
        const token = await question('请输入 token (直接回车结束输入): ');
        if (!token.trim()) {
            break;
        }
        
        const refreshToken = await question('请输入 refreshToken: ');
        if (!refreshToken.trim()) {
            log.warn('refreshToken 不能为空，请重新输入此账户');
            continue;
        }

        accounts.push({ token: token.trim(), refreshToken: refreshToken.trim() });
        log.info(`第 ${accountNum} 个账户添加成功`);
    }

    if (accounts.length === 0) {
        log.error('未输入任何账户信息！');
        rl.close();
        process.exit(1);
    }

    log.info(`成功读取 ${accounts.length} 个账户`);

    // 用户输入代理
    log.info('支持的代理格式：');
    log.info('1. ip:port');
    log.info('2. ip:port:username:password');
    log.info('3. username:password@ip:port');
    log.info('4. http://ip:port 或 socks5://ip:port');
    const proxyInput = await question('请输入代理地址 (多个代理用逗号分隔，直接回车则不使用代理): ');
    const proxies = proxyInput ? proxyInput.split(',').map(p => p.trim()).filter(p => p) : [];
    
    // 用户输入检查间隔时间
    const checkInterval = parseInt(await question('请输入检查间隔时间(小时) (直接回车默认为 1小时): ')) || 1;
    
    log.info('正在启动程序...');
    log.info(`使用配置：\n- 账户数量：${accounts.length}\n- 代理数量：${proxies.length || '不使用代理'}\n- 检查间隔：${checkInterval}小时`);

    // 主循环
    while (true) {
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;
            
            try {
                log.info(`正在处理第 ${i + 1}/${accounts.length} 个账户，使用代理: ${proxy || "无代理"}`);
                const { userFarmInfo, accessToken, refreshToken } = await getUserFarmInfo(
                    account.token,
                    account.refreshToken,
                    proxy,
                    i + 1
                );
                await activateMiningProcess(accessToken, refreshToken, proxy);
                await handleFarming(userFarmInfo, accessToken, refreshToken, proxy);

                // 更新账户的token
                account.token = accessToken;
                account.refreshToken = refreshToken;
            } catch (error) {
                log.error(`账户 ${i + 1} 处理出错:`, error.message);
            }
            await delay(3);
        }

        log.info(`所有账户处理完成，等待 ${checkInterval} 小时后进行下一轮...`);
        await delay(checkInterval * 60 * 60);
    }
}

// 将账户信息写入文件的函数
async function writeAccountsToFile(filename, accounts) {
    const data = accounts.map(account => `${account.token}|${account.reToken}`).join('\n');
    await fs.writeFile(filename, data, 'utf-8');
}

// 修改进程退出处理，确保正确关闭readline
process.on('SIGINT', () => {
    log.warn(`收到 SIGINT 信号，正在清理并退出程序...`);
    rl.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    log.warn(`收到 SIGTERM 信号，正在清理并退出程序...`);
    rl.close();
    process.exit(0);
});

main().catch(error => {
    log.error('程序运行出错:', error);
    rl.close();
    process.exit(1);
});
