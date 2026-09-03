// dayCountPicker.js - 自訂週期選取器 (日數制與星期制皆支援多選)

(function () {
  let pickerCallback = null;
  let activeMode = 'days'; // 'days' | 'weeks'
  let selectedDaysSet = new Set([2]); // ⚡ 支援日數多選 (例如 2, 5, 10 天)
  let selectedWeekDays = new Set(['Mon', 'Wed', 'Fri']);

  const WEEK_DAY_OPTIONS = [
    { key: 'Mon', label: '一' },
    { key: 'Tue', label: '二' },
    { key: 'Wed', label: '三' },
    { key: 'Thu', label: '四' },
    { key: 'Fri', label: '五' },
    { key: 'Sat', label: '六' },
    { key: 'Sun', label: '日' }
  ];

  function injectPickerStyles() {
    if (document.getElementById('dayCountPickerStyle')) return;
    const style = document.createElement('style');
    style.id = 'dayCountPickerStyle';
    style.textContent = `
      .day-picker-overlay {
        position: fixed !important; top: 0 !important; left: 0 !important;
        width: 100vw !important; height: 100vh !important;
        background: rgba(0, 0, 0, 0.75) !important; backdrop-filter: blur(4px) !important;
        display: none; justify-content: center !important; align-items: center !important;
        z-index: 3000000 !important;
      }
      .day-picker-overlay.active { display: flex !important; animation: dayPickerFadeIn 0.2s ease-out !important; }

      .day-picker-card {
        width: 420px !important; max-width: 90vw !important;
        background: #141519 !important; border: 1px solid #3b82f6 !important;
        border-radius: 16px !important; padding: 20px !important; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9) !important;
        color: #fff !important; box-sizing: border-box !important; position: relative !important;
      }

      .day-picker-title { font-size: 16px; font-weight: bold; color: #ffffff; text-align: center; margin-bottom: 14px; }

      /* 膠囊切換鈕 */
      .day-mode-capsule {
        display: flex; background: #0d0e12; border: 1px solid #262830;
        border-radius: 20px; padding: 3px; margin-bottom: 16px;
      }
      .day-mode-btn {
        flex: 1; background: transparent; border: none; color: #8a8d9b;
        font-size: 13px; font-weight: bold; padding: 8px; border-radius: 18px; cursor: pointer; transition: all 0.2s;
      }
      .day-mode-btn.active { background: #2b459d; color: #ffffff; }

      /* 日數網格區塊 (0~200日) */
      .days-grid-container {
        display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px;
        max-height: 220px; overflow-y: auto; padding-right: 4px; margin-bottom: 16px;
      }
      .day-num-chip {
        background: #0d0e12; border: 1px solid #262830; color: #d1d5db;
        border-radius: 8px; padding: 8px 0; text-align: center; font-size: 13px; font-weight: bold;
        cursor: pointer; transition: all 0.15s; user-select: none;
      }
      .day-num-chip:hover { border-color: #3b82f6; color: #fff; }
      .day-num-chip.selected { background: #2563eb; border-color: #3b82f6; color: #ffffff; box-shadow: 0 0 10px rgba(37, 99, 235, 0.5); }

      /* 星期制按鈕區塊 */
      .weeks-circle-container {
        display: flex; justify-content: space-around; align-items: center;
        padding: 24px 0; margin-bottom: 16px;
      }
      .week-circle-btn {
        width: 42px; height: 42px; border-radius: 50%; background: #0d0e12;
        border: 1px solid #262830; color: #9ca3af; font-size: 14px; font-weight: bold;
        display: flex; justify-content: center; align-items: center; cursor: pointer; transition: all 0.2s;
      }
      .week-circle-btn:hover { border-color: #3b82f6; color: #fff; }
      .week-circle-btn.selected {
        background: #f59e0b; border-color: #f59e0b; color: #000000; box-shadow: 0 0 12px rgba(245, 158, 11, 0.6);
      }

      .day-picker-footer { display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #262830; padding-top: 14px; }
      .btn-picker-cancel { background: transparent; border: 1px solid #4b5563; color: #9ca3af; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; }
      .btn-picker-confirm { background: #2563eb; border: none; color: #fff; padding: 8px 22px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; }

      @keyframes dayPickerFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    `;
    document.head.appendChild(style);
  }

  function initPickerDOM() {
    injectPickerStyles();
    if (document.getElementById('globalDayCountPickerOverlay')) return;

    const html = `
      <div id="globalDayCountPickerOverlay" class="day-picker-overlay">
        <div class="day-picker-card">
          <div class="day-picker-title">設定週期規則</div>

          <!-- 1. 名稱輸入框 -->
          <div style="margin-bottom: 14px;">
            <label style="font-size: 12px; color: #9ca3af; font-weight: bold; display: block; margin-bottom: 4px;">週期名稱：</label>
            <input type="text" id="pickerCycleNameInput" placeholder="例如：讀書週期" style="width: 100%; background: #0d0e12; border: 1px solid #262830; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; box-sizing: border-box; outline: none;" />
          </div>

          <!-- 2. 模式膠囊切換鈕 -->
          <div class="day-mode-capsule">
            <button class="day-mode-btn active" id="btnModeDays">日數制</button>
            <button class="day-mode-btn" id="btnModeWeeks">星期制</button>
          </div>

          <!-- 3. 日數制面板 (0 ~ 200 天多選網格) -->
          <div id="panelPickerDays">
            <div style="font-size: 12px; color: #38bdf8; margin-bottom: 8px; font-weight: bold;">選擇日：選取該日之後的 N 天 (可複選)</div>
            <div class="days-grid-container" id="daysGridContainer"></div>
          </div>

          <!-- 4. 星期制面板 (一~日 圓形按鈕) -->
          <div id="panelPickerWeeks" style="display: none;">
            <div style="font-size: 12px; color: #f59e0b; margin-bottom: 8px; font-weight: bold; text-align: center;">點擊可多選重複星期</div>
            <div class="weeks-circle-container" id="weeksCircleContainer"></div>
          </div>

          <!-- 5. 底部按鈕 -->
          <div class="day-picker-footer">
            <button class="btn-picker-cancel" id="btnCancelDayPicker">取消</button>
            <button class="btn-picker-confirm" id="btnConfirmDayPicker">確定</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    bindPickerEvents();
  }

  // ⚡ 渲染 0 ~ 200 數字網格 (複選邏輯)
  function renderDaysGrid() {
    const container = document.getElementById('daysGridContainer');
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i <= 200; i++) {
      const chip = document.createElement('div');
      const isSelected = selectedDaysSet.has(i);
      chip.className = `day-num-chip ${isSelected ? 'selected' : ''}`;
      chip.textContent = i;

      chip.onclick = () => {
        if (selectedDaysSet.has(i)) {
          selectedDaysSet.delete(i);
        } else {
          selectedDaysSet.add(i);
        }
        renderDaysGrid();
      };

      container.appendChild(chip);
    }
  }

  // 渲染 星期一~星期日 圓形按鈕
  function renderWeeksCircle() {
    const container = document.getElementById('weeksCircleContainer');
    if (!container) return;

    container.innerHTML = '';
    WEEK_DAY_OPTIONS.forEach(w => {
      const btn = document.createElement('div');
      const isSelected = selectedWeekDays.has(w.key);
      btn.className = `week-circle-btn ${isSelected ? 'selected' : ''}`;
      btn.textContent = w.label;

      btn.onclick = () => {
        if (selectedWeekDays.has(w.key)) {
          selectedWeekDays.delete(w.key);
        } else {
          selectedWeekDays.add(w.key);
        }
        renderWeeksCircle();
      };

      container.appendChild(btn);
    });
  }

  function bindPickerEvents() {
    const overlay = document.getElementById('globalDayCountPickerOverlay');
    const btnDays = document.getElementById('btnModeDays');
    const btnWeeks = document.getElementById('btnModeWeeks');
    const panelDays = document.getElementById('panelPickerDays');
    const panelWeeks = document.getElementById('panelPickerWeeks');

    const btnCancel = document.getElementById('btnCancelDayPicker');
    const btnConfirm = document.getElementById('btnConfirmDayPicker');

    // 切換日數制 / 星期制
    if (btnDays && btnWeeks) {
      btnDays.onclick = () => {
        activeMode = 'days';
        btnDays.classList.add('active');
        btnWeeks.classList.remove('active');
        panelDays.style.display = 'block';
        panelWeeks.style.display = 'none';
      };

      btnWeeks.onclick = () => {
        activeMode = 'weeks';
        btnWeeks.classList.add('active');
        btnDays.classList.remove('active');
        panelWeeks.style.display = 'block';
        panelDays.style.display = 'none';
      };
    }

    if (btnCancel) {
      btnCancel.onclick = () => closeDayPicker();
    }

    if (btnConfirm) {
      btnConfirm.onclick = () => {
        const cycleName = document.getElementById('pickerCycleNameInput')?.value.trim() || '讀書週期';
        let ruleStr = '';

        if (activeMode === 'days') {
          // ⚡ 將選取的天數由小到大排序並轉為字串 (如: 每 2, 5, 10 天)
          const sortedDays = Array.from(selectedDaysSet).sort((a, b) => a - b);
          ruleStr = sortedDays.length > 0 ? `每 ${sortedDays.join(', ')} 天` : '未選擇天數';
        } else {
          const selectedLabels = WEEK_DAY_OPTIONS
            .filter(w => selectedWeekDays.has(w.key))
            .map(w => w.label);
          ruleStr = selectedLabels.length > 0 ? `每週 ${selectedLabels.join(', ')}` : '未選擇星期';
        }

        if (typeof pickerCallback === 'function') {
          pickerCallback({
            name: cycleName,
            mode: activeMode,
            ruleText: ruleStr,
            daysList: Array.from(selectedDaysSet).sort((a, b) => a - b),
            weekDays: Array.from(selectedWeekDays)
          });
        }

        closeDayPicker();
      };
    }
  }

  function closeDayPicker() {
    const overlay = document.getElementById('globalDayCountPickerOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  // 🎯 對外開放入口
  window.openDayCountPicker = function ({ defaultName = '讀書週期', onConfirm }) {
    initPickerDOM();
    pickerCallback = onConfirm;

    const nameInput = document.getElementById('pickerCycleNameInput');
    if (nameInput) nameInput.value = defaultName;

    renderDaysGrid();
    renderWeeksCircle();

    const overlay = document.getElementById('globalDayCountPickerOverlay');
    if (overlay) overlay.classList.add('active');
  };
})();