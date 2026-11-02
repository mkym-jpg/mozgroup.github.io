// 株式会社moz 共通スクリプト(全ページ共通):スマホメニューの開閉とスクロールフェードイン
// (トップページのみ:ミッション文の文字演出とロードマップの線の演出も)
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

  // .scatter の文字を1文字ずつに分け、ばらばらの位置・角度を与える(画面に入ると整う)
  if (!reduceMotion) {
    document.querySelectorAll('.scatter').forEach(function (el) {
      (function split(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var frag = document.createDocumentFragment();
            Array.prototype.forEach.call(child.textContent, function (c) {
              var span = document.createElement('span');
              span.className = 'ch';
              span.textContent = c;
              span.style.setProperty('--x', Math.round((Math.random() - 0.5) * 160) + 'px');
              span.style.setProperty('--y', Math.round((Math.random() - 0.5) * 110) + 'px');
              span.style.setProperty('--r', Math.round((Math.random() - 0.5) * 70) + 'deg');
              span.style.setProperty('--d', (Math.random() * 0.45).toFixed(2) + 's');
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
    function requestUpdate() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    layoutTrack();
    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', function () { layoutTrack(); requestUpdate(); });
    window.addEventListener('load', function () { layoutTrack(); requestUpdate(); });
  }

  var targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  targets.forEach(function (el) { io.observe(el); });
})();
