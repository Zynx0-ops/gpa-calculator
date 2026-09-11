/**
 * gpa.js — Pure GPA logic. No DOM, no side effects.
 * Exposed as window.GPA so the app runs from file:// without a build step.
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Grade scale — standard 4.0 scale with +/- increments.
   * `min` is the lowest percentage that still earns this letter.
   * ------------------------------------------------------------------ */
  var GRADE_SCALE = [
    { letter: 'A+', points: 4.33, min: 97 },
    { letter: 'A',  points: 4.0, min: 93 },
    { letter: 'A-', points: 3.7, min: 90 },
    { letter: 'B+', points: 3.3, min: 87 },
    { letter: 'B',  points: 3.0, min: 83 },
    { letter: 'B-', points: 2.7, min: 80 },
    { letter: 'C+', points: 2.3, min: 77 },
    { letter: 'C',  points: 2.0, min: 73 },
    { letter: 'C-', points: 1.7, min: 70 },
    { letter: 'D+', points: 1.3, min: 67 },
    { letter: 'D',  points: 1.0, min: 63 },
    { letter: 'D-', points: 0.7, min: 60 },
    { letter: 'F',  points: 0.0, min: 0  }
  ];

  /* ------------------------------------------------------------------ *
   * Class types and their weighted-GPA boosts.
   * ------------------------------------------------------------------ */
  var CLASS_TYPES = [
    { id: 'regular', label: 'Regular', short: 'Reg',    boost: 0.0 },
    { id: 'honors',  label: 'Honors',  short: 'Honors', boost: 0.5 },
    { id: 'ap',      label: 'AP',      short: 'AP',     boost: 1.0 },
    { id: 'ib',      label: 'IB',      short: 'IB',     boost: 1.0 }
  ];

  var TYPE_BY_ID = CLASS_TYPES.reduce(function (map, t) {
    map[t.id] = t;
    return map;
  }, {});

  var GRADE_BY_LETTER = GRADE_SCALE.reduce(function (map, g) {
    map[g.letter] = g;
    return map;
  }, {});

  /** Highest GPA reachable on each scale — used for the meter fills. */
  var MAX_UNWEIGHTED = GRADE_SCALE.reduce(function (max, g) {
    return Math.max(max, g.points);
  }, 0);
  var MAX_WEIGHTED = CLASS_TYPES.reduce(function (max, t) {
    return Math.max(max, MAX_UNWEIGHTED + t.boost);
  }, MAX_UNWEIGHTED);

  /** Clamp a number into [min, max]. */
  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  /** Map a 0–100 percentage onto a letter grade. */
  function letterFromPercent(percent) {
    var p = clamp(Number(percent) || 0, 0, 100);
    for (var i = 0; i < GRADE_SCALE.length; i++) {
      if (p >= GRADE_SCALE[i].min) return GRADE_SCALE[i].letter;
    }
    return 'F';
  }

  /** Grade points for a letter, or 0 if the letter is unknown. */
  function pointsForLetter(letter) {
    var entry = GRADE_BY_LETTER[letter];
    return entry ? entry.points : 0;
  }

  /** Boost for a class type id, or 0 if unknown. */
  function boostForType(typeId) {
    var type = TYPE_BY_ID[typeId];
    return type ? type.boost : 0;
  }

  /**
   * Unweighted points for one course: the raw 4.0-scale value.
   * A course is `{ letter, type }`; `percent` is optional metadata.
   */
  function unweightedPoints(course) {
    return pointsForLetter(course && course.letter);
  }

  /**
   * Weighted points for one course: base points plus the type boost.
   * A failing grade earns no boost — an F is an F in any class.
   */
  function weightedPoints(course) {
    var base = unweightedPoints(course);
    if (base <= 0) return 0;
    return base + boostForType(course && course.type);
  }

  /** Decimal places each GPA is calculated and displayed to. */
  var PRECISION = { weighted: 3, unweighted: 2 };

  /** Round to `places` decimals without floating-point drift. */
  function roundTo(n, places) {
    var factor = Math.pow(10, places);
    return Math.round((n + Number.EPSILON) * factor) / factor;
  }

  /**
   * Calculate both GPAs across a list of courses.
   * Every course counts equally (one course = one unit).
   * Returns { count, unweighted, weighted, unweightedTotal, weightedTotal }.
   */
  function calculate(courses) {
    var list = Array.isArray(courses) ? courses : [];
    var count = list.length;

    if (count === 0) {
      return {
        count: 0,
        unweighted: 0,
        weighted: 0,
        unweightedTotal: 0,
        weightedTotal: 0
      };
    }

    var unweightedTotal = 0;
    var weightedTotal = 0;

    for (var i = 0; i < count; i++) {
      unweightedTotal += unweightedPoints(list[i]);
      weightedTotal += weightedPoints(list[i]);
    }

    return {
      count: count,
      unweighted: roundTo(unweightedTotal / count, PRECISION.unweighted),
      weighted: roundTo(weightedTotal / count, PRECISION.weighted),
      unweightedTotal: roundTo(unweightedTotal, 2),
      weightedTotal: roundTo(weightedTotal, 2)
    };
  }

  global.GPA = {
    GRADE_SCALE: GRADE_SCALE,
    CLASS_TYPES: CLASS_TYPES,
    MAX_UNWEIGHTED: MAX_UNWEIGHTED,
    MAX_WEIGHTED: MAX_WEIGHTED,
    PRECISION: PRECISION,
    letterFromPercent: letterFromPercent,
    pointsForLetter: pointsForLetter,
    boostForType: boostForType,
    unweightedPoints: unweightedPoints,
    weightedPoints: weightedPoints,
    calculate: calculate,
    clamp: clamp,
    roundTo: roundTo
  };
})(window);
