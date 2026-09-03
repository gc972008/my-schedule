// ==========================================
// 1. 全域工具函式與對照表
// ==========================================

// 萬能日期格式化函式 (統一轉換為 MM-DD)
function formatToMMDD(rawDateStr) {
  if (!rawDateStr) return '';
  let str = String(rawDateStr).trim();
  if (!str || str === 'undefined' || str === 'null') return '';

  const monthMap = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };

  const englishMatch = str.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
  if (englishMatch) {
    const month = monthMap[englishMatch[1]];
    const day = String(englishMatch[2]).padStart(2, '0');
    return `${month}-${day}`;
  }

  const digitalMatch = str.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (digitalMatch) {
    const month = String(digitalMatch[2]).padStart(2, '0');
    const day = String(digitalMatch[3]).padStart(2, '0');
    return `${month}-${day}`;
  }

  const shortMatch = str.match(/(\d{1,2})[/-](\d{1,2})/);
  if (shortMatch) {
    const month = String(shortMatch[1]).padStart(2, '0');
    const day = String(shortMatch[2]).padStart(2, '0');
    return `${month}-${day}`;
  }

  const d = new Date(rawDateStr);
  if (!isNaN(d.getTime())) {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }

  return str;
}

const DAY_MAP = {
  '星期一': 'Mon', '禮拜一': 'Mon', '週一': 'Mon', '周一': 'Mon', 'Mon': 'Mon',
  '星期二': 'Tue', '禮拜二': 'Tue', '週二': 'Tue', '周二': 'Tue', 'Tue': 'Tue',
  '星期三': 'Wed', '禮拜三': 'Wed', '週三': 'Wed', '周三': 'Wed', 'Wed': 'Wed',
  '星期四': 'Thu', '禮拜四': 'Thu', '週四': 'Thu', '周四': 'Thu', 'Thu': 'Thu',
  '星期五': 'Fri', '禮拜五': 'Fri', '週五': 'Fri', '周五': 'Fri', 'Fri': 'Fri',
  '星期六': 'Sat', '禮拜六': 'Sat', '週六': 'Sat', '周六': 'Sat', 'Sat': 'Sat',
  '星期日': 'Sun', '禮拜日': 'Sun', '週日': 'Sun', '周日': 'Sun', 'Sun': 'Sun'
};

const DAY_HEADER_TEXT = {
  Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六', Sun: '日'
};

// 全域掛載對照表，方便跨模組存取
window.DAY_MAP = DAY_MAP;

// ==========================================
// 2. 數據統計與 Header 繪製 (智慧比對今天真實日期)
// ==========================================

// ==========================================
// 2. 數據統計與 Header 繪製 (智慧比對今天真實日期)
// ==========================================

function updateHeaderStats(coursesList, currentWeek, datesMap) {
  if (!coursesList || !Array.isArray(coursesList)) return;

  // ⚡ 1. 修改此處：改為計算「總課程數量 (TOTAL COURSES)」
  // 直接計算傳入的課程清單長度（即畫面上出現的所有課程卡片數）
  const totalCoursesCount = coursesList.length;
  
  // 尋找第二個統計區塊（原本顯示 TOTAL CREDITS 的位置）
  const totalCreditsEl = document.querySelector('.stat-item:nth-child(3) .stat-num');
  const totalCreditsTitleEl = document.querySelector('.stat-item:nth-child(3) .stat-title');
  
  if (totalCreditsEl) totalCreditsEl.textContent = totalCoursesCount;
  if (totalCreditsTitleEl) totalCreditsTitleEl.textContent = 'TOTAL COURSES'; // 標題改為 TOTAL COURSES

  // 2. 抓取當前畫面上顯示的週次 (若無傳入則從 DOM 或預設 1 抓取)
  if (!currentWeek) {
    currentWeek = parseInt(document.getElementById('weekDisplay')?.textContent) || 1;
  }

  // 3. 讀取當週日期對照表
  if (!datesMap) {
    datesMap = JSON.parse(localStorage.getItem('user_dates') || '{}');
  }
  const currentWeekDates = datesMap[currentWeek] || datesMap[String(currentWeek)] || {};

  // 4. 抓取開啟 App 時的「今日真實日期 (MM-DD)」與「星期代碼」
  const now = new Date();
  const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
  const todayDay = String(now.getDate()).padStart(2, '0');
  const todayMMDD = `${todayMonth}-${todayDay}`;

  const weekDaysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDayCode = weekDaysMap[now.getDay()];

  // 5. 判斷今日是否在當前週次中
  let isTodayInCurrentWeek = false;
  let todayMatchedDayCode = null;
  const dayKeys = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (const dayKey of dayKeys) {
    const rawDateStr = currentWeekDates[dayKey] || currentWeekDates[dayKey.toLowerCase()] || '';
    if (rawDateStr) {
      const formatted = formatToMMDD(rawDateStr);
      if (formatted === todayMMDD) {
        isTodayInCurrentWeek = true;
        todayMatchedDayCode = dayKey;
        break;
      }
    }
  }

  // 6. 精準計算 COURSES TODAY
  let todayCoursesCount = 0;

  if (isTodayInCurrentWeek && todayMatchedDayCode) {
    todayCoursesCount = coursesList.filter(c => {
      const dayVal = c.dayOfWeek || c.day || '';
      const courseDayCode = DAY_MAP[dayVal] || dayVal;
      return courseDayCode === todayMatchedDayCode || dayVal.includes(todayMatchedDayCode);
    }).length;
  } else if (!Object.keys(currentWeekDates).length) {
    todayCoursesCount = coursesList.filter(c => {
      const dayVal = c.dayOfWeek || c.day || '';
      const courseDayCode = DAY_MAP[dayVal] || dayVal;
      return courseDayCode === todayDayCode;
    }).length;
  }

  const todayCoursesEl = document.querySelector('.stat-item:nth-child(1) .stat-num');
  if (todayCoursesEl) todayCoursesEl.textContent = todayCoursesCount;
}

function updateTableHeaders(currentWeek, datesMap) {
  const weekDates = datesMap ? (datesMap[currentWeek] || datesMap[String(currentWeek)]) : null;

  let rawMon = null;
  if (weekDates) {
    rawMon = weekDates['Mon'] || weekDates['mon'] || weekDates['一'] || weekDates['週一'];
  }

  let baseMonDate = null;
  if (rawMon) {
    const str = String(rawMon).trim();
    const match = str.match(/(?:(\d{4})[/-])?(\d{1,2})[/-](\d{1,2})/);
    if (match) {
      const year = match[1] ? parseInt(match[1], 10) : new Date().getFullYear();
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      baseMonDate = new Date(year, month, day);
    }
  }

  const dayOffsetMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(dayKey => {
    const th = document.querySelector(`th[data-header-day="${dayKey}"]`);
    const dayName = DAY_HEADER_TEXT[dayKey];

    if (th) {
      let finalDateStr = '';

      if (baseMonDate) {
        const offset = dayOffsetMap[dayKey];
        const calcDate = new Date(baseMonDate);
        calcDate.setDate(calcDate.getDate() + offset);

        const m = String(calcDate.getMonth() + 1).padStart(2, '0');
        const d = String(calcDate.getDate()).padStart(2, '0');
        finalDateStr = `${m}-${d}`;
      } else if (weekDates && weekDates[dayKey]) {
        finalDateStr = formatToMMDD(weekDates[dayKey]);
      }

      if (finalDateStr) {
        th.innerHTML = `<span style="font-size:11px; color:#8a8d9b; font-weight:normal;">${finalDateStr}</span><br>${dayName}`;
      } else {
        th.innerHTML = dayName;
      }
    }
  });
}

// ==========================================
// 3. 課表表格重置與單一課程卡片繪製
// ==========================================

function resetGrid() {
  const cells = document.querySelectorAll('td[data-day]');
  cells.forEach(cell => {
    cell.innerHTML = '';
    cell.removeAttribute('rowspan');
    cell.style.display = '';
  });
}

function getSyllabusStyle(contentText) {
  if (!contentText) return null;

  const ignoreNonExamWords = contentText.replace(/期[中末](?:回顧|討論|總結|報告準備)|學習日誌|問卷/g, '');

  const isMajorExam = /期中考|期末考|期中測驗|期末測驗|期中考試|期末考試|Midterm|Final\s*Exam|\bFinal\b/i.test(ignoreNonExamWords) ||
                      (/(?:期中|期末)/.test(ignoreNonExamWords) && !/(?:回顧|討論|說明)/.test(contentText));

  const isQuiz = /(?:小考|隨堂測驗|Quiz|UnitTest|筆試)/i.test(ignoreNonExamWords) || 
                 (/考/i.test(ignoreNonExamWords) && !/思考|參考|考慮|考察/.test(contentText));

  if (isMajorExam) {
    return {
      bg: 'rgba(239, 68, 68, 0.25)',
      border: '#ef4444',
      text: '#fca5a5',
      icon: '🚨'
    };
  } else if (isQuiz) {
    return {
      bg: 'rgba(234, 179, 8, 0.2)',
      border: '#eab308',
      text: '#fde047',
      icon: '✏️'
    };
  }

  return {
    bg: 'rgba(255, 255, 255, 0.08)',
    border: '#4b5563',
    text: '#d1d5db',
    icon: '📄'
  };
}

function printCourseToGrid(course, currentWeek) {
  const dayCode = DAY_MAP[course.dayOfWeek || course.day] || 'Mon';
  
  const parseSection = (val) => {
    if (!val) return NaN;
    const num = String(val).replace(/[^\d]/g, '');
    return parseInt(num, 10);
  };

  const startSec = parseSection(course.startPeriod || course.startClass);
  const endSec = parseSection(course.endPeriod || course.endClass);

  if (isNaN(startSec)) return;

  const actualEndSec = isNaN(endSec) ? startSec : endSec;
  const spanCount = actualEndSec - startSec + 1;

  const startCell = document.querySelector(`td[data-day="${dayCode}"][data-period="${startSec}"]`);
  if (!startCell) return;

  let weekContent = "";
  let customBg = null;

  if (course.syllabus && course.syllabus[currentWeek - 1]) {
    const rawData = course.syllabus[currentWeek - 1];
    if (typeof rawData === 'object' && rawData !== null) {
      weekContent = rawData.content || rawData.tag || "";
      customBg = rawData.highlightColor || null;
    } else {
      weekContent = rawData;
    }
  }

  if (spanCount > 1) {
    startCell.setAttribute('rowspan', spanCount);
  }

  const card = document.createElement('div');
  card.className = 'course-card';
  card.style.cursor = 'pointer';

  // 1. 課程當週摘要 HTML
  let noteHtml = "";
  if (weekContent && weekContent.trim() !== "") {
    const styleInfo = getSyllabusStyle(weekContent);

    let finalBg = styleInfo.bg;
    if (customBg === '#ffcccc') {
      finalBg = 'rgba(239, 68, 68, 0.3)';
    } else if (customBg === '#fff3cd') {
      finalBg = 'rgba(234, 179, 8, 0.25)';
    }

    noteHtml = `
      <div class="syllabus-tag" style="background-color: ${finalBg}; color: ${styleInfo.text}; border: 1px solid ${styleInfo.border}; padding: 3px 6px; border-radius: 4px; margin-top: 4px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 4px; width: 100%; box-sizing: border-box; overflow: hidden;">
        <span style="flex-shrink: 0;">${styleInfo.icon}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; text-align: left;">${weekContent}</span>
      </div>
    `;
  }

  // 2. 抓取快取中該課程 + 當週的「作業註記」並渲染在摘要下方
  let tasksHtml = "";
  const courseName = course.courseName || '未命名課程';
  const allCachedTasks = JSON.parse(localStorage.getItem('cached_course_tasks') || '[]');
  
  const currentCourseTasks = allCachedTasks.filter(t => 
    t.courseName === courseName && String(t.week) === String(currentWeek) && t.taskName && t.taskName.trim() !== ''
  );

  if (currentCourseTasks.length > 0) {
    tasksHtml = `<div class="course-tasks-container" style="margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">`;
    
    // 從 LocalStorage 讀取自訂類型
    const customTypes = JSON.parse(localStorage.getItem('app_custom_types') || '[]');

    currentCourseTasks.forEach(t => {
      const matchedTypeObj = customTypes.find(typeItem => 
        String(typeItem.name).trim().toLowerCase() === String(t.type).trim().toLowerCase()
      );

      const fallbackColorMap = { 'Homework': '#f59e0b', 'Paper': '#3b82f6', 'Quiz': '#ef4444' };
      const badgeColor = matchedTypeObj?.color || fallbackColorMap[t.type] || '#3b82f6';

      tasksHtml += `
        <div class="task-grid-chip" style="background: rgba(0,0,0,0.4); border-left: 3px solid ${badgeColor}; padding: 2px 5px; border-radius: 3px; font-size: 10px; color: #e0e0e0; display: flex; justify-content: space-between; align-items: center; overflow: hidden; white-space: nowrap;">
          <span style="overflow: hidden; text-overflow: ellipsis; max-width: 70%;" title="${t.taskName}">${t.taskName}</span>
          <span style="font-size: 9px; color: #9ca3af; margin-left: 4px;">W${t.deadlineWeek}/${t.deadlineDay}</span>
        </div>
      `;
    });
    tasksHtml += `</div>`;
  }

  // 組合卡片內容：標題 -> 摘要 -> 作業註記 -> 教室位置
  card.innerHTML = `
    <div class="course-title" title="${courseName}">${courseName}</div>
    ${noteHtml}
    ${tasksHtml}
    <div class="course-room" style="margin-top: 4px;">${course.classInfo || course.classroom || ''}</div>
  `;

  // 點擊事件：開啟 Modal
  card.addEventListener('click', (e) => {
    e.stopPropagation();

    startCell.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    const courseTitle = course.courseName || '未命名課程';
    const courseSummary = weekContent || '本週無課綱紀錄';
    const styleInfo = weekContent ? getSyllabusStyle(weekContent) : null;

    if (typeof window.openCourseModal === 'function') {
      window.openCourseModal(courseTitle, courseSummary, styleInfo, currentWeek);
    }
  });

  startCell.appendChild(card);

  for (let p = startSec + 1; p <= actualEndSec; p++) {
    const hideCell = document.querySelector(`td[data-day="${dayCode}"][data-period="${p}"]`);
    if (hideCell) {
      hideCell.style.display = 'none';
    }
  }
}

// ==========================================
// 4. 主渲染入口與全域綁定
// ==========================================

function renderAllTimetableData(coursesList, selectedWeek = 1, datesMap = null) {
  if (!coursesList || !Array.isArray(coursesList)) return;

  if (!datesMap) {
    datesMap = JSON.parse(localStorage.getItem('user_dates') || '{}');
  }

  updateTableHeaders(selectedWeek, datesMap);
  resetGrid();

  coursesList.forEach(course => {
    printCourseToGrid(course, selectedWeek);
  });

  // ⚡ 將 selectedWeek 與 datesMap 帶入 updateHeaderStats，進行精準的日期比對與極速計算
  if (typeof updateHeaderStats === 'function') {
    updateHeaderStats(coursesList, selectedWeek, datesMap);
  }

  if (typeof window.initCustomSlots === 'function') {
    window.initCustomSlots(selectedWeek);
  }
}

// 綁定全域 window 屬性供跨檔案呼叫
window.formatToMMDD = formatToMMDD;
window.updateHeaderStats = updateHeaderStats;
window.renderAllTimetableData = renderAllTimetableData;

// 頂部控制項切換監聽
document.addEventListener('DOMContentLoaded', () => {
  const btnPrevWeek = document.getElementById('btnPrevWeek');
  const btnNextWeek = document.getElementById('btnNextWeek');

  const triggerAutoCloseModal = () => {
    if (typeof window.autoSaveAndCloseModal === 'function') {
      window.autoSaveAndCloseModal();
    }
  };

  // 1. 週次切換 (+ / - 按鈕)
  const handleWeekChange = () => {
  triggerAutoCloseModal();

  const weekVal = parseInt(document.getElementById('weekDisplay')?.textContent) || 1;
  const cachedCourses = JSON.parse(localStorage.getItem('user_courses') || '[]');
  const cachedDates = JSON.parse(localStorage.getItem('user_dates') || '{}');
  
  // 1. 繪製課表
  renderAllTimetableData(cachedCourses, weekVal, cachedDates);

  // ⚡ 2. 若當前開啟的是 Time Line 視圖，同步重新繪製 Time Line
  const timelinePanel = document.getElementById('timelinePanel');
  if (timelinePanel && timelinePanel.classList.contains('active')) {
    if (typeof window.renderAppleTimeline === 'function') {
      window.renderAppleTimeline();
    }
  }
};
});