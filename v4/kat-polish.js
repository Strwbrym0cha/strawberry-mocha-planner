(() => {
  const pages = {
    home: {
      icon: '🌸', tab: 'Home', eyebrow: '🌸 HOME',
      title: 'Katinas house',
      quote: 'Home base for whatever the hell we’re doing today.'
    },
    time: {
      icon: '😎', tab: 'Plannin', eyebrow: '😎 PLANNIN',
      title: 'What the fuck is going on',
      quote: 'A visual explanation of why you’re busy.'
    },
    tasks: {
      icon: '😩', tab: 'To-dos', eyebrow: '😩 TO-DOS',
      title: 'i guess I’ll do things..',
      quote: 'Unfortunately, the tasks will not complete themselves.'
    },
    mochini: {
      icon: '🍡✨', tab: 'Mochini', eyebrow: '🍡✨ MOCHINI',
      title: 'mochini',
      quote: 'the little bean aka Mochis lil assistant'
    },
    pings: {
      icon: '🚨', tab: 'Remember', eyebrow: '🚨 REMEMBER',
      title: 'Don’t forget this shit',
      quote: 'Because your brain absolutely will.'
    },
    review: {
      icon: '🪷', tab: 'Daily note', eyebrow: '🪷 DAILY NOTE',
      title: 'Today’s fuckin review',
      quote: 'Let’s see what actually happened in there.'
    },
    routines: {
      icon: '🍓', tab: 'Routines', eyebrow: '🍓 ROUTINES',
      title: 'Routines for a baddie',
      quote: 'A little structure, but make it survivable.'
    },
    noms: {
      icon: '🍱', tab: 'Noms', eyebrow: '🍱 NOMS',
      title: 'Nominn station',
      quote: 'Feed the organism before she gets dramatic.'
    },
    sips: {
      icon: '💧', tab: 'Sips', eyebrow: '💧 SIPS',
      title: 'sippin shit',
      quote: 'Hydration, caffeine, and whatever else made it into the cup.'
    },
    motion: {
      icon: '🌿', tab: 'Get movin', eyebrow: '🌿 GET MOVIN',
      title: 'Pilates princess✨',
      quote: 'Move the body. Keep the crown.'
    },
    people: {
      icon: '💕', tab: 'My loves', eyebrow: '💕 MY LOVES',
      title: 'My niggas✨',
      quote: 'The people worth leaving the house for.'
    }
  };

  const nativeScrollTo = window.scrollTo.bind(window);
  let navigationScroll = null;

  // V4's internal setView() scrolls to top before every render. Preserve the
  // user's viewport during room changes so navigation feels like an app.
  document.addEventListener('click', event => {
    const target = event.target.closest?.('[data-view]');
    if (!target) return;
    navigationScroll = { y: window.scrollY };
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!navigationScroll) return;
      nativeScrollTo(0, navigationScroll.y);
      navigationScroll = null;
    }));
  }, true);

  window.scrollTo = (...args) => {
    if (navigationScroll) {
      const first = args[0];
      const top = typeof first === 'object' && first !== null
        ? Number(first.top ?? window.scrollY)
        : Number(args[1] ?? 0);
      if (top === 0) return;
    }
    return nativeScrollTo(...args);
  };

  function setHtmlIfChanged(node, html) {
    if (node && node.innerHTML !== html) node.innerHTML = html;
  }

  function setTextIfChanged(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function polish() {
    document.querySelectorAll('.nav-btn[data-view]').forEach(button => {
      const spec = pages[button.dataset.view];
      if (!spec) return;
      setHtmlIfChanged(
        button,
        `<span class="nav-icon">${spec.icon}</span><span class="nav-copy">${spec.tab}</span>`
      );
    });

    const active = document.querySelector('.nav-btn.active[data-view]');
    const spec = active && pages[active.dataset.view];
    if (!spec) return;

    setTextIfChanged(document.querySelector('.top-title'), spec.tab);
    document.title = `${spec.title} · KatOS V4`;

    const hero = document.querySelector('.main .page > .hero');
    if (!hero) return;

    const eyebrow = hero.querySelector('.ey');
    const title = hero.querySelector('h2');
    const quote = hero.querySelector('p');

    setTextIfChanged(eyebrow, spec.eyebrow);
    setTextIfChanged(title, spec.title);
    setTextIfChanged(quote, spec.quote);
    if (quote && !quote.classList.contains('page-tagline')) quote.classList.add('page-tagline');
  }

  const observer = new MutationObserver(polish);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', polish, { once: true });
  } else {
    polish();
  }
})();
