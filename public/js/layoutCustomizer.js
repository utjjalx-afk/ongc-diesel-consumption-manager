/**
 * ONGC Operations Portal - Advanced Visual Drag & Drop Layout Customizer
 * Features:
 *  1. Reorder: Drag & Drop with mouse or ⬆️ / ⬇️ arrow buttons
 *  2. Resize: Toggle width (100% / 85% / 75%) & card grid spans (1x / 2x / Full)
 *  3. Edit: Inline / Modal editor to rename titles, descriptions, badges
 *  4. Delete: Remove/hide unwanted sections/cards, with 1-click Restore Hidden drawer
 *  5. Persistence: Automatically saves to localStorage and applies on page reload
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'ongc_custom_home_layout';
  let isCustomizerActive = false;
  let draggedElement = null;
  let dragType = null; // 'section' or 'card'

  // Default layout setup
  const DEFAULT_LAYOUT = {
    sections: ['statutory', 'hero', 'modules'],
    cards: [
      'card-wellsites',
      'card-otfde',
      'card-dailyentry',
      'card-roster',
      'card-vehiclelog',
      'card-maintenance',
      'card-settings',
      'card-signin'
    ],
    sizes: {},
    edits: {},
    hidden: []
  };

  let activeLayout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));

  /**
   * Check if current session user has administrator privileges
   */
  function isUserAdmin() {
    if (document.body.classList.contains('is-admin')) {
      return true;
    }
    if (window.appState && window.appState.currentUser) {
      return Boolean(window.appState.currentUser.isAdmin);
    }
    try {
      const stored = localStorage.getItem('ongc_current_user');
      if (stored) {
        const u = JSON.parse(stored);
        return Boolean(u && u.isAdmin);
      }
    } catch (_) {}
    return false;
  }
  window.isLayoutCustomizerAdmin = isUserAdmin;

  /**
   * Update visibility of drag & drop customizer buttons based on admin status
   */
  function updateAdminVisibility() {
    const isAdmin = isUserAdmin();
    document.body.classList.toggle('is-admin', isAdmin);
    const headerBtn = document.getElementById('btnToggleLayoutCustomizer');
    const heroBtn = document.getElementById('btnHeroLayoutCustomizer');

    if (headerBtn) {
      headerBtn.style.display = isAdmin ? 'inline-flex' : 'none';
      headerBtn.disabled = !isAdmin;
    }
    if (heroBtn) {
      heroBtn.style.display = isAdmin ? 'inline-flex' : 'none';
      heroBtn.disabled = !isAdmin;
    }

    if (!isAdmin && isCustomizerActive) {
      toggleLayoutCustomizer(false);
    }
  }
  window.updateLayoutCustomizerAdminState = updateAdminVisibility;

  /**
   * Initialize layout markers and apply saved layout on page load
   */
  function init() {
    setupLayoutAttributes();
    loadAndApplySavedLayout();
    createCustomizerBar();
    createEditModal();
    createRestoreModal();
    setupGlobalShortcuts();
    updateAdminVisibility();
    window.addEventListener('storage', updateAdminVisibility);
    window.addEventListener('focus', updateAdminVisibility);
  }

  /**
   * Ensure sections and cards have unique layout data attributes
   */
  function setupLayoutAttributes() {
    const hub = document.getElementById('viewHomeHub');
    if (!hub) return;

    // Sections
    const hero = hub.querySelector('.home-hub-hero');
    if (hero) hero.setAttribute('data-layout-section', 'hero');

    const statutory = document.getElementById('homeStatutorySection');
    if (statutory) statutory.setAttribute('data-layout-section', 'statutory');

    const modules = hub.querySelector('.home-modules-grid');
    if (modules) modules.setAttribute('data-layout-section', 'modules');

    // Cards
    if (modules) {
      const cards = modules.querySelectorAll('.module-launch-card');
      const cardIds = [
        'card-wellsites',
        'card-otfde',
        'card-dailyentry',
        'card-roster',
        'card-vehiclelog',
        'card-maintenance',
        'card-settings',
        'card-signin'
      ];

      cards.forEach((card, index) => {
        if (!card.getAttribute('data-layout-card')) {
          card.setAttribute('data-layout-card', cardIds[index] || `card-${index + 1}`);
        }
      });
    }
  }

  /**
   * Load and Apply saved layout from localStorage
   */
  function loadAndApplySavedLayout() {
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        activeLayout = {
          sections: Array.isArray(parsed.sections) ? parsed.sections : DEFAULT_LAYOUT.sections,
          cards: Array.isArray(parsed.cards) ? parsed.cards : DEFAULT_LAYOUT.cards,
          sizes: parsed.sizes || {},
          edits: parsed.edits || {},
          hidden: Array.isArray(parsed.hidden) ? parsed.hidden : []
        };
      }
    } catch (e) {
      console.warn('Could not read saved layout:', e);
      activeLayout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
    }

    applyLayoutState();
  }

  /**
   * Apply order, sizes, edits, and hidden states to the DOM
   */
  function applyLayoutState() {
    const hub = document.getElementById('viewHomeHub');
    if (!hub) return;

    // 1. Order Sections
    if (Array.isArray(activeLayout.sections)) {
      activeLayout.sections.forEach(secId => {
        const el = hub.querySelector(`[data-layout-section="${secId}"]`);
        if (el && el.parentElement === hub) {
          hub.appendChild(el);
        }
      });
    }

    // 2. Order Cards
    const modules = hub.querySelector('.home-modules-grid');
    if (modules && Array.isArray(activeLayout.cards)) {
      activeLayout.cards.forEach(cardId => {
        const cardEl = modules.querySelector(`[data-layout-card="${cardId}"]`);
        if (cardEl && cardEl.parentElement === modules) {
          modules.appendChild(cardEl);
        }
      });
    }

    // 3. Apply Sizes
    Object.keys(activeLayout.sizes || {}).forEach(key => {
      const sizeVal = activeLayout.sizes[key];
      const target = hub.querySelector(`[data-layout-section="${key}"], [data-layout-card="${key}"]`);
      if (target) {
        applySizeToElement(target, sizeVal);
      }
    });

    // 4. Apply Edits (Titles, descriptions)
    Object.keys(activeLayout.edits || {}).forEach(key => {
      const editData = activeLayout.edits[key];
      const target = hub.querySelector(`[data-layout-section="${key}"], [data-layout-card="${key}"]`);
      if (target && editData) {
        applyEditToElement(target, editData);
      }
    });

    // 5. Apply Hidden / Deleted
    const allItems = hub.querySelectorAll('[data-layout-section], [data-layout-card]');
    allItems.forEach(item => {
      const id = item.getAttribute('data-layout-section') || item.getAttribute('data-layout-card');
      if (activeLayout.hidden.includes(id)) {
        item.style.display = 'none';
        item.classList.add('layout-item-hidden');
      } else {
        if (item.classList.contains('layout-item-hidden')) {
          item.style.display = '';
          item.classList.remove('layout-item-hidden');
        }
      }
    });

    updateRestoreBadge();
  }

  function applySizeToElement(el, size) {
    el.classList.remove('section-width-100', 'section-width-85', 'section-width-70', 'card-span-1', 'card-span-2', 'card-span-full');
    if (size) {
      el.classList.add(size);
    }
  }

  function applyEditToElement(el, data) {
    if (data.title) {
      const titleEl = el.querySelector('.hero-title, .card-header h3, .mod-title');
      if (titleEl) {
        // preserve icon span if exists
        const iconSpan = titleEl.querySelector('span');
        if (iconSpan) {
          titleEl.innerHTML = '';
          titleEl.appendChild(iconSpan);
          titleEl.appendChild(document.createTextNode(' ' + data.title));
        } else {
          titleEl.textContent = data.title;
        }
      }
    }
    if (data.desc) {
      const descEl = el.querySelector('.hero-desc, .card-header p, .mod-desc');
      if (descEl) descEl.textContent = data.desc;
    }
    if (data.badge) {
      const badgeEl = el.querySelector('.hero-badge span:last-child, .mod-badge');
      if (badgeEl) badgeEl.textContent = data.badge;
    }
  }

  /**
   * Create Floating Customizer Bar
   */
  function createCustomizerBar() {
    if (document.getElementById('layoutCustomizerBar')) return;

    const bar = document.createElement('div');
    bar.id = 'layoutCustomizerBar';
    bar.className = 'layout-customizer-banner';
    bar.style.display = 'none';

    bar.innerHTML = `
      <div class="customizer-bar-content">
        <div class="customizer-bar-lead">
          <span class="customizer-pulse-badge"></span>
          <div>
            <div class="customizer-bar-title">✋ Drag &amp; Drop Builder Active (Resize • Edit • Delete)</div>
            <div class="customizer-bar-subtitle">Drag to move, click 📐 Resize, ✏️ Edit text, or 🗑️ Delete. Click 'Save' when done.</div>
          </div>
        </div>
        <div class="customizer-bar-buttons">
          <button type="button" class="btn btn-secondary customizer-btn-restore" id="btnRestoreHiddenDrawer" style="display: none;">
            <span>➕</span> Restore Hidden (<span id="hiddenCountText">0</span>)
          </button>
          <button type="button" class="btn btn-success customizer-btn-save" id="btnSaveCustomLayout" title="Save your new arrangement">
            <span>💾</span> Save Layout
          </button>
          <button type="button" class="btn btn-secondary customizer-btn-reset" id="btnResetCustomLayout" title="Reset back to default">
            <span>↺</span> Reset Default
          </button>
          <button type="button" class="btn btn-secondary customizer-btn-close" id="btnCloseCustomizer" title="Exit Customizer Mode">
            <span>✖</span> Done
          </button>
        </div>
      </div>
    `;

    document.body.prepend(bar);

    document.getElementById('btnSaveCustomLayout')?.addEventListener('click', saveCurrentLayout);
    document.getElementById('btnResetCustomLayout')?.addEventListener('click', resetLayoutToDefault);
    document.getElementById('btnCloseCustomizer')?.addEventListener('click', () => toggleLayoutCustomizer(false));
    document.getElementById('btnRestoreHiddenDrawer')?.addEventListener('click', openRestoreModal);
  }

  /**
   * Toggle Customizer Mode
   */
  function toggleLayoutCustomizer(forceState) {
    if (!isUserAdmin()) {
      if (forceState !== false) {
        showToast('🔒 Drag & Drop Layout customization and editing is restricted to Admin only.');
      }
      if (isCustomizerActive) {
        isCustomizerActive = false;
        document.body.classList.remove('customizer-mode-active');
        const bar = document.getElementById('layoutCustomizerBar');
        if (bar) bar.style.display = 'none';
        detachDragHandlers();
      }
      return;
    }

    setupLayoutAttributes();
    isCustomizerActive = typeof forceState === 'boolean' ? forceState : !isCustomizerActive;

    const bar = document.getElementById('layoutCustomizerBar');
    const headerBtn = document.getElementById('btnToggleLayoutCustomizer');

    if (isCustomizerActive) {
      document.body.classList.add('customizer-mode-active');
      if (bar) bar.style.display = 'block';
      if (headerBtn) {
        headerBtn.classList.add('active');
        headerBtn.innerHTML = '<span>✕</span> Exit Customizer';
      }

      if (window.switchMainTab) {
        window.switchMainTab(null);
      }

      attachDragHandlers();
      updateRestoreBadge();
      showToast('✋ Customizer Mode Active! Drag to move, or use 📐 Resize, ✏️ Edit, and 🗑️ Delete.');
    } else {
      document.body.classList.remove('customizer-mode-active');
      if (bar) bar.style.display = 'none';
      if (headerBtn) {
        headerBtn.classList.remove('active');
        headerBtn.innerHTML = '<span>✋</span> Drag &amp; Drop Layout';
      }
      detachDragHandlers();
    }
  }
  window.toggleLayoutCustomizer = toggleLayoutCustomizer;

  /**
   * Attach Handles, Resize, Edit, Delete and Drag Events
   */
  function attachDragHandlers() {
    const hub = document.getElementById('viewHomeHub');
    if (!hub) return;

    // 1. Sections
    const sections = hub.querySelectorAll('[data-layout-section]');
    sections.forEach(section => {
      const secId = section.getAttribute('data-layout-section');
      section.setAttribute('draggable', 'true');
      section.classList.add('layout-draggable-section');

      if (!section.querySelector('.layout-drag-handle-bar')) {
        const handleBar = document.createElement('div');
        handleBar.className = 'layout-drag-handle-bar section-handle';
        const title = secId === 'statutory' 
          ? '📋 Vehicle Statutory Documents' 
          : secId === 'hero' 
          ? '⭐ Operations Hero Banner' 
          : '📦 Module Launchpad Grid';

        handleBar.innerHTML = `
          <div class="handle-title"><span>⠿</span> <strong>${title}</strong></div>
          <div class="handle-controls-group">
            <button type="button" class="btn-builder btn-move-up" title="Move Up">⬆️</button>
            <button type="button" class="btn-builder btn-move-down" title="Move Down">⬇️</button>
            <button type="button" class="btn-builder btn-builder-resize" title="Toggle Section Width">📐 Resize</button>
            <button type="button" class="btn-builder btn-builder-edit" title="Edit Section Title & Text">✏️ Edit</button>
            <button type="button" class="btn-builder btn-builder-delete" title="Delete / Hide this section">🗑️ Delete</button>
          </div>
        `;

        handleBar.querySelector('.btn-move-up')?.addEventListener('click', (e) => { e.stopPropagation(); moveElement(section, -1); });
        handleBar.querySelector('.btn-move-down')?.addEventListener('click', (e) => { e.stopPropagation(); moveElement(section, 1); });
        handleBar.querySelector('.btn-builder-resize')?.addEventListener('click', (e) => { e.stopPropagation(); cycleSectionSize(section, secId); });
        handleBar.querySelector('.btn-builder-edit')?.addEventListener('click', (e) => { e.stopPropagation(); openEditModal(section, secId, 'section'); });
        handleBar.querySelector('.btn-builder-delete')?.addEventListener('click', (e) => { e.stopPropagation(); deleteElement(section, secId); });

        section.prepend(handleBar);
      }

      // Drag Events
      section.addEventListener('dragstart', onSectionDragStart);
      section.addEventListener('dragover', onSectionDragOver);
      section.addEventListener('dragenter', onSectionDragEnter);
      section.addEventListener('dragleave', onSectionDragLeave);
      section.addEventListener('drop', onSectionDrop);
      section.addEventListener('dragend', onSectionDragEnd);
    });

    // 2. Cards
    const modulesGrid = hub.querySelector('.home-modules-grid');
    if (modulesGrid) {
      const cards = modulesGrid.querySelectorAll('[data-layout-card]');
      cards.forEach(card => {
        const cardId = card.getAttribute('data-layout-card');
        card.setAttribute('draggable', 'true');
        card.classList.add('layout-draggable-card');

        if (!card.querySelector('.card-drag-handle-bar')) {
          const cardHandle = document.createElement('div');
          cardHandle.className = 'card-drag-handle-bar';
          cardHandle.innerHTML = `
            <span class="card-handle-icon" title="Drag Card">⠿</span>
            <div class="card-controls-group">
              <button type="button" class="btn-card-ctrl btn-card-left" title="Move Left">◀</button>
              <button type="button" class="btn-card-ctrl btn-card-right" title="Move Right">▶</button>
              <button type="button" class="btn-card-ctrl btn-card-size" title="Resize Card Span">📐</button>
              <button type="button" class="btn-card-ctrl btn-card-edit" title="Edit Card Text">✏️</button>
              <button type="button" class="btn-card-ctrl btn-card-del" title="Delete / Hide Card">🗑️</button>
            </div>
          `;

          cardHandle.querySelector('.btn-card-left')?.addEventListener('click', (e) => { e.stopPropagation(); moveElement(card, -1); });
          cardHandle.querySelector('.btn-card-right')?.addEventListener('click', (e) => { e.stopPropagation(); moveElement(card, 1); });
          cardHandle.querySelector('.btn-card-size')?.addEventListener('click', (e) => { e.stopPropagation(); cycleCardSize(card, cardId); });
          cardHandle.querySelector('.btn-card-edit')?.addEventListener('click', (e) => { e.stopPropagation(); openEditModal(card, cardId, 'card'); });
          cardHandle.querySelector('.btn-card-del')?.addEventListener('click', (e) => { e.stopPropagation(); deleteElement(card, cardId); });

          card.prepend(cardHandle);
        }

        card.addEventListener('dragstart', onCardDragStart);
        card.addEventListener('dragover', onCardDragOver);
        card.addEventListener('dragenter', onCardDragEnter);
        card.addEventListener('dragleave', onCardDragLeave);
        card.addEventListener('drop', onCardDrop);
        card.addEventListener('dragend', onCardDragEnd);
      });
    }
  }

  function detachDragHandlers() {
    const hub = document.getElementById('viewHomeHub');
    if (!hub) return;

    hub.querySelectorAll('.layout-drag-handle-bar').forEach(el => el.remove());
    hub.querySelectorAll('.card-drag-handle-bar').forEach(el => el.remove());

    hub.querySelectorAll('[data-layout-section]').forEach(el => {
      el.removeAttribute('draggable');
      el.classList.remove('layout-draggable-section', 'drag-target-over', 'is-dragging');
    });

    hub.querySelectorAll('[data-layout-card]').forEach(el => {
      el.removeAttribute('draggable');
      el.classList.remove('layout-draggable-card', 'drag-target-over', 'is-dragging');
    });
  }

  /**
   * RESIZE LOGIC
   */
  function cycleSectionSize(el, secId) {
    if (!isUserAdmin()) {
      showToast('🔒 Layout customization is restricted to Admin only.');
      return;
    }
    const sizes = ['section-width-100', 'section-width-85', 'section-width-70'];
    let current = activeLayout.sizes[secId] || 'section-width-100';
    let nextIndex = (sizes.indexOf(current) + 1) % sizes.length;
    let nextSize = sizes[nextIndex];

    activeLayout.sizes[secId] = nextSize;
    applySizeToElement(el, nextSize);

    const label = nextSize === 'section-width-100' ? '100% Full Width' : nextSize === 'section-width-85' ? '85% Width' : '70% Compact Width';
    showToast(`📐 Section resized to: ${label}`);
  }

  function cycleCardSize(el, cardId) {
    if (!isUserAdmin()) {
      showToast('🔒 Layout customization is restricted to Admin only.');
      return;
    }
    const sizes = ['card-span-1', 'card-span-2', 'card-span-full'];
    let current = activeLayout.sizes[cardId] || 'card-span-1';
    let nextIndex = (sizes.indexOf(current) + 1) % sizes.length;
    let nextSize = sizes[nextIndex];

    activeLayout.sizes[cardId] = nextSize;
    applySizeToElement(el, nextSize);

    const label = nextSize === 'card-span-1' ? 'Standard 1x' : nextSize === 'card-span-2' ? 'Wide 2x Span' : 'Full Row Span';
    showToast(`📐 Card resized to: ${label}`);
  }

  /**
   * DELETE / HIDE LOGIC
   */
  function deleteElement(el, id) {
    if (!isUserAdmin()) {
      showToast('🔒 Layout customization is restricted to Admin only.');
      return;
    }
    if (!activeLayout.hidden.includes(id)) {
      activeLayout.hidden.push(id);
    }
    el.style.display = 'none';
    el.classList.add('layout-item-hidden');
    updateRestoreBadge();
    showToast(`🗑️ Element hidden. You can restore it anytime from 'Restore Hidden' button!`);
  }

  function updateRestoreBadge() {
    const btn = document.getElementById('btnRestoreHiddenDrawer');
    const countEl = document.getElementById('hiddenCountText');
    const count = activeLayout.hidden.length;

    if (btn && countEl) {
      countEl.textContent = count;
      btn.style.display = count > 0 && isCustomizerActive ? 'inline-flex' : 'none';
    }
  }

  /**
   * EDIT MODAL
   */
  function createEditModal() {
    if (document.getElementById('layoutEditModal')) return;

    const modal = document.createElement('div');
    modal.id = 'layoutEditModal';
    modal.className = 'layout-builder-modal-backdrop';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="layout-builder-modal-card">
        <div class="modal-card-header">
          <h3 id="layoutEditModalTitle">✏️ Edit Section / Card Text</h3>
          <button type="button" class="btn-modal-x" id="btnCloseEditModal">&times;</button>
        </div>
        <div class="modal-card-body">
          <input type="hidden" id="editElementId">
          <input type="hidden" id="editElementType">

          <div class="form-group-custom">
            <label>Heading / Title</label>
            <input type="text" id="editFieldTitle" class="form-control-custom" placeholder="Enter custom heading...">
          </div>

          <div class="form-group-custom">
            <label>Subtitle / Description</label>
            <textarea id="editFieldDesc" class="form-control-custom" rows="3" placeholder="Enter custom description..."></textarea>
          </div>

          <div class="form-group-custom" id="editBadgeGroup">
            <label>Badge / Tag Text</label>
            <input type="text" id="editFieldBadge" class="form-control-custom" placeholder="e.g. 112 Wells • Charts">
          </div>
        </div>
        <div class="modal-card-footer">
          <button type="button" class="btn btn-secondary" id="btnCancelEditModal">Cancel</button>
          <button type="button" class="btn btn-primary" id="btnSaveEditModal">💾 Apply Changes</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btnCloseEditModal')?.addEventListener('click', closeEditModal);
    document.getElementById('btnCancelEditModal')?.addEventListener('click', closeEditModal);
    document.getElementById('btnSaveEditModal')?.addEventListener('click', saveModalEdits);
  }

  function openEditModal(el, id, type) {
    if (!isUserAdmin()) {
      showToast('🔒 Layout editing is restricted to Admin only.');
      return;
    }
    const modal = document.getElementById('layoutEditModal');
    if (!modal) return;

    document.getElementById('editElementId').value = id;
    document.getElementById('editElementType').value = type;

    // Get current values
    const existing = activeLayout.edits[id] || {};
    const titleEl = el.querySelector('.hero-title, .card-header h3, .mod-title');
    const descEl = el.querySelector('.hero-desc, .card-header p, .mod-desc');
    const badgeEl = el.querySelector('.hero-badge span:last-child, .mod-badge');

    document.getElementById('editFieldTitle').value = existing.title || (titleEl ? titleEl.textContent.trim().replace(/^📋\s*/, '') : '');
    document.getElementById('editFieldDesc').value = existing.desc || (descEl ? descEl.textContent.trim() : '');
    document.getElementById('editFieldBadge').value = existing.badge || (badgeEl ? badgeEl.textContent.trim() : '');

    modal.style.display = 'flex';
  }

  function closeEditModal() {
    const modal = document.getElementById('layoutEditModal');
    if (modal) modal.style.display = 'none';
  }

  function saveModalEdits() {
    const id = document.getElementById('editElementId').value;
    const title = document.getElementById('editFieldTitle').value.trim();
    const desc = document.getElementById('editFieldDesc').value.trim();
    const badge = document.getElementById('editFieldBadge').value.trim();

    if (!activeLayout.edits[id]) activeLayout.edits[id] = {};
    activeLayout.edits[id] = { title, desc, badge };

    const hub = document.getElementById('viewHomeHub');
    const el = hub?.querySelector(`[data-layout-section="${id}"], [data-layout-card="${id}"]`);
    if (el) {
      applyEditToElement(el, activeLayout.edits[id]);
      flashHighlight(el);
    }

    closeEditModal();
    showToast('✏️ Text updated live!');
  }

  /**
   * RESTORE HIDDEN MODAL
   */
  function createRestoreModal() {
    if (document.getElementById('layoutRestoreModal')) return;

    const modal = document.createElement('div');
    modal.id = 'layoutRestoreModal';
    modal.className = 'layout-builder-modal-backdrop';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="layout-builder-modal-card">
        <div class="modal-card-header">
          <h3>➕ Restore Deleted / Hidden Elements</h3>
          <button type="button" class="btn-modal-x" id="btnCloseRestoreModal">&times;</button>
        </div>
        <div class="modal-card-body" id="restoreItemsListContainer" style="max-height: 350px; overflow-y: auto;">
          <!-- Dynamically populated list of hidden elements -->
        </div>
        <div class="modal-card-footer">
          <button type="button" class="btn btn-secondary" id="btnCancelRestoreModal">Close</button>
          <button type="button" class="btn btn-success" id="btnRestoreAllElements">↺ Restore All</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btnCloseRestoreModal')?.addEventListener('click', closeRestoreModal);
    document.getElementById('btnCancelRestoreModal')?.addEventListener('click', closeRestoreModal);
    document.getElementById('btnRestoreAllElements')?.addEventListener('click', restoreAllElements);
  }

  function openRestoreModal() {
    if (!isUserAdmin()) {
      showToast('🔒 Layout customization is restricted to Admin only.');
      return;
    }
    const modal = document.getElementById('layoutRestoreModal');
    const container = document.getElementById('restoreItemsListContainer');
    if (!modal || !container) return;

    const readableNames = {
      'statutory': '📋 Vehicle Statutory Documents & Validity Status',
      'hero': '⭐ Operations Command Hero Banner',
      'modules': '📦 Module Launchpad Grid',
      'card-wellsites': '📍 1. Well Site Information & Charts',
      'card-otfde': '⏱️ 2. Overtime & Field Duty Portal',
      'card-dailyentry': '⚡ All-in-One Daily Entry System',
      'card-roster': '👥 Crew Editor & Pay Scales',
      'card-vehiclelog': '🚛 3. Vehicle HSD Log',
      'card-maintenance': '🔧 4. Vehicle Documents & Maintenance',
      'card-settings': '⚙️ 5. Settings & Master DB',
      'card-signin': '🔑 3. Operations Portal Sign In'
    };

    container.innerHTML = '';
    if (activeLayout.hidden.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">No hidden elements right now.</div>`;
    } else {
      activeLayout.hidden.forEach(id => {
        const itemRow = document.createElement('div');
        itemRow.className = 'restore-item-row';
        itemRow.innerHTML = `
          <span>${readableNames[id] || id}</span>
          <button type="button" class="btn btn-sm btn-primary" data-restore-id="${id}">↺ Restore</button>
        `;
        itemRow.querySelector('button')?.addEventListener('click', () => {
          restoreSingleElement(id);
          openRestoreModal(); // re-render
        });
        container.appendChild(itemRow);
      });
    }

    modal.style.display = 'flex';
  }

  function closeRestoreModal() {
    const modal = document.getElementById('layoutRestoreModal');
    if (modal) modal.style.display = 'none';
  }

  function restoreSingleElement(id) {
    activeLayout.hidden = activeLayout.hidden.filter(item => item !== id);
    const hub = document.getElementById('viewHomeHub');
    const el = hub?.querySelector(`[data-layout-section="${id}"], [data-layout-card="${id}"]`);
    if (el) {
      el.style.display = '';
      el.classList.remove('layout-item-hidden');
      flashHighlight(el);
    }
    updateRestoreBadge();
    showToast(`↺ Restored ${id}`);
  }

  function restoreAllElements() {
    const hub = document.getElementById('viewHomeHub');
    activeLayout.hidden.forEach(id => {
      const el = hub?.querySelector(`[data-layout-section="${id}"], [data-layout-card="${id}"]`);
      if (el) {
        el.style.display = '';
        el.classList.remove('layout-item-hidden');
      }
    });
    activeLayout.hidden = [];
    updateRestoreBadge();
    closeRestoreModal();
    showToast('↺ All hidden elements restored successfully!');
  }

  /**
   * DOM Movement (Up / Down)
   */
  function moveElement(el, direction) {
    if (!isUserAdmin()) {
      showToast('🔒 Layout movement is restricted to Admin only.');
      return;
    }
    const parent = el.parentElement;
    if (!parent) return;

    if (direction === -1) {
      let prev = el.previousElementSibling;
      while (prev && prev.classList.contains('layout-item-hidden')) {
        prev = prev.previousElementSibling;
      }
      if (prev && prev.hasAttribute(el.hasAttribute('data-layout-section') ? 'data-layout-section' : 'data-layout-card')) {
        parent.insertBefore(el, prev);
        flashHighlight(el);
      }
    } else {
      let next = el.nextElementSibling;
      while (next && next.classList.contains('layout-item-hidden')) {
        next = next.nextElementSibling;
      }
      if (next && next.hasAttribute(el.hasAttribute('data-layout-section') ? 'data-layout-section' : 'data-layout-card')) {
        parent.insertBefore(next, el);
        flashHighlight(el);
      }
    }
  }

  function flashHighlight(el) {
    el.classList.add('layout-just-moved');
    setTimeout(() => el.classList.remove('layout-just-moved'), 600);
  }

  /* HTML5 DRAG & DROP FOR SECTIONS */
  function onSectionDragStart(e) {
    if (!isUserAdmin() || !isCustomizerActive) {
      e.preventDefault();
      return;
    }
    draggedElement = this;
    dragType = 'section';
    this.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.getAttribute('data-layout-section'));
  }

  function onSectionDragOver(e) {
    if (!isCustomizerActive || dragType !== 'section' || draggedElement === this) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function onSectionDragEnter(e) {
    if (!isCustomizerActive || dragType !== 'section' || draggedElement === this) return;
    this.classList.add('drag-target-over');
  }

  function onSectionDragLeave() {
    this.classList.remove('drag-target-over');
  }

  function onSectionDrop(e) {
    if (!isCustomizerActive || dragType !== 'section' || !draggedElement || draggedElement === this) return;
    e.preventDefault();
    this.classList.remove('drag-target-over');

    const hub = document.getElementById('viewHomeHub');
    if (!hub) return;

    const rect = this.getBoundingClientRect();
    const dropPosition = (e.clientY - rect.top) / rect.height;

    if (dropPosition < 0.5) {
      hub.insertBefore(draggedElement, this);
    } else {
      hub.insertBefore(draggedElement, this.nextSibling);
    }
    flashHighlight(draggedElement);
  }

  function onSectionDragEnd() {
    this.classList.remove('is-dragging');
    document.querySelectorAll('.drag-target-over').forEach(el => el.classList.remove('drag-target-over'));
    draggedElement = null;
    dragType = null;
  }

  /* HTML5 DRAG & DROP FOR CARDS */
  function onCardDragStart(e) {
    if (!isUserAdmin() || !isCustomizerActive) {
      e.preventDefault();
      return;
    }
    draggedElement = this;
    dragType = 'card';
    this.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.getAttribute('data-layout-card'));
  }

  function onCardDragOver(e) {
    if (!isCustomizerActive || dragType !== 'card' || draggedElement === this) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function onCardDragEnter() {
    if (!isCustomizerActive || dragType !== 'card' || draggedElement === this) return;
    this.classList.add('drag-target-over');
  }

  function onCardDragLeave() {
    this.classList.remove('drag-target-over');
  }

  function onCardDrop(e) {
    if (!isCustomizerActive || dragType !== 'card' || !draggedElement || draggedElement === this) return;
    e.preventDefault();
    this.classList.remove('drag-target-over');

    const grid = this.parentElement;
    if (!grid) return;

    const rect = this.getBoundingClientRect();
    const dropPosition = (e.clientX - rect.left) / rect.width;

    if (dropPosition < 0.5) {
      grid.insertBefore(draggedElement, this);
    } else {
      grid.insertBefore(draggedElement, this.nextSibling);
    }
    flashHighlight(draggedElement);
  }

  function onCardDragEnd() {
    this.classList.remove('is-dragging');
    document.querySelectorAll('.drag-target-over').forEach(el => el.classList.remove('drag-target-over'));
    draggedElement = null;
    dragType = null;
  }

  /**
   * Save layout to localStorage
   */
  function saveCurrentLayout() {
    if (!isUserAdmin()) {
      showToast('🔒 Saving custom layouts is restricted to Admin only.');
      return;
    }
    const hub = document.getElementById('viewHomeHub');
    if (!hub) return;

    const sections = Array.from(hub.querySelectorAll('[data-layout-section]'))
      .map(el => el.getAttribute('data-layout-section'))
      .filter(Boolean);

    const modules = hub.querySelector('.home-modules-grid');
    const cards = modules 
      ? Array.from(modules.querySelectorAll('[data-layout-card]'))
          .map(el => el.getAttribute('data-layout-card'))
          .filter(Boolean)
      : [];

    activeLayout.sections = sections;
    activeLayout.cards = cards;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeLayout));
    toggleLayoutCustomizer(false);
    showToast('💾 Layout saved! Your reordering, resizes, edits, and deletions are saved.');
  }
  window.saveCustomLayout = saveCurrentLayout;

  /**
   * Reset back to system default
   */
  function resetLayoutToDefault() {
    if (!isUserAdmin()) {
      showToast('🔒 Resetting layout is restricted to Admin only.');
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    activeLayout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));

    // Reset styles and sizes
    const hub = document.getElementById('viewHomeHub');
    if (hub) {
      hub.querySelectorAll('[data-layout-section], [data-layout-card]').forEach(el => {
        el.style.display = '';
        el.classList.remove('layout-item-hidden', 'section-width-100', 'section-width-85', 'section-width-70', 'card-span-1', 'card-span-2', 'card-span-full');
      });

      // Restore order
      DEFAULT_LAYOUT.sections.forEach(secId => {
        const el = hub.querySelector(`[data-layout-section="${secId}"]`);
        if (el) hub.appendChild(el);
      });

      const modules = hub.querySelector('.home-modules-grid');
      if (modules) {
        DEFAULT_LAYOUT.cards.forEach(cardId => {
          const cardEl = modules.querySelector(`[data-layout-card="${cardId}"]`);
          if (cardEl) modules.appendChild(cardEl);
        });
      }
    }

    toggleLayoutCustomizer(false);
    showToast('↺ Layout reset completely to system defaults.');
  }
  window.resetCustomLayout = resetLayoutToDefault;

  /**
   * Toast helper
   */
  function showToast(message) {
    if (window.showAppToast) {
      window.showAppToast(message);
      return;
    }
    const container = document.getElementById('toastContainer') || document.body;
    const toast = document.createElement('div');
    toast.className = 'toast-notification toast-info';
    toast.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 99999; background: #0f172a; border: 1px solid #38bdf8; color: #f8fafc; padding: 12px 20px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;';
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  function setupGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        if (!isUserAdmin()) {
          showToast('🔒 Drag & Drop Layout customization and editing is restricted to Admin only.');
          return;
        }
        toggleLayoutCustomizer();
      }
    });
  }

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
