/* Ontwikkelhulp (niet voor de live site): vergelijkt deze pagina met de oude versie
   in een verborgen iframe en geeft de CSS terug die nodig is om gelijk te renderen. */
window.FP = (() => {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'TEMPLATE', 'META', 'TITLE', 'BR', 'WBR', 'HEAD']);
  const REPLACED = new Set(['img', 'iframe', 'svg', 'canvas', 'video']);
  const INH = ['color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
    'text-transform', 'text-align', 'white-space', 'list-style-type', 'list-style-position', 'visibility',
    'border-collapse', 'word-break', 'overflow-wrap', 'text-indent', 'text-shadow', 'fill', 'pointer-events'];
  const SIDES = ['top', 'right', 'bottom', 'left'];
  const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  const FLEXC = ['flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'row-gap', 'column-gap'];
  const PLAIN = ['float', 'clear', 'z-index', 'flex-grow', 'flex-shrink', 'flex-basis', 'align-self', 'order',
    'box-sizing', 'max-width', 'min-width', 'max-height', 'overflow-x', 'overflow-y', 'opacity', 'transform',
    'box-shadow', 'background-color', 'vertical-align', 'text-decoration-line', 'text-overflow', 'table-layout',
    'aspect-ratio', 'filter'];
  const MUSTNOT = new Set(['width', 'height']); // '-' betekent hier: niet zetten

  const kids = e => [...e.children].filter(c => !SKIP.has(c.tagName.toUpperCase()));
  const cls = e => (e.getAttribute('class') || '').split(/\s+/).filter(Boolean);
  const px = v => (/^-?[\d.]+px$/.test(v) ? parseFloat(v) : null);
  const r2 = x => Math.round(x * 100) / 100;

  function same(p, a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (p === 'width' && a.endsWith('%') && b.endsWith('%')) return Math.abs(parseFloat(a) - parseFloat(b)) <= 0.06;
    const x = px(a), y = px(b);
    if (x !== null && y !== null) return Math.abs(x - y) <= 0.51;
    return false;
  }

  function mapDoc(doc) {
    const m = new Map();
    m.set('H', doc.documentElement);
    (function walk(e, key) {
      m.set(key, e);
      kids(e).forEach((c, i) => {
        const did = c.getAttribute('data-id');
        let k = did ? 'E' + did : (c.id ? 'I' + c.id : key + '/' + i);
        if (m.has(k)) { let n = 2; while (m.has(k + '#' + n)) n++; k = k + '#' + n; }
        walk(c, k);
      });
    })(doc.body, 'B');
    return m;
  }

  function contentWidth(win, e) {
    if (!e) return 0;
    const cs = win.getComputedStyle(e);
    return e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  }

  function lineHeight(g) {
    const lh = g('line-height');
    if (lh === 'normal') return lh;
    const r = parseFloat(lh) / parseFloat(g('font-size'));
    return Math.abs(r * 100 - Math.round(r * 100)) < 1e-4 ? String(Math.round(r * 100) / 100) : r2(parseFloat(lh)) + 'px';
  }

  function boxProps(g, o) {
    for (const s of SIDES) {
      o['margin-' + s] = g('margin-' + s);
      o['padding-' + s] = g('padding-' + s);
      const w = g('border-' + s + '-width');
      o['border-' + s + '-width'] = w;
      o['border-' + s + '-style'] = w === '0px' ? '-' : g('border-' + s + '-style');
      o['border-' + s + '-color'] = w === '0px' ? '-' : g('border-' + s + '-color');
    }
    for (const c of CORNERS) o['border-' + c + '-radius'] = g('border-' + c + '-radius');
    const pos = g('position');
    o.position = pos;
    for (const s of SIDES) o[s] = pos === 'static' ? '0px' : (pos === 'relative' || pos === 'sticky' ? g(s) : '-');
    const bi = g('background-image');
    o['background-image'] = bi;
    for (const p of ['background-size', 'background-position', 'background-repeat', 'background-attachment']) o[p] = bi === 'none' ? '-' : g(p);
  }

  function read(win, e, full) {
    const cs = win.getComputedStyle(e);
    const g = p => cs.getPropertyValue(p);
    const o = { display: g('display') };
    if (o.display === 'none' && !full) return o;
    boxProps(g, o);
    const flex = /flex|grid/.test(o.display);
    for (const p of FLEXC) o[p] = (flex || full) ? g(p) : '-';
    o['grid-template-columns'] = /grid/.test(o.display) ? g('grid-template-columns') : '-';
    for (const p of PLAIN) o[p] = g(p);
    const mh = g('min-height'); o['min-height'] = mh === 'auto' ? '0px' : mh;
    const mw = o['min-width']; o['min-width'] = mw === 'auto' ? '0px' : mw;
    for (const p of INH) o[p] = g(p);
    o['line-height'] = lineHeight(g);
    const tag = e.localName, rect = e.getBoundingClientRect(), par = e.parentElement;
    const pw = contentWidth(win, par);
    // auto-marges herkennen (gecentreerd blok)
    const ml = parseFloat(o['margin-left']), mr = parseFloat(o['margin-right']);
    if (o.display !== 'none' && ml > 0.5 && Math.abs(ml - mr) <= 1 && Math.abs(rect.width + ml + mr - pw) <= 1.5) {
      o['margin-left'] = o['margin-right'] = 'auto';
    }
    o.width = '-'; o.height = '-'; o.__pw = pw;
    o['object-fit'] = '-';
    if (REPLACED.has(tag)) {
      o['object-fit'] = g('object-fit');
      o.width = Math.abs(rect.width - pw) <= 1 ? '100%' : r2(rect.width) + 'px';
      if (tag === 'img' && e.naturalWidth && Math.abs(rect.width * e.naturalHeight / e.naturalWidth - rect.height) <= 1.5) o.height = 'auto';
      else o.height = r2(rect.height) + 'px';
    } else if (cls(e).includes('elementor-column') && pw > 0) {
      o.width = r2(rect.width / pw * 100) + '%';
    } else if (kids(e).length === 0 && !e.textContent.trim() && o.display !== 'inline') {
      o.height = g('height');
      if (o.position === 'absolute' || o.position === 'fixed' || /inline-/.test(o.display)) o.width = g('width');
    }
    return o;
  }

  function readPseudo(win, e, ps) {
    const cs = win.getComputedStyle(e, ps);
    const g = p => cs.getPropertyValue(p);
    const c = g('content');
    if (c === 'none' || c === 'normal' || c === '') return { content: 'none' };
    const o = { content: c, display: g('display') };
    boxProps(g, o);
    if (o.position === 'absolute' || o.position === 'fixed') for (const s of SIDES) o[s] = g(s);
    for (const p of ['width', 'height', 'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'transform',
      'opacity', 'z-index', 'vertical-align', 'box-shadow', 'background-color', 'float', 'clear', 'flex-grow',
      'flex-shrink', 'flex-basis', 'text-align', 'overflow-x', 'overflow-y']) o[p] = g(p);
    o['line-height'] = lineHeight(g);
    return o;
  }

  const UNIQ = /^(elementor-element-[0-9a-f]{6,}|elementor-repeater-item-.*|menu-item-\d+|wp-image-\d+|page-id-\d+|elementor-page-\d+|elementor-\d+)$/;
  const genClasses = e => cls(e).filter(c => !UNIQ.test(c) && /^[A-Za-z_][\w-]*$/.test(c));

  function uniqueSel(n) {
    const doc = document;
    const one = s => { try { return doc.querySelectorAll(s).length === 1; } catch (e) { return false; } };
    if (n === doc.body) return 'body';
    if (n === doc.documentElement) return 'html';
    const idc = cls(n).find(c => /^elementor-element-[0-9a-f]{6,}$/.test(c));
    if (idc && one('.' + idc)) return '.' + idc;
    if (n.id && /^[A-Za-z][\w-]*$/.test(n.id) && one('#' + n.id)) return '#' + n.id;
    let a = n.parentElement;
    while (a && a !== doc.body && !(a.getAttribute('data-id') || a.id)) a = a.parentElement;
    const base = a && a !== doc.body ? uniqueSel(a) : '';
    for (const c of genClasses(n)) { const s = (base ? base + ' ' : '') + '.' + c; if (one(s)) return s; }
    const st = (base ? base + ' ' : 'body ') + n.localName;
    if (one(st)) return st;
    const sib = [...n.parentElement.children].filter(x => x.localName === n.localName);
    return uniqueSel(n.parentElement) + ' > ' + n.localName + (sib.length > 1 ? ':nth-of-type(' + (sib.indexOf(n) + 1) + ')' : '');
  }

  async function eager(doc) {
    const imgs = [...doc.images];
    imgs.forEach(i => { i.loading = 'eager'; });
    await Promise.all(imgs.map(i => (i.complete ? 0 : new Promise(r => { i.addEventListener('load', r); i.addEventListener('error', r); setTimeout(r, 8000); }))));
    try { await doc.fonts.ready; } catch (e) { /* geen probleem */ }
  }

  async function loadOld(url) {
    let f = document.getElementById('__fp_old');
    if (f) f.remove();
    f = document.createElement('iframe');
    f.id = '__fp_old';
    f.style.cssText = 'position:fixed;left:0;top:0;width:' + innerWidth + 'px;height:' + innerHeight + 'px;border:0;visibility:hidden;pointer-events:none;z-index:-1';
    f.src = (url || 'index.html') + '?fp=' + Date.now();
    document.body.appendChild(f);
    await new Promise(r => { f.onload = r; });
    await new Promise(r => setTimeout(r, 3500));
    return f;
  }

  function shorthand(decl) {
    const out = new Map(decl);
    for (const base of ['margin', 'padding']) {
      const v = SIDES.map(s => out.get(base + '-' + s));
      if (v.every(x => x !== undefined)) {
        SIDES.forEach(s => out.delete(base + '-' + s));
        let sh = v;
        if (v[1] === v[3]) { sh = v[0] === v[2] ? (v[0] === v[1] ? [v[0]] : [v[0], v[1]]) : [v[0], v[1], v[2]]; }
        out.set(base, sh.join(' '));
      }
    }
    const rv = CORNERS.map(c => out.get('border-' + c + '-radius'));
    if (rv.every(x => x !== undefined) && rv.every(x => x === rv[0])) {
      CORNERS.forEach(c => out.delete('border-' + c + '-radius'));
      out.set('border-radius', rv[0]);
    }
    return out;
  }

  async function run(opts = {}) {
    const level = opts.level || 1;
    const frame = await loadOld(opts.old);
    const od = frame.contentDocument, ow = frame.contentWindow;
    await eager(od); await eager(document);
    await new Promise(r => setTimeout(r, 300));
    const oldMap = mapDoc(od), newMap = mapDoc(document);
    const pairs = []; // {n, o, O, N}
    const O = new Map(), N = new Map(), counterpart = new Map(), hidden = new Set();
    let unmatchedNew = 0;
    for (const [key, n] of newMap) {
      if (n.id === '__fp_old') continue;
      const o = oldMap.get(key);
      if (!o || o.localName !== n.localName) { unmatchedNew++; continue; }
      if (o.parentElement && hidden.has(o.parentElement)) { hidden.add(o); continue; }
      const po = read(ow, o, false);
      if (po.display === 'none') hidden.add(o);
      O.set(o, po); N.set(n, read(window, n, true)); counterpart.set(n, o);
      pairs.push({ n, o });
    }
    const psCache = new Map();
    const pseudo = (win, e, ps) => {
      let m = psCache.get(e); if (!m) { m = {}; psCache.set(e, m); }
      if (!m[ps]) m[ps] = readPseudo(win, e, ps);
      return m[ps];
    };
    // waarde in de oude pagina voor nieuw element n (undefined = maakt niet uit)
    const oldVal = (n, ps, p) => {
      if (p === '__pw') return undefined;
      const o = counterpart.get(n);
      if (!o) return undefined;
      const po = O.get(o);
      if (po.display === 'none') return p === 'display' && !ps ? 'none' : undefined;
      if (!ps) return po[p];
      const q = pseudo(ow, o, ps);
      if (q.content === 'none') return p === 'content' ? 'none' : undefined;
      return q[p];
    };

    // standaardwaarden van een pseudo-element
    const st = document.createElement('style'); st.textContent = '.__fp_ref::before{content:"x"}'; document.head.appendChild(st);
    const ref = document.createElement('span'); ref.className = '__fp_ref'; document.body.appendChild(ref);
    const PD = readPseudo(window, ref, '::before');
    const hostRef = read(window, ref, true);
    ref.remove(); st.remove();
    const PINH = ['color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'text-align'];
    const needs = [];
    for (const { n, o } of pairs) {
      const po = O.get(o), pn = N.get(n);
      if (po.display === 'none') { if (pn.display !== 'none') needs.push({ n, ps: '', p: 'display', v: 'none' }); continue; }
      const ppo = o.parentElement && O.get(o.parentElement), ppn = n.parentElement && N.get(n.parentElement);
      for (const p in po) {
        if (p === '__pw') continue;
        const vo = po[p], vn = pn[p];
        if (vo === '-' || same(p, vo, vn)) continue;
        if ((p === 'width' || p === 'height') && /px$/.test(vo) && REPLACED.has(n.localName) && Math.abs(po.__pw - pn.__pw) > 1) continue;
        if ((p === 'width') && /%$/.test(vo) && false) continue;
        if (INH.includes(p) && ppo && ppn && ppo.display !== 'none' && same(p, vo, ppo[p]) && same(p, vn, ppn[p])) continue;
        needs.push({ n, ps: '', p, v: vo });
      }
      for (const ps of ['::before', '::after']) {
        const qo = pseudo(ow, o, ps), qn = pseudo(window, n, ps);
        if (qo.content === 'none') { if (qn.content !== 'none') needs.push({ n, ps, p: 'content', v: 'none' }); continue; }
        const fresh = qn.content === 'none';
        for (const p in qo) {
          const vo = qo[p];
          if (vo === '-') continue;
          if (fresh) {
            if (p === 'content') { needs.push({ n, ps, p, v: vo }); continue; }
            if (PINH.includes(p)) { if (!same(p, vo, po[p])) needs.push({ n, ps, p, v: vo }); continue; }
            if (!same(p, vo, PD[p])) needs.push({ n, ps, p, v: vo });
          } else {
            if (same(p, vo, qn[p])) continue;
            if (PINH.includes(p) && same(p, vo, po[p]) && same(p, qn[p], pn[p])) continue;
            needs.push({ n, ps, p, v: vo });
          }
        }
      }
    }

    // generaliseren
    const safeCache = new Map();
    const safeCount = (sel, ps, p, v) => {
      const k = sel + '|' + ps + '|' + p + '|' + v;
      if (safeCache.has(k)) return safeCache.get(k);
      let count = 0, els;
      try { els = document.querySelectorAll(sel); } catch (e) { safeCache.set(k, 0); return 0; }
      for (const el of els) {
        const ov = oldVal(el, ps, p);
        if (ov === undefined) continue;
        if (ov === '-') { if (MUSTNOT.has(p)) { count = 0; break; } continue; }
        if (!same(p, ov, v)) { count = 0; break; }
        count++;
      }
      safeCache.set(k, count);
      return count;
    };
    const candidates = n => {
      const t = n.localName, out = [t];
      const gc = genClasses(n).slice(0, 4);
      const par = n.parentElement, prev = n.previousElementSibling;
      const pc = par ? genClasses(par).slice(0, 3) : [];
      gc.forEach(c => { out.push('.' + c, '.' + c + ':not(:last-child)', '.' + c + ':last-child', '.' + c + ':not(:first-child)', '.' + c + ':first-child'); });
      let w = par, ctx = null;
      while (w && !ctx) { ctx = cls(w).find(c => /^elementor-widget-(?!container$|wrap$)[a-z-]+$/.test(c)); w = w.parentElement; }
      if (ctx) {
        out.push('.' + ctx + ' ' + t, '.' + ctx + ' ' + t + ':not(:last-child)', '.' + ctx + ' ' + t + ':last-child');
        gc.slice(0, 2).forEach(c => out.push('.' + ctx + ' .' + c));
      }
      pc.forEach(c => { out.push('.' + c + ' > ' + t); gc.slice(0, 3).forEach(d => out.push('.' + c + ' > .' + d)); });
      if (prev) genClasses(prev).slice(0, 2).forEach(c => { out.push('.' + c + ' + ' + t); gc.slice(0, 2).forEach(d => out.push('.' + c + ' + .' + d)); });
      return out;
    };
    const rules = new Map(); // selector -> Map(prop->value)
    const order = [];
    const add = (sel, p, v) => { if (!rules.has(sel)) { rules.set(sel, new Map()); order.push(sel); } rules.get(sel).set(p, v); };
    const generalSel = new Set();
    const elemNeeds = [];
    for (const nd of needs) {
      let best = null, bestCount = 1;
      if (level === 1 && nd.n !== document.body && nd.n !== document.documentElement) {
        for (const c of candidates(nd.n)) {
          const cnt = safeCount(c, nd.ps, nd.p, nd.v);
          if (cnt > bestCount) { best = c; bestCount = cnt; }
        }
      }
      if (best) { add(best + nd.ps, nd.p, nd.v); generalSel.add(best + nd.ps); } else elemNeeds.push(nd);
    }
    for (const nd of elemNeeds) add(uniqueSel(nd.n) + nd.ps, nd.p, nd.v + (level >= 3 ? ' !important' : ''));

    const general = order.filter(s => generalSel.has(s)).sort((a, b) => (/^[a-z]/.test(b) ? 1 : 0) - (/^[a-z]/.test(a) ? 1 : 0));
    const specific = order.filter(s => !generalSel.has(s));
    let css = '', decls = 0;
    for (const sel of [...general, ...specific]) {
      const d = shorthand(rules.get(sel));
      decls += d.size;
      css += sel + '{' + [...d].map(([p, v]) => p + ':' + v).join(';') + '}\n';
    }

    // geometrie: bovenste elementen waarvan de maat afwijkt
    const diag = [];
    const bad = new Set();
    for (const { n, o } of pairs) {
      if (hidden.has(o)) continue;
      const a = o.getBoundingClientRect(), b = n.getBoundingClientRect();
      const dw = Math.abs(a.width - b.width) > 1, dh = Math.abs(a.height - b.height) > 1;
      if (dw || dh) {
        bad.add(n);
        if (!bad.has(n.parentElement)) diag.push([uniqueSel(n), Math.round(a.width) + 'x' + Math.round(a.height), Math.round(b.width) + 'x' + Math.round(b.height)]);
      }
    }
    const res = {
      vw: innerWidth, level, pairs: pairs.length, unmatchedNew, hiddenOld: hidden.size, needs: needs.length,
      rules: rules.size, decls, bytes: css.length, general: general.length, geomBad: bad.size,
      docH: [od.documentElement.scrollHeight, document.documentElement.scrollHeight],
    };
    FP.last = { css, diag, res };
    return res;
  }

  return {
    run,
    last: null,
    css: (i = 0, size = 14000) => FP.last.css.slice(i * size, (i + 1) * size),
    diag: (n = 40) => FP.last.diag.slice(0, n),
  };
})();
