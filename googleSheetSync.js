// googleSheetSync.js - Google 試算表註記同步模組

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwF0GeDuWVJnPf1prU77DsXs2NepjtdIboF-OoF-164iYx0OUSYwm_SL0svbtIkO_iDqw/exec";

/**
 * 將目前 Modal 中的所有完整填寫項目打包並發送到 Google 試算表
 * @param {string} courseName 課程名稱
 * @param {number|string} currentWeek 當前週次
 */
async function saveTasksToGoogleSheet(courseName, currentWeek) {
  const tbody = document.getElementById('taskTableBody');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');
  const taskList = [];

  rows.forEach(row => {
    const typeBtn = row.querySelector('.task-type-btn');
    const type = typeBtn ? typeBtn.dataset.typeName || typeBtn.textContent.trim() : 'Homework';
    
    const taskName = row.querySelector('.task-name')?.value.trim() || '';
    const deadlineBtnText = row.querySelector('.task-deadline-btn')?.textContent.trim() || '';

    if (taskName && deadlineBtnText !== '請選擇死線') {
      const match = deadlineBtnText.match(/W(\d+)\/([一二三四五六日a-zA-Z]+)\/(\d{2}:\d{2})/);

      let deadlineWeek = 'W1';
      let deadlineDay = '六';
      let deadlineTime = '23:59';

      if (match) {
        deadlineWeek = `W${match[1]}`;
        deadlineDay = match[2];
        deadlineTime = match[3];
      }

      taskList.push({
        courseName: courseName,
        week: currentWeek,
        type: type,
        taskName: taskName,
        deadlineWeek: deadlineWeek,
        deadlineDay: deadlineDay,
        deadlineTime: deadlineTime
      });
    }
  });

  if (taskList.length === 0) {
    console.log('沒有需要儲存至 Google 試算表的有效項目');
    return;
  }

  const payload = {
    action: 'saveTasks',
    tasks: taskList
  };

  try {
    // 使用 text/plain 避免跨域預檢 Blocking
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    console.log('✅ 已成功將註記資料上傳至 Google 試算表！');
  } catch (error) {
    console.error('❌ 上傳至 Google 試算表失敗:', error);
  }
}

/**
 * 從 Google 試算表讀取該課程與週次的註記資料
 */
async function fetchTasksFromGoogleSheet(courseName, currentWeek) {
  if (!GOOGLE_SCRIPT_URL) return [];

  try {
    const url = `${GOOGLE_SCRIPT_URL}?action=getTasks&courseName=${encodeURIComponent(courseName)}&week=${currentWeek}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.tasks || [];
  } catch (error) {
    console.error('❌ 從 Google 試算表讀取資料失敗:', error);
    return [];
  }
}

window.saveTasksToGoogleSheet = saveTasksToGoogleSheet;
window.fetchTasksFromGoogleSheet = fetchTasksFromGoogleSheet;