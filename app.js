// 配置
// const API_BASE_URL = 'http://localhost:5000';  // 本地开发时使用
const API_BASE_URL = 'https://c4b9-124-64-23-130.ngrok-free.app';  // ngrok URL
const UPDATE_INTERVAL = 1000;  // 数据更新间隔（毫秒）

// 状态变量
let isConnected = false;
let updateTimer = null;

// DOM 元素
const elements = {
    temperature: document.getElementById('temperature'),
    humidity: document.getElementById('humidity'),
    light: document.getElementById('light'),
    curtainProgress: document.getElementById('curtain-progress'),
    curtainCountdown: document.getElementById('curtain-countdown'),
    autoMode: document.getElementById('auto-mode'),
    connectionStatus: document.getElementById('connection-status')
};

// 更新连接状态显示
function updateConnectionStatus(connected) {
    if (!elements.connectionStatus) {
        console.warn('Connection status element not found');
        return;
    }
    
    isConnected = connected;
    const statusIcon = elements.connectionStatus.querySelector('i');
    const statusText = elements.connectionStatus.querySelector('span');
    
    if (connected) {
        statusIcon.className = 'bi bi-circle-fill text-success';
        statusText.textContent = '已连接';
    } else {
        statusIcon.className = 'bi bi-circle-fill text-danger';
        statusText.textContent = '未连接';
    }
}

// 更新传感器数据显示
function updateSensorDisplay(data) {
    if (!data) {
        console.warn('No data received');
        return;
    }
    
    try {
        if (elements.temperature) elements.temperature.textContent = data.temperature?.toFixed(1) || '--';
        if (elements.humidity) elements.humidity.textContent = data.humidity?.toFixed(1) || '--';
        if (elements.light) elements.light.textContent = data.light || '--';
        
        // 更新窗帘状态
        if (elements.curtainProgress && elements.curtainCountdown) {
            if (data.curtain_limit_time) {
                const progress = (data.curtain_state === 'opening' || data.curtain_state === 'closing') 
                    ? (data.curtain_state === 'opening' ? 100 : 0)
                    : 50;
                elements.curtainProgress.style.width = `${progress}%`;
                elements.curtainCountdown.textContent = `倒计时: ${data.curtain_limit_time.toFixed(1)}秒 [${progress}%]`;
            } else {
                elements.curtainProgress.style.width = '0%';
                elements.curtainCountdown.textContent = '倒计时: -- [--%]';
            }
        }
        
        // 更新自动模式状态
        if (elements.autoMode) {
            elements.autoMode.checked = data.auto || false;
        }
    } catch (error) {
        console.error('Error updating display:', error);
    }
}

// 发送控制命令
async function sendCommand(command) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command })
        });
        
        if (!response.ok) {
            throw new Error('命令发送失败');
        }
        
        const result = await response.json();
        if (result.status !== 'success') {
            throw new Error(result.message || '命令发送失败');
        }
    } catch (error) {
        console.error('发送命令时出错:', error);
        alert('发送命令失败，请检查网络连接');
    }
}

// 定期更新数据
async function updateData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sensor_data`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取数据失败');
        }
        
        const data = await response.json();
        updateSensorDisplay(data);
        updateConnectionStatus(true);
    } catch (error) {
        console.error('更新数据时出错:', error);
        updateConnectionStatus(false);
    }
}

// 自动模式切换处理
if (elements.autoMode) {
    elements.autoMode.addEventListener('change', function() {
        sendCommand('H');
    });
}

// 启动数据更新
function startDataUpdate() {
    if (updateTimer) {
        clearInterval(updateTimer);
    }
    updateTimer = setInterval(updateData, UPDATE_INTERVAL);
    updateData();  // 立即执行一次
}

// 页面加载完成后启动
document.addEventListener('DOMContentLoaded', function() {
    startDataUpdate();
    
    // 页面关闭前清理
    window.addEventListener('beforeunload', function() {
        if (updateTimer) {
            clearInterval(updateTimer);
        }
    });
}); 