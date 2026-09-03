import { parseCourseMeta, parseSyllabus } from './parsers.js';

// 1. Google Apps Script Web App 網址
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwF0GeDuWVJnPf1prU77DsXs2NepjtdIboF-OoF-164iYx0OUSYwm_SL0svbtIkO_iDqw/exec';

let currentMetaResult = null;
let currentSyllabusResult = [];

// 星期文字對照表 (對應 HTML data-day)
const DAY_MAP = {
  '星期一': 'Mon', '禮拜一': 'Mon', '週一': 'Mon', '周一': 'Mon', 'Mon': 'Mon',
  '星期二': 'Tue', '禮拜二': 'Tue', '週二': 'Tue', '周二': 'Tue', 'Tue': 'Tue',
  '星期三': 'Wed', '禮拜三': 'Wed', '週三': 'Wed', '周三': 'Wed', 'Wed': 'Wed',
  '星期四': 'Thu', '禮拜四': 'Thu', '週四': 'Thu', '周四': 'Thu', 'Thu': 'Thu',
  '星期五': 'Fri', '禮拜五': 'Fri', '週五': 'Fri', '周五': 'Fri', 'Fri': 'Fri',
  '星期六': 'Sat', '禮拜六': 'Sat', '週六': 'Sat', '周六': 'Sat', 'Sat': 'Sat',
  '星期日': 'Sun', '禮拜日': 'Sun', '週日': 'Sun', '周日': 'Sun', 'Sun': 'Sun'
};

// 課程卡片漸層顏色庫 (Dark Theme 質感)
const CARD_COLORS = [
  'linear-gradient(135deg, #2b459d, #4f46e5)', // Navy Indigo
  'linear-gradient(135deg, #10b981, #059669)', // Emerald
  'linear-gradient(135deg, #d97706, #b45309)', // Amber
  'linear-gradient(135deg, #ec4899, #be185d)', // Pink
  'linear-gradient(135deg, #8b5cf6, #6d28d9)'  // Purple
];

// ==========================================
// 頁面初始化：載入時自動拉取試算表資料繪製課表
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  fetchCoursesFromSheet();
});

// 2. 從 Google 試算表拉取課程資料
// 2. 從 Google 試算表拉取課程資料與作業註記
async function fetchCoursesFromSheet() {
  try {
    // 1. 拉取課程資料與日期
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'GET',
      redirect: 'follow'
    });
    
    const data = await response.json();
    const courses = Array.isArray(data) ? data : (data.courses || []);
    const dates = data.dates || {};

    // 2. ⚡ 新增：主動向 GAS 請求最新的作業與待辦事項 (getTasks)
    const taskResponse = await fetch(`${GAS_WEB_APP_URL}?action=getTasks`);
    const taskData = await taskResponse.json();
    const latestTasks = (taskData.status === 'success' && Array.isArray(taskData.tasks)) ? taskData.tasks : [];

    // 3. ⚡ 用試算表傳回來的最新資料完整覆蓋 LocalStorage（這樣在試算表刪除的項目就會同步消失）
    localStorage.setItem('user_courses', JSON.stringify(courses));
    localStorage.setItem('user_dates', JSON.stringify(dates));
    localStorage.setItem('cached_course_tasks', JSON.stringify(latestTasks));

    // 4. 渲染主頁面資料
    renderTimetable(courses);
    updateDashboardStats(courses);

    // 5. 通知 iframe (timetable.html) 重新繪製
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow && typeof iframe.contentWindow.renderAllTimetableData === 'function') {
      iframe.contentWindow.renderAllTimetableData(courses, 1, dates);
    }
  } catch (error) {
    console.error('抓取試算表資料失敗：', error);
  }
}

// 3. 將課程動態填入 HTML 的時間格子中
// 3. 將課程動態傳遞至 iframe 繪製課表
function renderTimetable(courses) {
  const iframe = document.querySelector('iframe');
  const cachedDates = JSON.parse(localStorage.getItem('user_dates') || '{}');
  
  if (iframe && iframe.contentWindow && typeof iframe.contentWindow.renderAllTimetableData === 'function') {
    // 取得當前選擇的週次（預設第 1 週）
    const currentWeek = parseInt(iframe.contentWindow.document.getElementById('weekDisplay')?.textContent) || 1;
    iframe.contentWindow.renderAllTimetableData(courses, currentWeek, cachedDates);
  }
}
// 4. 更新當日課程數與總學分
// 4. 更新當日課程數與總課程數 (修正：統一使用課程數量而非學分)
function updateDashboardStats(courses) {
  if (!courses || !Array.isArray(courses)) return;

  // 1. 計算總課程數 (TOTAL COURSES)
  const totalCourses = courses.length;
  const totalCoursesEl = document.querySelector('.stat-item:nth-child(3) .stat-num');
  const totalCoursesTitleEl = document.querySelector('.stat-item:nth-child(3) .stat-title');

  if (totalCoursesEl) totalCoursesEl.textContent = totalCourses;
  if (totalCoursesTitleEl) totalCoursesTitleEl.textContent = 'TOTAL COURSES';

  // 2. 計算今日課程數 (COURSES TODAY)
  const daysCodeMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayCode = daysCodeMap[new Date().getDay()];
  const todayCount = courses.filter(c => {
    const dayVal = c.dayOfWeek || c.day || '';
    const courseDayCode = DAY_MAP[dayVal] || dayVal;
    return courseDayCode === todayCode || dayVal.includes(todayCode);
  }).length;

  const coursesTodayEl = document.querySelector('.stat-item:nth-child(1) .stat-num');
  if (coursesTodayEl) coursesTodayEl.textContent = todayCount;
}

// ==========================================
// 表單解析與上傳邏輯 (使用 Safe Check 防護)
// ==========================================

// 5. 點擊「開始解析」
const parseBtn = document.getElementById('parseBtn');
if (parseBtn) {
  parseBtn.addEventListener('click', () => {
    const metaInput = document.getElementById('metaInput').value;
    const syllabusInput = document.getElementById('syllabusInput').value;

    const dayOfWeek = document.getElementById('dayOfWeekInput').value;
    const startClass = document.getElementById('startClassInput').value.trim();
    const endClass = document.getElementById('endClassInput').value.trim();
    const assessment = document.getElementById('assessmentInput').value.trim();

    currentMetaResult = {
      ...parseCourseMeta(metaInput),
      dayOfWeek,
      startClass,
      endClass,
      assessment
    };

    const metaResultDiv = document.getElementById('metaResult');
    if (metaResultDiv) {
      metaResultDiv.innerHTML = `
        <p><strong>學年學期：</strong> ${currentMetaResult.term || '未抓到'}</p>
        <p><strong>班級：</strong> ${currentMetaResult.classInfo || '未抓到'}</p>
        <p><strong>課程代號：</strong> ${currentMetaResult.courseId || '未抓到'}</p>
        <p><strong>課程名稱：</strong> ${currentMetaResult.courseName || '未抓到'}</p>
        <p><strong>選修別：</strong> ${currentMetaResult.type || '未抓到'}</p>
        <p><strong>學分：</strong> ${currentMetaResult.credits || '未抓到'}</p>
        <p><strong>教師：</strong> ${currentMetaResult.teacher || '未抓到'}</p>
        <p><strong>上課禮拜：</strong> ${currentMetaResult.dayOfWeek}</p>
        <p><strong>開始課堂：</strong> ${currentMetaResult.startClass || '未填寫'}</p>
        <p><strong>結束課堂：</strong> ${currentMetaResult.endClass || '未填寫'}</p>
        <p><strong>學習評量項目總計：</strong> ${currentMetaResult.assessment || '未填寫'}</p>
      `;
    }

    // 解析課綱
    currentSyllabusResult = parseSyllabus(syllabusInput);
    const syllabusResultDiv = document.getElementById('syllabusResult');
    if (syllabusResultDiv) {
      syllabusResultDiv.innerHTML = '';
      if (currentSyllabusResult.length === 0) {
        syllabusResultDiv.innerHTML = '<p>無課綱資料</p>';
      } else {
        currentSyllabusResult.forEach(item => {
          const card = document.createElement('div');
          card.className = 'week-card';
          if (item.highlightColor) {
            card.style.backgroundColor = item.highlightColor;
          }
          card.textContent = item.content;
          syllabusResultDiv.appendChild(card);
        });
      }
    }
  });
}

// 6. 點擊「上傳到試算表」
const uploadBtn = document.getElementById('uploadBtn');
if (uploadBtn) {
  uploadBtn.addEventListener('click', async () => {
    const statusMsg = document.getElementById('statusMsg');

    if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL === '貼上你的_GAS_WEB_APP_URL') {
      if (statusMsg) {
        statusMsg.style.color = 'red';
        statusMsg.textContent = '請先在 app.js 中設定有效的 GAS_WEB_APP_URL！';
      }
      return;
    }

    if (!currentMetaResult) {
      if (statusMsg) {
        statusMsg.style.color = 'red';
        statusMsg.textContent = '請先進行解析再上傳！';
      }
      return;
    }

    if (statusMsg) {
      statusMsg.style.color = 'blue';
      statusMsg.textContent = '資料上傳中...';
    }

    const payload = {
      meta: currentMetaResult,
      syllabus: currentSyllabusResult
    };

    try {
      await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (statusMsg) {
        statusMsg.style.color = 'green';
        statusMsg.textContent = '上傳成功！資料已同步至 Google 試算表。';
      }

      // 上傳成功後 1.2 秒自動重新拉取並刷新課表繪製
      setTimeout(() => {
        fetchCoursesFromSheet();
      }, 1200);

    } catch (error) {
      if (statusMsg) {
        statusMsg.style.color = 'red';
        statusMsg.textContent = '上傳失敗：' + error.message;
      }
    }
  });
}