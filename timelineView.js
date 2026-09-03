// timelineView.js - 自訂行程背景透明化 + 課堂教室上移

(function () {
  const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const DAY_LABELS = { Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六', Sun: '日' };

  function injectTimelineStyles() {
    if (document.getElementById('appleTimelineStyle')) return;
    const style = document.createElement('style');
    style.id = 'appleTimelineStyle';
    style.textContent = `
      .apple-timeline-container {
        width: 100%; background-color: #141519; border: 1px solid #262830;
        border-radius: 12px; overflow: hidden; color: #e0e0e0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .timeline-header-row { display: flex; background: #1a1b20; border-bottom: 1px solid #262830; }
      .timeline-header-corner { width: 70px; flex-shrink: 0; border-right: 1px solid #262830; }
      .timeline-header-days { flex: 1; display: flex; }
      .timeline-day-header { flex: 1; text-align: center; padding: 8px 0; font-size: 12px; font-weight: bold; color: #8a8d9b; border-right: 1px solid #262830; }
      .timeline-day-header:last-child { border-right: none; }

      .timeline-allday-row { display: flex; border-bottom: 1px solid #262830; background: #141519; min-height: 36px; align-items: center; }
      .allday-label { width: 70px; font-size: 11px; color: #8a8d9b; text-align: center; font-weight: bold; flex-shrink: 0; }
      .allday-content { flex: 1; display: flex; gap: 6px; padding: 4px 8px; overflow-x: auto; }
      .allday-chip { background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; color: #60a5fa; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; white-space: nowrap; }

      .timeline-scroll-body { position: relative; max-height: 600px; overflow-y: auto; display: flex; }
      .timeline-time-col { width: 70px; flex-shrink: 0; border-right: 1px solid #262830; background: #141519; user-select: none; }
      .time-slot-label { height: 60px; box-sizing: border-box; font-size: 11px; color: #8a8d9b; text-align: right; padding-right: 10px; transform: translateY(-8px); }

      .timeline-grid-wrapper { flex: 1; display: flex; position: relative; background: #0d0e12; }
      .timeline-day-col { flex: 1; position: relative; border-right: 1px solid #1e2028; }
      .timeline-day-col:last-child { border-right: none; }

      .grid-hour-row { height: 60px; border-bottom: 1px solid #1e2028; box-sizing: border-box; position: relative; }
      .grid-half-hour-line { position: absolute; top: 30px; left: 0; right: 0; border-bottom: 1px dashed #181920; }

      .timeline-now-line { position: absolute; left: 0; right: 0; height: 2px; background: #ef4444; z-index: 10; pointer-events: none; }
      .timeline-now-line::before { content: ''; position: absolute; left: -4px; top: -4px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; }

      /* 卡片通用樣式 */
      .timeline-event-card {
        position: absolute; border-radius: 6px; padding: 5px 6px; box-sizing: border-box;
        overflow: hidden; cursor: pointer; transition: transform 0.12s ease, box-shadow 0.12s ease; z-index: 5;
        display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start;
      }
      .timeline-event-card:hover { z-index: 20 !important; transform: scale(1.01); box-shadow: 0 4px 12px rgba(0,0,0,0.8); }
      
      .event-card-title {
        font-weight: bold; font-size: 11px; color: #ffffff; width: 100%;
        word-break: break-word; white-space: normal; line-height: 1.25;
      }

      .event-card-time-sub {
        font-size: 10px; color: #8a8d9b; font-weight: normal; margin-top: 3px; display: block;
      }

      /* 教室地點：緊接在名稱下方近處 */
      .event-card-room-near { 
        font-size: 10px; 
        color: #8a8d9b; 
        width: 100%; 
        text-align: right; 
        margin-top: 6px;
      }
    `;
    document.head.appendChild(style);
  }

  function timeToTopPx(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  }

  function getPeriodTimeRange(periodStr) {
    const periodMap = {
      '1': { start: '08:20', end: '09:10' },
      '2': { start: '09:20', end: '10:10' },
      '3': { start: '10:20', end: '11:10' },
      '4': { start: '11:20', end: '12:10' },
      '5': { start: '12:30', end: '14:20' },
      '6': { start: '14:30', end: '15:20' },
      '7': { start: '15:30', end: '16:20' },
      '8': { start: '16:30', end: '17:20' }
    };
    return periodMap[periodStr] || { start: '08:00', end: '09:00' };
  }

  function renderAppleTimeline() {
    injectTimelineStyles();
    const container = document.getElementById('timelinePanel');
    if (!container) return;

    container.innerHTML = '';

    const isDayView = document.getElementById('btnViewDay')?.classList.contains('active');
    const selectedDay = document.getElementById('daySelect')?.value || 'Monday';

    const currentWeek = parseInt(document.getElementById('weekDisplay')?.textContent) || 1;
    const datesMap = JSON.parse(localStorage.getItem('user_dates') || '{}');
    const weekDates = datesMap[currentWeek] || {};

    const DAY_MAP_FULL = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
    const activeDays = isDayView ? [DAY_MAP_FULL[selectedDay] || 'Mon'] : DAY_KEYS;

    const timelineWrapper = document.createElement('div');
    timelineWrapper.className = 'apple-timeline-container';

    // 1. 頂部列
    const headerRow = document.createElement('div');
    headerRow.className = 'timeline-header-row';
    headerRow.appendChild(Object.assign(document.createElement('div'), { className: 'timeline-header-corner' }));

    const daysHeaderContainer = document.createElement('div');
    daysHeaderContainer.className = 'timeline-header-days';

    activeDays.forEach(dayKey => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'timeline-day-header';
      const dateStr = weekDates[dayKey] ? (typeof window.formatToMMDD === 'function' ? window.formatToMMDD(weekDates[dayKey]) : weekDates[dayKey]) : '';
      dayHeader.innerHTML = `<div>${dateStr}</div><div>${dayKey} (${DAY_LABELS[dayKey]})</div>`;
      daysHeaderContainer.appendChild(dayHeader);
    });
    headerRow.appendChild(daysHeaderContainer);
    timelineWrapper.appendChild(headerRow);

    // 2. All-day 列
    const alldayRow = document.createElement('div');
    alldayRow.className = 'timeline-allday-row';
    alldayRow.innerHTML = `
      <div class="allday-label">all-day</div>
      <div class="allday-content">
        <div class="allday-chip">📌 專題期中總結預備</div>
        <div class="allday-chip">🎯 補繳 Lab Report</div>
      </div>
    `;
    timelineWrapper.appendChild(alldayRow);

    // 3. 24小時網格
    const scrollBody = document.createElement('div');
    scrollBody.className = 'timeline-scroll-body';

    const timeCol = document.createElement('div');
    timeCol.className = 'timeline-time-col';

    for (let h = 0; h < 24; h++) {
      const timeLabel = document.createElement('div');
      timeLabel.className = 'time-slot-label';
      timeLabel.textContent = `${String(h).padStart(2, '0')}:00`;
      timeCol.appendChild(timeLabel);
    }
    scrollBody.appendChild(timeCol);

    const gridWrapper = document.createElement('div');
    gridWrapper.className = 'timeline-grid-wrapper';

    const dayColMap = {};
    const eventsByDay = {};

    activeDays.forEach(dayKey => {
      eventsByDay[dayKey] = [];
      const dayCol = document.createElement('div');
      dayCol.className = 'timeline-day-col';
      dayCol.dataset.day = dayKey;

      for (let h = 0; h < 24; h++) {
        const hourRow = document.createElement('div');
        hourRow.className = 'grid-hour-row';
        hourRow.innerHTML = `<div class="grid-half-hour-line"></div>`;
        dayCol.appendChild(hourRow);
      }

      gridWrapper.appendChild(dayCol);
      dayColMap[dayKey] = dayCol;
    });

    scrollBody.appendChild(gridWrapper);
    timelineWrapper.appendChild(scrollBody);
    container.appendChild(timelineWrapper);

    // 4. 收集【正式課程】
    const courses = JSON.parse(localStorage.getItem('user_courses') || '[]');
    courses.forEach(course => {
      const rawDay = course.dayOfWeek || course.day || '';
      const dayCode = (window.DAY_MAP && window.DAY_MAP[rawDay]) || rawDay;

      if (eventsByDay[dayCode]) {
        const startSec = String(course.startPeriod || course.startClass || '1');
        const endSec = String(course.endPeriod || course.endClass || startSec);

        const startTimeInfo = getPeriodTimeRange(startSec);
        const endTimeInfo = getPeriodTimeRange(endSec);

        eventsByDay[dayCode].push({
          type: 'course',
          title: course.courseName || '未命名課程',
          classroom: course.classInfo || course.classroom || '',
          startPx: timeToTopPx(startTimeInfo.start),
          endPx: timeToTopPx(endTimeInfo.end),
          color: '#3b82f6',
          raw: course
        });
      }
    });

    // 5. 收集【自訂行程/待辦事項 (SLOT_)】
    const allCachedTasks = JSON.parse(localStorage.getItem('cached_course_tasks') || '[]');
    const customTypes = JSON.parse(localStorage.getItem('app_custom_types') || '[]');

    const slotTasks = allCachedTasks.filter(t => 
      t.courseName && t.courseName.startsWith('SLOT_') && String(t.week) === String(currentWeek) && t.taskName && !t.taskName.startsWith('[已完成]')
    );

    slotTasks.forEach(task => {
      const parts = task.courseName.split('_');
      let targetDayCode = parts[1] || 'Mon';
      const deadlineStr = task.deadlineDay || '';

      const dateMatch = deadlineStr.match(/(\d{1,2})[/-](\d{1,2})/);
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

      let startTimeStr = '09:30';
      let endTimeStr = '12:20';

      const timeMatch = deadlineStr.match(/(\d{1,2}:\d{2})\s*[\-~—–]\s*(\d{1,2}:\d{2})/);
      if (timeMatch) {
        startTimeStr = timeMatch[1];
        endTimeStr = timeMatch[2];
      }

      if (eventsByDay[targetDayCode]) {
        const matchedType = customTypes.find(typeItem => 
          String(typeItem.name).trim().toLowerCase() === String(task.type).trim().toLowerCase()
        );
        const fallbackColorMap = { Homework: '#f59e0b', Paper: '#3b82f6', Quiz: '#ef4444' };
        const badgeColor = matchedType?.color || fallbackColorMap[task.type] || '#ef4444';

        eventsByDay[targetDayCode].push({
          type: 'slot',
          title: task.taskName,
          timeRangeStr: `${startTimeStr}–${endTimeStr}`,
          startPx: timeToTopPx(startTimeStr),
          endPx: timeToTopPx(endTimeStr),
          color: badgeColor,
          raw: task
        });
      }
    });

    // 6. 收集【死線前 10 分鐘警示區塊】
    const DAY_MAP_LOCAL = window.DAY_MAP || {};
    allCachedTasks.forEach(task => {
      const isSlotTask = task.courseName && task.courseName.startsWith('SLOT_');
      const taskWeekStr = String(task.deadlineWeek || task.week || '');
      const isMatchingWeek = taskWeekStr === String(currentWeek) || taskWeekStr === `W${currentWeek}`;

      if (!isSlotTask && task.deadlineTime && isMatchingWeek && task.taskName && !task.taskName.startsWith('[已完成]')) {
        const deadlineMatch = task.deadlineTime.match(/(\d{1,2}):(\d{2})/);
        if (deadlineMatch) {
          const endMin = parseInt(deadlineMatch[1], 10) * 60 + parseInt(deadlineMatch[2], 10);
          const startMin = Math.max(0, endMin - 10);

          let targetDayCode = DAY_MAP_LOCAL[task.deadlineDay] || task.deadlineDay || 'Sat';

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

          if (eventsByDay[targetDayCode]) {
            eventsByDay[targetDayCode].push({
              type: 'deadline',
              title: `🚨 截止: ${task.taskName}`,
              timeRangeStr: `(${task.deadlineTime})`,
              startPx: startMin,
              endPx: endMin,
              color: '#ef4444',
              raw: task
            });
          }
        }
      }
    });

    // 7. 渲染 DOM
    Object.keys(eventsByDay).forEach(dayKey => {
      const dayEvents = eventsByDay[dayKey];
      const dayCol = dayColMap[dayKey];
      if (!dayCol || !dayEvents.length) return;

      dayEvents.sort((a, b) => {
        if (a.startPx !== b.startPx) return a.startPx - b.startPx;
        return a.type === 'course' ? -1 : 1;
      });

      dayEvents.forEach(event => {
        const overlappingEvents = dayEvents.filter(other => 
          !(event.endPx <= other.startPx || event.startPx >= other.endPx)
        );

        overlappingEvents.sort((a, b) => {
          if (a.startPx !== b.startPx) return a.startPx - b.startPx;
          return a.type === 'course' ? -1 : 1;
        });

        event.totalCols = overlappingEvents.length;
        event.colIndex = overlappingEvents.indexOf(event);
      });

      dayEvents.forEach(event => {
        const card = document.createElement('div');
        card.className = 'timeline-event-card';

        const widthPct = 100 / event.totalCols;
        const leftPct = event.colIndex * widthPct;
        const heightPx = Math.max(24, event.endPx - event.startPx);

        card.style.top = `${event.startPx}px`;
        card.style.height = `${heightPx}px`;
        card.style.left = `calc(${leftPct}% + 1px)`;
        card.style.width = `calc(${widthPct}% - 2px)`;
        card.style.borderLeft = `3px solid ${event.color}`;

        // ⚡ 核心修正 1：自訂行程保持高度拉長涵蓋至結束時間，但背景設為完全透明，讓後方網格穿透
        if (event.type === 'slot') {
          card.style.backgroundColor = 'transparent';
        } else if (event.type === 'course') {
          card.style.backgroundColor = 'rgba(26, 28, 35, 0.95)';
        } else if (event.type === 'deadline') {
          card.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95))';
          card.style.color = '#fff';
          card.style.zIndex = '12';
        }

        // ⚡ 核心修正 2：課堂教室緊跟名稱下方近處，自訂行程名稱下接時間
        let contentHtml = '';
        if (event.type === 'course') {
          contentHtml = `
            <div class="event-card-title">${event.title}</div>
            <div class="event-card-room-near">${event.classroom || ''}</div>
          `;
        } else {
          contentHtml = `
            <div class="event-card-title">${event.title}</div>
            <div class="event-card-time-sub">${event.timeRangeStr || ''}</div>
          `;
        }

        card.innerHTML = contentHtml;

        card.addEventListener('click', (e) => {
          e.stopPropagation();
          if (event.type === 'course' && typeof window.openCourseModal === 'function') {
            window.openCourseModal(event.raw.courseName, '無課綱紀錄', null, currentWeek);
          } else if (typeof window.openTaskModal === 'function') {
            window.openTaskModal(event.raw.courseName, `${event.raw.deadlineDay || '行程'}`, currentWeek);
          }
        });

        dayCol.appendChild(card);
      });
    });

    // 8. 當前時間紅線與滾動
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const nowTopPx = currentHour * 60 + currentMin;

    const weekDaysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayCode = weekDaysMap[now.getDay()];

    if (dayColMap[todayCode]) {
      const nowLine = document.createElement('div');
      nowLine.className = 'timeline-now-line';
      nowLine.style.top = `${nowTopPx}px`;
      dayColMap[todayCode].appendChild(nowLine);
    }

    setTimeout(() => {
      scrollBody.scrollTop = Math.max(0, nowTopPx - 100);
    }, 100);
  }

  window.renderAppleTimeline = renderAppleTimeline;
})();