// durationPicker.js - 智慧日期選取器 (對齊課表真實日期、當前節次時間 & 支援跨月切換完整版)

(function () {
  let activeCallback = null;
  let isFullDay = false;
  let activeTarget = null; // null | 'C' | 'D'

  // 當前月曆渲染基準年月
  let viewYear = 2026;
  let viewMonth = 8; // 0-based, 8 代表 9 月

  // 日期與時間變數
  let startDate = new Date();
  let endDate = new Date();
  let startTime = '08:20';
  let endTime = '09:10';

  // 課表節次與標準時間對照表
  const PERIOD_TIME_MAP = {
    '1': { start: '08:20', end: '09:10' },
    '2': { start: '09:20', end: '10:10' },
    '3': { start: '10:20', end: '11:10' },
    '4': { start: '11:20', end: '12:10' },
    '5': { start: '12:30', end: '14:20' },
    '6': { start: '14:30', end: '15:20' },
    '7': { start: '15:30', end: '16:20' },
    '8': { start: '16:30', end: '17:20' },
    '17:30': { start: '17:30', end: '18:00' },
    '18:00': { start: '18:00', end: '18:30' },
    '18:30': { start: '18:30', end: '19:00' },
    '19:00': { start: '19:00', end: '19:30' },
    '19:30': { start: '19:30', end: '20:00' },
    '20:00': { start: '20:00', end: '20:30' },
    '20:30': { start: '20:30', end: '21:00' },
    '21:00': { start: '21:00', end: '21:30' },
    '21:30': { start: '21:30', end: '22:00' },
    '22:00': { start: '22:00', end: '22:30' }
  };

  function injectStyles() {
    if (document.getElementById('durationPickerStyle')) return;
    const style = document.createElement('style');
    style.id = 'durationPickerStyle';
    style.textContent = `
      .duration-popover-overlay {
        position: fixed !important; top: 0 !important; left: 0 !important;
        width: 100vw !important; height: 100vh !important;
        background: rgba(0, 0, 0, 0.6) !important; backdrop-filter: blur(4px) !important;
        display: none; justify-content: center !important; align-items: center !important;
        z-index: 2000000 !important;
      }
      .duration-popover-overlay.active { display: flex !important; animation: durFadeIn 0.15s ease-out !important; }

      .duration-card {
        width: 360px !important; background: #121316 !important; border: 1px solid #262830 !important;
        border-radius: 18px !important; padding: 18px !important; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85) !important;
        color: #fff !important; box-sizing: border-box !important; position: relative !important;
      }

      .duration-tab-row {
        display: flex; justify-content: center; gap: 20px; border-bottom: 1px solid #262830; padding-bottom: 10px; margin-bottom: 14px;
      }
      .dur-tab-btn {
        background: transparent; border: none; color: #8a8d9b; font-size: 15px; font-weight: bold; cursor: pointer; padding-bottom: 4px;
      }
      .dur-tab-btn.active { color: #38bdf8; border-bottom: 2px solid #38bdf8; }

      .dur-setting-row {
        display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 14px;
      }
      .dur-toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
      .dur-toggle-switch input { opacity: 0; width: 0; height: 0; }
      .dur-slider {
        position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
        background-color: #374151; transition: .2s; border-radius: 24px;
      }
      .dur-slider:before {
        position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
        background-color: white; transition: .2s; border-radius: 50%;
      }
      input:checked + .dur-slider { background-color: #2563eb; }
      input:checked + .dur-slider:before { transform: translateX(20px); }

      .dur-range-display {
        display: flex; justify-content: space-around; align-items: center; background: #0d0e12; border: 1px solid #20222a;
        padding: 12px; border-radius: 14px; margin-bottom: 16px;
      }
      .dur-btn-capsule {
        background: #1f2937; border: 1px solid #374151; padding: 6px 14px; border-radius: 20px;
        font-size: 13px; font-weight: bold; color: #e0e0e0; cursor: pointer; transition: all 0.15s ease;
      }
      .dur-btn-capsule.active {
        border-color: #3b82f6 !important; background: rgba(59, 130, 246, 0.25) !important; color: #60a5fa !important;
      }

      .dur-time-btn {
        background: transparent; border: none; font-size: 14px; color: #38bdf8; font-weight: bold; margin-top: 6px; cursor: pointer; display: block; width: 100%; text-align: center;
      }

      .dur-calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 14px; font-weight: bold; }
      .dur-nav-btn { background: transparent; border: none; color: #8a8d9b; font-size: 18px; cursor: pointer; padding: 0 10px; }
      .dur-nav-btn:hover { color: #fff; }

      .dur-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; font-size: 12px; }
      .dur-day-head { color: #8a8d9b; padding-bottom: 6px; font-weight: bold; }
      .dur-day-head.sun { color: #ef4444; }
      .dur-day-head.sat { color: #3b82f6; }

      .dur-day-cell {
        height: 34px; line-height: 34px; border-radius: 8px; cursor: pointer; transition: all 0.15s; user-select: none;
      }
      .dur-day-cell:hover { background: rgba(255, 255, 255, 0.1); }
      .dur-day-cell.in-range { background: rgba(37, 99, 235, 0.35); border-radius: 0; color: #fff; }
      .dur-day-cell.range-start { background: #2563eb !important; border-radius: 8px; font-weight: bold; color: #fff; }
      .dur-day-cell.range-end { background: #2563eb !important; border-radius: 8px; font-weight: bold; color: #fff; }

      .dur-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; border-top: 1px solid #262830; padding-top: 12px; }
      .dur-btn-cancel { background: transparent; border: 1px solid #4b5563; color: #9ca3af; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
      .dur-btn-confirm { background: #2563eb; border: none; color: #fff; padding: 6px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; }

      @keyframes durFadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);
  }

  function initDOM() {
    injectStyles();
    if (document.getElementById('globalDurationPickerOverlay')) return;

    const html = `
      <div id="globalDurationPickerOverlay" class="duration-popover-overlay">
        <div class="duration-card">
          <div class="duration-tab-row">
            <button class="dur-tab-btn active" id="btnDurTabDate">日期</button>
            <button class="dur-tab-btn" id="btnDurTabCycle">特殊週期</button>
          </div>

          <div class="dur-setting-row">
            <span style="color: #9ca3af;">🕒 整天</span>
            <label class="dur-toggle-switch">
              <input type="checkbox" id="chkDurFullDay">
              <span class="dur-slider"></span>
            </label>
          </div>

          <div class="dur-range-display">
            <div style="flex: 1; text-align: center;">
              <button class="dur-btn-capsule" id="btnC">--月 --日</button>
              <button class="dur-time-btn" id="btnA">08:20</button>
            </div>
            <span style="color: #6b7280; font-weight: bold;">➔</span>
            <div style="flex: 1; text-align: center;">
              <button class="dur-btn-capsule" id="btnD">--月 --日</button>
              <button class="dur-time-btn" id="btnB">09:10</button>
            </div>
          </div>

          <div id="durCalendarPanel">
            <div class="dur-calendar-header">
              <button class="dur-nav-btn" id="btnDurPrevMonth">&lt;</button>
              <span id="durMonthYearLabel">2026年9月</span>
              <button class="dur-nav-btn" id="btnDurNextMonth">&gt;</button>
            </div>

            <div class="dur-calendar-grid">
              <div class="dur-day-head sun">週日</div>
              <div class="dur-day-head">週一</div>
              <div class="dur-day-head">週二</div>
              <div class="dur-day-head">週三</div>
              <div class="dur-day-head">週四</div>
              <div class="dur-day-head">週五</div>
              <div class="dur-day-head sat">週六</div>
            </div>
            <div class="dur-calendar-grid" id="durDaysContainer" style="margin-top: 4px;"></div>
          </div>

          <div class="dur-footer">
            <button class="dur-btn-cancel" id="btnDurCancel">取消</button>
            <button class="dur-btn-confirm" id="btnDurConfirm">確定</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    bindEvents();
  }

  function renderCalendar() {
    const container = document.getElementById('durDaysContainer');
    if (!container) return;

    container.innerHTML = '';
    document.getElementById('durMonthYearLabel').textContent = `${viewYear}年${viewMonth + 1}月`;

    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
      container.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      cell.className = 'dur-day-cell';
      cell.textContent = day;

      const currentCellDate = new Date(viewYear, viewMonth, day);

      const isStart = currentCellDate.toDateString() === startDate.toDateString();
      const isEnd = currentCellDate.toDateString() === endDate.toDateString();
      const isInRange = currentCellDate > startDate && currentCellDate < endDate;

      if (isStart) cell.classList.add('range-start');
      if (isEnd) cell.classList.add('range-end');
      if (isInRange) cell.classList.add('in-range');

      cell.onclick = () => {
        if (activeTarget === 'C') {
          startDate = currentCellDate;
          if (endDate < startDate) endDate = new Date(startDate);
        } else if (activeTarget === 'D') {
          endDate = currentCellDate;
          if (startDate > endDate) startDate = new Date(endDate);
        } else {
          startDate = currentCellDate;
          endDate = new Date(currentCellDate);
        }
        updateUI();
        renderCalendar();
      };

      container.appendChild(cell);
    }
  }

  function updateUI() {
    const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

    const btnC = document.getElementById('btnC');
    const btnD = document.getElementById('btnD');
    const btnA = document.getElementById('btnA');
    const btnB = document.getElementById('btnB');

    if (btnC) btnC.textContent = `${startDate.getMonth() + 1}月 ${startDate.getDate()}日 ${dayNames[startDate.getDay()]}`;
    if (btnD) btnD.textContent = `${endDate.getMonth() + 1}月 ${endDate.getDate()}日 ${dayNames[endDate.getDay()]}`;

    if (btnC) btnC.classList.toggle('active', activeTarget === 'C');
    if (btnD) btnD.classList.toggle('active', activeTarget === 'D');

    if (btnA && btnB) {
      if (isFullDay) {
        btnA.style.display = 'none';
        btnB.style.display = 'none';
      } else {
        btnA.style.display = 'block';
        btnB.style.display = 'block';
        btnA.textContent = startTime;
        btnB.textContent = endTime;
      }
    }
  }

  function bindEvents() {
    const overlay = document.getElementById('globalDurationPickerOverlay');
    const chkFullDay = document.getElementById('chkDurFullDay');
    const btnC = document.getElementById('btnC');
    const btnD = document.getElementById('btnD');
    const btnA = document.getElementById('btnA');
    const btnB = document.getElementById('btnB');

    const btnPrevMonth = document.getElementById('btnDurPrevMonth');
    const btnNextMonth = document.getElementById('btnDurNextMonth');

    const btnCancel = document.getElementById('btnDurCancel');
    const btnConfirm = document.getElementById('btnDurConfirm');

    btnPrevMonth.onclick = () => {
      viewMonth--;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
      }
      renderCalendar();
    };

    btnNextMonth.onclick = () => {
      viewMonth++;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
      }
      renderCalendar();
    };

    btnC.onclick = () => {
      activeTarget = activeTarget === 'C' ? null : 'C';
      updateUI();
    };

    btnD.onclick = () => {
      activeTarget = activeTarget === 'D' ? null : 'D';
      updateUI();
    };

    btnA.onclick = () => {
      const newTime = prompt('請輸入開始時間 (例如 08:20)：', startTime);
      if (newTime) { startTime = newTime; updateUI(); }
    };

    btnB.onclick = () => {
      const newTime = prompt('請輸入結束時間 (例如 09:10)：', endTime);
      if (newTime) { endTime = newTime; updateUI(); }
    };

    chkFullDay.onchange = (e) => {
      isFullDay = e.target.checked;
      updateUI();
    };

    btnCancel.onclick = () => closePicker();

    btnConfirm.onclick = () => {
      if (typeof activeCallback === 'function') {
        const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
        let resultStr = '';

        const startM = startDate.getMonth() + 1;
        const startD = startDate.getDate();
        const endM = endDate.getMonth() + 1;
        const endD = endDate.getDate();

        if (isFullDay) {
          if (startDate.toDateString() === endDate.toDateString()) {
            resultStr = `${startM}/${startD}(${dayNames[startDate.getDay()]}) 整天`;
          } else {
            resultStr = `${startM}/${startD} - ${endM}/${endD} 整天`;
          }
        } else {
          if (startDate.toDateString() === endDate.toDateString()) {
            resultStr = `${startM}/${startD} ${startTime}~${endTime}`;
          } else {
            resultStr = `${startM}/${startD} ${startTime} - ${endM}/${endD} ${endTime}`;
          }
        }
        activeCallback(resultStr);
      }
      closePicker();
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) closePicker();
    };
  }

  function closePicker() {
    const overlay = document.getElementById('globalDurationPickerOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  // ⚡ 對外暴露入口：精準對齊課表真實日期與節次時間
  // ⚡ 核心修復：強制對齊課表當週的真實日期（如 9月8日）與節次時間
  window.openDurationPicker = function ({ slotCourseName, currentWeek = 1, defaultDuration = '', onSelect }) {
    initDOM();
    activeCallback = onSelect;
    activeTarget = null;

    const DAY_KEY_MAP = {
      'Mon': 'Mon', 'Tue': 'Tue', 'Wed': 'Wed', 'Thu': 'Thu', 'Fri': 'Fri', 'Sat': 'Sat', 'Sun': 'Sun'
    };

    let dayCode = 'Mon';
    let periodCode = '1';

    if (slotCourseName) {
      const parts = slotCourseName.split('_');
      if (parts.length >= 2) dayCode = DAY_KEY_MAP[parts[1]] || parts[1];
      if (parts.length >= 3) periodCode = parts[2];
    }

    // 1. 設定初始 A, B 時間按鈕 (對應第 5 節 ➔ 12:30 ~ 14:20)
    if (PERIOD_TIME_MAP[periodCode]) {
      startTime = PERIOD_TIME_MAP[periodCode].start;
      endTime = PERIOD_TIME_MAP[periodCode].end;
    } else {
      startTime = '08:20';
      endTime = '09:10';
    }

    let targetDate = null;

    // ⚡ 2. 核心修正：直接向 HTML 課表表頭 (th) 拿當前的真實日期 (例如 09-08)
    const headerTh = document.querySelector(`th[data-header-day="${dayCode}"]`);
    if (headerTh) {
      // 搜尋表頭中的 "MM-DD" 格式 (如 09-08)
      const match = headerTh.innerText.match(/(\d{1,2})[-/](\d{1,2})/);
      if (match) {
        const year = 2026; // 使用你的學期年份
        const month = parseInt(match[1], 10) - 1; // 0-based
        const day = parseInt(match[2], 10);
        targetDate = new Date(year, month, day);
      }
    }

    // 備用方案：從 user_dates 讀取
    if (!targetDate) {
      const cachedDates = JSON.parse(localStorage.getItem('user_dates') || '{}');
      const weekDates = cachedDates[currentWeek] || cachedDates[String(currentWeek)] || {};
      const rawDateStr = weekDates[dayCode] || weekDates[dayCode.toLowerCase()] || '';

      if (rawDateStr) {
        const match = String(rawDateStr).match(/(\d{1,2})[-/](\d{1,2})/);
        if (match) {
          targetDate = new Date(2026, parseInt(match[1], 10) - 1, parseInt(match[2], 10));
        }
      }
    }

    // 真的抓不到才降級用今天
    if (!targetDate || isNaN(targetDate.getTime())) {
      targetDate = new Date(2026, 8, 8); // 預設 9/8
    }

    // 3. 將精準抓到的日期賦予 C 與 D 按鈕
    startDate = new Date(targetDate);
    endDate = new Date(targetDate);

    // 月曆視圖自動跳轉到對應的年份與月份 (9月)
    viewYear = targetDate.getFullYear();
    viewMonth = targetDate.getMonth();

    renderCalendar();
    updateUI();

    const overlay = document.getElementById('globalDurationPickerOverlay');
    if (overlay) overlay.classList.add('active');
  };

})();