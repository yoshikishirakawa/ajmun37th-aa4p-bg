/**
 * 索引アンカーへのスクロールを調整
 */
(function() {
  'use strict';

  const IDX_PREFIX = 'idx-';
  const HIGHLIGHT_DURATION = 2000;

  function getScrollOffset() {
    const docEl = document.documentElement;
    const styles = window.getComputedStyle(docEl);
    const headerVarRaw = parseFloat(styles.getPropertyValue('--header-h'));
    const extraVarRaw = parseFloat(styles.getPropertyValue('--idx-scroll-offset'));
    const headerVar = Number.isFinite(headerVarRaw) ? headerVarRaw : 60;
    const extraVar = Number.isFinite(extraVarRaw) ? extraVarRaw : 20;
    const headerEl = document.querySelector('#quarto-header');
    const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : headerVar;
    return headerHeight + extraVar;
  }

  function highlightTargetElement(target) {
    if (!target) return;
    const parent = target.closest('p, div, section, li');
    if (!parent) return;
    parent.classList.add('highlight-target');
    setTimeout(() => parent.classList.remove('highlight-target'), HIGHLIGHT_DURATION);
  }

  function scrollToAnchor(target, options) {
    if (!target) return false;
    const offset = getScrollOffset();
    const rect = target.getBoundingClientRect();
    const absoluteTop = window.pageYOffset + rect.top;
    const top = Math.max(absoluteTop - offset, 0);
    const instant = options && options.instant;

    const scrollOptions = {
      top,
      left: 0,
      behavior: instant ? 'auto' : 'smooth'
    };

    try {
      window.scrollTo(scrollOptions);
    } catch (err) {
      window.scrollTo(0, top);
    }

    highlightTargetElement(target);
    return true;
  }

  function focusIndexAnchorFromHash(options) {
    const hash = window.location.hash;
    if (!hash || hash.length <= 1) {
      return;
    }
    let targetId = hash.slice(1);
    try {
      targetId = decodeURIComponent(targetId);
    } catch (err) {
      // no-op
    }
    if (!targetId.startsWith(IDX_PREFIX)) {
      return;
    }
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }
    const delay = options && typeof options.delay === 'number' ? options.delay : 0;
    setTimeout(() => {
      scrollToAnchor(target, options);
    }, delay);
  }

  window.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash) {
      focusIndexAnchorFromHash({ delay: 250, instant: true });
    }
  });

  window.addEventListener('hashchange', () => {
    focusIndexAnchorFromHash({ delay: 50 });
  });
})();
