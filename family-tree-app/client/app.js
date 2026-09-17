(() => {
  const state = { people: [], relationships: [], search: '', me: null };

  const els = {
    authScreen: document.getElementById('authScreen'),
    appScreen: document.getElementById('appScreen'),
    treeContainer: document.getElementById('treeContainer'),
    treeCanvas: document.getElementById('treeCanvas'),
    linesSvg: document.getElementById('linesSvg'),
    emptyState: document.getElementById('emptyState'),
    detailPanel: document.getElementById('detailPanel'),
    detailPanelContent: document.getElementById('detailPanelContent'),
    overlay: document.getElementById('overlay'),
    addPersonBtn: document.getElementById('addPersonBtn'),
    closePanelBtn: document.getElementById('closePanelBtn'),
    searchBox: document.getElementById('searchBox'),
    userMenuBtn: document.getElementById('userMenuBtn'),
    userMenuDropdown: document.getElementById('userMenuDropdown'),
    userInitial: document.getElementById('userInitial'),
    userDropdownName: document.getElementById('userDropdownName'),
    logoutBtn: document.getElementById('logoutBtn'),
  };

  // ---------- API helpers ----------
  async function api(path, opts) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (res.status === 401) {
      showAuthScreen();
      throw new Error('Bitte melde dich erneut an.');
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${res.status})`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function loadState() {
    const data = await api('/api/state');
    state.people = data.people;
    state.relationships = data.relationships;
    state.me = data.me;
    render();
  }

  // ---------- Auth ----------
  function showAuthScreen() {
    els.authScreen.hidden = false;
    els.appScreen.hidden = true;
  }

  function showAppScreen(person) {
    els.authScreen.hidden = true;
    els.appScreen.hidden = false;
    if (person) {
      els.userInitial.textContent = (person.firstName || '?')[0].toUpperCase();
      els.userDropdownName.textContent = [person.firstName, person.lastName].filter(Boolean).join(' ');
    }
  }

  async function checkAuth() {
    try {
      const data = await fetch('/api/auth/me', { headers: { 'Content-Type': 'application/json' } }).then((r) => r.json());
      if (data.user && data.person) {
        showAppScreen(data.person);
        await loadState();
      } else {
        showAuthScreen();
      }
    } catch (err) {
      showAuthScreen();
    }
  }

  function setError(el, message) {
    if (!message) {
      el.hidden = true;
      el.textContent = '';
    } else {
      el.hidden = false;
      el.textContent = message;
    }
  }

  // -- Tabs: login vs register --
  const authTabs = document.getElementById('authTabs');
  const loginForm = document.getElementById('loginForm');
  const registerPane = document.getElementById('registerPane');
  authTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.segmented-btn');
    if (!btn) return;
    authTabs.querySelectorAll('.segmented-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
    const isLogin = btn.dataset.tab === 'login';
    loginForm.hidden = !isLogin;
    registerPane.hidden = isLogin;
  });

  // -- Tabs: new person vs claim existing --
  const registerModeTabs = document.getElementById('registerModeTabs');
  const registerNewForm = document.getElementById('registerNewForm');
  const registerClaimForm = document.getElementById('registerClaimForm');
  registerModeTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.segmented-btn');
    if (!btn) return;
    registerModeTabs.querySelectorAll('.segmented-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
    const isNew = btn.dataset.mode === 'new';
    registerNewForm.hidden = !isNew;
    registerClaimForm.hidden = isNew;
  });

  // -- Login submit --
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setError(document.getElementById('loginError'), '');
    const fd = new FormData(loginForm);
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(fd)) });
      showAppScreen(data.person);
      await loadState();
    } catch (err) {
      setError(document.getElementById('loginError'), err.message);
    }
  });

  // -- Register: new person --
  registerNewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setError(document.getElementById('registerNewError'), '');
    const fd = new FormData(registerNewForm);
    const payload = Object.fromEntries(fd);
    const body = {
      mode: 'new',
      username: payload.username,
      password: payload.password,
      person: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        birthDate: payload.birthDate,
      },
    };
    try {
      const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
      showAppScreen(data.person);
      await loadState();
    } catch (err) {
      setError(document.getElementById('registerNewError'), err.message);
    }
  });

  // -- Register: claim existing person --
  const claimSearch = document.getElementById('claimSearch');
  const claimResults = document.getElementById('claimResults');
  const claimSelected = document.getElementById('claimSelected');
  const claimSelectedName = document.getElementById('claimSelectedName');
  const claimSubmitBtn = document.getElementById('claimSubmitBtn');
  let claimedPersonId = null;
  let claimSearchTimer = null;

  claimSearch.addEventListener('input', () => {
    clearTimeout(claimSearchTimer);
    const q = claimSearch.value.trim();
    if (q.length < 2) {
      claimResults.hidden = true;
      claimResults.innerHTML = '';
      return;
    }
    claimSearchTimer = setTimeout(async () => {
      const data = await fetch('/api/auth/search-unclaimed?q=' + encodeURIComponent(q)).then((r) => r.json());
      claimResults.innerHTML = '';
      if (!data.people.length) {
        claimResults.hidden = false;
        claimResults.innerHTML = '<p class="muted" style="padding:10px">Niemand gefunden.</p>';
        return;
      }
      claimResults.hidden = false;
      data.people.forEach((p) => {
        const btn = document.createElement('button');
        const year = p.birthDate ? ' · ' + p.birthDate.slice(0, 4) : '';
        btn.textContent = [p.firstName, p.lastName].filter(Boolean).join(' ') + year;
        btn.addEventListener('click', () => {
          claimedPersonId = p.id;
          claimSelectedName.textContent = [p.firstName, p.lastName].filter(Boolean).join(' ');
          claimSelected.hidden = false;
          claimResults.hidden = true;
          claimSearch.value = '';
          claimSubmitBtn.disabled = false;
        });
        claimResults.appendChild(btn);
      });
    }, 250);
  });

  document.getElementById('claimClearBtn').addEventListener('click', () => {
    claimedPersonId = null;
    claimSelected.hidden = true;
    claimSubmitBtn.disabled = true;
  });

  registerClaimForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setError(document.getElementById('registerClaimError'), '');
    if (!claimedPersonId) return;
    const body = {
      mode: 'claim',
      personId: claimedPersonId,
      username: document.getElementById('claimUsername').value,
      password: document.getElementById('claimPassword').value,
    };
    try {
      const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
      showAppScreen(data.person);
      await loadState();
    } catch (err) {
      setError(document.getElementById('registerClaimError'), err.message);
    }
  });

  // -- User menu / logout --
  els.userMenuBtn.addEventListener('click', () => {
    const isOpen = !els.userMenuDropdown.hidden;
    els.userMenuDropdown.hidden = isOpen;
    els.userMenuBtn.setAttribute('aria-expanded', String(!isOpen));
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
      els.userMenuDropdown.hidden = true;
      els.userMenuBtn.setAttribute('aria-expanded', 'false');
    }
  });
  els.logoutBtn.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    state.people = [];
    state.relationships = [];
    state.me = null;
    closePanel();
    showAuthScreen();
  });

  // ---------- Relationship helpers ----------
  function personById(id) {
    return state.people.find((p) => p.id === id);
  }
  function parentsOf(id) {
    return state.relationships
      .filter((r) => r.type === 'parent-child' && r.toId === id)
      .map((r) => personById(r.fromId))
      .filter(Boolean);
  }
  function childrenOf(id) {
    return state.relationships
      .filter((r) => r.type === 'parent-child' && r.fromId === id)
      .map((r) => personById(r.toId))
      .filter(Boolean);
  }
  function spousesOf(id) {
    return state.relationships
      .filter((r) => r.type === 'spouse' && (r.fromId === id || r.toId === id))
      .map((r) => personById(r.fromId === id ? r.toId : r.fromId))
      .filter(Boolean);
  }

  function fullName(p) {
    if (!p) return '';
    const parts = [p.firstName, p.lastName].filter(Boolean);
    return parts.join(' ') || '(unbenannt)';
  }

  // ---------- Layout ----------
  const CARD_W = 152;
  const CARD_H = 96;
  const COUPLE_GAP = 26;
  const UNIT_GAP = 46;
  const ROW_H = 192;

  function computeLayout() {
    const people = state.people;
    const gen = {};
    people.forEach((p) => (gen[p.id] = 0));

    for (let iter = 0; iter < 6; iter++) {
      state.relationships
        .filter((r) => r.type === 'parent-child')
        .forEach((r) => {
          if (gen[r.toId] < gen[r.fromId] + 1) gen[r.toId] = gen[r.fromId] + 1;
        });
      state.relationships
        .filter((r) => r.type === 'spouse')
        .forEach((r) => {
          const g = Math.max(gen[r.fromId], gen[r.toId]);
          gen[r.fromId] = g;
          gen[r.toId] = g;
        });
    }

    const primarySpouse = {};
    state.relationships
      .filter((r) => r.type === 'spouse')
      .forEach((r) => {
        if (!(r.fromId in primarySpouse) && !(r.toId in primarySpouse)) {
          primarySpouse[r.fromId] = r.toId;
          primarySpouse[r.toId] = r.fromId;
        }
      });

    const placed = new Set();
    const units = [];
    people.forEach((p) => {
      if (placed.has(p.id)) return;
      const spouseId = primarySpouse[p.id];
      if (spouseId && !placed.has(spouseId) && personById(spouseId)) {
        units.push({ personIds: [p.id, spouseId], gen: gen[p.id] });
        placed.add(p.id);
        placed.add(spouseId);
      } else {
        units.push({ personIds: [p.id], gen: gen[p.id] });
        placed.add(p.id);
      }
    });

    const byGen = {};
    units.forEach((u) => {
      (byGen[u.gen] = byGen[u.gen] || []).push(u);
    });
    const genKeys = Object.keys(byGen).map(Number).sort((a, b) => a - b);

    const unitById = {};
    units.forEach((u) => u.personIds.forEach((id) => (unitById[id] = u)));

    function parentUnitsOf(unit) {
      const parentIds = new Set();
      unit.personIds.forEach((id) => {
        parentsOf(id).forEach((par) => parentIds.add(par.id));
      });
      const result = new Set();
      parentIds.forEach((id) => {
        const u = unitById[id];
        if (u) result.add(u);
      });
      return [...result];
    }

    const positionedUnits = {};
    genKeys.forEach((g) => {
      const rowUnits = byGen[g];
      rowUnits.sort((a, b) => {
        const ax = avgParentX(a);
        const bx = avgParentX(b);
        if (ax !== null && bx !== null && ax !== bx) return ax - bx;
        if (ax !== null && bx === null) return -1;
        if (bx !== null && ax === null) return 1;
        return fullName(personById(a.personIds[0])).localeCompare(
          fullName(personById(b.personIds[0]))
        );
      });

      function avgParentX(unit) {
        const pu = parentUnitsOf(unit);
        const xs = pu.map((u) => positionedUnits[unitKey(u)]?.centerX).filter((x) => x !== undefined);
        if (!xs.length) return null;
        return xs.reduce((a, b) => a + b, 0) / xs.length;
      }

      let cursor = 0;
      rowUnits.forEach((u) => {
        const width = u.personIds.length === 2 ? CARD_W * 2 + COUPLE_GAP : CARD_W;
        const centerX = cursor + width / 2;
        positionedUnits[unitKey(u)] = { unit: u, x: cursor, width, centerX, y: g * ROW_H };
        cursor += width + UNIT_GAP;
      });
    });

    function unitKey(u) {
      return u.personIds.join('+');
    }

    const positions = {};
    Object.values(positionedUnits).forEach((pu) => {
      if (pu.unit.personIds.length === 2) {
        positions[pu.unit.personIds[0]] = { x: pu.x, y: pu.y };
        positions[pu.unit.personIds[1]] = { x: pu.x + CARD_W + COUPLE_GAP, y: pu.y };
      } else {
        positions[pu.unit.personIds[0]] = { x: pu.x, y: pu.y };
      }
    });

    const maxX = Math.max(0, ...Object.values(positions).map((p) => p.x + CARD_W)) + 60;
    const maxY = (Math.max(0, ...genKeys) + 1) * ROW_H + 60;

    return { positions, unitById, positionedUnits, maxX, maxY };
  }

  // ---------- Rendering ----------
  function render() {
    els.emptyState.hidden = state.people.length > 0;
    els.treeCanvas.querySelectorAll('.person-card').forEach((el) => el.remove());

    if (!state.people.length) {
      els.linesSvg.setAttribute('width', 0);
      els.linesSvg.setAttribute('height', 0);
      return;
    }

    const { positions, maxX, maxY } = computeLayout();
    els.treeCanvas.style.width = maxX + 'px';
    els.treeCanvas.style.height = maxY + 'px';
    els.linesSvg.setAttribute('width', maxX);
    els.linesSvg.setAttribute('height', maxY);
    els.linesSvg.innerHTML = '';

    const query = state.search.trim().toLowerCase();

    state.people.forEach((p) => {
      const pos = positions[p.id];
      if (!pos) return;
      const card = document.createElement('div');
      const deceased = !!p.deathDate;
      const isMe = p.id === state.me;
      card.className = `person-card gender-${p.gender || 'other'}${deceased ? ' deceased' : ''}${isMe ? ' is-me' : ''}`;
      card.style.left = pos.x + 'px';
      card.style.top = pos.y + 'px';
      card.style.width = CARD_W + 'px';
      card.dataset.personId = p.id;

      const matches = query && fullName(p).toLowerCase().includes(query);
      if (matches) card.classList.add('is-match');

      const photo = p.photos && p.photos[0];
      const photoHtml = photo
        ? `<img class="person-photo" src="/uploads/${photo.filename}" alt="" />`
        : `<div class="person-photo-placeholder">${(p.firstName || '?')[0].toUpperCase()}</div>`;

      const dates = [formatYear(p.birthDate), formatYear(p.deathDate)].filter(Boolean).join(' – ');

      card.innerHTML = `
        ${isMe ? '<span class="me-badge">Du</span>' : ''}
        ${photoHtml}
        <div class="person-name">${escapeHtml(fullName(p))}</div>
        ${dates ? `<div class="person-dates">${dates}</div>` : ''}
      `;
      card.addEventListener('click', () => openDetailPanel(p.id));
      els.treeCanvas.appendChild(card);
    });

    state.relationships.forEach((r) => {
      const a = positions[r.fromId];
      const b = positions[r.toId];
      if (!a || !b) return;
      if (r.type === 'spouse') {
        drawLine(a.x + CARD_W, a.y + CARD_H / 2, b.x, b.y + CARD_H / 2, 'spouse');
      }
    });

    const childParents = {};
    state.relationships
      .filter((r) => r.type === 'parent-child')
      .forEach((r) => {
        (childParents[r.toId] = childParents[r.toId] || []).push(r.fromId);
      });
    Object.entries(childParents).forEach(([childId, parentIds]) => {
      const childPos = positions[childId];
      if (!childPos) return;
      const validParents = parentIds.map((id) => positions[id]).filter(Boolean);
      if (!validParents.length) return;
      const parentXs = validParents.map((pp) => pp.x + CARD_W / 2);
      const parentY = validParents[0].y + CARD_H;
      const midX = parentXs.reduce((a, b) => a + b, 0) / parentXs.length;
      const midY = parentY + (childPos.y - parentY) / 2;
      validParents.forEach((pp) => {
        drawLine(pp.x + CARD_W / 2, pp.y + CARD_H, pp.x + CARD_W / 2, midY, 'parent');
      });
      drawLine(Math.min(...parentXs), midY, Math.max(...parentXs), midY, 'parent');
      drawLine(midX, midY, childPos.x + CARD_W / 2, midY, 'parent');
      drawLine(childPos.x + CARD_W / 2, midY, childPos.x + CARD_W / 2, childPos.y, 'parent');
    });
  }

  function drawLine(x1, y1, x2, y2, kind) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', kind === 'spouse' ? '#c9a877' : '#b7b0a3');
    line.setAttribute('stroke-width', kind === 'spouse' ? 2.5 : 1.75);
    line.setAttribute('stroke-linecap', 'round');
    if (kind === 'spouse') line.setAttribute('stroke-dasharray', '1,5');
    els.linesSvg.appendChild(line);
  }

  function formatYear(dateStr) {
    if (!dateStr) return '';
    const m = /^(\d{4})/.exec(dateStr);
    return m ? m[1] : dateStr;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Panel: open/close ----------
  function openOverlay() {
    els.overlay.hidden = false;
    els.detailPanel.hidden = false;
  }
  function closePanel() {
    els.overlay.hidden = true;
    els.detailPanel.hidden = true;
    els.detailPanelContent.innerHTML = '';
  }
  els.closePanelBtn.addEventListener('click', closePanel);
  els.overlay.addEventListener('click', closePanel);

  // ---------- Add new person (blank) ----------
  els.addPersonBtn.addEventListener('click', () => openPersonForm(null));

  function openPersonForm(existingPerson, opts = {}) {
    const isNew = !existingPerson;
    const p = existingPerson || {};
    els.detailPanelContent.innerHTML = `
      <h2>${isNew ? 'Person hinzufügen' : 'Bearbeiten: ' + escapeHtml(fullName(p))}</h2>
      <form id="personForm">
        <div class="field-row">
          <div class="field"><label>Vorname</label><input name="firstName" value="${escapeHtml(p.firstName || '')}" /></div>
          <div class="field"><label>Nachname</label><input name="lastName" value="${escapeHtml(p.lastName || '')}" /></div>
        </div>
        <div class="field"><label>Geburtsname</label><input name="maidenName" value="${escapeHtml(p.maidenName || '')}" /></div>
        <div class="field">
          <label>Geschlecht</label>
          <select name="gender">
            <option value="" ${!p.gender ? 'selected' : ''}>—</option>
            <option value="male" ${p.gender === 'male' ? 'selected' : ''}>Männlich</option>
            <option value="female" ${p.gender === 'female' ? 'selected' : ''}>Weiblich</option>
            <option value="other" ${p.gender === 'other' ? 'selected' : ''}>Divers</option>
          </select>
        </div>
        <div class="field-row">
          <div class="field"><label>Geburtsdatum</label><input type="date" name="birthDate" value="${p.birthDate || ''}" /></div>
          <div class="field"><label>Sterbedatum</label><input type="date" name="deathDate" value="${p.deathDate || ''}" /></div>
        </div>
        <div class="field"><label>Geburtsort</label><input name="birthPlace" value="${escapeHtml(p.birthPlace || '')}" /></div>
        <div class="field"><label>Notizen</label><textarea name="notes" rows="4">${escapeHtml(p.notes || '')}</textarea></div>
        <div class="panel-actions">
          <button type="submit" class="btn btn-primary">${isNew ? 'Hinzufügen' : 'Speichern'}</button>
          <button type="button" class="btn" id="cancelFormBtn">Abbrechen</button>
        </div>
      </form>
    `;
    openOverlay();
    document.getElementById('cancelFormBtn').addEventListener('click', () => {
      if (opts.onCancel) opts.onCancel();
      else closePanel();
    });
    document.getElementById('personForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      try {
        let saved;
        if (isNew) {
          saved = await api('/api/people', { method: 'POST', body: JSON.stringify(payload) });
        } else {
          saved = await api(`/api/people/${p.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        }
        await loadState();
        if (opts.onCreated) {
          opts.onCreated(saved.id);
        } else {
          openDetailPanel(saved.id);
        }
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // ---------- Detail panel ----------
  function openDetailPanel(personId) {
    const p = personById(personId);
    if (!p) return closePanel();

    const parents = parentsOf(personId);
    const children = childrenOf(personId);
    const spouses = spousesOf(personId);

    els.detailPanelContent.innerHTML = `
      <h2>${escapeHtml(fullName(p))} ${p.id === state.me ? '<span class="me-tag">Du</span>' : ''}</h2>
      ${p.maidenName ? `<p class="muted">geb. ${escapeHtml(p.maidenName)}</p>` : ''}
      ${p.birthPlace ? `<p class="muted">Geboren in ${escapeHtml(p.birthPlace)}</p>` : ''}
      ${p.birthDate || p.deathDate ? `<p class="muted">${p.birthDate || '?'} – ${p.deathDate || 'heute'}</p>` : ''}
      ${p.notes ? `<p>${escapeHtml(p.notes)}</p>` : ''}

      <div class="section-title">Fotos</div>
      <div class="photo-grid" id="photoGrid"></div>
      <input type="file" id="photoInput" accept="image/*" style="display:none" />
      <button class="btn btn-small" id="addPhotoBtn">+ Foto hinzufügen</button>

      <div class="section-title">Eltern</div>
      <ul class="rel-list" id="parentsList"></ul>
      <button class="btn btn-small" id="addParentBtn">+ Elternteil hinzufügen</button>

      <div class="section-title">Partner:in</div>
      <ul class="rel-list" id="spousesList"></ul>
      <button class="btn btn-small" id="addSpouseBtn">+ Partner:in hinzufügen</button>

      <div class="section-title">Kinder</div>
      <ul class="rel-list" id="childrenList"></ul>
      <button class="btn btn-small" id="addChildBtn">+ Kind hinzufügen</button>

      <div class="panel-actions">
        <button class="btn" id="editPersonBtn">Bearbeiten</button>
        <button class="btn btn-danger" id="deletePersonBtn">Löschen</button>
      </div>
    `;
    openOverlay();

    renderPhotoGrid(p);
    renderRelList('parentsList', parents, (rel) => removeParentChild(rel.id, personId, personId));
    renderRelList('spousesList', spouses, (rel) => removeSpouse(personId, rel.id, personId));
    renderRelList('childrenList', children, (rel) => removeParentChild(personId, rel.id, personId));

    document.getElementById('editPersonBtn').addEventListener('click', () => openPersonForm(p));
    document.getElementById('deletePersonBtn').addEventListener('click', () => deletePerson(p));
    document.getElementById('addPhotoBtn').addEventListener('click', () => document.getElementById('photoInput').click());
    document.getElementById('photoInput').addEventListener('change', (e) => uploadPhoto(p.id, e.target.files[0]));
    document.getElementById('addParentBtn').addEventListener('click', () => openRelativePicker('parent', p));
    document.getElementById('addSpouseBtn').addEventListener('click', () => openRelativePicker('spouse', p));
    document.getElementById('addChildBtn').addEventListener('click', () => openRelativePicker('child', p));
  }

  function renderPhotoGrid(p) {
    const grid = document.getElementById('photoGrid');
    grid.innerHTML = '';
    (p.photos || []).forEach((photo) => {
      const div = document.createElement('div');
      div.className = 'photo-thumb';
      div.innerHTML = `<img src="/uploads/${photo.filename}" alt="" /><button class="remove-photo" title="Entfernen">×</button>`;
      div.querySelector('.remove-photo').addEventListener('click', async () => {
        await api(`/api/people/${p.id}/photos/${photo.id}`, { method: 'DELETE' });
        await loadState();
        openDetailPanel(p.id);
      });
      grid.appendChild(div);
    });
  }

  async function uploadPhoto(personId, file) {
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    try {
      await api(`/api/people/${personId}/photos`, { method: 'POST', body: JSON.stringify({ dataUrl }) });
      await loadState();
      openDetailPanel(personId);
    } catch (err) {
      alert(err.message);
    }
  }

  function renderRelList(elId, list, onRemove) {
    const ul = document.getElementById(elId);
    if (!list.length) {
      ul.innerHTML = '<li class="muted">Noch keine</li>';
      return;
    }
    ul.innerHTML = '';
    list.forEach((person) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = fullName(person);
      link.style.color = 'inherit';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openDetailPanel(person.id);
      });
      li.appendChild(link);
      const btn = document.createElement('button');
      btn.className = 'rel-remove';
      btn.textContent = 'entfernen';
      btn.addEventListener('click', () => onRemove(person));
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  async function removeParentChild(parentId, childId, reopenId) {
    const rel = state.relationships.find(
      (r) => r.type === 'parent-child' && r.fromId === parentId && r.toId === childId
    );
    if (!rel) return;
    if (!confirm('Diese Eltern-Kind-Verbindung entfernen?')) return;
    await api(`/api/relationships/${rel.id}`, { method: 'DELETE' });
    await loadState();
    openDetailPanel(reopenId);
  }

  async function removeSpouse(aId, bId, reopenId) {
    const rel = state.relationships.find(
      (r) => r.type === 'spouse' && ((r.fromId === aId && r.toId === bId) || (r.fromId === bId && r.toId === aId))
    );
    if (!rel) return;
    if (!confirm('Diese Partnerschaft entfernen?')) return;
    await api(`/api/relationships/${rel.id}`, { method: 'DELETE' });
    await loadState();
    openDetailPanel(reopenId);
  }

  async function deletePerson(p) {
    if (!confirm(`${fullName(p)} löschen? Das entfernt auch Verbindungen und Fotos.`)) return;
    await api(`/api/people/${p.id}`, { method: 'DELETE' });
    await loadState();
    closePanel();
  }

  // ---------- Relative picker: choose existing person or create new ----------
  function openRelativePicker(kind, anchorPerson) {
    const label = { parent: 'Elternteil', spouse: 'Partner:in', child: 'Kind' }[kind];
    const candidates = state.people.filter((p) => p.id !== anchorPerson.id);
    els.detailPanelContent.innerHTML = `
      <h2>${label} für ${escapeHtml(fullName(anchorPerson))} hinzufügen</h2>
      <button class="btn btn-primary btn-small" id="createNewBtn">+ Neue Person anlegen</button>
      <p class="hint">…oder eine vorhandene Person auswählen:</p>
      <div class="picker-list" id="pickerList"></div>
      <div class="panel-actions">
        <button class="btn" id="backBtn">Zurück</button>
      </div>
    `;
    const list = document.getElementById('pickerList');
    if (!candidates.length) {
      list.innerHTML = '<p class="muted" style="padding:8px">Noch keine anderen Personen.</p>';
    }
    candidates.forEach((c) => {
      const btn = document.createElement('button');
      btn.textContent = fullName(c);
      btn.addEventListener('click', () => linkRelative(kind, anchorPerson, c.id));
      list.appendChild(btn);
    });
    document.getElementById('createNewBtn').addEventListener('click', () => {
      openPersonForm(null, {
        onCreated: (newId) => linkRelative(kind, anchorPerson, newId),
        onCancel: () => openDetailPanel(anchorPerson.id),
      });
    });
    document.getElementById('backBtn').addEventListener('click', () => openDetailPanel(anchorPerson.id));
  }

  async function linkRelative(kind, anchorPerson, otherId) {
    try {
      let body;
      if (kind === 'parent') body = { type: 'parent-child', fromId: otherId, toId: anchorPerson.id };
      else if (kind === 'child') body = { type: 'parent-child', fromId: anchorPerson.id, toId: otherId };
      else body = { type: 'spouse', fromId: anchorPerson.id, toId: otherId };
      await api('/api/relationships', { method: 'POST', body: JSON.stringify(body) });
      await loadState();
      openDetailPanel(anchorPerson.id);
    } catch (err) {
      alert(err.message);
    }
  }

  // ---------- Search ----------
  els.searchBox.addEventListener('input', (e) => {
    state.search = e.target.value;
    render();
  });

  checkAuth();
})();
