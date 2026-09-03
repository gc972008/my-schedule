// courseEditModal.js - 課程詳細資料與 18 週大綱編輯 Modal 模組

(function () {
  function injectEditModalStyles() {
    if (document.getElementById('courseEditModalStyle')) return;
    const style = document.createElement('style');
    style.id = 'courseEditModalStyle';
    style.textContent = `
      .course-edit-overlay {
        position: fixed !important; top: 0 !important; left: 0 !important;
        width: 100vw !important; height: 100vh !important;
        background: rgba(0, 0, 0, 0.75) !important; backdrop-filter: blur(4px) !important;
        display: none; justify-content: center !important; align-items: center !important;
        z-index: 2000000 !important;
      }
      .course-edit-overlay.active { display: flex !important; animation: editFadeIn 0.2s ease-out !important; }

      .course-edit-card {
        width: 750px !important; max-width: 90vw !important; max-height: 85vh !important;
        background: #141519 !important; border: 1px solid #3b82f6 !important;
        border-radius: 16px !important; padding: 24px !important; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9) !important;
        color: #fff !important; box-sizing: border-box !important; position: relative !important;
        display: flex; flex-direction: column; gap: 16px; overflow-y: auto;
      }

      .course-edit-title { font-size: 18px; font-weight: bold; color: #38bdf8; border-bottom: 2px solid #262830; padding-bottom: 8px; }

      .edit-form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
      .edit-field-group { display: flex; flex-direction: column; gap: 4px; }
      .edit-field-group label { font-size: 12px; color: #9ca3af; font-weight: bold; }
      .edit-field-group input, .edit-field-group select {
        background: #0d0e12; border: 1px solid #262830; color: #fff; padding: 8px 10px;
        border-radius: 6px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box;
      }
      .edit-field-group input:focus { border-color: #3b82f6; }

      .syllabus-edit-section { margin-top: 8px; border-top: 1px dashed #262830; padding-top: 12px; }
      .syllabus-edit-title { font-size: 14px; font-weight: bold; color: #f59e0b; margin-bottom: 10px; }
      
      .syllabus-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 260px; overflow-y: auto; padding-right: 6px; }
      .syllabus-row-item { display: flex; align-items: center; gap: 8px; background: #0d0e12; padding: 6px 10px; border-radius: 6px; border: 1px solid #20222a; }
      .syllabus-week-label { font-size: 12px; font-weight: bold; color: #60a5fa; min-width: 55px; }
      .syllabus-input { flex: 1; background: transparent; border: none; color: #fff; font-size: 12px; outline: none; }

      .edit-modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
      .btn-edit-cancel { background: transparent; border: 1px solid #4b5563; color: #9ca3af; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 13px; }
      .btn-edit-save { background: #2563eb; border: none; color: #fff; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; }

      @keyframes editFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    `;
    document.head.appendChild(style);
  }

  function initEditModalDOM() {
    injectEditModalStyles();
    if (document.getElementById('globalCourseEditOverlay')) return;

    let syllabusInputsHtml = '';
    for (let i = 1; i <= 18; i++) {
      syllabusInputsHtml += `
        <div class="syllabus-row-item">
          <span class="syllabus-week-label">第 ${i} 週:</span>
          <input type="text" class="syllabus-input" data-week="${i}" placeholder="請輸入本週進度大綱..." />
        </div>
      `;
    }

    const html = `
      <div id="globalCourseEditOverlay" class="course-edit-overlay">
        <div class="course-edit-card">
          <div class="course-edit-title">✏️ 編輯課程與 18 週大綱</div>

          <!-- 1. 基本資訊與時間節次表單 -->
          <div class="edit-form-grid">
            <div class="edit-field-group">
              <label>課程名稱：</label>
              <input type="text" id="editCourseName" />
            </div>
            <div class="edit-field-group">
              <label>授課教師：</label>
              <input type="text" id="editTeacher" />
            </div>
            <div class="edit-field-group">
              <label>教室/班級：</label>
              <input type="text" id="editClassInfo" />
            </div>
            <div class="edit-field-group">
              <label>選修別：</label>
              <select id="editType">
                <option value="校必">校必</option>
                <option value="系必">系必</option>
                <option value="系選">系選</option>
                <option value="通識">通識</option>
                <option value="必修">必修</option>
                <option value="選修">選修</option>
              </select>
            </div>
            <div class="edit-field-group">
              <label>學分數：</label>
              <input type="number" id="editCredits" min="0" step="0.5" />
            </div>
            <div class="edit-field-group">
              <label>上課禮拜：</label>
              <select id="editDayOfWeek">
                <option value="星期一">星期一</option>
                <option value="星期二">星期二</option>
                <option value="星期三">星期三</option>
                <option value="星期四">星期四</option>
                <option value="星期五">星期五</option>
                <option value="星期六">星期六</option>
                <option value="星期日">星期日</option>
              </select>
            </div>
            <div class="edit-field-group">
              <label>開始節次：</label>
              <input type="number" id="editStartPeriod" min="1" max="14" />
            </div>
            <div class="edit-field-group">
              <label>結束節次：</label>
              <input type="number" id="editEndPeriod" min="1" max="14" />
            </div>
          </div>

          <!-- 2. 18 週大綱表格 -->
          <div class="syllabus-edit-section">
            <div class="syllabus-edit-title">📅 18 週課程大綱與 Topic 編輯</div>
            <div class="syllabus-grid">
              ${syllabusInputsHtml}
            </div>
          </div>

          <!-- 3. 按鈕區 -->
          <div class="edit-modal-footer">
            <button class="btn-edit-cancel" id="btnCancelCourseEdit">取消</button>
            <button class="btn-edit-save" id="btnSaveCourseEdit">儲存變更</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    bindEditModalEvents();
  }

  let activeEditingIndex = null;

  function bindEditModalEvents() {
    const overlay = document.getElementById('globalCourseEditOverlay');
    const btnCancel = document.getElementById('btnCancelCourseEdit');
    const btnSave = document.getElementById('btnSaveCourseEdit');

    if (btnCancel) btnCancel.onclick = () => closeCourseEditModal();

    if (btnSave) {
      btnSave.onclick = async () => {
        if (activeEditingIndex === null) return;

        const courses = JSON.parse(localStorage.getItem('user_courses') || '[]');
        const course = courses[activeEditingIndex];
        if (!course) return;

        // 1. 抓取基本資訊
        course.courseName = document.getElementById('editCourseName').value.trim();
        course.teacher = document.getElementById('editTeacher').value.trim();
        course.classInfo = document.getElementById('editClassInfo').value.trim();
        course.type = document.getElementById('editType').value;
        course.credits = document.getElementById('editCredits').value;
        course.dayOfWeek = document.getElementById('editDayOfWeek').value;
        course.startPeriod = document.getElementById('editStartPeriod').value;
        course.endPeriod = document.getElementById('editEndPeriod').value;

        // 2. 抓取 18 週大綱
        const syllabusInputs = overlay.querySelectorAll('.syllabus-input');
        course.syllabus = [];
        syllabusInputs.forEach(input => {
          course.syllabus.push(input.value.trim());
        });

        // 3. 更新 LocalStorage 快取
        courses[activeEditingIndex] = course;
        localStorage.setItem('user_courses', JSON.stringify(courses));

        // 4. 重新繪製課表網格與清單
        if (typeof window.renderCourseList === 'function') {
          window.renderCourseList();
        }
        if (typeof window.renderAllTimetableData === 'function') {
          const cachedDates = JSON.parse(localStorage.getItem('user_dates') || '{}');
          window.renderAllTimetableData(courses, 1, cachedDates);
        }

        closeCourseEditModal();
        alert('✅ 課程資料與 18 週大綱已成功更新！');
      };
    }
  }

  function closeCourseEditModal() {
    const overlay = document.getElementById('globalCourseEditOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  // 🎯 對外開放入口：點擊「編輯」時呼叫並代入課程資料
  window.openCourseEditModal = function (courseIndex) {
    initEditModalDOM();
    activeEditingIndex = courseIndex;

    const courses = JSON.parse(localStorage.getItem('user_courses') || '[]');
    const c = courses[courseIndex];
    if (!c) return;

    // 填入基本資訊
    document.getElementById('editCourseName').value = c.courseName || '';
    document.getElementById('editTeacher').value = c.teacher || '';
    document.getElementById('editClassInfo').value = c.classInfo || c.classroom || '';
    document.getElementById('editType').value = c.type || '校必';
    document.getElementById('editCredits').value = c.credits || '0';
    document.getElementById('editDayOfWeek').value = c.dayOfWeek || '星期一';
    document.getElementById('editStartPeriod').value = c.startPeriod || c.startClass || '1';
    document.getElementById('editEndPeriod').value = c.endPeriod || c.endClass || '1';

    // 填入 18 週大綱
    const syllabusInputs = document.querySelectorAll('.syllabus-input');
    syllabusInputs.forEach((input, idx) => {
      let content = '';
      if (c.syllabus && c.syllabus[idx]) {
        content = typeof c.syllabus[idx] === 'object' ? (c.syllabus[idx].content || '') : c.syllabus[idx];
      }
      input.value = content;
    });

    const overlay = document.getElementById('globalCourseEditOverlay');
    if (overlay) overlay.classList.add('active');
  };
})();