// typePopover.js - 獨立全域類型選擇器元件 (已修復三點選單 Z-Index 層級與溢出裁切問題)

(function () {
  let activeCallback = null;
  let activeCurrentType = null;
  let customColorTemp = '#f59e0b';

  const DEFAULT_TYPES = [
    { id: 'type_1', name: 'Homework', color: '#f59e0b', icon: '📜', order: 1 },
    { id: 'type_2', name: 'Paper', color: '#3b82f6', icon: '📓', order: 2 },
    { id: 'type_3', name: 'Quiz', color: '#ef4444', icon: '✏️', order: 3 }
  ];

  function getLocalTypes() {
    const saved = localStorage.getItem('app_custom_types');
    if (!saved) return DEFAULT_TYPES;
    try {
      const parsed = JSON.parse(saved);
      return parsed.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (e) {
      return DEFAULT_TYPES;
    }
  }

  function saveLocalTypes(typesArray) {
    localStorage.setItem('app_custom_types', JSON.stringify(typesArray));
    syncTypesToGAS(typesArray);
  }

  async function syncTypesToGAS(typesArray) {
    const targetUrl = window.GAS_WEB_APP_URL;
    if (!targetUrl) return;

    try {
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveTypeSettings',
          types: typesArray
        })
      });
    } catch (err) {
      console.warn('⚠️ 同步類型至 Google 試算表失敗:', err);
    }
  }

  function injectStyles() {
    if (document.getElementById('globalTypePopoverStyle')) return;
    const style = document.createElement('style');
    style.id = 'globalTypePopoverStyle';
    style.textContent = `
      .type-popover-blur-overlay {
        position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important;
        background: rgba(0, 0, 0, 0.6) !important; backdrop-filter: blur(4px) !important;
        display: none; justify-content: center !important; align-items: center !important;
        z-index: 1000000 !important;
      }
      .type-popover-blur-overlay.active { display: flex !important; animation: typePopoverFadeIn 0.15s ease-out !important; }

      .type-popover-card {
        width: 380px !important; background: #121316 !important; border: 1px solid #262830 !important;
        border-radius: 16px !important; padding: 20px !important; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85) !important;
        color: #fff !important; box-sizing: border-box !important; position: relative !important;
      }

      .type-popover-title {
        text-align: center !important; font-size: 16px !important; font-weight: bold !important; color: #ffffff !important; margin-bottom: 16px !important;
      }

      .type-options-scroll-container {
        display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto; padding-right: 4px;
        position: relative;
      }

      .type-card-item {
        background: #0d0e12; border: 1px solid #20222a; border-radius: 10px;
        padding: 10px 14px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;
        transition: all 0.15s ease; user-select: none;
      }
      .type-card-item:hover { border-color: #3b82f6; background: #161820; }
      .type-card-item.selected { border-color: #3b82f6; background: rgba(59, 130, 246, 0.15); }
      .type-card-item.dragging { opacity: 0.4; }
      .type-card-item.drag-over { border: 2px dashed #3b82f6 !important; }

      .type-badge-content { display: flex; align-items: center; gap: 10px; font-weight: bold; font-size: 14px; }
      .type-dot-indicator { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

      .btn-type-dots { background: transparent; border: none; color: #6b7280; font-size: 16px; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
      .btn-type-dots:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }

      /* ⚡ 關鍵修復：獨立置於頂層的浮動小選單 (不受 overflow 切割) */
      .type-global-dropdown-menu {
        position: fixed !important; background: #1e2028 !important; border: 1px solid #374151 !important;
        border-radius: 8px !important; box-shadow: 0 8px 20px rgba(0,0,0,0.8) !important;
        z-index: 2000000 !important; width: 90px !important; overflow: hidden !important; display: none;
      }
      .type-global-dropdown-menu.active { display: block !important; }

      .type-dropdown-item { padding: 8px 12px; font-size: 13px; cursor: pointer; transition: background 0.15s; color: #e0e0e0; }
      .type-dropdown-item:hover { background: #2b2e3a; color: #fff; }

      .btn-toggle-add-custom {
        width: 100%; background: transparent; border: 1px dashed #374151; color: #9ca3af;
        padding: 10px; border-radius: 10px; cursor: pointer; font-size: 13px; text-align: center; margin-top: 10px; margin-bottom: 12px;
      }
      .btn-toggle-add-custom:hover { border-color: #6b7280; color: #e5e7eb; }

      .custom-type-form-panel {
        display: none; flex-direction: column; gap: 10px; border-top: 1px solid #262830; padding-top: 12px; margin-bottom: 14px;
      }
      .custom-type-form-panel.active { display: flex !important; }

      .color-dot-picker {
        width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: transform 0.15s ease;
      }
      .color-dot-picker:hover { transform: scale(1.15); }
      .color-dot-picker.selected { border-color: #ffffff; transform: scale(1.15); }

      .type-popover-footer { display: flex; justify-content: flex-end; gap: 10px; }
      .btn-popover-cancel { background: #1f2937; border: 1px solid #374151; color: #d1d5db; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
      .btn-popover-confirm { background: #4f46e5; border: none; color: #fff; padding: 6px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; }

      @keyframes typePopoverFadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);
  }

  function initDOM() {
    injectStyles();
    if (document.getElementById('globalTypePopoverOverlay')) return;

    const html = `
      <div id="globalTypePopoverOverlay" class="type-popover-blur-overlay">
        <div class="type-popover-card" id="globalTypePopoverCard">
          <div class="type-popover-title">選擇項目類型</div>
          
          <div class="type-options-scroll-container" id="globalTypeOptionsContainer"></div>

          <button id="btnToggleCustomForm" class="btn-toggle-add-custom">+ 新增自訂類型</button>

          <div id="globalCustomTypeForm" class="custom-type-form-panel">
            <div style="font-size: 13px; font-weight: bold; color: #e5e7eb;">新增自訂類型</div>
            <input type="text" id="inputCustomTypeName" placeholder="輸入類型名稱 (如: Exam)" style="width: 100%; background: #0d0e12; border: 1px solid #374151; color: #fff; padding: 8px 10px; border-radius: 6px; font-size: 13px; box-sizing: border-box;" />
            
            <div style="font-size: 12px; color: #9ca3af;">選擇顏色標籤：</div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <div class="color-dot-picker selected" data-color="#f59e0b" style="background: #f59e0b;"></div>
              <div class="color-dot-picker" data-color="#3b82f6" style="background: #3b82f6;"></div>
              <div class="color-dot-picker" data-color="#10b981" style="background: #10b981;"></div>
              <div class="color-dot-picker" data-color="#ef4444" style="background: #ef4444;"></div>
              <div class="color-dot-picker" data-color="#8b5cf6" style="background: #8b5cf6;"></div>
              <div class="color-dot-picker" data-color="#ec4899" style="background: #ec4899;"></div>
            </div>
          </div>

          <div class="type-popover-footer">
            <button id="btnCancelGlobalType" class="btn-popover-cancel">取消</button>
            <button id="btnConfirmGlobalType" class="btn-popover-confirm">確定</button>
          </div>
        </div>
      </div>

      <!-- ⚡ 掛載在 body 最頂層的共享獨立選單 -->
      <div id="typeGlobalDropdownMenu" class="type-global-dropdown-menu">
        <div class="type-dropdown-item" id="btnDropdownEdit">✏️ 修改</div>
        <div class="type-dropdown-item" id="btnDropdownDelete" style="color: #ef4444;">🗑️ 刪除</div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    bindEvents();
  }

  let activeItemIndex = null;

  function renderOptions() {
    const container = document.getElementById('globalTypeOptionsContainer');
    if (!container) return;

    const types = getLocalTypes();
    container.innerHTML = '';

    types.forEach((t, index) => {
      const card = document.createElement('div');
      card.className = `type-card-item ${t.name === activeCurrentType ? 'selected' : ''}`;
      card.dataset.index = index;
      card.dataset.typeName = t.name;
      card.dataset.color = t.color;
      card.setAttribute('draggable', 'true');

      card.innerHTML = `
        <div class="type-badge-content">
          <span class="type-dot-indicator" style="background: ${t.color};"></span>
          <span>${t.icon || '📌'} ${t.name}</span>
        </div>
        <button class="btn-type-dots" title="更多選項">⋮</button>
      `;

      // 點擊卡片選取
      card.onclick = (e) => {
        if (e.target.classList.contains('btn-type-dots')) return;
        
        hideDropdown();
        if (typeof activeCallback === 'function') {
          activeCallback(t.name, t.color);
        }
        closePicker();
      };

      // ⚡ 點擊三點按鈕：計算螢幕絕對座標，讓選單「浮在最頂層」
      const btnDots = card.querySelector('.btn-type-dots');
      btnDots.onclick = (e) => {
        e.stopPropagation();
        activeItemIndex = index;

        const dropdown = document.getElementById('typeGlobalDropdownMenu');
        if (!dropdown) return;

        if (dropdown.classList.contains('active') && dropdown.dataset.forIndex == index) {
          hideDropdown();
          return;
        }

        const rect = btnDots.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${rect.left - 60}px`;
        dropdown.dataset.forIndex = index;
        dropdown.classList.add('active');
      };

      // 拖曳排序
      card.ondragstart = (e) => {
        hideDropdown();
        e.dataTransfer.setData('text/plain', index);
        card.classList.add('dragging');
      };

      card.ondragover = (e) => {
        e.preventDefault();
        card.classList.add('drag-over');
      };

      card.ondragleave = () => card.classList.remove('drag-over');

      card.ondrop = (e) => {
        e.preventDefault();
        card.classList.remove('drag-over');
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const toIndex = index;

        if (fromIndex !== toIndex) {
          const moved = types.splice(fromIndex, 1)[0];
          types.splice(toIndex, 0, moved);
          
          types.forEach((item, idx) => item.order = idx + 1);
          saveLocalTypes(types);
          renderOptions();
        }
      };

      card.ondragend = () => card.classList.remove('dragging');

      container.appendChild(card);
    });
  }

  function hideDropdown() {
    const dropdown = document.getElementById('typeGlobalDropdownMenu');
    if (dropdown) {
      dropdown.classList.remove('active');
      delete dropdown.dataset.forIndex;
    }
  }

  function bindEvents() {
    const overlay = document.getElementById('globalTypePopoverOverlay');
    const btnCancel = document.getElementById('btnCancelGlobalType');
    const btnConfirm = document.getElementById('btnConfirmGlobalType');
    const btnToggle = document.getElementById('btnToggleCustomForm');
    const customForm = document.getElementById('globalCustomTypeForm');
    const inputCustomName = document.getElementById('inputCustomTypeName');

    const btnEdit = document.getElementById('btnDropdownEdit');
    const btnDelete = document.getElementById('btnDropdownDelete');

    // 點擊修改
    if (btnEdit) {
      btnEdit.onclick = (e) => {
        e.stopPropagation();
        if (activeItemIndex === null) return;
        
        const types = getLocalTypes();
        const targetType = types[activeItemIndex];
        hideDropdown();

        if (targetType) {
          const newName = prompt('請輸入新的類型名稱：', targetType.name);
          if (newName && newName.trim()) {
            types[activeItemIndex].name = newName.trim();
            saveLocalTypes(types);
            renderOptions();
          }
        }
      };
    }

    // 點擊刪除
    if (btnDelete) {
      btnDelete.onclick = (e) => {
        e.stopPropagation();
        if (activeItemIndex === null) return;

        const types = getLocalTypes();
        const targetType = types[activeItemIndex];
        hideDropdown();

        if (targetType && confirm(`確定要刪除「${targetType.name}」類型嗎？`)) {
          types.splice(activeItemIndex, 1);
          saveLocalTypes(types);
          renderOptions();
        }
      };
    }

    // 點擊空白處或遮罩關閉
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#typeGlobalDropdownMenu') && !e.target.classList.contains('btn-type-dots')) {
        hideDropdown();
      }
    });

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closePicker();
      }
    };

    if (btnCancel) btnCancel.onclick = () => closePicker();

    if (btnToggle && customForm) {
      btnToggle.onclick = () => customForm.classList.toggle('active');
    }

    overlay.querySelectorAll('.color-dot-picker').forEach(dot => {
      dot.onclick = () => {
        overlay.querySelectorAll('.color-dot-picker').forEach(d => d.classList.remove('selected'));
        dot.classList.add('selected');
        customColorTemp = dot.dataset.color || '#f59e0b';
      };
    });

    if (btnConfirm) {
      btnConfirm.onclick = () => {
        const customName = inputCustomName?.value.trim();

        if (customName) {
          const types = getLocalTypes();
          const newTypeObj = {
            id: 'type_' + Date.now(),
            name: customName,
            color: customColorTemp,
            icon: '📌',
            order: types.length + 1
          };
          types.push(newTypeObj);
          saveLocalTypes(types);

          if (typeof activeCallback === 'function') {
            activeCallback(customName, customColorTemp);
          }
        }

        closePicker();
      };
    }
  }

  function closePicker() {
    hideDropdown();
    const overlay = document.getElementById('globalTypePopoverOverlay');
    const customForm = document.getElementById('globalCustomTypeForm');
    const inputCustomName = document.getElementById('inputCustomTypeName');

    if (overlay) overlay.classList.remove('active');
    if (customForm) customForm.classList.remove('active');
    if (inputCustomName) inputCustomName.value = '';
  }

  window.openTypePicker = function ({ targetBtn, currentType, onSelect }) {
    initDOM();
    activeCallback = onSelect;
    activeCurrentType = currentType || 'Homework';

    renderOptions();

    const overlay = document.getElementById('globalTypePopoverOverlay');
    if (overlay) overlay.classList.add('active');
  };

  window.fetchTypeSettingsFromGAS = async function () {
    const targetUrl = window.GAS_WEB_APP_URL;
    if (!targetUrl) return;

    try {
      const res = await fetch(`${targetUrl}?action=getTypeSettings`);
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.types) && data.types.length > 0) {
        localStorage.setItem('app_custom_types', JSON.stringify(data.types));
      }
    } catch (e) {
      console.warn('⚠️ 從 Google 試算表載入類型失敗:', e);
    }
  };

  // ⚡ 頁面一載入時，自動非同步向 Google 試算表拉取最新的類型設定
 // ⚡ 頁面載入時，延遲 500ms 再背景拉取最新的類型設定，避免阻塞主線程繪圖
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (typeof window.fetchTypeSettingsFromGAS === 'function') {
          window.fetchTypeSettingsFromGAS();
        }
      }, 500);
    });
  } else {
    setTimeout(() => {
      if (typeof window.fetchTypeSettingsFromGAS === 'function') {
        window.fetchTypeSettingsFromGAS();
      }
    }, 500);
  }

})();