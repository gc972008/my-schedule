// courseManage.js - 課程管理與特殊週期設定模組 (支援 GAS 非同步同步與選取器彈窗對接)

(function () {
  // ⚡ 非同步同步週期資料給 Google 試算表 (GAS)
  async function syncCyclesToGAS(cyclesArray) {
    const targetUrl = window.GAS_WEB_APP_URL;
    if (!targetUrl) return;

    try {
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveCycleSettings',
          cycles: cyclesArray
        })
      });
      console.log('✅ 週期設定已同步至 Google 試算表');
    } catch (err) {
      console.warn('⚠️ 同步週期至 Google 試算表失敗:', err);
    }
  }

  // 1. 注入 CSS 樣式
  function injectManageStyles() {
    if (document.getElementById('courseManageStyle')) return;
    const style = document.createElement('style');
    style.id = 'courseManageStyle';
    style.textContent = `
      .manage-container { max-width: 900px; margin: 0 auto; padding: 20px; }
      
      /* 滑動式段落切換鈕 (Segmented Switch) */
      .manage-segmented-control {
        position: relative; display: flex; width: 100%; max-width: 480px; margin: 0 auto 24px auto;
        background: #0d0e12; border: 1px solid #262830; border-radius: 30px; padding: 4px; box-sizing: border-box;
      }
      .manage-slider-bg {
        position: absolute; top: 4px; left: 4px; width: calc(50% - 4px); height: calc(100% - 8px);
        background: #2b459d; border-radius: 26px; transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .manage-seg-btn {
        flex: 1; position: relative; z-index: 2; background: transparent; border: none; color: #8a8d9b;
        font-size: 14px; font-weight: bold; padding: 10px 16px; cursor: pointer; transition: color 0.2s; text-align: center;
      }
      .manage-seg-btn.active { color: #ffffff; }

      /* 面板切換 */
      .manage-panel { display: none; }
      .manage-panel.active { display: block; animation: manageFadeIn 0.2s ease-out; }

      /* 課程卡片 */
      .course-manage-card {
        background: #141519; border: 1px solid #262830; border-radius: 12px; padding: 16px 20px;
        margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; transition: border-color 0.15s;
      }
      .course-manage-card:hover { border-color: #3b82f6; }
      .course-info-meta { display: flex; gap: 8px; margin-top: 6px; font-size: 12px; color: #9ca3af; }
      .badge-tag { padding: 2px 8px; border-radius: 4px; font-weight: bold; background: #262830; color: #60a5fa; }

      .btn-manage-edit { background: #2563eb; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; }
      .btn-manage-delete { background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-left: 8px; }

      /* 🎯 依據手繪圖設計的自訂週期介面 */
      .btn-add-cycle-trigger {
        width: 100%; background: #0d0e12; border: 1px solid #262830; border-radius: 25px;
        color: #ffffff; padding: 12px; font-size: 20px; font-weight: bold; cursor: pointer;
        display: flex; justify-content: center; align-items: center; margin-bottom: 16px; transition: all 0.2s;
      }
      .btn-add-cycle-trigger:hover { border-color: #3b82f6; background: #141519; }

      .cycle-item-row {
        width: 100%; background: #0d0e12; border: 1px solid #262830; border-radius: 25px;
        padding: 12px 20px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;
        box-sizing: border-box; transition: all 0.2s;
      }
      .cycle-item-row:hover { border-color: #3b82f6; }
      .cycle-item-title { font-size: 16px; font-weight: bold; color: #ffffff; }
      .cycle-item-rule { font-size: 13px; color: #f59e0b; background: rgba(245, 158, 11, 0.1); padding: 4px 12px; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.3); }

      .btn-cycle-delete {
        background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 6px 10px;
        border-radius: 8px; font-size: 13px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center;
      }
      .btn-cycle-delete:hover { background: rgba(239, 68, 68, 0.2); }

      @keyframes manageFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  }

  // 2. 初始化 HTML 結構
  function initCourseManageDOM() {
    injectManageStyles();
    const container = document.getElementById('tab-manage');
    if (!container) return;

    container.innerHTML = `
      <div class="manage-container">
        <!-- 頂部滑動段落切換鈕 -->
        <div class="manage-segmented-control">
          <div class="manage-slider-bg" id="manageSliderBg"></div>
          <button class="manage-seg-btn active" id="btnSegCourses">📚 課程清單與編輯</button>
          <button class="manage-seg-btn" id="btnSegCycles">🔄 特殊週期設定</button>
        </div>

        <!-- 面板一：課程清單與編輯 -->
        <div class="manage-panel active" id="panelCourses">
          <div id="courseCardListContainer"></div>
        </div>

        <!-- 面板二：特殊週期設定（手繪風格） -->
        <div class="manage-panel" id="panelCycles">
          <button class="btn-add-cycle-trigger" id="btnToggleCycleForm">+</button>
          <div id="cycleListContainer"></div>
        </div>
      </div>
    `;

    bindManageEvents();
    renderCourseList();
    renderCycleList();
  }

  // 3. 渲染已匯入課程列表
  function renderCourseList() {
    const container = document.getElementById('courseCardListContainer');
    if (!container) return;

    const courses = JSON.parse(localStorage.getItem('user_courses') || '[]');
    container.innerHTML = '';

    if (courses.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: #6b7280; padding: 40px;">尚無匯入的課程資料</div>`;
      return;
    }

    courses.forEach((c, idx) => {
      const card = document.createElement('div');
      card.className = 'course-manage-card';
      
      card.innerHTML = `
        <div>
          <div style="font-size: 16px; font-weight: bold; color: #ffffff;">${c.courseName || '未命名課程'}</div>
          <div class="course-info-meta">
            <span class="badge-tag">${c.type || '選修'}</span>
            <span>學分: ${c.credits || '0'}</span>
            <span>教師: ${c.teacher || '未填寫'}</span>
            <span>${c.dayOfWeek || '週一'} (第 ${c.startClass || c.startPeriod || '1'} 節)</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn-manage-edit" data-index="${idx}">✏️ 編輯</button>
          <button class="btn-manage-delete" data-index="${idx}">🗑️ 刪除</button>
        </div>
      `;

      const btnEdit = card.querySelector('.btn-manage-edit');
      if (btnEdit) {
        btnEdit.onclick = () => {
          if (typeof window.openCourseEditModal === 'function') {
            window.openCourseEditModal(idx);
          } else {
            console.error('❌ 找不到 window.openCourseEditModal，請確認 courseEditModal.js 是否已載入！');
          }
        };
      }

      const btnDelete = card.querySelector('.btn-manage-delete');
      if (btnDelete) {
        btnDelete.onclick = () => {
          if (confirm(`確定要刪除「${c.courseName}」嗎？`)) {
            courses.splice(idx, 1);
            localStorage.setItem('user_courses', JSON.stringify(courses));
            renderCourseList();

            if (typeof window.renderAllTimetableData === 'function') {
              const cachedDates = JSON.parse(localStorage.getItem('user_dates') || '{}');
              window.renderAllTimetableData(courses, 1, cachedDates);
            }
          }
        };
      }

      container.appendChild(card);
    });
  }

  window.renderCourseList = renderCourseList;

  // 4. 渲染特殊週期列表 (可刪除與同步 GAS)
  function renderCycleList() {
    const container = document.getElementById('cycleListContainer');
    if (!container) return;

    let cycles = JSON.parse(localStorage.getItem('app_custom_cycles') || '[]');
    container.innerHTML = '';

    if (cycles.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: #6b7280; padding: 20px;">尚無設定的特殊週期</div>`;
      return;
    }

    cycles.forEach((cy, idx) => {
      const card = document.createElement('div');
      card.className = 'cycle-item-row';
      card.innerHTML = `
        <div class="cycle-item-title">${cy.name}</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="cycle-item-rule">${cy.rule}</div>
          <button class="btn-cycle-delete" title="刪除此週期">🗑️</button>
        </div>
      `;

      // ⚡ 點擊垃圾桶：刪除 LocalStorage 快取並背景同步至 GAS 試算表
      const btnDelete = card.querySelector('.btn-cycle-delete');
      btnDelete.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`確定要刪除「${cy.name}」週期嗎？`)) {
          cycles.splice(idx, 1);
          localStorage.setItem('app_custom_cycles', JSON.stringify(cycles));
          renderCycleList();
          syncCyclesToGAS(cycles); // ⚡ 同步刪除至 Google 試算表
        }
      };

      container.appendChild(card);
    });
  }

  // 5. 事件監聽與滑動按鈕切換
  function bindManageEvents() {
    const btnSegCourses = document.getElementById('btnSegCourses');
    const btnSegCycles = document.getElementById('btnSegCycles');
    const sliderBg = document.getElementById('manageSliderBg');

    const panelCourses = document.getElementById('panelCourses');
    const panelCycles = document.getElementById('panelCycles');

    if (btnSegCourses && btnSegCycles && sliderBg) {
      btnSegCourses.onclick = () => {
        btnSegCourses.classList.add('active');
        btnSegCycles.classList.remove('active');
        sliderBg.style.transform = 'translateX(0%)';

        panelCourses.classList.add('active');
        panelCycles.classList.remove('active');
      };

      btnSegCycles.onclick = () => {
        btnSegCycles.classList.add('active');
        btnSegCourses.classList.remove('active');
        sliderBg.style.transform = 'translateX(100%)';

        panelCycles.classList.add('active');
        panelCourses.classList.remove('active');
      };
    }

    // ⚡ 點擊 [+] 按鈕開啟選取器彈窗
    const btnToggle = document.getElementById('btnToggleCycleForm');

    if (btnToggle) {
      btnToggle.onclick = () => {
        if (typeof window.openDayCountPicker === 'function') {
          window.openDayCountPicker({
            defaultName: '讀書週期',
            onConfirm: (res) => {
              console.log('✅ 選擇結果：', res);

              const cycles = JSON.parse(localStorage.getItem('app_custom_cycles') || '[]');
              
              const newCycle = {
                id: 'cycle_' + Date.now(),
                name: res.name,
                rule: res.ruleText
              };

              cycles.push(newCycle);
              localStorage.setItem('app_custom_cycles', JSON.stringify(cycles));

              renderCycleList();
              syncCyclesToGAS(cycles); // ⚡ 同步新增至 Google 試算表
            }
          });
        } else {
          console.error('❌ 找不到 window.openDayCountPicker，請確認 dayCountPicker.js 是否已載入！');
        }
      };
    }
  }

  // 頁面 DOMContentLoaded 或切換到 tab-manage 時初始化
  document.addEventListener('DOMContentLoaded', () => {
    initCourseManageDOM();

    const navManageTab = document.querySelector('[data-tab="tab-manage"]');
    if (navManageTab) {
      navManageTab.addEventListener('click', () => {
        renderCourseList();
        renderCycleList();
      });
    }
  });

})();