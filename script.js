document.addEventListener('DOMContentLoaded', function () {
  const elements = {
    loginModal: document.getElementById('login-modal'),
    loginButton: document.getElementById('login-button'),
    operatorInput: document.getElementById('operator-name-input'),
    app: document.getElementById('app'),
    operatorName: document.getElementById('operator-name'),
    projectsContainer: document.getElementById('projects-container'),
    projectCount: document.getElementById('project-count'),
    startShiftBtn: document.getElementById('start-shift'),
    endShiftBtn: document.getElementById('end-shift'),
    pauseShiftBtn: document.getElementById('pause-shift-btn'),
    channelToggleBtn: document.getElementById('channel-toggle-button'),
    shiftTimer: document.getElementById('shift-timer'),
    callTimer: document.getElementById('call-timer'),
    pauseModal: document.getElementById('pause-modal'),
    pauseTimer: document.getElementById('pause-timer'),
    endPauseBtn: document.getElementById('end-pause-btn'),
    reportModal: document.getElementById('report-modal'),
    reportBody: document.getElementById('report-body'),
    closeReportBtn: document.getElementById('close-report'),
    statusIndicator: document.querySelector('.status-indicator'),
    editProjectsBtn: document.getElementById('edit-projects-btn'),
    editProjectsModal: document.getElementById('edit-projects-modal'),
    projectsEditContainer: document.getElementById('projects-edit-container'),
    addProjectBtn: document.getElementById('add-project-btn'),
    saveProjectsBtn: document.getElementById('save-projects-btn'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    editCallsModal: document.getElementById('edit-calls-modal'),
    editCallsProjectName: document.getElementById('edit-calls-project-name'),
    editCallsInput: document.getElementById('edit-calls-input'),
    saveCallsBtn: document.getElementById('save-calls-btn'),
    cancelEditCallsBtn: document.getElementById('cancel-edit-calls-btn'),
    // Добавлены новые элементы для улучшения UX
    loginError: document.getElementById('login-error'),
    shiftControls: document.getElementById('shift-controls'),
    currentProject: document.getElementById('current-project')
  };

  const state = {
    operator: localStorage.getItem('operator') || null,
    shiftActive: localStorage.getItem('shiftActive') === 'true',
    shiftStartTime: +localStorage.getItem('shiftStartTime') || 0,
    shiftPaused: localStorage.getItem('shiftPaused') === 'true',
    pauseStartTime: +localStorage.getItem('pauseStartTime') || 0,
    totalPausedTime: +localStorage.getItem('totalPausedTime') || 0,
    currentCall: localStorage.getItem('currentCall') || null,
    callStartTime: +localStorage.getItem('callStartTime') || 0,
    channel: localStorage.getItem('channel') || 'Call Back',
    projects: JSON.parse(localStorage.getItem('projects')) || (() => {
      const defaultProjects = [];
      for (let i = 1; i <= 5; i++) { // Уменьшено количество проектов по умолчанию
        defaultProjects.push({
          name: `Проект ${i}`,
          calls: 0,
          status: 'inactive'
        });
      }
      return defaultProjects;
    })(),
    timers: { shift: null, call: null, pause: null },
    editingProject: null
  };

  function formatTime(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function saveState() {
    try {
      localStorage.setItem('operator', state.operator);
      localStorage.setItem('shiftActive', state.shiftActive);
      localStorage.setItem('shiftStartTime', state.shiftStartTime);
      localStorage.setItem('shiftPaused', state.shiftPaused);
      localStorage.setItem('pauseStartTime', state.pauseStartTime);
      localStorage.setItem('totalPausedTime', state.totalPausedTime);
      localStorage.setItem('currentCall', state.currentCall);
      localStorage.setItem('callStartTime', state.callStartTime);
      localStorage.setItem('channel', state.channel);
      localStorage.setItem('projects', JSON.stringify(state.projects));
    } catch (e) {
      console.error('Ошибка сохранения:', e);
      if (e.name === 'QuotaExceededError') {
        // Более дружелюбное сообщение об ошибке
        showNotification('Переполнение хранилища. Старые данные будут очищены.', 'error');
        setTimeout(() => {
          localStorage.clear();
          location.reload();
        }, 3000);
      }
    }
  }

  // Новая функция для показа уведомлений
  function showNotification(message, type = 'info') {
    // Создаем элемент уведомления, если его нет
    let notification = document.getElementById('notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s;
        max-width: 300px;
      `;
      document.body.appendChild(notification);
    }
    
    // Устанавливаем стили в зависимости от типа
    if (type === 'error') {
      notification.style.background = '#ff4757';
    } else if (type === 'success') {
      notification.style.background = '#2ed573';
    } else {
      notification.style.background = '#3742fa';
    }
    
    notification.textContent = message;
    notification.style.opacity = '1';
    
    // Автоматически скрываем через 3 секунды
    setTimeout(() => {
      notification.style.opacity = '0';
    }, 3000);
  }

  function updateStatusIndicator() {
    const ind = elements.statusIndicator;
    ind.className = 'status-indicator';
    if (!state.shiftActive) ind.classList.add('inactive');
    else if (state.shiftPaused) ind.classList.add('paused');
    else if (state.currentCall) ind.classList.add('active-call');
    else ind.classList.add('active');
    
    // Обновляем текст текущего проекта, если есть активный звонок
    if (state.currentCall) {
      elements.currentProject.textContent = `Текущий проект: ${state.currentCall}`;
      elements.currentProject.style.display = 'block';
    } else {
      elements.currentProject.style.display = 'none';
    }
  }

  function renderProjects() {
    const fragment = document.createDocumentFragment();
    
    state.projects.forEach(project => {
      const card = document.createElement('div');
      card.className = `project-card ${project.status === 'active' ? 'active-call-card' : ''}`;
      const disabled = !state.shiftActive || state.shiftPaused || (state.currentCall && state.currentCall !== project.name);
      const reason = !state.shiftActive ? 'Смена не начата' :
                     state.shiftPaused ? 'Смена на паузе' :
                     state.currentCall && state.currentCall !== project.name ? 'Завершите текущий звонок' : '';
      
      card.innerHTML = `
        <h3>${project.name}</h3>
        <div>Звонков: <span class="call-count">${project.calls}</span></div>
        <div>Канал: ${state.channel}</div>
        <div style="display: flex; gap: 10px; margin-top: 15px;">
          <button class="project-btn" data-project="${project.name}" ${disabled ? `disabled title="${reason}"` : ''}>
            ${project.status === 'active' ? 'Завершить' : 'Начать звонок'}
          </button>
          <button class="edit-calls-btn" data-project="${project.name}" title="Изменить количество звонков" style="padding: 12px; border-radius: 10px; border: 1px solid var(--accent); background: transparent; color: var(--accent); cursor: pointer; transition: var(--transition);">
            ✏️
          </button>
        </div>
      `;
      fragment.appendChild(card);
    });
    
    elements.projectsContainer.innerHTML = '';
    elements.projectsContainer.appendChild(fragment);
    elements.projectCount.textContent = `Проектов: ${state.projects.length}`;
  }

  function startTimer(type) {
    stopTimer(type);
    state.timers[type] = setInterval(() => {
      const now = Date.now();
      let seconds;
      if (type === 'shift') {
        seconds = Math.floor((now - state.shiftStartTime - state.totalPausedTime) / 1000);
        elements.shiftTimer.textContent = formatTime(seconds);
      } else if (type === 'call') {
        seconds = Math.floor((now - state.callStartTime) / 1000);
        elements.callTimer.textContent = formatTime(seconds);
      } else if (type === 'pause') {
        seconds = Math.floor((now - state.pauseStartTime) / 1000);
        elements.pauseTimer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      }
    }, 1000);
  }

  function stopTimer(type) {
    if (state.timers[type]) {
      clearInterval(state.timers[type]);
      state.timers[type] = null;
    }
  }

  function handleLogin() {
    const name = elements.operatorInput.value.trim();
    if (!name) {
      elements.loginError.style.display = 'block';
      elements.loginError.textContent = "Введите имя оператора!";
      return;
    }
    
    elements.loginError.style.display = 'none';
    state.operator = name;
    elements.operatorName.textContent = name;
    elements.loginModal.classList.remove('active');
    elements.app.style.display = 'block';
    saveState();
    renderProjects();
    updateStatusIndicator();
    elements.startShiftBtn.disabled = state.shiftActive;
    
    // Фокусируемся на кнопке начала смены для улучшения навигации
    if (!state.shiftActive) {
      elements.startShiftBtn.focus();
    }
  }

  function startShift() {
    if (!state.operator) {
      showNotification("Сначала введите имя оператора!", "error");
      elements.loginModal.classList.add('active');
      elements.operatorInput.focus();
      return;
    }
    
    state.shiftActive = true;
    state.shiftStartTime = Date.now();
    state.totalPausedTime = 0;
    startTimer('shift');
    elements.startShiftBtn.disabled = true;
    elements.shiftControls.classList.add('shift-active');
    saveState();
    renderProjects();
    updateStatusIndicator();
    elements.shiftTimer.parentElement.classList.add('active');
    
    showNotification("Смена начата!", "success");
  }

  function endShift() {
    // Подтверждение завершения смены
    if (!confirm("Вы уверены, что хотите завершить смену?")) return;
    
    stopTimer('shift');
    stopTimer('call');
    stopTimer('pause');
    
    if (state.currentCall) {
      const project = state.projects.find(p => p.name === state.currentCall);
      if (project) {
        project.status = 'inactive';
        project.calls++;
      }
    }
    
    showReport();
    state.currentCall = null;
    elements.shiftTimer.parentElement.classList.remove('active');
    elements.callTimer.parentElement.classList.remove('active');
    elements.startShiftBtn.disabled = false;
    elements.shiftControls.classList.remove('shift-active');
    
    showNotification("Смена завершена!", "success");
  }

  function toggleChannel() {
    state.channel = state.channel === 'Call Back' ? 'Hot Line' : 'Call Back';
    elements.channelToggleBtn.textContent = state.channel;
    elements.channelToggleBtn.classList.toggle('channel-hotline');
    saveState();
    renderProjects();
    
    showNotification(`Канал изменен на: ${state.channel}`);
  }

  function togglePause() {
    if (state.shiftPaused) endPause();
    else startPause();
  }

  function startPause() {
    if (!state.shiftActive) return;
    state.shiftPaused = true;
    state.pauseStartTime = Date.now();
    stopTimer('shift');
    
    if (state.currentCall) {
      stopTimer('call');
      elements.callTimer.textContent = 'Пауза';
    }
    
    elements.pauseModal.classList.add('active');
    startTimer('pause');
    saveState();
    renderProjects();
    updateStatusIndicator();
    
    showNotification("Смена на паузе", "info");
  }

  function endPause() {
    state.shiftPaused = false;
    state.totalPausedTime += Date.now() - state.pauseStartTime;
    elements.pauseModal.classList.remove('active');
    stopTimer('pause');
    
    if (state.shiftActive) startTimer('shift');
    if (state.currentCall) {
      state.callStartTime += Date.now() - state.pauseStartTime;
      startTimer('call');
    }
    
    saveState();
    renderProjects();
    updateStatusIndicator();
    
    showNotification("Пауза завершена", "success");
  }

  function showReport() {
    const duration = state.shiftStartTime ? Math.floor((Date.now() - state.shiftStartTime - state.totalPausedTime) / 1000) : 0;
    const totalCalls = state.projects.reduce((sum, p) => sum + p.calls, 0);
    
    const formatDate = ts => {
        const d = new Date(ts);
        return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
    };
    
    const getTimeInterval = () => {
        const startHour = new Date(state.shiftStartTime).getHours();
        if (startHour >= 18 || startHour < 6) {
            return '20:00 - 08:00';
        } else {
            return '08:00 - 20:00';
        }
    };
    
    const getChannelName = () => {
        return state.channel === 'Call Back' ? 'CallBack' : 'HotLine';
    };
    
    const timeInterval = getTimeInterval();
    const currentDate = formatDate(Date.now());
    const channelName = getChannelName();
    
    const projectsWithCalls = state.projects.filter(p => p.calls > 0);
    
    elements.reportBody.innerHTML = `
        <div class="report-header" style="text-align: left; margin-bottom: 30px;">
            <div style="font-size: 24px; font-weight: bold; color: var(--accent); margin-bottom: 10px;">
                ${currentDate}    ${timeInterval} ( ${state.operator} )
            </div>
            <div style="font-size: 16px; margin-bottom: 5px;">
                Длительность смены: ${formatTime(duration)}
            </div>
        </div>
        
        <div style="margin-top: 20px;">
            ${projectsWithCalls.map(p => `
                <div style="margin-bottom: 15px; padding: 15px; background: rgba(212, 175, 55, 0.05); border-radius: 8px; border-left: 4px solid var(--accent);">
                    <div style="font-weight: 600; color: var(--accent); margin-bottom: 8px; font-size: 18px;">${p.name}</div>
                    <div style="font-size: 16px;">${channelName} - ${p.calls}</div>
                </div>
            `).join('')}
            
            ${projectsWithCalls.length === 0 ? `
                <div style="text-align: center; opacity: 0.7; padding: 40px; font-style: italic; font-size: 16px;">
                    Нет звонков за смену
                </div>
            ` : ''}
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(212, 175, 55, 0.2);">
            <div style="font-weight: 600; color: var(--accent); font-size: 18px;">Всего звонков: ${totalCalls}</div>
        </div>
    `;
    
    elements.reportModal.classList.add('active');
  }

  function openEditCallsModal(projectName) {
    const project = state.projects.find(p => p.name === projectName);
    if (project) {
      state.editingProject = project;
      elements.editCallsProjectName.textContent = projectName;
      elements.editCallsInput.value = project.calls;
      elements.editCallsModal.classList.add('active');
      // Фокусируемся на поле ввода
      setTimeout(() => elements.editCallsInput.focus(), 100);
    }
  }

  function saveEditedCalls() {
    if (state.editingProject) {
      const newCalls = parseInt(elements.editCallsInput.value) || 0;
      if (newCalls >= 0) {
        state.editingProject.calls = newCalls;
        saveState();
        renderProjects();
        elements.editCallsModal.classList.remove('active');
        state.editingProject = null;
        showNotification("Количество звонков обновлено", "success");
      } else {
        showNotification("Количество звонков не может быть отрицательным!", "error");
      }
    }
  }

  function resetShiftData() {
    state.projects.forEach(p => {
      p.calls = 0;
      p.status = 'inactive';
    });
    
    Object.assign(state, {
      shiftStartTime: 0,
      callStartTime: 0,
      pauseStartTime: 0,
      totalPausedTime: 0,
      currentCall: null,
      shiftActive: false,
      shiftPaused: false
    });
    
    ['shiftActive','shiftStartTime','shiftPaused','pauseStartTime','totalPausedTime','currentCall','callStartTime']
      .forEach(k => localStorage.removeItem(k));
    
    elements.shiftTimer.textContent = '00:00:00';
    elements.callTimer.textContent = '00:00:00';
    elements.pauseTimer.textContent = '00:00';
    
    saveState();
    renderProjects();
    updateStatusIndicator();
    elements.startShiftBtn.disabled = false;
    elements.shiftControls.classList.remove('shift-active');
  }

  function closeReport() {
    elements.reportModal.classList.remove('active');
    resetShiftData();
  }

  function openEditProjectsModal() {
    renderProjectsEditList();
    elements.editProjectsModal.classList.add('active');
  }

  function renderProjectsEditList() {
    elements.projectsEditContainer.innerHTML = '';
    
    state.projects.forEach((project, index) => {
      const projectDiv = document.createElement('div');
      projectDiv.className = 'project-edit-item';
      projectDiv.style.display = 'flex';
      projectDiv.style.alignItems = 'center';
      projectDiv.style.marginBottom = '10px';
      projectDiv.style.gap = '10px';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.value = project.name;
      input.className = 'project-input';
      input.dataset.index = index;
      input.style.flex = '1';
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
      deleteBtn.className = 'delete-project-btn';
      deleteBtn.title = 'Удалить проект';
      deleteBtn.onclick = () => {
        if (state.projects.length > 1) {
          if (confirm(`Удалить проект "${project.name}"?`)) {
            state.projects.splice(index, 1);
            renderProjectsEditList();
          }
        } else {
          showNotification("Должен остаться хотя бы один проект!", "error");
        }
      };
      
      projectDiv.appendChild(input);
      projectDiv.appendChild(deleteBtn);
      elements.projectsEditContainer.appendChild(projectDiv);
    });
  }

  function saveProjects() {
    const inputs = elements.projectsEditContainer.querySelectorAll('.project-input');
    const newProjects = [];
    let hasEmptyName = false;
    
    inputs.forEach((input, index) => {
      const newName = input.value.trim();
      if (!newName) {
        hasEmptyName = true;
        input.style.borderColor = 'red';
        return;
      }
      
      // Проверяем дубликаты имен
      if (newProjects.some(p => p.name === newName)) {
        showNotification(`Проект с именем "${newName}" уже существует!`, "error");
        input.style.borderColor = 'red';
        return;
      }
      
      input.style.borderColor = '';
      
      // Сохраняем существующие данные или создаем новый проект
      if (state.projects[index]) {
        newProjects.push({
          ...state.projects[index],
          name: newName
        });
      } else {
        newProjects.push({
          name: newName,
          calls: 0,
          status: 'inactive'
        });
      }
    });
    
    if (hasEmptyName) {
      showNotification("Имя проекта не может быть пустым!", "error");
      return;
    }
    
    state.projects = newProjects;
    saveState();
    renderProjects();
    elements.editProjectsModal.classList.remove('active');
    
    showNotification("Проекты сохранены", "success");
  }

  function addNewProject() {
    const newProject = {
      name: `Новый проект ${state.projects.length + 1}`,
      calls: 0,
      status: 'inactive'
    };
    state.projects.push(newProject);
    renderProjectsEditList();
    
    // Фокусируемся на новом поле ввода
    const inputs = elements.projectsEditContainer.querySelectorAll('.project-input');
    if (inputs.length > 0) {
      inputs[inputs.length - 1].focus();
    }
  }

  // Обработчики событий
  elements.loginButton.addEventListener('click', handleLogin);
  elements.operatorInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') handleLogin();
  });
  
  elements.startShiftBtn.addEventListener('click', startShift);
  elements.endShiftBtn.addEventListener('click', endShift);
  elements.pauseShiftBtn.addEventListener('click', togglePause);
  elements.channelToggleBtn.addEventListener('click', toggleChannel);
  elements.endPauseBtn.addEventListener('click', endPause);
  elements.closeReportBtn.addEventListener('click', closeReport);
  elements.editProjectsBtn.addEventListener('click', openEditProjectsModal);
  elements.addProjectBtn.addEventListener('click', addNewProject);
  elements.saveProjectsBtn.addEventListener('click', saveProjects);
  elements.cancelEditBtn.addEventListener('click', () => {
    elements.editProjectsModal.classList.remove('active');
  });
  elements.saveCallsBtn.addEventListener('click', saveEditedCalls);
  elements.cancelEditCallsBtn.addEventListener('click', () => {
    elements.editCallsModal.classList.remove('active');
    state.editingProject = null;
  });
  elements.editCallsInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') saveEditedCalls();
  });

  elements.editProjectsModal.addEventListener('click', (e) => {
    if (e.target === elements.editProjectsModal) {
      elements.editProjectsModal.classList.remove('active');
    }
  });

  elements.editCallsModal.addEventListener('click', (e) => {
    if (e.target === elements.editCallsModal) {
      elements.editCallsModal.classList.remove('active');
      state.editingProject = null;
    }
  });

  elements.projectsContainer.addEventListener('click', e => {
    const btn = e.target.closest('.project-btn');
    if (btn && !btn.disabled) {
      const name = btn.dataset.project;
      const project = state.projects.find(p => p.name === name);
      
      if (project) {
        if (project.status === 'active') {
          project.status = 'inactive';
          project.calls++;
          stopTimer('call');
          state.currentCall = null;
          elements.callTimer.textContent = '00:00:00';
          elements.callTimer.parentElement.classList.remove('active');
          showNotification(`Звонок по проекту "${name}" завершен`, "success");
        } else {
          state.projects.forEach(p => p.status = 'inactive');
          project.status = 'active';
          state.currentCall = name;
          state.callStartTime = Date.now();
          startTimer('call');
          elements.callTimer.parentElement.classList.add('active');
          showNotification(`Начат звонок по проекту "${name}"`, "info");
        }
        
        saveState();
        renderProjects();
        updateStatusIndicator();
      }
    }
    
    const editBtn = e.target.closest('.edit-calls-btn');
    if (editBtn) {
      const projectName = editBtn.dataset.project;
      openEditCallsModal(projectName);
    }
  });

  // Добавляем обработчик для закрытия модальных окон по ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elements.editProjectsModal.classList.contains('active')) {
        elements.editProjectsModal.classList.remove('active');
      } else if (elements.editCallsModal.classList.contains('active')) {
        elements.editCallsModal.classList.remove('active');
        state.editingProject = null;
      } else if (elements.reportModal.classList.contains('active')) {
        closeReport();
      }
    }
  });

  // Автоинициализация
  if (state.operator) {
    elements.operatorName.textContent = state.operator;
    elements.loginModal.classList.remove('active');
    elements.app.style.display = 'block';
    elements.startShiftBtn.disabled = state.shiftActive;
    
    if (state.shiftActive) {
      elements.shiftControls.classList.add('shift-active');
      
      if (!state.shiftPaused) {
        const currentTime = Date.now();
        const elapsed = currentTime - state.shiftStartTime - state.totalPausedTime;
        state.shiftStartTime = currentTime - elapsed;
        startTimer('shift');
        elements.shiftTimer.parentElement.classList.add('active');
      }
    }
    
    if (state.currentCall) {
      startTimer('call');
      elements.callTimer.parentElement.classList.add('active');
    }
    
    // Восстанавливаем состояние кнопки переключения канала
    if (state.channel === 'Hot Line') {
      elements.channelToggleBtn.classList.add('channel-hotline');
    }
    
    renderProjects();
    updateStatusIndicator();
  }
  
  // Фокусируемся на поле ввода имени при загрузке
  if (!state.operator) {
    setTimeout(() => elements.operatorInput.focus(), 100);
  }
});
