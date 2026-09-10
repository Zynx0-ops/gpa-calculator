# GPA

A weighted and unweighted GPA calculator. Minimal black-and-cream design, liquid-glass
surfaces, no build step and no dependencies — open `index.html` and it runs.

## Run it

Open `index.html` in a browser. That's it.

To serve it over HTTP instead:

```bash
python3 -m http.server 4173
```

## Features

- Add, edit and remove classes; both GPAs recalculate in real time
- Grades by letter (A+ through F) or by percentage, which maps to a letter automatically
- Class types: Regular, Honors (+0.5), AP (+1.0), IB (+1.0)
- Weighted and unweighted GPA side by side, each with a scale meter
- Undo for individual deletes and for "Clear all"
- Dark and light (cream) themes, remembered per device
- Classes persist in `localStorage`
- Responsive down to phone widths; honors `prefers-reduced-motion`

## Grading

Standard 4.0 scale with +/- increments:

| A+ | A | A- | B+ | B | B- | C+ | C | C- | D+ | D | D- | F |
|----|---|----|----|---|----|----|---|----|----|---|----|---|
| 4.0 | 4.0 | 3.7 | 3.3 | 3.0 | 2.7 | 2.3 | 2.0 | 1.7 | 1.3 | 1.0 | 0.7 | 0.0 |

Percentages map as 97+ = A+, 93 = A, 90 = A-, 87 = B+, and so on down in three-point bands.

The weighted GPA adds the class-type boost to each class's grade points. A failing grade
earns no boost, and every class counts equally — there are no credit-hour weights.

Weighting varies between schools. Check yours before trusting the weighted number.

## Layout

```
index.html      markup
styles.css      design tokens, glass surfaces, layout, motion
js/gpa.js       grade scale, weights, GPA math — pure functions, no DOM
js/app.js       state, rendering, events
```

All grading logic lives in `js/gpa.js`, separate from the UI. To change the scale or the
weights, edit `GRADE_SCALE` and `CLASS_TYPES` there — the dropdowns, the reference panel
and the meters all read from those two tables.
