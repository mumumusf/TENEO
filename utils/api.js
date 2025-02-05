import axios from 'axios';
import log from "./logger.js"
import { newAgent } from './helper.js';

// 创建带超时和重试的 axios 实例
const createAxiosInstance = (proxy) => {
    const agent = newAgent(proxy);
    return axios.create({
        timeout: 30000,
        httpsAgent: agent,
        proxy: false,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json',
            'Origin': 'https://www.wallet.litas.io',
            'Referer': 'https://www.wallet.litas.io/',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin'
        },
        validateStatus: function (status) {
            return status >= 200 && status < 500;
        },
        maxRedirects: 5,
        decompress: true
    });
};

// 获取新的访问令牌
export async function getNewToken(token, refreshToken, proxy) {
    const axiosInstance = createAxiosInstance(proxy);
    try {
        log.info('正在尝试刷新令牌...');
        const response = await axiosInstance.post('https://wallet.litas.io/api/v1/auth/refresh', {
            refreshToken: refreshToken
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Origin': 'https://www.wallet.litas.io',
                'Referer': 'https://www.wallet.litas.io/',
                'Content-Type': 'application/json'
            }
        });

        log.info('刷新令牌响应状态码:', response.status);

        // 检查响应数据
        if (!response.data) {
            log.error('刷新令牌响应为空');
            return null;
        }

        // 打印响应数据用于调试
        log.info('刷新令牌响应:', response.data);

        if (!response.data.accessToken || !response.data.refreshToken) {
            log.error('刷新令牌响应格式错误');
            return null;
        }

        return {
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken
        };
    } catch (error) {
        if (error.response) {
            if (error.response.status === 401) {
                log.error('刷新令牌已失效，需要重新登录');
                log.error('错误响应:', error.response.data);
                return "invalid_token";
            }
            log.error('刷新令牌失败，状态码:', error.response.status);
            log.error('错误响应:', error.response.data);
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            log.error('代理连接失败:', error.message);
        } else {
            log.error('未知错误:', error.message);
            if (error.stack) {
                log.error('错误堆栈:', error.stack);
            }
        }
        return null;
    }
}

// 获取用户农场信息
export async function getUserFarm(token, proxy) {
    const axiosInstance = createAxiosInstance(proxy);
    try {
        log.info('正在获取农场信息...');
        const response = await axiosInstance.get('https://wallet.litas.io/api/v1/miner/current-user', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Origin': 'https://www.wallet.litas.io',
                'Referer': 'https://www.wallet.litas.io/',
                'Content-Type': 'application/json'
            }
        });
        
        log.info('响应状态码:', response.status);
        
        if (response.status === 401) {
            log.warn('令牌需要刷新');
            return "unauth";
        }
        
        if (!response.data) {
            log.error('获取农场信息响应为空');
            return null;
        }
        
        log.info('农场信息响应:', response.data);
        return response.data;
    } catch (error) {
        if (error.response) {
            if (error.response.status === 401) {
                log.warn('令牌需要刷新');
                return "unauth";
            }
            log.error('获取农场信息失败，状态码:', error.response.status);
        } else if (error.code) {
            if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(error.code)) {
                log.error('代理连接失败:', error.message);
            } else {
                log.error('网络错误:', error.code, error.message);
            }
        } else {
            log.error('未知错误:', error.message);
        }
        return null;
    }
}

// 激活挖矿
export async function activateMining(token, proxy) {
    const axiosInstance = createAxiosInstance(proxy);
    try {
        const response = await axiosInstance.patch(
            'https://wallet.litas.io/api/v1/miner/activate',
            {},
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    } catch (error) {
        if (error.response) {
            if (error.response.status === 401) {
                return "unauth";
            } else if (error.response.status === 409) {
                log.info('挖矿已经处于激活状态');
                return "activated";
            }
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            log.error('代理连接失败:', error.message);
        } else if (error.response) {
            log.error('API响应错误:', error.response.data);
        } else {
            log.error('请求错误:', error.message);
        }
        return null;
    }
}

// 领取挖矿奖励
export async function claimMining(token, proxy) {
    const axiosInstance = createAxiosInstance(proxy);
    try {
        const response = await axiosInstance.patch(
            'https://wallet.litas.io/api/v1/miner/claim',
            {},
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            return "unauth";
        } else if (error.response && error.response.status === 409) {
            return "奖励已经领取";
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            log.error('代理连接失败:', error.message);
        } else if (error.response) {
            log.error('API响应错误:', error.response.data);
        } else {
            log.error('请求错误:', error.message);
        }
        return null;
    }
}

