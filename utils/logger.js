import chalk from 'chalk';

// 日志系统
const logger = {
    // 基础日志函数
    log: (level, message, value = '') => {
        const now = new Date().toLocaleString();

        // 不同级别日志的颜色配置
        const colors = {
            info: chalk.cyanBright,    // 信息 - 青色
            warn: chalk.yellow,        // 警告 - 黄色
            error: chalk.red,          // 错误 - 红色
            success: chalk.blue,       // 成功 - 蓝色
            debug: chalk.magenta,      // 调试 - 品红色
        };

        const color = colors[level] || chalk.white;
        const levelTag = `[ ${level.toUpperCase()} ]`;
        const timestamp = `[ ${now} ]`;

        const formattedMessage = `${chalk.cyanBright("[ LitasBot ]")} ${chalk.grey(timestamp)} ${color(levelTag)} ${message}`;

        // 根据日志级别设置不同的值颜色
        let formattedValue = ` ${chalk.green(value)}`;
        if (level === 'error') {
            formattedValue = ` ${chalk.red(value)}`;
        } else if (level === 'warn') {
            formattedValue = ` ${chalk.yellow(value)}`;
        }
        if (typeof value === 'object') {
            const valueColor = level === 'error' ? chalk.red : chalk.green;
            formattedValue = ` ${valueColor(JSON.stringify(value))}`;
        }

        console.log(`${formattedMessage}${formattedValue}`);
    },

    // 各种日志级别的快捷方法
    info: (message, value = '') => logger.log('info', message, value),
    warn: (message, value = '') => logger.log('warn', message, value),
    error: (message, value = '') => logger.log('error', message, value),
    success: (message, value = '') => logger.log('success', message, value),
    debug: (message, value = '') => logger.log('debug', message, value),
};

export default logger;
