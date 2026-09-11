/**
 * app.js — UI state and rendering. All GPA math lives in js/gpa.js.
 */
(function (window, document, GPA) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Setup
   * ------------------------------------------------------------------ */

  var STORE_KEY = 'gpa.courses.v1';
  var THEME_KEY = 'gpa.theme.v1';

  var $ = function (id) { return document.getElementById(id); };

  var el = {
    root: document.documentElement,
    themeToggle: $('themeToggle'),
    weightedValue: $('weightedValue'),
    unweightedValue: $('unweightedValue'),
    weightedMeter: $('weightedMeter'),
    unweightedMeter: $('unweightedMeter'),
    weightedFoot: $('weightedFoot'),
    unweightedFoot: $('unweightedFoot'),
    weightedScale: $('weightedScale'),
    unweightedScale: $('unweightedScale'),
    addForm: $('addForm'),
    nameInput: $('nameInput'),
    letterInput: $('letterInput'),
    percentInput: $('percentInput'),
    percentHint: $('percentHint'),
    letterWrap: $('letterWrap'),
    percentWrap: $('percentWrap'),
    typeInput: $('typeInput'),
    modeSwitch: $('modeSwitch'),
    rows: $('rows'),
    empty: $('empty'),
    countPill: $('countPill'),
    clearAll: $('clearAll'),
    scaleChips: $('scaleChips'),
    boostChips: $('boostChips'),
    toast: $('toast')
  };

  /** courses: [{ id, name, letter, type, percent|null }] */
  var courses = [];
  var gradeMode = 'letter';
  var nodesById = Object.create(null);

  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  /* ------------------------------------------------------------------ *
   * Persistence
   * ------------------------------------------------------------------ */

  function safeStorage(fn, fallback) {
    try { return fn(); } catch (err) { return fallback; }
  }

  function load() {
    var raw = safeStorage(function () { return localStorage.getItem(STORE_KEY); }, null);
    if (!raw) return [];

    var parsed = safeStorage(function () { return JSON.parse(raw); }, null);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(function (c) { return c && typeof c === 'object'; })
      .map(function (c) {
        return {
          id: String(c.id || uid()),
          name: typeof c.name === 'string' ? c.name : '',
          letter: isKnownLetter(c.letter) ? c.letter : 'A',
          type: isKnownType(c.type) ? c.type : 'regular',
          percent: typeof c.percent === 'number' ? c.percent : null
        };
      });
  }

  function isKnownLetter(letter) {
    return GPA.GRADE_SCALE.some(function (g) { return g.letter === letter; });
  }

  function isKnownType(typeId) {
    return GPA.CLASS_TYPES.some(function (t) { return t.id === typeId; });
  }

  function save() {
    safeStorage(function () {
      localStorage.setItem(STORE_KEY, JSON.stringify(courses));
    });
  }

  function uid() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ------------------------------------------------------------------ *
   * Theme
   * ------------------------------------------------------------------ */

  function initTheme() {
    var saved = safeStorage(function () { return localStorage.getItem(THEME_KEY); }, null);
    var prefersLight = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches;
    setTheme(saved || (prefersLight ? 'light' : 'dark'));
  }

  function setTheme(theme) {
    el.root.setAttribute('data-theme', theme);
    safeStorage(function () { localStorage.setItem(THEME_KEY, theme); });
  }

  el.themeToggle.addEventListener('click', function () {
    setTheme(el.root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  /* ------------------------------------------------------------------ *
   * Option builders
   * ------------------------------------------------------------------ */

  /** Grade points with as many decimals as they need: 4.0, 3.7, 4.33. */
  function formatPoints(n) {
    var two = n.toFixed(2);
    return two.charAt(two.length - 1) === '0' ? n.toFixed(1) : two;
  }

  /**
   * The composer spells out each grade's points and each type's boost.
   * Rows omit both — their points column already shows the result, and
   * phone-width cells have no room for the longer labels.
   */
  function gradeOptionsHTML(selected, withPoints) {
    return GPA.GRADE_SCALE.map(function (g) {
      var points = withPoints ? ' &nbsp;·&nbsp; ' + formatPoints(g.points) : '';
      return '<option value="' + g.letter + '"' +
        (g.letter === selected ? ' selected' : '') + '>' + g.letter + points + '</option>';
    }).join('');
  }

  function typeOptionsHTML(selected, withBoost) {
    return GPA.CLASS_TYPES.map(function (t) {
      var boost = withBoost && t.boost > 0 ? ' &nbsp;·&nbsp; +' + t.boost.toFixed(1) : '';
      return '<option value="' + t.id + '"' +
        (t.id === selected ? ' selected' : '') + '>' + t.label + boost + '</option>';
    }).join('');
  }

  function buildReference() {
    el.scaleChips.innerHTML = GPA.GRADE_SCALE.map(function (g) {
      return '<li><b>' + g.letter + '</b><span>' + formatPoints(g.points) + '</span></li>';
    }).join('');

    el.boostChips.innerHTML = GPA.CLASS_TYPES.map(function (t) {
      return '<li><b>' + t.label + '</b><span>' +
        (t.boost > 0 ? '+' + t.boost.toFixed(1) : 'no boost') + '</span></li>';
    }).join('');
  }

  /* ------------------------------------------------------------------ *
   * Rows
   * ------------------------------------------------------------------ */

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function pointsMarkup(course) {
    var weighted = GPA.weightedPoints(course);
    var unweighted = GPA.unweightedPoints(course);
    var boosted = weighted > unweighted;
    return '<span class="pts-w">' + formatPoints(weighted) + '</span>' +
      '<span class="pts-u">' + (boosted ? formatPoints(unweighted) + ' base' : 'unweighted') + '</span>';
  }

  function buildRow(course) {
    var li = document.createElement('li');
    li.className = 'row';
    li.dataset.id = course.id;

    li.innerHTML =
      '<input class="input row-name" type="text" value="' + escapeHTML(course.name) + '" ' +
        'maxlength="60" spellcheck="false" aria-label="Class name" placeholder="Untitled class" />' +
      '<div class="cell-grade select-wrap">' +
        '<select class="input select row-grade" aria-label="Letter grade">' +
          gradeOptionsHTML(course.letter) +
        '</select>' +
      '</div>' +
      '<div class="cell-type select-wrap">' +
        '<select class="input select row-type" aria-label="Class type">' +
          typeOptionsHTML(course.type) +
        '</select>' +
      '</div>' +
      '<div class="pts" title="Weighted points">' + pointsMarkup(course) + '</div>' +
      '<button class="del" type="button" aria-label="Remove ' +
        escapeHTML(course.name || 'class') + '">' +
        '<svg class="icon" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" ' +
        'stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '</button>';

    var nameInput = li.querySelector('.row-name');
    var gradeSelect = li.querySelector('.row-grade');
    var typeSelect = li.querySelector('.row-type');

    nameInput.addEventListener('input', function () {
      course.name = nameInput.value;
      save();
    });

    gradeSelect.addEventListener('change', function () {
      course.letter = gradeSelect.value;
      course.percent = null; // an explicit letter overrides the original percentage
      refreshRow(li, course);
      commit();
    });

    typeSelect.addEventListener('change', function () {
      course.type = typeSelect.value;
      refreshRow(li, course);
      commit();
    });

    li.querySelector('.del').addEventListener('click', function () {
      removeCourse(course.id);
    });

    nodesById[course.id] = li;
    return li;
  }

  function refreshRow(li, course) {
    var pts = li.querySelector('.pts');
    pts.innerHTML = pointsMarkup(course);
    pts.classList.toggle('is-boosted', GPA.weightedPoints(course) > GPA.unweightedPoints(course));
  }

  function renderAll() {
    nodesById = Object.create(null);
    var frag = document.createDocumentFragment();
    courses.forEach(function (course) { frag.appendChild(buildRow(course)); });
    el.rows.innerHTML = '';
    el.rows.appendChild(frag);
    updateChrome();
  }

  /* ------------------------------------------------------------------ *
   * Mutations
   * ------------------------------------------------------------------ */

  function addCourse(course) {
    courses.push(course);
    var li = buildRow(course);
    li.classList.add('is-entering');
    li.addEventListener('animationend', function () {
      li.classList.remove('is-entering');
    }, { once: true });
    el.rows.appendChild(li);
    commit();
  }

  function removeCourse(id) {
    var index = courses.findIndex(function (c) { return c.id === id; });
    if (index === -1) return;

    var removed = courses[index];
    var li = nodesById[id];
    courses.splice(index, 1);
    delete nodesById[id];
    commit();

    var drop = function () {
      if (li && li.parentNode) li.parentNode.removeChild(li);
    };

    if (li && !reduceMotion.matches) {
      li.classList.add('is-leaving');
      li.addEventListener('animationend', drop, { once: true });
      window.setTimeout(drop, 400); // safety net if the animation never fires
    } else {
      drop();
    }

    showToast('Removed ' + (removed.name || 'class'), 'Undo', function () {
      courses.splice(Math.min(index, courses.length), 0, removed);
      renderAll();
      commit();
    });
  }

  function clearAllCourses() {
    if (courses.length === 0) return;
    var snapshot = courses.slice();
    courses = [];
    renderAll();
    commit();

    showToast('Cleared ' + snapshot.length + ' class' + (snapshot.length === 1 ? '' : 'es'),
      'Undo', function () {
        courses = snapshot;
        renderAll();
        commit();
      });
  }

  /** Persist + recompute everything that depends on the course list. */
  function commit() {
    save();
    updateChrome();
    updateScores();
  }

  /* ------------------------------------------------------------------ *
   * Score display
   * ------------------------------------------------------------------ */

  var tweens = Object.create(null);

  /**
   * Animate a number readout from its current value to `target`.
   * Animation frames are a nicety, not the source of truth: they stall in
   * background tabs and occluded windows, so a timer guarantees the final
   * value always lands.
   */
  function tweenValue(node, key, target, decimals) {
    var state = tweens[key] || (tweens[key] = { value: 0, raf: 0, guard: 0 });
    var from = state.value;
    var duration = 520;

    if (state.raf) cancelAnimationFrame(state.raf);
    if (state.guard) window.clearTimeout(state.guard);

    var settle = function () {
      if (state.raf) cancelAnimationFrame(state.raf);
      window.clearTimeout(state.guard);
      state.raf = 0;
      state.guard = 0;
      state.value = target;
      node.textContent = target.toFixed(decimals);
    };

    if (reduceMotion.matches || document.hidden ||
        Math.abs(target - from) < 0.5 * Math.pow(10, -decimals)) {
      settle();
      return;
    }

    var start = performance.now();

    var step = function (now) {
      var t = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
      if (t < 1) {
        node.textContent = (from + (target - from) * eased).toFixed(decimals);
        state.raf = requestAnimationFrame(step);
      } else {
        settle();
      }
    };

    state.raf = requestAnimationFrame(step);
    state.guard = window.setTimeout(settle, duration + 140);
  }

  function updateScores() {
    var result = GPA.calculate(courses);

    tweenValue(el.weightedValue, 'weighted', result.weighted, GPA.PRECISION.weighted);
    tweenValue(el.unweightedValue, 'unweighted', result.unweighted, GPA.PRECISION.unweighted);

    el.weightedMeter.style.width = meterWidth(result.weighted, GPA.MAX_WEIGHTED);
    el.unweightedMeter.style.width = meterWidth(result.unweighted, GPA.MAX_UNWEIGHTED);

    var boosted = courses.filter(function (c) { return GPA.boostForType(c.type) > 0; }).length;

    el.weightedFoot.textContent = result.count === 0
      ? 'Includes Honors, AP and IB boosts'
      : boosted === 0
        ? 'No weighted classes yet'
        : boosted + ' weighted class' + (boosted === 1 ? '' : 'es');

    el.unweightedFoot.textContent = result.count === 0
      ? 'No classes yet'
      : result.count + ' class' + (result.count === 1 ? '' : 'es') +
        ' · ' + formatPoints(result.unweightedTotal) + ' total points';
  }

  function meterWidth(value, max) {
    return GPA.clamp(value / max * 100, 0, 100) + '%';
  }

  function updateChrome() {
    el.countPill.textContent = String(courses.length);
    el.empty.classList.toggle('is-hidden', courses.length > 0);
    el.clearAll.hidden = courses.length === 0;
  }

  /* ------------------------------------------------------------------ *
   * Composer
   * ------------------------------------------------------------------ */

  function setMode(mode) {
    gradeMode = mode;
    el.modeSwitch.dataset.mode = mode;

    Array.prototype.forEach.call(el.modeSwitch.querySelectorAll('.seg'), function (btn) {
      var on = btn.dataset.mode === mode;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });

    el.letterWrap.classList.toggle('is-hidden', mode !== 'letter');
    el.percentWrap.classList.toggle('is-hidden', mode !== 'percent');

    if (mode === 'percent') el.percentInput.focus();
  }

  el.modeSwitch.addEventListener('click', function (event) {
    var btn = event.target.closest('.seg');
    if (btn) setMode(btn.dataset.mode);
  });

  el.percentInput.addEventListener('input', function () {
    var raw = el.percentInput.value.trim();
    if (raw === '' || isNaN(Number(raw))) {
      el.percentHint.classList.remove('is-on');
      return;
    }
    el.percentHint.textContent = GPA.letterFromPercent(Number(raw));
    el.percentHint.classList.add('is-on');
  });

  el.addForm.addEventListener('submit', function (event) {
    event.preventDefault();

    var letter, percent = null;

    if (gradeMode === 'percent') {
      var raw = el.percentInput.value.trim();
      if (raw === '' || isNaN(Number(raw))) {
        nudge(el.percentInput);
        el.percentInput.focus();
        return;
      }
      percent = GPA.clamp(Number(raw), 0, 100);
      letter = GPA.letterFromPercent(percent);
    } else {
      letter = el.letterInput.value;
    }

    var name = el.nameInput.value.trim();

    addCourse({
      id: uid(),
      name: name || 'Class ' + (courses.length + 1),
      letter: letter,
      type: el.typeInput.value,
      percent: percent
    });

    // Keep grade and type — they are usually reused for the next class.
    el.nameInput.value = '';
    el.percentInput.value = '';
    el.percentHint.classList.remove('is-on');
    el.nameInput.focus();
  });

  el.clearAll.addEventListener('click', clearAllCourses);

  /** A short shake to flag an invalid field. */
  function nudge(node) {
    if (reduceMotion.matches || !node.animate) return;
    node.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(0)' }
      ],
      { duration: 320, easing: 'ease-in-out' }
    );
  }

  /* ------------------------------------------------------------------ *
   * Toast
   * ------------------------------------------------------------------ */

  var toastTimer = null;

  function showToast(message, actionLabel, onAction) {
    window.clearTimeout(toastTimer);
    el.toast.innerHTML = '';

    var text = document.createElement('span');
    text.textContent = message;
    el.toast.appendChild(text);

    if (actionLabel && onAction) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-ghost btn-sm';
      btn.style.marginLeft = '10px';
      btn.textContent = actionLabel;
      btn.addEventListener('click', function () {
        hideToast();
        onAction();
      });
      el.toast.appendChild(btn);
    }

    el.toast.style.pointerEvents = 'auto';
    el.toast.classList.add('is-on');
    toastTimer = window.setTimeout(hideToast, 4200);
  }

  function hideToast() {
    window.clearTimeout(toastTimer);
    el.toast.classList.remove('is-on');
    el.toast.style.pointerEvents = 'none';
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

  function init() {
    initTheme();
    el.letterInput.innerHTML = gradeOptionsHTML('A', true);
    el.typeInput.innerHTML = typeOptionsHTML('regular', true);
    buildReference();
    el.weightedScale.textContent = '/ ' + formatPoints(GPA.MAX_WEIGHTED);
    el.unweightedScale.textContent = '/ ' + formatPoints(GPA.MAX_UNWEIGHTED);
    setMode('letter');

    courses = load();
    renderAll();
    updateScores();
  }

  init();
})(window, document, window.GPA);
