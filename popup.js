document.addEventListener('DOMContentLoaded', async () => {
    const refreshButton = document.getElementById('refreshButton');
    
    // 初始加载数据
    await loadNews();
    
    // 添加刷新按钮点击事件
    refreshButton.addEventListener('click', async () => {
      refreshButton.disabled = true;
      refreshButton.textContent = '正在刷新...';
      document.getElementById('content').innerHTML = '<div class="loading">正在获取最新资讯...</div>';
      
      try {
        // 发送消息给background script请求刷新
        await chrome.runtime.sendMessage({ action: 'refreshNews' });
        await loadNews();
      } catch (error) {
        document.getElementById('content').innerHTML = '<div class="loading">刷新失败，请稍后重试</div>';
      } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = '刷新';
      }
    });
    
    // 监听来自background的更新消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'newsUpdated') {
        loadNews();
      }
    });
  });
  
  async function loadNews() {
    const { lastUpdate, summary, rawNews } = await chrome.storage.local.get(['lastUpdate', 'summary', 'rawNews']);
    
    if (!summary) {
      document.getElementById('content').innerHTML = '<div class="loading">正在获取最新资讯...</div>';
      return;
    }
    
    document.getElementById('lastUpdate').textContent = 
      `最后更新: ${new Date(lastUpdate).toLocaleString()}`;
    
    let html = '';
    
    // 研究进展
    html += '<div class="category"><h2>研究进展</h2>';
    summary.categories.research.forEach(item => {
      html += `
        <div class="news-item">
          <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
          <p>${item.summary.substring(0, 200)}...</p>
          <div class="source">来源: ${item.source}</div>
        </div>
      `;
    });
    html += '</div>';
    
    // 行业动态
    html += '<div class="category"><h2>行业动态</h2>';
    summary.categories.industry.forEach(item => {
      html += `
        <div class="news-item">
          <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
          <p>${item.summary.substring(0, 200)}...</p>
          <div class="source">来源: ${item.source}</div>
        </div>
      `;
    });
    html += '</div>';
    
    // 应用案例
    html += '<div class="category"><h2>应用案例</h2>';
    summary.categories.applications.forEach(item => {
      html += `
        <div class="news-item">
          <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
          <p>${item.summary.substring(0, 200)}...</p>
          <div class="source">来源: ${item.source}</div>
        </div>
      `;
    });
    html += '</div>';
    
    document.getElementById('content').innerHTML = html;
  }