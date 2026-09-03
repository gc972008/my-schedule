// taskModal.js - 修復上傳 Google 試算表、持續時間選取器與動態標題/晶片連動版

(function () {
  let activeTargetRow = null;

  // ⚡ 核心：統一處理儲存、排除已刪除項目、同步 GAS/LocalStorage 與重新渲染課表晶片
  async function saveAndSyncTaskModal() {
    const modal = document.getElementById('emptySlotTaskModal');
    if (!modal || !modal.classList.contains('active')) return;

    const slotCourseName = modal.dataset.slotCourseName || '行程項目';
    const currentWeek = modal.dataset.currentWeek || '1';
    const tbody = document.getElementById('emptySlotTaskTbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    const tasksToSave = [];

    rows.forEach(row => {
      const isPendingDelete = row.dataset.pendingDelete === 'true'; // 檢查是否按了「復原/刪除」
      const type = row.querySelector('.task-type-btn')?.dataset.typeName || 'Homework';
      const name = row.querySelector('.task-select-name-btn')?.textContent.trim();
      
      // ⚡ 強制抓取按鈕上的最新文字（包含動態選取的 9/10 - 9/11）
      const durationBtn = row.querySelector('.task-duration-btn');
      const duration = durationBtn ? durationBtn.textContent.trim() : '';
      const isDone = row.querySelector('.task-checkbox')?.checked;

      // 只有「未標記刪除」且「名稱有效」的項目才會保留
      if (!isPendingDelete && name && name !== '請選擇項目名稱') {
        tasksToSave.push({
          courseName: slotCourseName,
          week: String(currentWeek),
          type: type,
          taskName: isDone ? `[已完成] ${name}` : name,
          deadlineWeek: String(currentWeek),
          deadlineDay: duration, // 帶入最新的持續時間字串
          deadlineTime: '23:59'
        });
      }
    });

    // 1. 先關閉 Modal 面板
    modal.classList.remove('active');

    // 2. 更新 LocalStorage 本地快取
    let allTasks = JSON.parse(localStorage.getItem('cached_course_tasks') || '[]');
    allTasks = allTasks.filter(t => !(t.courseName === slotCourseName && String(t.week) === String(currentWeek)));
    if (tasksToSave.length > 0) {
      allTasks.push(...tasksToSave);
    }
    localStorage.setItem('cached_course_tasks', JSON.stringify(allTasks));

    // 3. ⚡ 立刻呼叫渲染器重新繪製課表上的晶片
    if (typeof window.renderCustomSlotChips === 'function') {
      window.renderCustomSlotChips(currentWeek);
    } else {
      const cachedCourses = JSON.parse(localStorage.getItem('user_courses') || '[]');
      const cachedDates = JSON.parse(localStorage.getItem('user_dates') || '{}');
      if (typeof window.renderAllTimetableData === 'function') {
        window.renderAllTimetableData(cachedCourses, parseInt(currentWeek, 10), cachedDates);
      }
    }

    // 4. 背景非同步上傳給 Google 試算表 (GAS)
    // 4. ⚡ 背景非同步上傳給 Google 試算表 (完全不卡住 UI 彈窗關閉)
const targetUrl = window.GAS_WEB_APP_URL;
if (targetUrl) {
  fetch(targetUrl, { // 🚀 移除 await，直接背景發送
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'saveTasks',
      tasks: tasksToSave.length > 0 ? tasksToSave : [{ courseName: slotCourseName, week: String(currentWeek), taskName: '' }]
    })
  }).catch(err => console.error('❌ 背景上傳 Google 試算表失敗:', err));
}
  }

  function injectTaskModalStyles() {
    if (document.getElementById('taskModalStyle')) return;
    const style = document.createElement('style');
    style.id = 'taskModalStyle';
    style.textContent = `
      #emptySlotTaskModal {
        position: fixed !important; bottom: 0 !important; left: 0 !important; width: 100% !important;
        max-height: 50vh !important; background-color: #141519 !important; border-top: 2px solid #3b82f6 !important;
        box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.9) !important; display: none; z-index: 999999 !important;
        overflow-y: auto !important; box-sizing: border-box !important;
      }
      #emptySlotTaskModal.active { display: block !important; animation: slideUp 0.25s ease-out !important; }

      .task-popover-menu {
        position: fixed !important; top: 50% !important; left: 50% !important; 
        transform: translate(-50%, -50%) !important; width: 320px !important; 
        background: #181a20 !important; border: 1px solid #3b82f6 !important; 
        border-radius: 12px !important; padding: 14px !important;
        box-shadow: 0 12px 36px rgba(0,0,0,0.85) !important; display: none; 
        z-index: 1000000 !important; color: #fff !important; box-sizing: border-box !important;
      }
      .task-popover-menu.active { display: block !important; animation: fadeIn 0.15s ease-out !important; }

      .popover-item-option {
        padding: 8px 12px; background: #0d0e12; border: 1px solid #262830; border-radius: 6px;
        margin-bottom: 6px; cursor: pointer; font-size: 13px; color: #e0e0e0; transition: all 0.15s;
        display: flex; justify-content: space-between; align-items: center;
      }
      .popover-item-option:hover { border-color: #3b82f6; background: rgba(59, 130, 246, 0.15); color: #fff; }

      @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);
  }

  function initTaskModal() {
    injectTaskModalStyles();
    if (document.getElementById('emptySlotTaskModal')) return;

    const modalHtml = `
      <div id="emptySlotTaskModal">
        <div style="max-width: 900px; margin: 0 auto; padding: 14px 24px 20px 24px; color: #e0e0e0; position: relative;">
          <button id="btnTaskModalClose" style="position: absolute; top: 12px; right: 16px; background: transparent; border: none; color: #8a8d9b; font-size: 24px; cursor: pointer;">&times;</button>
          
          <h2 id="taskModalTitle" style="font-size: 18px; color: #ffffff; margin-bottom: 6px; border-bottom: 2px solid #3b82f6; padding-bottom: 2px; display: inline-block;">行程</h2>
          <div id="modalTaskSummary" style="font-size: 14px; font-weight: bold; color: #38bdf8; margin-top: 6px;">待辦事項 0 件</div>
          <hr style="border: 0; height: 1px; background: #262830; margin: 8px 0;" />

          <div class="task-table-wrapper">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
              <thead>
                <tr>
                  <th style="width: 10%; background: #1a1b20; color: #8a8d9b; font-size: 12px; padding: 6px; border: 1px solid #262830; text-align: center;">取消</th>
                  <th style="width: 25%; background: #1a1b20; color: #8a8d9b; font-size: 12px; padding: 6px; border: 1px solid #262830; text-align: left;">類型</th>
                  <th style="width: 35%; background: #1a1b20; color: #8a8d9b; font-size: 12px; padding: 6px; border: 1px solid #262830; text-align: left;">項目名稱</th>
                  <th style="width: 20%; background: #1a1b20; color: #8a8d9b; font-size: 12px; padding: 6px; border: 1px solid #262830; text-align: left;">持續時間</th>
                  <th style="width: 10%; background: #1a1b20; color: #8a8d9b; font-size: 12px; padding: 6px; border: 1px solid #262830; text-align: center;">完成</th>
                </tr>
              </thead>
              <tbody id="emptySlotTaskTbody"></tbody>
            </table>

            <button id="btnAddNewTaskRow" style="background: transparent; border: 1px dashed #4b5563; color: #9ca3af; width: 100%; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 13px;">+ 增加項目</button>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px;">
            <button id="btnCancelTaskModal" style="background: transparent; border: 1px solid #4b5563; color: #9ca3af; padding: 6px 18px; border-radius: 6px; cursor: pointer; font-size: 13px;">取消</button>
            <button id="btnSaveTaskModal" style="background: #2b459d; color: #fff; border: none; padding: 6px 18px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;">儲存</button>
          </div>
        </div>
      </div>

      <div id="uncompletedItemsPopover" class="task-popover-menu">
        <div style="font-size: 14px; font-weight: bold; color: #93c5fd; margin-bottom: 10px; border-bottom: 1px solid #262830; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
          <span>選擇未完成項目</span>
          <span class="btn-close-popover" style="cursor: pointer; color: #8a8d9b;">&times;</span>
        </div>
        <div id="uncompletedItemsList" style="max-height: 180px; overflow-y: auto;"></div>
        
        <div style="margin-top: 10px; border-top: 1px dashed #374151; padding-top: 10px;">
          <input type="text" id="customItemInput" placeholder="+ 自訂新項目名稱" style="width: 100%; background: #0d0e12; border: 1px solid #374151; color: #fff; padding: 6px; border-radius: 4px; font-size: 12px; box-sizing: border-box; margin-bottom: 6px;" />
          <button id="btnConfirmCustomItem" style="width: 100%; background: #2563eb; color: #fff; border: none; padding: 6px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">使用新名稱</button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    bindTaskModalEvents();
  }

  function updateEmptyTaskCount() {
    const tbody = document.getElementById('emptySlotTaskTbody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    let remaining = 0;

    rows.forEach(row => {
      const isDone = row.dataset.completed === 'true';
      const isPendingDelete = row.dataset.pendingDelete === 'true';
      const nameText = row.querySelector('.task-select-name-btn')?.textContent.trim();
      if (!isDone && !isPendingDelete && nameText && nameText !== '請選擇項目名稱') {
        remaining++;
      }
    });

    const summaryEl = document.getElementById('modalTaskSummary');
    if (summaryEl) summaryEl.textContent = `待辦事項 ${remaining} 件`;
  }

  function addTaskRowToEmptyModal(type = 'Homework', name = '請選擇項目名稱', duration = '星期一 第 5 節', isCompleted = false) {
    const tbody = document.getElementById('emptySlotTaskTbody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.dataset.completed = isCompleted ? 'true' : 'false';
    tr.dataset.pendingDelete = 'false';

    tr.innerHTML = `
      <td style="padding: 6px; border: 1px solid #262830; text-align: center;">
        <button class="btn-mark-delete" title="不在這個時段做這件事" style="background: transparent; border: 1px solid #374151; color: #ef4444; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; transition: all 0.15s;">
          🗑️
        </button>
      </td>
      <td style="padding: 6px; border: 1px solid #262830;">
        <button class="task-type-btn" data-type-name="${type}" style="width: 100%; background: #0d0e12; border: 1px solid #3b82f6; color: #60a5fa; padding: 6px; border-radius: 4px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <span class="color-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; display: inline-block;"></span>
          <span class="type-label">${type}</span>
        </button>
      </td>
      <td style="padding: 6px; border: 1px solid #262830;">
        <button class="task-select-name-btn" style="width: 100%; background: #0d0e12; border: 1px solid #262830; color: ${name === '請選擇項目名稱' ? '#8a8d9b' : '#fff'}; padding: 6px; border-radius: 4px; font-size: 13px; cursor: pointer; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${isCompleted ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
          ${name}
        </button>
      </td>
      <td style="padding: 6px; border: 1px solid #262830;">
        <button class="task-duration-btn" style="width: 100%; background: #0d0e12; border: 1px solid #3b82f6; color: #60a5fa; padding: 6px; border-radius: 4px; font-size: 13px; cursor: pointer;">
          ${duration}
        </button>
      </td>
      <td style="padding: 6px; border: 1px solid #262830; text-align: center;">
        <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;" />
      </td>
    `;

    // 1. 刪除/復原 按鈕邏輯
    const btnDelete = tr.querySelector('.btn-mark-delete');
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      const isPending = tr.dataset.pendingDelete === 'true';

      if (!isPending) {
        tr.dataset.pendingDelete = 'true';
        tr.style.opacity = '0.35';
        tr.style.filter = 'grayscale(100%)';
        btnDelete.innerHTML = '↩️ 復原';
        btnDelete.style.color = '#10b981';
        btnDelete.style.borderColor = '#10b981';
      } else {
        tr.dataset.pendingDelete = 'false';
        tr.style.opacity = '1';
        tr.style.filter = 'none';
        btnDelete.innerHTML = '🗑️';
        btnDelete.style.color = '#ef4444';
        btnDelete.style.borderColor = '#374151';
      }
      updateEmptyTaskCount();
    });

    // 2. 類型按鈕
    const btnType = tr.querySelector('.task-type-btn');
    btnType.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof window.openTypePicker === 'function') {
        window.openTypePicker({
          targetBtn: btnType,
          currentType: btnType.dataset.typeName || 'Homework',
          onSelect: (selectedType, selectedColor) => {
            btnType.dataset.typeName = selectedType;
            btnType.querySelector('.type-label').textContent = selectedType;
            btnType.querySelector('.color-dot').style.background = selectedColor;
          }
        });
      }
    });

    // 3. 項目名稱按鈕
    const btnName = tr.querySelector('.task-select-name-btn');
    btnName.addEventListener('click', (e) => {
      e.stopPropagation();
      activeTargetRow = tr;
      const currentType = btnType.dataset.typeName || 'Homework';
      openUncompletedItemsPopover(btnName, currentType);
    });

    // ⚡ 4. 持續時間按鈕 (對接 durationPicker.js + 動態標題連動修復)
    const btnDuration = tr.querySelector('.task-duration-btn');
    btnDuration.addEventListener('click', (e) => {
      e.stopPropagation();
      const modal = document.getElementById('emptySlotTaskModal');
      const slotCourseName = modal?.dataset.slotCourseName || '';
      const currentWeek = modal?.dataset.currentWeek || '1';

      if (typeof window.openDurationPicker === 'function') {
        window.openDurationPicker({
          slotCourseName: slotCourseName,
          currentWeek: currentWeek,
          defaultDuration: btnDuration.textContent.trim(),
          onSelect: (selectedDurationStr) => {
            if (!selectedDurationStr) return;

            // ① 更新按鈕文字與高亮顏色
            btnDuration.textContent = selectedDurationStr;
            btnDuration.style.color = '#ffffff';

            // ⚡ ② 即時連動更新面板左上角標題
            const titleEl = document.getElementById('taskModalTitle');
            if (titleEl) {
              titleEl.textContent = `${selectedDurationStr} (自訂行程)`;
            }

            updateEmptyTaskCount();
          }
        });
      }
    });

    // 5. 完成核取方塊
    const checkbox = tr.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        tr.dataset.completed = 'true';
        btnName.style.textDecoration = 'line-through';
        btnName.style.opacity = '0.5';
        tbody.appendChild(tr);
      } else {
        tr.dataset.completed = 'false';
        btnName.style.textDecoration = 'none';
        btnName.style.opacity = '1';
        tbody.insertBefore(tr, tbody.firstChild);
      }
      updateEmptyTaskCount();
    });

    if (isCompleted) tbody.appendChild(tr);
    else tbody.insertBefore(tr, tbody.firstChild);

    updateEmptyTaskCount();
  }

  function openUncompletedItemsPopover(targetBtn, selectedType) {
    const popover = document.getElementById('uncompletedItemsPopover');
    const listContainer = document.getElementById('uncompletedItemsList');
    if (!popover || !listContainer) return;

    listContainer.innerHTML = '';

    const allCachedTasks = JSON.parse(localStorage.getItem('cached_course_tasks') || '[]');
    
    // 排除自訂行程 (SLOT_) 產生的重複項目
    const rawUncompleted = allCachedTasks.filter(t => 
      t.type === selectedType && 
      t.taskName && 
      !t.taskName.startsWith('[已完成]') &&
      !t.courseName.startsWith('SLOT_')
    );

    // 項目名稱去重
    const uniqueMap = new Map();
    rawUncompleted.forEach(item => {
      const cleanName = item.taskName.trim();
      if (!uniqueMap.has(cleanName)) {
        uniqueMap.set(cleanName, item);
      }
    });

    const uncompleted = Array.from(uniqueMap.values());

    if (uncompleted.length === 0) {
      listContainer.innerHTML = `<div style="font-size: 12px; color: #6b7280; padding: 12px; text-align: center;">尚無 ${selectedType} 類型的未完成項目</div>`;
    } else {
      uncompleted.forEach(item => {
        const opt = document.createElement('div');
        opt.className = 'popover-item-option';
        opt.innerHTML = `
          <span>${item.taskName}</span>
          <span style="font-size: 10px; color: #9ca3af;">${item.courseName}</span>
        `;
        opt.onclick = () => {
          targetBtn.textContent = item.taskName;
          targetBtn.style.color = '#ffffff';
          popover.classList.remove('active');
          updateEmptyTaskCount();
        };
        listContainer.appendChild(opt);
      });
    }

    popover.classList.add('active');
  }

  function bindTaskModalEvents() {
    const modal = document.getElementById('emptySlotTaskModal');
    const btnClose = document.getElementById('btnTaskModalClose');
    const btnCancel = document.getElementById('btnCancelTaskModal');
    const btnAdd = document.getElementById('btnAddNewTaskRow');
    const btnSave = document.getElementById('btnSaveTaskModal');

    const itemPopover = document.getElementById('uncompletedItemsPopover');
    const btnConfirmCustom = document.getElementById('btnConfirmCustomItem');
    const customInput = document.getElementById('customItemInput');

    // 點擊「選擇未完成項目」浮窗外部自動收起
    document.addEventListener('click', (e) => {
      if (!itemPopover) return;
      if (itemPopover.classList.contains('active')) {
        const isClickInsidePopover = itemPopover.contains(e.target);
        const isClickOnSelectBtn = e.target.classList.contains('task-select-name-btn');
        if (!isClickInsidePopover && !isClickOnSelectBtn) {
          itemPopover.classList.remove('active');
        }
      }
    });

    // 關閉/取消/儲存按鈕綁定 saveAndSyncTaskModal
    if (btnClose) btnClose.onclick = () => saveAndSyncTaskModal();
    if (btnCancel) btnCancel.onclick = () => saveAndSyncTaskModal();
    if (btnSave) btnSave.onclick = () => saveAndSyncTaskModal();

    document.querySelectorAll('.btn-close-popover').forEach(btn => {
      btn.onclick = () => itemPopover.classList.remove('active');
    });

    if (btnAdd) {
      btnAdd.onclick = () => {
        const modalTitle = document.getElementById('taskModalTitle')?.textContent || '星期一 第 5 節';
        const defaultDuration = modalTitle.split(' (')[0] || '星期一 第 5 節';
        addTaskRowToEmptyModal('Homework', '請選擇項目名稱', defaultDuration, false);
      };
    }

    if (btnConfirmCustom && customInput) {
      btnConfirmCustom.onclick = () => {
        const val = customInput.value.trim();
        if (val && activeTargetRow) {
          const nameBtn = activeTargetRow.querySelector('.task-select-name-btn');
          if (nameBtn) {
            nameBtn.textContent = val;
            nameBtn.style.color = '#ffffff';
          }
          customInput.value = '';
          itemPopover.classList.remove('active');
          updateEmptyTaskCount();
        }
      };
    }
  }

  // 🎯 開啟 / 關閉 待辦事項 Modal 入口
  window.openTaskModal = function(slotCourseName, displayTitle, currentWeek = 1) {
    initTaskModal();
    const modal = document.getElementById('emptySlotTaskModal');
    const courseModalEl = document.getElementById('courseDetailModal');
    if (!modal) return;

    // 若已有開啟中的待辦 Modal，點擊其他格子時先自動儲存上一格
    if (modal.classList.contains('active') && modal.dataset.slotCourseName !== slotCourseName) {
      saveAndSyncTaskModal();
    }

    // 強制關閉「課程註解」面板
    if (courseModalEl) {
      courseModalEl.classList.remove('active');
    }

    // 判斷是否點擊「同一格」且「正開啟中」 ➔ 再點一次視為關閉並儲存
    if (modal.classList.contains('active') && modal.dataset.slotCourseName === slotCourseName) {
      saveAndSyncTaskModal();
      return;
    }

    modal.dataset.slotCourseName = slotCourseName;
    modal.dataset.currentWeek = currentWeek;

    const titleEl = document.getElementById('taskModalTitle');
    if (titleEl) titleEl.textContent = displayTitle;

    const tbody = document.getElementById('emptySlotTaskTbody');
    if (tbody) tbody.innerHTML = '';

    const defaultDuration = displayTitle.split(' (')[0] || '星期一 第 5 節';

    // 從 LocalStorage 載入歷史紀錄
    const allCachedTasks = JSON.parse(localStorage.getItem('cached_course_tasks') || '[]');
    const savedSlotTasks = allCachedTasks.filter(t => 
      t.courseName === slotCourseName && String(t.week) === String(currentWeek)
    );

    if (savedSlotTasks.length > 0) {
      savedSlotTasks.forEach(t => {
        const isDone = t.taskName && t.taskName.startsWith('[已完成]');
        const cleanName = isDone ? t.taskName.replace('[已完成] ', '') : t.taskName;
        
        addTaskRowToEmptyModal(
          t.type || 'Homework', 
          cleanName || '請選擇項目名稱', 
          t.deadlineDay || defaultDuration, 
          isDone
        );
      });

      // ⚡ 如果有帶入歷史持續時間，將左上角標題設定為歷史持續時間
      if (savedSlotTasks[0].deadlineDay && titleEl) {
        titleEl.textContent = `${savedSlotTasks[0].deadlineDay} (自訂行程)`;
      }
    } else {
      addTaskRowToEmptyModal('Homework', '請選擇項目名稱', defaultDuration, false);
    }

    updateEmptyTaskCount();
    modal.classList.add('active');

    // 自動平滑捲動被點擊的格子到面板邊界上方
    setTimeout(() => {
      const parts = slotCourseName.split('_');
      if (parts.length >= 3) {
        const dayCode = parts[1];
        const period = parts[2];
        const targetCell = document.querySelector(`td[data-day="${dayCode}"][data-period="${period}"]`);

        if (targetCell) {
          const cellRect = targetCell.getBoundingClientRect();
          const modalHeight = modal.offsetHeight || window.innerHeight * 0.4;
          const targetY = window.scrollY + cellRect.bottom - (window.innerHeight - modalHeight) + 12;

          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth'
          });
        }
      }
    }, 50);
  };

  // 暴露給全域
  window.autoSaveTaskModal = saveAndSyncTaskModal;

})();