// 株式会社moz 共通スクリプト(全ページ共通):スマホメニューの開閉とスクロールフェードイン
// (トップページのみ:ミッション文の文字演出(ブラーイン)/ STEPのスタックカードとロードマップの線の演出も)/ 右下のTOPボタン / タッチした場所の光
(function () {
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('navMenu');
  if (toggle && menu) {
    function closeMenu() {
      menu.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.addEventListener('click', function () {
      var isOpen = menu.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // .blur-text の文字を1文字ずつに分け、先頭から順にピントが合うよう時間差を付ける
  if (!reduceMotion) {
    document.querySelectorAll('.blur-text').forEach(function (el) {
      var index = 0;
      (function split(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var frag = document.createDocumentFragment();
            Array.prototype.forEach.call(child.textContent, function (c) {
              var span = document.createElement('span');
              span.className = 'ch';
              span.textContent = c;
              span.style.setProperty('--d', (index++ * 0.04).toFixed(2) + 's');
              frag.appendChild(span);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1 && child.tagName !== 'BR') {
            split(child);
          }
        });
      })(el);
      el.setAttribute('aria-label', el.textContent);
    });
  }

  // ロードマップの線:スクロールに合わせて銀色に伸び、最後の点に届いたら金色にする
  var roadmap = document.getElementById('roadmapLine');
  var requestUpdate = function () {};
  if (roadmap) {
    var track = roadmap.querySelector('.rm-track');
    var fill = roadmap.querySelector('.rm-fill');
    var phases = roadmap.querySelectorAll('.phase');
    var wide = window.matchMedia('(min-width: 900px)');
    var ticking = false;

    function dotCenter(ph) {
      // 各 .phase の点(::after)は左上から 4px + 7.5px の位置にある
      return { x: ph.offsetLeft + 7.5, y: ph.offsetTop + 11.5 };
    }
    function layoutTrack() {
      var first = dotCenter(phases[0]);
      var last = dotCenter(phases[phases.length - 1]);
      if (wide.matches) {
        track.style.top = first.y + 'px';
        track.style.left = first.x + 'px';
        track.style.width = (last.x - first.x) + 'px';
        track.style.height = '';
      } else {
        track.style.top = first.y + 'px';
        track.style.left = '7px';
        track.style.height = (last.y - first.y) + 'px';
        track.style.width = '';
      }
    }
    function update() {
      ticking = false;
      if (roadmap.classList.contains('is-complete')) return;
      var rect = roadmap.getBoundingClientRect();
      var vh = window.innerHeight;
      var p;
      if (wide.matches) {
        // 横並び:ロードマップが画面の下から中央へ上がる間に 0→100%
        p = (vh * 0.95 - rect.top) / (vh * 0.5);
      } else {
        // 縦並び:画面の6割の高さを線の先端が通過していく
        var start = rect.top + parseFloat(track.style.top);
        p = (vh * 0.6 - start) / parseFloat(track.style.height);
      }
      p = Math.max(0, Math.min(1, p));
      fill.style[wide.matches ? 'width' : 'height'] = (p * 100) + '%';
      fill.style[wide.matches ? 'height' : 'width'] = '100%';
      phases.forEach(function (ph, i) {
        ph.classList.toggle('is-lit', p >= i / (phases.length - 1) - 0.001);
      });
      if (p >= 1) roadmap.classList.add('is-complete');
    }
    requestUpdate = function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    layoutTrack();
    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', function () { layoutTrack(); requestUpdate(); });
    window.addEventListener('load', function () { layoutTrack(); requestUpdate(); });
  }

  // STEPのスタックカード(スマホ):次のカードが重なってくるほど、下のカードを少し縮めて暗くする
  var stack = document.getElementById('stepStack');
  if (stack && !reduceMotion) {
    var cards = stack.querySelectorAll('.step');
    var narrow = window.matchMedia('(max-width: 899px)');
    var stackTicking = false;
    function updateStack() {
      stackTicking = false;
      cards.forEach(function (card, i) {
        var inner = card.querySelector('.step-inner');
        var next = cards[i + 1];
        if (!narrow.matches || !next) { inner.style.transform = ''; inner.style.filter = ''; return; }
        var cur = card.getBoundingClientRect();
        var gap = next.getBoundingClientRect().top - cur.top;
        var p = Math.max(0, Math.min(1, 1 - gap / cur.height));
        inner.style.transform = 'scale(' + (1 - 0.06 * p).toFixed(4) + ')';
        inner.style.filter = 'brightness(' + (1 - 0.35 * p).toFixed(3) + ')';
      });
    }
    function requestStack() {
      if (!stackTicking) { stackTicking = true; requestAnimationFrame(updateStack); }
    }
    window.addEventListener('scroll', requestStack, { passive: true });
    window.addEventListener('resize', requestStack);
    updateStack();
  }

  var targets = document.querySelectorAll('.reveal');
  var io = null;
  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  }

  // スマホで触れた場所に、白くやわらかい光がにじんで消える(明るい背景の上では青白い光)
  function isLightAt(x, y) {
    var el = document.elementFromPoint(x, y);
    while (el && el !== document.documentElement) {
      var m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      if (m && (m.length < 4 || parseFloat(m[3]) > 0.5)) {
        // 背景色の明るさ(0〜255)で判定
        return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) > 160;
      }
      el = el.parentElement;
    }
    return true;
  }
  if (!reduceMotion) {
    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch') return;
      var glow = document.createElement('span');
      glow.className = 'touch-glow' + (isLightAt(e.clientX, e.clientY) ? ' on-light' : '');
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
      document.body.appendChild(glow);
      glow.addEventListener('animationend', function () { glow.remove(); });
    }, { passive: true });
  }

  // 右下の「TOP」ボタン:先頭まで戻ったら、各セクションの演出をもう一度見られるように戻す
  var topBtn = document.createElement('button');
  topBtn.type = 'button';
  topBtn.className = 'to-top';
  topBtn.setAttribute('aria-label', 'ページの先頭へ戻る');
  topBtn.innerHTML = '<span aria-hidden="true">↑</span>TOP';
  document.body.appendChild(topBtn);

  function replayAnimations() {
    if (!io) return;
    targets.forEach(function (el) {
      el.classList.remove('is-visible');
      io.observe(el);
    });
    if (roadmap) {
      roadmap.classList.remove('is-complete');
      requestUpdate();
    }
  }
  var waitingTop = false;
  topBtn.addEventListener('click', function () {
    waitingTop = true;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    if (window.scrollY < 2) { waitingTop = false; replayAnimations(); }
  });
  window.addEventListener('scroll', function () {
    topBtn.classList.toggle('is-shown', window.scrollY > window.innerHeight * 0.8);
    if (waitingTop && window.scrollY < 2) { waitingTop = false; replayAnimations(); }
  }, { passive: true });
})();
