// customSlots.js - 修正死線 night/midnight 時段定位、日期比對與每週切換大綱連動

const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ⚡ 1. 補全完整節次與晚間/深夜時間對照表 (涵蓋至 23:59)
const PERIOD_TIME_MAP = [
  { period: '1', startMin: 8 * 60 + 20, endMin: 9 * 60 + 10 },
  { period: '2', startMin: 9 * 60 + 20, endMin: 10 * 60 + 10 },
  { period: '3', startMin: 10 * 60 + 20, endMin: 11 * 60 + 10 },
  { period: '4', startMin: 11 * 60 + 20, endMin: 12 * 60 + 10 },
  { period: '5', startMin: 12 * 60 + 30, endMin: 14 * 60 + 20 },
  { period: '6', startMin: 14 * 60 + 30, endMin: 15 * 60 + 20 },
  { period: '7', startMin: 15 * 60 + 30, endMin: 16 * 60 + 20 },
  { period: '8', startMin: 16 * 60 + 30, endMin: 17 * 60 + 20 },
  // 晚間與深夜半小時時段
  { period: '17:30', startMin: 17 * 60 + 30, endMin: 18 * 60 },
  { period: '18:00', startMin: 18 * 60, endMin: 18 * 60 + 30 },
  { period: '18:30', startMin: 18 * 60 + 30, endMin: 19 * 60 },
  { period: '19:00', startMin: 19 * 60, endMin: 19 * 60 + 30 },
  { period: '19:30', startMin: 19 * 60 + 30, endMin: 20 * 60 },
  { period: '20:00', startMin: 20 * 60, endMin: 20 * 60 + 30 },
  { period: '20:30', startMin: 20 * 60 + 30, endMin: 21 * 60 },
  { period: '21:00', startMin: 21 * 60, endMin: 21 * 60 + 30 },
  { period: '21:30', startMin: 21 * 60 + 30, endMin: 22 * 60 },
  { period: '22:00', startMin: 22 * 60, endMin: 24 * 60 } // 深夜時段涵蓋至 23:59
];

function parseTaskTimeRange(durationStr) {
  if (!durationStr) return null;

  const monthDayMatch = durationStr.match(/(\d{1,2})[/-](\d{1,2})/);
  let month = monthDayMatch ? parseInt(monthDayMatch[1], 10) : null;
  let day = monthDayMatch ? parseInt(monthDayMatch[2], 10) : null;

  const rangeMatch = durationStr.match(/(\d{1,2}):(\d{2})\s*[\-~—–]\s*(\d{1,2}):(\d{2})/);
  if (rangeMatch) {
    const startH = parseInt(rangeMatch[1], 10);
    const startM = parseInt(rangeMatch[2], 10);
    const endH = parseInt(rangeMatch[3], 10);
    const endM = parseInt(rangeMatch[4], 10);
    return { month, day, startMin: startH * 60 + startM, endMin: endH * 60 + endM };
  }

  return { month, day, startMin: null, endMin: null };
}

// ⚡ 2. 時間對照精準映射函式
function mapTimeToPeriods(startMin, endMin) {
  let startPeriod = '1';
  let endPeriod = '1';
  let isBreak = false;

  for (const slot of PERIOD_TIME_MAP) {
    if (startMin >= slot.startMin && startMin < slot.endMin) {
      startPeriod = slot.period;
      break;
    }
  }

  for (let i = PERIOD_TIME_MAP.length - 1; i >= 0; i--) {
    const slot = PERIOD_TIME_MAP[i];
    if (endMin > slot.startMin && endMin <= slot.endMin) {
      endPeriod = slot.period;
      break;
    }
  }

  return { startPeriod, endPeriod, isBreak };
}

function updateCoursesTodayStat(currentWeek = 1) {
  const cachedCourses = JSON.parse(localStorage.getItem('user_courses') || '[]');
  const datesMap = JSON.parse(localStorage.getItem('user_dates') || '{}');
  const currentWeekDates = datesMap[currentWeek] || datesMap[String(currentWeek)] || {};

  const now = new Date();
  const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
  const todayDay = String(now.getDate()).padStart(2, '0');
  const todayMMDD = `${todayMonth}-${todayDay}`;

  const weekDaysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDayCode = weekDaysMap[now.getDay()];

  let isTodayInCurrentWeek = false;
  let todayMatchedDayCode = null;

  for (const dayKey of DAY_KEYS) {
    const rawDateStr = currentWeekDates[dayKey] || currentWeekDates[dayKey.toLowerCase()] || '';
    if (rawDateStr) {
      const formatted = typeof window.formatToMMDD === 'function' ? window.formatToMMDD(rawDateStr) : rawDateStr;
      if (formatted === todayMMDD) {
        isTodayInCurrentWeek = true;
        todayMatchedDayCode = dayKey;
        break;
      }
    }
  }

  let todayCoursesCount = 0;
  const DAY_MAP_LOCAL = window.DAY_MAP || {};

  if (isTodayInCurrentWeek && todayMatchedDayCode) {
    todayCoursesCount = cachedCourses.filter(c => {
      const dayVal = c.dayOfWeek || c.day || '';
      const courseDayCode = DAY_MAP_LOCAL[dayVal] || dayVal;
      return courseDayCode === todayMatchedDayCode || dayVal.includes(todayMatchedDayCode);
    }).length;
  } else if (!Object.keys(currentWeekDates).length) {
    todayCoursesCount = cachedCourses.filter(c => {
      const dayVal = c.dayOfWeek || c.day || '';
      const courseDayCode = DAY_MAP_LOCAL[dayVal] || dayVal;
      return courseDayCode === todayDayCode;
    }).length;
  }

  const todayCoursesEl = document.querySelector('.stat-item:nth-child(1) .stat-num');
  if (todayCoursesEl) {
    todayCoursesEl.textContent = todayCoursesCount;
  }
}

// ----------------------------------------------------
// 自訂行程與死線前 10 分鐘警示區塊晶片渲染 (支援每週連動與去重)
// ----------------------------------------------------
function renderCustomSlotChips(currentWeek = 1) {
  updateCoursesTodayStat(currentWeek);

  const allCachedTasks = JSON.parse(localStorage.getItem('cached_course_tasks') || '[]');
  const customTypes = JSON.parse(localStorage.getItem('app_custom_types') || '[]');
  const cachedDates = JSON.parse(localStorage.getItem('user_dates') || '{}');
  const weekDates = cachedDates[currentWeek] || cachedDates[String(currentWeek)] || {};
  const DAY_MAP_LOCAL = window.DAY_MAP || {};

  // 1. 清理舊有自訂晶片與併格狀態
  document.querySelectorAll('td[data-slot-custom="true"]').forEach(cell => {
    cell.removeAttribute('rowspan');
    cell.removeAttribute('data-slot-custom');
    cell.style.display = '';
    const container = cell.querySelector('.custom-slot-chip-container');
    if (container) container.remove();
  });

  const activeTasks = allCachedTasks.filter(t => 
    t.taskName && !t.taskName.startsWith('[已完成]')
  );

  const processedTasks = [];
  const renderedKeys = new Set(); // ⚡ 用於避免同一個死線被重複印出

  activeTasks.forEach((task, originalIndex) => {
    const isSlotTask = task.courseName && task.courseName.startsWith('SLOT_');

    // 🅰️ 處理自訂行程 (SLOT_)
    if (isSlotTask && String(task.week) === String(currentWeek)) {
      const parts = task.courseName.split('_');
      let defaultDayCode = parts[1] || 'Mon';
      let defaultPeriod = parts[2] || '1';

      const timeInfo = parseTaskTimeRange(task.deadlineDay);
      let targetDayCode = defaultDayCode;

      if (timeInfo && timeInfo.month && timeInfo.day) {
        const targetMMDD = `${String(timeInfo.month).padStart(2, '0')}-${String(timeInfo.day).padStart(2, '0')}`;
        for (const dayKey of DAY_KEYS) {
          const rawDateStr = weekDates[dayKey] || '';
          if (rawDateStr) {
            const formatted = typeof window.formatToMMDD === 'function' ? window.formatToMMDD(rawDateStr) : rawDateStr;
            if (formatted === targetMMDD) {
              targetDayCode = dayKey;
              break;
            }
          }
        }
      }

      let startMin = timeInfo?.startMin ?? 500;
      let endMin = timeInfo?.endMin ?? 550;
      let pMap = timeInfo && timeInfo.startMin !== null ? mapTimeToPeriods(startMin, endMin) : { startPeriod: defaultPeriod, endPeriod: defaultPeriod, isBreak: false };

      processedTasks.push({
        rawTask: task,
        targetDayCode,
        startPeriod: pMap.startPeriod,
        endPeriod: pMap.endPeriod,
        startMin,
        type: task.type || 'Homework',
        createdAt: task.createdAt || task.id || originalIndex,
        isBreak: pMap.isBreak,
        isDeadlineBlock: false
      });
    }

    // 🅱️ 處理死線前 10 分鐘警示區塊 (精準比對當週 currentWeek)
    const taskWeekStr = String(task.deadlineWeek || task.week || '');
    const currentWeekStr = String(currentWeek);
    const isMatchingWeek = taskWeekStr === currentWeekStr || taskWeekStr === `W${currentWeek}`;

    if (!isSlotTask && task.deadlineTime && isMatchingWeek) {
      const uniqueKey = `${task.courseName}_${task.taskName}_${task.deadlineTime}_${currentWeek}`;
      if (renderedKeys.has(uniqueKey)) return; // ⚡ 已處理過則跳過，防止雙重列印
      renderedKeys.add(uniqueKey);

      const deadlineMatch = task.deadlineTime.match(/(\d{1,2}):(\d{2})/);
      if (deadlineMatch) {
        const endMin = parseInt(deadlineMatch[1], 10) * 60 + parseInt(deadlineMatch[2], 10);
        const startMin = Math.max(0, endMin - 10); // 前 10 分鐘區塊

        let targetDayCode = DAY_MAP_LOCAL[task.deadlineDay] || task.deadlineDay || 'Sat';

        // ⚡ 若死線有具體 MM-DD 日期，比對當週日期精準歸類至星期欄位
        if (task.deadlineDay) {
          const dateMatch = task.deadlineDay.match(/(\d{1,2})[/-](\d{1,2})/);
          if (dateMatch) {
            const targetMMDD = `${String(dateMatch[1]).padStart(2, '0')}-${String(dateMatch[2]).padStart(2, '0')}`;
            for (const dayKey of DAY_KEYS) {
              const rawDateStr = weekDates[dayKey] || '';
              if (rawDateStr) {
                const formatted = typeof window.formatToMMDD === 'function' ? window.formatToMMDD(rawDateStr) : rawDateStr;
                if (formatted === targetMMDD) {
                  targetDayCode = dayKey;
                  break;
                }
              }
            }
          }
        }

        if (!DAY_KEYS.includes(targetDayCode)) targetDayCode = 'Sat';

        const pMap = mapTimeToPeriods(startMin, endMin);

        processedTasks.push({
          rawTask: task,
          targetDayCode,
          startPeriod: pMap.startPeriod,
          endPeriod: pMap.endPeriod,
          startMin,
          type: 'Deadline',
          createdAt: task.createdAt || originalIndex,
          isBreak: false,
          isDeadlineBlock: true,
          deadlineStr: task.deadlineTime
        });
      }
    }
  });

  // 排序
  processedTasks.sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin;
    if (a.type !== b.type) return String(a.type).localeCompare(String(b.type));
    return a.createdAt - b.createdAt;
  });

  // 分組渲染
  const cellTaskGroups = {};
  processedTasks.forEach(item => {
    const key = `${item.targetDayCode}_${item.startPeriod}`;
    if (!cellTaskGroups[key]) cellTaskGroups[key] = [];
    cellTaskGroups[key].push(item);
  });

  Object.keys(cellTaskGroups).forEach(key => {
    const group = cellTaskGroups[key];
    const firstItem = group[0];

    const startCell = document.querySelector(`td[data-day="${firstItem.targetDayCode}"][data-period="${firstItem.startPeriod}"]`);
    if (!startCell) return;

    startCell.setAttribute('data-slot-custom', 'true');

    let container = startCell.querySelector('.custom-slot-chip-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'custom-slot-chip-container';
      container.style.cssText = `
        display: flex; flex-direction: row; gap: 4px; padding: 2px;
        height: 100%; min-height: 100%; width: 100%; box-sizing: border-box;
        align-items: stretch; justify-content: flex-start;
      `;
      startCell.appendChild(container);
    }

    group.forEach(item => {
      const task = item.rawTask;
      const chip = document.createElement('div');
      chip.className = 'custom-task-chip';

      if (item.isDeadlineBlock) {
        chip.style.cssText = `
          flex: 1; min-width: 0; height: 100%; min-height: 100%;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95));
          border-left: 4px solid #fca5a5 !important;
          padding: 4px 6px; border-radius: 4px; color: #ffffff; cursor: pointer;
          display: flex; flex-direction: column; justify-content: flex-start;
          align-items: flex-start; border: 1px solid #ef4444; box-sizing: border-box;
        `;

        chip.innerHTML = `
          <div style="display: flex; flex-wrap: wrap; gap: 2px 6px; width: 100%; align-items: baseline; justify-content: flex-start;">
            <span style="font-weight: bold; font-size: 11px; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              🚨 截止: ${task.taskName}
            </span>
            <span style="font-size: 9px; color: #fecaca; white-space: nowrap;">
              (${item.deadlineStr} 截止)
            </span>
          </div>
        `;
      } else {
        const matchedType = customTypes.find(typeItem => 
          String(typeItem.name).trim().toLowerCase() === String(item.type).trim().toLowerCase()
        );
        const fallbackColorMap = { Homework: '#f59e0b', Paper: '#3b82f6', Quiz: '#ef4444' };
        const badgeColor = matchedType?.color || fallbackColorMap[item.type] || '#3b82f6';
        const prefixTag = item.isBreak ? `<span style="background: #ef4444; color: #fff; padding: 1px 3px; border-radius: 2px; margin-right: 4px; font-size: 8px;">下課時</span>` : '';

        chip.style.cssText = `
          flex: 1; min-width: 0; height: 100%; min-height: 100%;
          background: rgba(20, 21, 25, 0.95);
          border-left: 4px solid ${badgeColor} !important;
          padding: 6px 8px; border-radius: 4px; color: #ffffff; cursor: pointer;
          display: flex; flex-direction: column; justify-content: flex-start;
          align-items: flex-start; border: 1px solid #262830; box-sizing: border-box;
        `;

        chip.innerHTML = `
          <div style="display: flex; flex-wrap: wrap; gap: 4px 8px; width: 100%; align-items: baseline; justify-content: flex-start;">
            <span style="font-weight: bold; font-size: 13px; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${prefixTag}${task.taskName}
            </span>
            <span style="font-size: 10px; color: #8a8d9b; white-space: nowrap;">
              ${task.deadlineDay || ''}
            </span>
          </div>
        `;
      }

      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.openTaskModal === 'function') {
          window.openTaskModal(task.courseName, `${task.deadlineDay || '死線警示'} (死線)`, currentWeek);
        }
      });

      container.appendChild(chip);
    });
  });
}

function initCustomSlots(currentWeek = 1) {
  renderCustomSlotChips(currentWeek);

  const emptyCells = document.querySelectorAll('td[data-day]:not([data-course-cell="true"])');
  emptyCells.forEach(cell => {
    cell.style.cursor = 'pointer';
    cell.onclick = (e) => {
      if (e.target.closest('.custom-task-chip')) return;

      const dayCode = cell.dataset.day;
      const period = cell.dataset.period;
      const DAY_NAME_MAP = { Mon: '星期一', Tue: '星期二', Wed: '星期三', Thu: '星期四', Fri: '星期五', Sat: '星期六', Sun: '星期日' };

      const slotCourseName = `SLOT_${dayCode}_${period}`;
      const displayTitle = `${DAY_NAME_MAP[dayCode] || '星期一'} 第 ${period} 節`;

      if (typeof window.openTaskModal === 'function') {
        window.openTaskModal(slotCourseName, displayTitle, currentWeek);
      }
    };
  });
}

window.initCustomSlots = initCustomSlots;
window.renderCustomSlotChips = renderCustomSlotChips;
window.updateCoursesTodayStat = updateCoursesTodayStat;