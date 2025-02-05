import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import fs from 'fs/promises';
import log from './logger.js';

// 延迟函数
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms * 1000));
}

// 保存数据到文件
export async function saveToFile(filename, data) {
    try {
        await fs.appendFile(filename, `${data}\n`, 'utf-8');
        log.info(`数据已保存到 ${filename}`);
    } catch (error) {
        log.error(`保存数据到 ${filename} 失败: ${error.message}`);
    }
}

// 从文件读取账户信息
export async function readAccountsFromFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        const lines = data.trim().split('\n');

        const accounts = lines
            .map(line => {
                const [token, reToken] = line.split('|');
                if (!token || !reToken) return null; 
                return { token: token.trim(), reToken: reToken.trim() };
            })
            .filter(account => account !== null); 

        return accounts;
    } catch (error) {
        log.error('读取账户文件错误:', error.message);
        return [];
    }
}

// 读取文件内容
export async function readFile(pathFile) {
    try {
        const datas = await fs.readFile(pathFile, 'utf8');
        return datas.split('\n')
            .map(data => data.trim())
            .filter(data => data.length > 0);
    } catch (error) {
        log.error(`读取文件错误: ${error.message}`);
        return [];
    }
}

// 创建代理代理
export const newAgent = (proxy = null) => {
    if (!proxy) return null;
    
    try {
        // 处理用户名密码格式的代理
        if (proxy.includes('@')) {
            return new HttpsProxyAgent(`http://${proxy}`);
        }
        
        // 处理 ip:port:user:pass 格式
        const parts = proxy.split(':');
        if (parts.length === 4) {
            const [ip, port, user, pass] = parts;
            return new HttpsProxyAgent(`http://${user}:${pass}@${ip}:${port}`);
        }
        
        // 处理 ip:port 格式
        if (parts.length === 2) {
            return new HttpsProxyAgent(`http://${proxy}`);
        }

        // 如果已经包含协议头，直接使用
        if (proxy.startsWith('http://') || proxy.startsWith('https://') || 
            proxy.startsWith('socks4://') || proxy.startsWith('socks5://')) {
            return proxy.startsWith('socks') ? new SocksProxyAgent(proxy) : new HttpsProxyAgent(proxy);
        }

        // 默认添加 http:// 前缀
        return new HttpsProxyAgent(`http://${proxy}`);
    } catch (error) {
        log.error(`代理格式错误: ${proxy}`, error.message);
        return null;
    }
};
