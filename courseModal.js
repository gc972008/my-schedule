// courseModal.js - 課程詳情、死線選時器與全域類型選擇器對接版

window.GAS_WEB_APP_URL = window.GAS_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbwF0GeDuWVJnPf1prU77DsXs2NepjtdIboF-OoF-164iYx0OUSYwm_SL0svbtIkO_iDqw/exec';

function initCourseModal() {
  if (document.getElementById('courseDetailModal')) return;

  const modalHtml = `
    <div id="courseDetailModal" class="course-bottom-panel">
      <div class="course-panel-content">
        <button class="modal-close-btn" id="btnCloseModal">&times;</button>
        
        <h2 id="modalCourseTitle" class="modal-title">課程名稱</h2>
        <div id="modalCourseSummary" class="modal-summary">課程當週摘要與進度...</div>
        
        <hr class="modal-divider" />
        
        <div class="note-section-title">
          <span class="badge-note">註解</span>
        </div>

        <div class="task-table-wrapper">
          <table class="task-table">
            <thead>
              <tr>
                <th style="width: 28%;">類型</th>
                <th style="width: 37%;">項目名稱</th>
                <th style="width: 25%;">Deadline (死線)</th>
                <th style="width: 10%; text-align: center;">操作</th>
              </tr>
            </thead>
            <tbody id="taskTableBody"></tbody>
          </table>
          <button id="btnAddTaskRow" class="btn-add-row">+ 新增項目</button>
        </div>

        <div class="modal-footer">
          <button id="btnSaveCourseNotes" class="btn-modal-submit">儲存</button>
        </div>
      </div>
    </div>

    <!-- 1. 鬧鐘式滾輪選時 Popover -->
    <div id="deadlinePickerPopover" class="deadline-popover-large">
      <div class="popover-header">設定死線時間</div>
      
      <div class="wheel-picker-container">
        <div class="wheel-selection-overlay"></div>
        
        <div class="wheel-zone red-zone">
          <div class="wheel-column" id="wheelHour">
            <div class="wheel-space"></div>
            ${Array.from({length: 24}, (_, i) => `<div class="wheel-item" data-val="${String(i).padStart(2,'0')}">${String(i).padStart(2,'0')}</div>`).join('')}
            <div class="wheel-space"></div>
          </div>
        </div>

        <div class="wheel-colon">:</div>

        <div class="wheel-zone green-zone">
          <div class="wheel-column" id="wheelMinute">
            <div class="wheel-space"></div>
            ${Array.from({length: 60}, (_, i) => `<div class="wheel-item" data-val="${String(i).padStart(2,'0')}">${String(i).padStart(2,'0')}</div>`).join('')}
            <div class="wheel-space"></div>
          </div>
        </div>
      </div>

      <div class="day-picker-row">
        <button class="day-btn" data-day="日">日</button>
        <button class="day-btn" data-day="一">一</button>
        <button class="day-btn" data-day="二">二</button>
        <button class="day-btn" data-day="三">三</button>
        <button class="day-btn" data-day="四">四</button>
        <button class="day-btn" data-day="五">五</button>
        <button class="day-btn active" data-day="六">六</button>
      </div>

      <div class="week-stepper-row">
        <span class="stepper-label">Week</span>
        <button id="btnPickerPrevWeek" class="stepper-btn">−</button>
        <input type="number" id="pickerWeekInput" class="stepper-input" value="1" min="1" max="18" />
        <button id="btnPickerNextWeek" class="stepper-btn">+</button>
      </div>

      <div class="popover-footer">
        <button id="btnCancelDeadline" class="btn-popover-cancel">取消</button>
        <button id="btnConfirmDeadline" class="btn-popover-confirm">確定</button>
      </div>
    </div>
  `;

  const modalStyle = `
    <style>
      .course-bottom-panel {
        position: fixed; bottom: 0; left: 0; width: 100%; max-height: 40vh;
        background: #141519; border-top: 2px solid #2b459d;
        box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.7); display: none; z-index: 9998;
        overflow-y: auto; box-sizing: border-box;
      }
      .course-bottom-panel.active { display: block; animation: slideUp 0.25s ease-out; }
      @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      .course-panel-content { max-width: 900px; margin: 0 auto; padding: 14px 24px 20px 24px; color: #e0e0e0; position: relative; }
      .modal-close-btn { position: absolute; top: 12px; right: 16px; background: transparent; border: none; color: #8a8d9b; font-size: 24px; cursor: pointer; }
      .modal-title { font-size: 18px; color: #ffffff; margin-bottom: 6px; border-bottom: 2px solid #3b82f6; padding-bottom: 2px; display: inline-block; }
      
      .modal-summary { font-size: 13px; margin-bottom: 6px; line-height: 1.4; display: flex; align-items: center; }
      .modal-summary-tag {
        padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 13px;
        display: inline-flex; align-items: center; gap: 6px; box-sizing: border-box;
      }

      .modal-divider { border: 0; height: 1px; background: #262830; margin: 6px 0 !important; }
      .note-section-title { margin-top: 4px; margin-bottom: 6px; }
      .badge-note {
        color: #8a8d9b; background: transparent; border: none; padding: 0; font-size: 13px; font-weight: bold;
      }

      .task-table-wrapper { margin-top: 6px; }
      .task-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      .task-table th, .task-table td { border: 1px solid #262830; padding: 6px; text-align: left; }
      .task-table th { background: #1a1b20; color: #8a8d9b; font-size: 12px; }
      .task-table input {
        width: 100%; background: #0d0e12; border: 1px solid #262830;
        color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 13px; box-sizing: border-box;
      }
      .task-deadline-btn, .task-type-btn {
        width: 100%; background: #0d0e12; border: 1px solid #3b82f6; color: #60a5fa;
        padding: 6px 8px; border-radius: 4px; font-size: 13px; text-align: center; cursor: pointer; font-weight: bold;
        display: flex; align-items: center; justify-content: center; gap: 6px; box-sizing: border-box;
      }
      .btn-delete-row { background: transparent; border: none; font-size: 16px; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.15s; }
      .btn-delete-row:hover { background: rgba(239, 68, 68, 0.2); }

      .deadline-popover-large {
        position: fixed; width: 400px; background: #181a20; border: 1px solid #3b82f6;
        border-radius: 16px; padding: 20px; box-shadow: 0 12px 36px rgba(0,0,0,0.85);
        display: none; z-index: 99999; color: #fff; box-sizing: border-box;
      }
      .deadline-popover-large.active { display: block; animation: fadeIn 0.15s ease-out; }
      .popover-header { font-size: 16px; font-weight: bold; margin-bottom: 16px; text-align: center; color: #93c5fd; }

      .wheel-picker-container {
        position: relative; display: flex; justify-content: space-between; align-items: center;
        height: 150px; margin-bottom: 16px; background: #0d0e12; border-radius: 12px; overflow: hidden; padding: 0 10px;
      }
      .wheel-selection-overlay {
        position: absolute; left: 10px; right: 10px; height: 46px; background: rgba(59, 130, 246, 0.18);
        border-top: 2px solid #3b82f6; border-bottom: 2px solid #3b82f6;
        pointer-events: none; border-radius: 8px; z-index: 1;
      }

      .wheel-zone { flex: 1; height: 100%; display: flex; justify-content: center; position: relative; z-index: 2; }
      .wheel-column { height: 100%; width: 100%; overflow-y: scroll; scroll-snap-type: y mandatory; scrollbar-width: none; text-align: center; }
      .wheel-column::-webkit-scrollbar { display: none; }
      .wheel-space { height: 52px; }
      .wheel-item { height: 46px; line-height: 46px; font-size: 26px; font-weight: bold; color: #4b5563; scroll-snap-align: center; transition: all 0.15s; cursor: pointer; user-select: none; }
      .wheel-item.selected { color: #ffffff !important; font-size: 30px !important; }
      .wheel-colon { font-size: 28px; font-weight: bold; color: #3b82f6; z-index: 3; padding: 0 4px; }

      .day-picker-row { display: flex; justify-content: space-between; margin-bottom: 16px; }
      .day-btn { background: #0d0e12; border: 1px solid #374151; color: #9ca3af; width: 42px; height: 42px; border-radius: 50%; cursor: pointer; font-size: 14px; font-weight: bold; }
      .day-btn.active { background: #2563eb; color: #fff; border-color: #3b82f6; }

      .week-stepper-row { display: flex; align-items: center; justify-content: space-between; background: #0d0e12; border: 1px solid #374151; border-radius: 10px; padding: 6px 12px; margin-bottom: 20px; }
      .stepper-label { font-size: 14px; color: #9ca3af; font-weight: bold; }
      .stepper-btn { background: transparent; border: none; color: #fff; font-size: 22px; width: 36px; cursor: pointer; }
      .stepper-input { width: 60px !important; text-align: center; background: transparent !important; border: none !important; font-size: 18px !important; font-weight: bold; color: #38bdf8 !important; }

      .color-dot-indicator { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
      .popover-footer { display: flex; justify-content: flex-end; gap: 12px; }
      .btn-popover-cancel { background: transparent; border: 1px solid #4b5563; color: #9ca3af; padding: 6px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
      .btn-popover-confirm { background: #2563eb; border: none; color: #fff; padding: 6px 20px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: bold; }
      .btn-add-row { background: transparent; border: 1px dashed #4b5563; color: #9ca3af; width: 100%; padding: 6px; border-radius: 4px; cursor: pointer; font-size: 12px; }
      .modal-footer { display: flex; justify-content: flex-end; margin-top: 8px; }
      .btn-modal-submit { background: #2b459d; color: #fff; border: none; padding: 6px 18px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; }
    </style>
  `;

  document.head.insertAdjacentHTML('beforeend', modalStyle);
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  bindModalEvents();
  bindPopoverEvents();
}

let activeTargetDeadlineBtn = null;

function addTaskRow(type = 'Homework', name = '', deadline = '請選擇死線', color = '#f59e0b') {
  const tbody = document.getElementById('taskTableBody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <button class="task-type-btn" data-type-name="${type}" data-color="${color}">
        <span class="color-dot-indicator" style="background: ${color};"></span>
        <span class="type-label">${type}</span>
      </button>
    </td>
    <td>
      <input type="text" class="task-name" value="${name}" placeholder="請輸入項目名稱" />
    </td>
    <td>
      <button class="task-deadline-btn">${deadline}</button>
    </td>
    <td style="text-align: center;">
      <button class="btn-delete-row" title="刪除此行">🗑️</button>
    </td>
  `;

  // ⚡ 點擊類型：直接對接全域獨立 openTypePicker 浮窗
  const btnType = tr.querySelector('.task-type-btn');
  btnType.addEventListener('click', (e) => {
    e.stopPropagation();
    if (typeof window.openTypePicker === 'function') {
      window.openTypePicker({
        targetBtn: btnType,
        currentType: btnType.dataset.typeName || 'Homework',
        onSelect: (selectedType, selectedColor) => {
          btnType.dataset.typeName = selectedType;
          btnType.dataset.color = selectedColor;
          btnType.querySelector('.type-label').textContent = selectedType;
          btnType.querySelector('.color-dot-indicator').style.background = selectedColor;
        }
      });
    }
  });

  const btnDeadline = tr.querySelector('.task-deadline-btn');
  btnDeadline.addEventListener('click', (e) => {
    e.stopPropagation();
    activeTargetDeadlineBtn = btnDeadline;
    openDeadlinePopover(btnDeadline);
  });

  const btnDelete = tr.querySelector('.btn-delete-row');
  btnDelete.addEventListener('click', () => {
    tr.remove();
  });

  tbody.appendChild(tr);
}

function openDeadlinePopover(targetBtn) {
  const popover = document.getElementById('deadlinePickerPopover');
  const topPos = Math.max(80, window.innerHeight / 2 - 250);
  const leftPos = Math.max(50, window.innerWidth / 2 - 200);

  popover.style.top = `${topPos}px`;
  popover.style.left = `${leftPos}px`;
  popover.classList.add('active');
}

function bindPopoverEvents() {
  const popover = document.getElementById('deadlinePickerPopover');
  const weekInput = document.getElementById('pickerWeekInput');
  const btnPrev = document.getElementById('btnPickerPrevWeek');
  const btnNext = document.getElementById('btnPickerNextWeek');
  const dayBtns = document.querySelectorAll('.day-btn');
  const btnCancel = document.getElementById('btnCancelDeadline');
  const btnConfirm = document.getElementById('btnConfirmDeadline');

  const wheelHour = document.getElementById('wheelHour');
  const wheelMinute = document.getElementById('wheelMinute');

  const syncWheelHighlight = (wheel) => {
    const items = wheel.querySelectorAll('.wheel-item');
    const idx = Math.round(wheel.scrollTop / 46);
    items.forEach((item, i) => {
      if (i === idx) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  };

  wheelHour.addEventListener('scroll', () => syncWheelHighlight(wheelHour));
  wheelMinute.addEventListener('scroll', () => syncWheelHighlight(wheelMinute));

  dayBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dayBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  btnPrev.addEventListener('click', () => {
    let val = parseInt(weekInput.value) || 1;
    if (val > 1) weekInput.value = val - 1;
  });

  btnNext.addEventListener('click', () => {
    let val = parseInt(weekInput.value) || 1;
    if (val < 18) weekInput.value = val + 1;
  });

  btnCancel.addEventListener('click', () => popover.classList.remove('active'));

  btnConfirm.addEventListener('click', () => {
    if (activeTargetDeadlineBtn) {
      const hourIdx = Math.round(wheelHour.scrollTop / 46);
      const minIdx = Math.round(wheelMinute.scrollTop / 46);

      const hourStr = String(Math.min(23, Math.max(0, hourIdx))).padStart(2, '0');
      const minStr = String(Math.min(59, Math.max(0, minIdx))).padStart(2, '0');

      const activeDay = document.querySelector('.day-btn.active')?.dataset.day || '六';
      const week = weekInput.value || '1';

      activeTargetDeadlineBtn.textContent = `W${week}/${activeDay}/${hourStr}:${minStr}`;
    }
    popover.classList.remove('active');
  });
}

function bindModalEvents() {
  const modal = document.getElementById('courseDetailModal');
  const btnClose = document.getElementById('btnCloseModal');
  const btnAdd = document.getElementById('btnAddTaskRow');
  const btnSave = document.getElementById('btnSaveCourseNotes');

  if (btnClose) {
    btnClose.addEventListener('click', async () => {
      const courseName = document.getElementById('modalCourseTitle')?.textContent.trim();
      const modalEl = document.getElementById('courseDetailModal');
      const currentWeek = modalEl?.dataset.currentWeek || '1';

      const tbody = document.getElementById('taskTableBody');
      const rows = tbody.querySelectorAll('tr');

      const validTasks = [];
      let incompleteCount = 0;

      rows.forEach(row => {
        const typeBtn = row.querySelector('.task-type-btn');
        const type = typeBtn?.dataset.typeName || typeBtn?.textContent.trim() || 'Homework';
        const taskName = row.querySelector('.task-name')?.value.trim();
        const deadlineText = row.querySelector('.task-deadline-btn')?.textContent.trim();

        const isComplete = taskName && deadlineText && deadlineText !== '請選擇死線';

        if (isComplete) {
          const cleanText = deadlineText.replace('W', '');
          const parts = cleanText.split('/');

          validTasks.push({
            courseName: courseName || '未命名課程',
            week: String(currentWeek),
            type: type,
            taskName: taskName,
            deadlineWeek: parts[0] || String(currentWeek),
            deadlineDay: parts[1] || '六',
            deadlineTime: parts[2] || '23:59'
          });
        } else {
          incompleteCount++;
          row.remove();
        }
      });

      if (validTasks.length === 0 && incompleteCount === 0) {
        modalEl.classList.remove('active');
        return;
      }

      showToastNotice(`⏳ 正在同步 ${validTasks.length} 個項目...`, 'loading');

      const targetUrl = window.GAS_WEB_APP_URL;
      const payload = {
        action: 'saveTasks',
        tasks: validTasks.length > 0 ? validTasks : [{ courseName: courseName || '未命名課程', week: String(currentWeek), taskName: '' }]
      };

      try {
        await fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });

        let allTasks = JSON.parse(localStorage.getItem('cached_course_tasks') || '[]');
        allTasks = allTasks.filter(t => !(t.courseName === courseName && String(t.week) === String(currentWeek)));
        if (validTasks.length > 0) {
          allTasks.push(...validTasks);
        }
        localStorage.setItem('cached_course_tasks', JSON.stringify(allTasks));

        const cachedCourses = JSON.parse(localStorage.getItem('user_courses') || '[]');
        const cachedDates = JSON.parse(localStorage.getItem('user_dates') || '{}');
        if (typeof window.renderAllTimetableData === 'function') {
          window.renderAllTimetableData(cachedCourses, parseInt(currentWeek, 10), cachedDates);
        }

        let msg = `✅ 已成功儲存 ${validTasks.length} 個項目`;
        if (incompleteCount > 0) {
          msg += `（未填寫完畢有 ${incompleteCount} 個項目未儲存）`;
        }

        showToastNotice(msg, 'success');
        modalEl.classList.remove('active');

      } catch (err) {
        console.error('自動儲存失敗:', err);
        showToastNotice('❌ 儲存失敗，請確認網路連線', 'error');
      }
    });
  }

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      addTaskRow('Homework', '', '請選擇死線');
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const courseName = document.getElementById('modalCourseTitle')?.textContent.trim();
      const modalEl = document.getElementById('courseDetailModal');
      const currentWeek = modalEl?.dataset.currentWeek || '1';
      
      const tbody = document.getElementById('taskTableBody');
      const rows = tbody.querySelectorAll('tr');
      
      const tasksToSave = [];

      rows.forEach(row => {
        const type = row.querySelector('.task-type-btn')?.dataset.typeName || 'Homework';
        const taskName = row.querySelector('.task-name')?.value.trim();
        const deadlineText = row.querySelector('.task-deadline-btn')?.textContent.trim();

        if (taskName && deadlineText !== '請選擇死線') {
          const parts = deadlineText.replace('W', '').split('/');
          
          tasksToSave.push({
            courseName: courseName || '未命名課程',
            week: currentWeek,
            type: type,
            taskName: taskName,
            deadlineWeek: parts[0] || currentWeek,
            deadlineDay: parts[1] || '六',
            deadlineTime: parts[2] || '23:59'
          });
        }
      });

      const originalBtnText = btnSave.textContent;
      btnSave.textContent = '⏳ 儲存中...';
      btnSave.disabled = true;
      btnSave.style.opacity = '0.7';

      showToastNotice('⏳ 資料同步中，請稍候...', 'loading');

      const targetUrl = window.GAS_WEB_APP_URL;
      
      try {
        await fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'saveTasks',
            tasks: tasksToSave.length > 0 ? tasksToSave : [{ courseName: courseName || '未命名課程', week: currentWeek, taskName: '' }]
          })
        });

        showToastNotice('✅ 註記與作業已成功同步！', 'success');

        setTimeout(() => {
          modalEl.classList.remove('active');
          btnSave.textContent = originalBtnText;
          btnSave.disabled = false;
          btnSave.style.opacity = '1';
        }, 3000);

      } catch (err) {
        console.error('儲存失敗:', err);
        showToastNotice('❌ 儲存失敗，請重試', 'error');
        btnSave.textContent = originalBtnText;
        btnSave.disabled = false;
        btnSave.style.opacity = '1';
      }

      let allTasks = JSON.parse(localStorage.getItem('cached_course_tasks') || '[]');
      allTasks = allTasks.filter(t => !(t.courseName === courseName && String(t.week) === String(currentWeek)));
      if (tasksToSave.length > 0) {
        allTasks.push(...tasksToSave);
      }
      localStorage.setItem('cached_course_tasks', JSON.stringify(allTasks));

      const cachedCourses = JSON.parse(localStorage.getItem('user_courses') || '[]');
      const cachedDates = JSON.parse(localStorage.getItem('user_dates') || '{}');
      if (typeof window.renderAllTimetableData === 'function') {
        window.renderAllTimetableData(cachedCourses, parseInt(currentWeek), cachedDates);
      }
    });
  }
}

// 🎯 開啟 / 關閉 課程註解 Modal 入口 (互斥 Toggle 模式)
async function openCourseModal(courseName, courseSummary, styleInfo = null, currentWeek = 1) {
  initCourseModal();

  const modalEl = document.getElementById('courseDetailModal');
  const taskModalEl = document.getElementById('emptySlotTaskModal');

  // ⚡ 核心 1：強制關閉「待辦事項」面板（保證二選一）
  if (taskModalEl) {
    taskModalEl.classList.remove('active');
  }

  // ⚡ 核心 2：判斷是否點擊「同一格」且「正開啟中」 ➔ 再點一次視為按叉叉關閉
  if (modalEl.classList.contains('active') && modalEl.dataset.currentCourse === courseName) {
    modalEl.classList.remove('active');
    return;
  }

  // 記錄當前選取的課程名稱
  modalEl.dataset.currentCourse = courseName;
  modalEl.dataset.currentWeek = currentWeek;

  document.getElementById('modalCourseTitle').textContent = courseName || '未命名課程';

  const summaryEl = document.getElementById('modalCourseSummary');
  if (courseSummary && styleInfo) {
    summaryEl.innerHTML = `
      <div class="modal-summary-tag" style="background-color: ${styleInfo.bg}; color: ${styleInfo.text}; border: 1px solid ${styleInfo.border};">
        <span>${styleInfo.icon}</span>
        <span>${courseSummary}</span>
      </div>
    `;
  } else if (courseSummary) {
    summaryEl.innerHTML = `<span style="color: #a0a0a0;">${courseSummary}</span>`;
  } else {
    summaryEl.innerHTML = `<span style="color: #6b7280;">本週無課綱紀錄</span>`;
  }

  const tbody = document.getElementById('taskTableBody');
  tbody.innerHTML = '';

  // 開啟註解面板
  modalEl.classList.add('active');

  // 背景非同步載入試算表資料
  // 背景非同步載入試算表資料
const targetUrl = window.GAS_WEB_APP_URL;
try {
  const res = await fetch(`${targetUrl}?action=getTasks&courseName=${encodeURIComponent(courseName)}&week=${currentWeek}`);
  const data = await res.json();
  if (data.status === 'success' && Array.isArray(data.tasks)) {
    data.tasks.forEach(t => {
      if (t.taskName && t.taskName.trim() !== '') {
        let timeStr = String(t.deadlineTime || '23:59');

        // 防護：若傳入 ISO 時間字串 (如 1899-12-29T19:00:00.000Z)，轉回 HH:mm
        if (timeStr.includes('T')) {
          const d = new Date(timeStr);
          if (!isNaN(d.getTime())) {
            const h = String(d.getHours()).padStart(2, '0');
            const m = String(d.getMinutes()).padStart(2, '0');
            timeStr = `${h}:${m}`;
          }
        }

        addTaskRow(t.type, t.taskName, `W${t.deadlineWeek}/${t.deadlineDay}/${timeStr}`);
      }
    });
  }
} catch (e) {
  console.warn('載入當週作業失敗:', e);
}
}

function autoSaveAndCloseModal() {
  const modal = document.getElementById('courseDetailModal');
  if (!modal || !modal.classList.contains('active')) return;

  const tbody = document.getElementById('taskTableBody');
  if (tbody) {
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
      const name = row.querySelector('.task-name')?.value.trim();
      const deadline = row.querySelector('.task-deadline-btn')?.textContent.trim();

      if (!name || deadline === '請選擇死線') {
        row.remove();
      }
    });
  }

  modal.classList.remove('active');
  document.getElementById('deadlinePickerPopover')?.classList.remove('active');
}

function showToastNotice(msg, status = 'success') {
  let toast = document.getElementById('systemToastNotice');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'systemToastNotice';
    toast.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      color: #fff; padding: 10px 20px; border-radius: 20px; font-size: 14px;
      font-weight: bold; z-index: 99999; box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      transition: all 0.3s ease; opacity: 0; pointer-events: none;
    `;
    document.body.appendChild(toast);
  }
  
  if (status === 'loading') {
    toast.style.background = 'rgba(59, 130, 246, 0.9)';
  } else if (status === 'error') {
    toast.style.background = 'rgba(239, 68, 68, 0.9)';
  } else {
    toast.style.background = 'rgba(16, 185, 129, 0.9)';
  }

  toast.textContent = msg;
  toast.style.opacity = '1';

  if (status !== 'loading') {
    setTimeout(() => {
      toast.style.opacity = '0';
    }, 2700);
  }
}

window.openCourseModal = openCourseModal;
window.autoSaveAndCloseModal = autoSaveAndCloseModal;