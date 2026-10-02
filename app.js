(() => {
  const DEBOUNCE_MS = 200;
  const REPO_URL = 'https://github.com/ferdous-gp/telco-jargons';
  const MAX_RESULTS = 8;

  const input = document.getElementById('search');
  const wrap = document.getElementById('search-wrap');
  const list = document.getElementById('suggestions');
  const empty = document.getElementById('empty');
  const emptyText = document.getElementById('empty-text');
  const request = document.getElementById('request');
  const requestTerm = document.getElementById('request-term');
  const result = document.getElementById('result');
  const resultAbbr = document.getElementById('result-abbr');
  const resultFull = document.getElementById('result-full');
  const resultDesc = document.getElementById('result-desc');

  let jargons = [];
  let matches = [];
  let active = -1;
  let timer;

  const debounce = (fn, ms) => (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };

  const escapeHtml = (s) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const highlight = (text, q) => {
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (!q || i < 0) return escapeHtml(text);
    return (
      escapeHtml(text.slice(0, i)) +
      '<mark class="rounded-sm bg-sky-100 px-0.5 font-semibold text-slate-900">' +
      escapeHtml(text.slice(i, i + q.length)) +
      '</mark>' +
      escapeHtml(text.slice(i + q.length))
    );
  };

  // Rank: exact abbr > abbr prefix > abbr contains > full form contains.
  const search = (q) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const scored = [];
    for (const j of jargons) {
      const abbr = j.abbr.toLowerCase();
      const full = j.full.toLowerCase();
      let score = -1;
      if (abbr === needle) score = 0;
      else if (abbr.startsWith(needle)) score = 1;
      else if (abbr.includes(needle)) score = 2;
      else if (full.includes(needle)) score = 3;
      if (score >= 0) scored.push({ j, score });
    }
    scored.sort((a, b) => a.score - b.score || a.j.abbr.localeCompare(b.j.abbr));
    return scored.slice(0, MAX_RESULTS).map((s) => s.j);
  };

  const close = () => {
    list.hidden = true;
    list.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };

  const setActive = (i) => {
    const items = list.querySelectorAll('[role="option"]');
    if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach((el, idx) => {
      const on = idx === active;
      el.setAttribute('aria-selected', String(on));
      el.classList.toggle('bg-sky-100', on);
    });
    input.setAttribute('aria-activedescendant', items[active].id);
    items[active].scrollIntoView({ block: 'nearest' });
  };

  // Prefilled GitHub issue so a missing term can be added to jargon.json.
  const setRequestLink = (term) => {
    const params = new URLSearchParams({
      title: `Add jargon: ${term}`,
      labels: 'jargon-request',
      body: [
        `**Abbreviation:** ${term}`,
        '**Full form:** <!-- if you know it -->',
        '**Description (optional):**',
        '',
        '_Requested from the Telco Jargons search page._',
      ].join('\n'),
    });
    request.href = `${REPO_URL}/issues/new?${params}`;
    requestTerm.textContent = term;
  };

  const render = (q) => {
    matches = search(q);
    empty.hidden = !(q.trim() && matches.length === 0);
    if (!empty.hidden) setRequestLink(q.trim());
    if (!matches.length) return close();

    list.innerHTML = matches
      .map(
        (j, i) => `
        <li id="opt-${i}" role="option" aria-selected="false" data-index="${i}" style="animation-delay:${i * 30}ms"
            class="flex animate-fade-up cursor-pointer items-baseline gap-4 px-6 py-3 text-lg transition-colors hover:bg-sky-50">
          <span class="w-24 shrink-0 font-semibold text-sky-600">${highlight(j.abbr, q.trim())}</span>
          <span class="truncate text-slate-700">${highlight(j.full, q.trim())}</span>
        </li>`
      )
      .join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    active = -1;
  };

  const select = (j) => {
    if (!j) return;
    input.value = j.abbr;
    resultAbbr.textContent = j.abbr;
    resultFull.textContent = j.full;
    resultDesc.textContent = j.description || '';
    resultDesc.hidden = !j.description;
    result.hidden = false;
    empty.hidden = true;
    close();
  };

  const stopTyping = () => wrap.classList.remove('is-typing');

  const onInput = debounce(() => {
    stopTyping();
    result.hidden = true;
    render(input.value);
  }, DEBOUNCE_MS);

  input.addEventListener('input', () => {
    // Restart the glow + sweep bar on every keystroke.
    stopTyping();
    void wrap.offsetWidth;
    if (input.value) wrap.classList.add('is-typing');
    onInput();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && !list.hidden) {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === 'ArrowUp' && !list.hidden) {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(timer);
      stopTyping();
      if (list.hidden) render(input.value);
      select(matches[active >= 0 ? active : 0]);
    } else if (e.key === 'Escape') {
      close();
    }
  });

  // mousedown fires before blur, so the click isn't lost when the list closes.
  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('[role="option"]');
    if (!li) return;
    e.preventDefault();
    select(matches[Number(li.dataset.index)]);
  });

  input.addEventListener('blur', close);
  input.addEventListener('focus', () => {
    if (input.value && result.hidden) render(input.value);
  });

  // Press "/" anywhere to jump back to the search box.
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });

  fetch(`jargon.json?t=${Date.now()}`)
    .then((r) => r.json())
    .then((data) => {
      jargons = data;
      document.getElementById('count').textContent = `${data.length} jargons`;
      document.body.dataset.ready = 'true';
      if (input.value) render(input.value);
    })
    .catch(() => {
      emptyText.textContent = 'Could not load jargon.json.';
      request.hidden = true;
      empty.hidden = false;
    });

  input.focus();
})();
