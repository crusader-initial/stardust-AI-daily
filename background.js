const NEWS_SOURCES = [
    {
      name: 'ArXiv AI',
      url: 'http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=lastUpdatedDate&sortOrder=descending&max_results=10'
    },
    {
      name: 'AI News RSS',
      url: 'https://artificialintelligence-news.com/feed/'
    }
  ];
  
  // 设置每天定时抓取
  chrome.alarms.create('fetchNews', {
    periodInMinutes: 1440 // 24小时
  });
  
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'fetchNews') {
      fetchAndProcessNews();
    }
  });
  
  // 添加消息监听器，处理来自popup的刷新请求
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'refreshNews') {
      fetchAndProcessNews().then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // 表明会异步发送响应
    }
  });
  
  async function fetchAndProcessNews() {
    let allNews = [];
    
    for (const source of NEWS_SOURCES) {
      try {
        const response = await fetch(source.url, {
            mode: 'cors',
            headers: {
              'Accept': 'application/xml'
            }
          });
        const data = await response.text();
        const news = parseNewsData(data, source.name);
        allNews = allNews.concat(news);
      } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error);
      }
    }
  
    const summary = generateDailySummary(allNews);
    
    // 保存到 storage
    await chrome.storage.local.set({
      lastUpdate: new Date().toISOString(),
      summary: summary,
      rawNews: allNews
    });
    
    // 发送消息通知popup更新界面
    chrome.runtime.sendMessage({ action: 'newsUpdated' });
  }
  
  function parseNewsData(data, sourceName) {
    // 根据不同源的数据格式进行解析
    if (sourceName === 'ArXiv AI') {
      return parseArxivXML(data);
    } else {
      return parseRSSFeed(data);
    }
  }
  
  function parseArxivXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const entries = xmlDoc.getElementsByTagName('entry');
    
    return Array.from(entries).map(entry => ({
      title: entry.getElementsByTagName('title')[0].textContent,
      link: entry.getElementsByTagName('link')[0].getAttribute('href'),
      summary: entry.getElementsByTagName('summary')[0].textContent,
      date: new Date(entry.getElementsByTagName('published')[0].textContent),
      source: 'ArXiv AI'
    }));
  }
  
  function parseRSSFeed(rssString) {
    const parser = new DOMParser();
    const rssDoc = parser.parseFromString(rssString, 'text/xml');
    const items = rssDoc.getElementsByTagName('item');
    
    return Array.from(items).map(item => ({
      title: item.getElementsByTagName('title')[0].textContent,
      link: item.getElementsByTagName('link')[0].textContent,
      summary: item.getElementsByTagName('description')[0].textContent,
      date: new Date(item.getElementsByTagName('pubDate')[0].textContent),
      source: 'AI News RSS'
    }));
  }
  
  function generateDailySummary(news) {
    // 按主题分类新闻
    const categories = {
      research: [],
      industry: [],
      applications: []
    };
    
    news.forEach(item => {
      // 简单的关键词分类
      if (item.title.toLowerCase().includes('research') || item.source === 'ArXiv AI') {
        categories.research.push(item);
      } else if (item.title.toLowerCase().includes('business') || item.title.toLowerCase().includes('company')) {
        categories.industry.push(item);
      } else {
        categories.applications.push(item);
      }
    });
    
    return {
      date: new Date().toISOString().split('T')[0],
      categories: categories
    };
  }