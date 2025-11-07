/**
 * UI操作関連のJavaScript
 * Quarto標準テーマの拡張機能
 */

(function () {
  'use strict';

  // LocalStorageキー定義
  const STORAGE_KEYS = {
    fontSize: 'txtSize',
    theme: 'theme',
    tocLocation: 'tocLocation',
    scrollPosition: 'scrollPos'
  };

  // DOM要素
  let elements = {};

  // 初期化
  function init() {
    cacheElements();
    setupEventListeners();
    restoreUserPreferences();
    setupFontSizeControls();
    setupThemeControls();
    setupRightSidebar();
    setupBackToTop();
    setupSearch();
    setupHeaderControls();
    setupToCOverlay();
    setupPDFDownload();
    setupLeftPanelTabs();
    generateMobileToC();
    setupGlobalSearch();
    setupMarkerFunctionality();
  }

  // DOM要素のキャッシュ
  function cacheElements() {
    elements = {
      body: document.body,
      sidebar: document.querySelector('.quarto-sidebar, .navbar, .sidebar, #quarto-sidebar'),
      mainContent: document.querySelector('#quarto-content, main, .page-columns'),
      rightSidebar: document.querySelector('.right-sidebar'),
      bookHeader: document.querySelector('.book-title-block, .page-header'),
      navFooter: document.querySelector('.nav-footer')
    };
  }

  // イベントリスナー設定
  function setupEventListeners() {
    // 文字サイズ変更
    setupFontSizeControls();

    // テーマ切り替ェ替
    setupThemeControls();

    // スクロール位置保存
    setupScrollPosition();

    // キーボード操作
    setupKeyboardShortcuts();
  }

  // ユーザー設定の復元
  function restoreUserPreferences() {
    // 文字サイズ
    const savedSize = localStorage.getItem(STORAGE_KEYS.fontSize) || 'M';
    setFontSize(savedSize, false);

    // テーマ
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || 'auto';
    setTheme(savedTheme, false);
  }

  // 文字サイズ制御
  function setupFontSizeControls() {
    const sizes = ['S', 'M', 'L', 'XL'];
    const sizeMapping = {
      'S': 'font-s',
      'M': 'font-m',
      'L': 'font-l',
      'XL': 'font-xl'
    };

    // ヘッダーにセレクタを追加
    if (elements.bookHeader) {
      const selector = createSizeSelector(sizes);
      elements.bookHeader.appendChild(selector);
    }
  }

  function createSizeSelector(sizes) {
    const container = document.createElement('div');
    container.className = 'size-selector';

    const label = document.createElement('label');
    label.textContent = '文字サイズ: ';
    container.appendChild(label);

    const select = document.createElement('select');
    select.id = 'size-selector';

    sizes.forEach(size => {
      const option = document.createElement('option');
      option.value = size;
      option.textContent = size;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => setFontSize(e.target.value, true));

    container.appendChild(select);

    // 現在の選択状態を反映
    const currentSize = localStorage.getItem(STORAGE_KEYS.fontSize) || 'M';
    select.value = currentSize;

    return container;
  }

  function setFontSize(size, save = true) {
    const fontSizeMap = {
      'S': '15px',
      'M': '17px',
      'L': '19px',
      'XL': '21px'
    };

    const fontSize = fontSizeMap[size] || '17px';
    elements.body.style.setProperty('--font-base', fontSize);

    if (save) {
      localStorage.setItem(STORAGE_KEYS.fontSize, size);
    }
  }

  // テーマ制御
  function setupThemeControls() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    prefersDark.addEventListener('change', handleSystemThemeChange);

    // テーマボタンがなければ作成
    if (!elements.themeButton) {
      const button = createThemeButton();
      const menu = document.querySelector('.header-menu');
      if (menu) {
        menu.appendChild(button);
        elements.themeButton = button;
      }
    }

    updateThemeButton();
  }

  function createThemeButton() {
    const button = document.createElement('button');
    button.id = 'theme-button';
    button.className = 'theme-button';
    button.textContent = '🌙';
    button.title = 'テーマ切り替え';
    button.setAttribute('aria-label', 'テーマ切り替え');
    return button;
  }

  function toggleTheme() {
    const currentTheme = localStorage.getItem(STORAGE_KEYS.theme) || 'auto';
    const themes = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];

    setTheme(nextTheme, true);
  }

  function setTheme(theme, save = true) {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else if (theme === 'light') {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    } else {
      // auto
      root.classList.remove('dark-theme', 'light-theme');
    }

    if (save) {
      localStorage.setItem(STORAGE_KEYS.theme, theme);
    }

    updateThemeButton();
  }

  function updateThemeButton() {
    if (!elements.themeButton) return;

    const currentTheme = localStorage.getItem(STORAGE_KEYS.theme) || 'auto';
    const icons = {
      'light': '🌞',
      'dark': '🌙',
      'auto': '🌓'
    };

    elements.themeButton.textContent = icons[currentTheme];
  }

  function handleSystemThemeChange(e) {
    const currentTheme = localStorage.getItem(STORAGE_KEYS.theme);
    if (currentTheme === 'auto') {
      updateThemeButton();
    }
  }

  // ToC位置制御
  function setupTocControls() {
    const menu = document.querySelector('.header-menu');

    // ToC位置ボタンがなければ作成
    if (!elements.tocRightBtn && menu) {
      const rightBtn = createTocButton('right', '右側ToC');
      const bodyBtn = createTocButton('body', '本文ToC');

      menu.appendChild(rightBtn);
      menu.appendChild(bodyBtn);

      elements.tocRightBtn = rightBtn;
      elements.tocBodyBtn = bodyBtn;
    }

    // モバイル用ToCボタン
    if (!elements.tocOpenBtn && menu && window.innerWidth < 768) {
      const openBtn = createMobileTocButton();
      menu.appendChild(openBtn);
      elements.tocOpenBtn = openBtn;
    }
  }

  function createTocButton(location, title) {
    const button = document.createElement('button');
    button.id = `toc-${location}-btn`;
    button.className = 'main-menu-button';
    button.textContent = title;
    button.setAttribute('aria-label', title);
    return button;
  }

  function createMobileTocButton() {
    const button = document.createElement('button');
    button.id = 'toc-open-btn';
    button.className = 'main-menu-button';
    button.textContent = '📖 目次';
    button.setAttribute('aria-label', '目次を開く');
    return button;
  }

  function setTocLocation(location, save = true) {
    const root = document.documentElement;

    root.classList.toggle('toc-right-on', location === 'right');
    root.classList.toggle('toc-body-on', location === 'body');

    if (save) {
      localStorage.setItem(STORAGE_KEYS.tocLocation, location);
    }
  }

  function openTocOverlay() {
    document.body.classList.add('toc-open');
  }

  function closeTocOverlay() {
    document.body.classList.remove('toc-open');
  }

  // スクロール位置制御
  function setupScrollPosition() {
    // 復元
    const chapterId = getCurrentChapterId();
    const savedPosition = localStorage.getItem(`${STORAGE_KEYS.scrollPosition}:${chapterId}`);

    if (savedPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedPosition));
      }, 100);
    }

    // 保存
    let saveTimer;
    window.addEventListener('scroll', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveScrollPosition();
      }, 1000);
    });
  }

  function getCurrentChapterId() {
    // 現在の章IDをURLから取得（実装はプロジェクト次第）
    return location.pathname.replace(/.*\/|\.html/g, '') || 'index';
  }

  function saveScrollPosition() {
    const chapterId = getCurrentChapterId();
    const position = window.scrollY;
    localStorage.setItem(`${STORAGE_KEYS.scrollPosition}:${chapterId}`, position);
  }

  // トップへ戻るボタン
  function setupBackToTop() {
    if (!elements.backToTop) {
      createBackToTopButton();
    }

    window.addEventListener('scroll', handleBackToTopVisibility);
  }

  function createBackToTopButton() {
    const button = document.createElement('button');
    button.id = 'back-to-top';
    button.className = 'back-to-top';
    button.innerHTML = '↑';
    button.textContent = '↑';
    button.setAttribute('aria-label', 'ページトップへ');
    button.addEventListener('click', () => {
      window.scrollTo(0, 0);
    });

    document.body.appendChild(button);
    elements.backToTop = button;
  }

  function handleBackToTopVisibility() {
    if (!elements.backToTop) return;

    const threshold = 800;
    const isVisible = window.scrollY > threshold;

    elements.backToTop.classList.toggle('visible', isVisible);
  }

  // キーボード操作
  function handleKeyboard(e) {
    // ESCキーでオーバーレイを閉じる
    if (e.key === 'Escape') {
      closeTocOverlay();
    }

    // 検索ショートカット
    if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && !isInputFocused()) {
      e.preventDefault();
      focusSearch();
    }

    // 前後章ナビゲーション
    if (e.key === '[' && !isInputFocused()) {
      navigateToPreviousChapter();
    }
    if (e.key === ']' && !isInputFocused()) {
      navigateToNextChapter();
    }
  }

  function isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    );
  }

  function focusSearch() {
    if (elements.searchInput) {
      elements.searchInput.focus();
      elements.searchInput.select();
    }
  }

  function navigateToPreviousChapter() {
    console.log('navigateToPreviousChapter called');
    const prevLink = document.querySelector('.page-nav .prev');
    console.log('prevLink found:', !!prevLink);
    if (prevLink) {
      console.log('clicking prevLink');
      prevLink.click();
    } else {
      console.log('prevLink not found');
    }
  }

  function navigateToNextChapter() {
    console.log('navigateToNextChapter called');
    const nextLink = document.querySelector('.page-nav .next');
    console.log('nextLink found:', !!nextLink);
    if (nextLink) {
      console.log('clicking nextLink');
      nextLink.click();
    } else {
      console.log('nextLink not found');
    }
  }

  // 検索機能
  function handleSearch(e) {
    const query = e.target.value.toLowerCase();

    if (query.length < 2) {
      clearSearchResults();
      return;
    }

    // 簡易的な本文検索（実装はプロジェクト次第）
    searchInContent(query);
  }

  function handleSearchKeydown(e) {
    if (e.key === 'Escape') {
      e.target.value = '';
      e.target.blur();
      clearSearchResults();
    }
  }

  function searchInContent(query) {
    const content = document.querySelector('.main');
    if (!content) return;

    // クリア
    clearSearchResults();

    // 検索実行
    const walker = document.createTreeWalker(
      content,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const results = [];
    let node;

    while (node = walker.nextNode()) {
      const text = node.textContent.toLowerCase();
      const index = text.indexOf(query);

      if (index >= 0) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + query.length);
        results.push(range);
      }
    }

    // 検索結果の強調表示
    results.forEach(range => {
      const span = document.createElement('mark');
      span.className = 'search-highlight';
      range.surroundContents(span);
    });

    // 最初の結果にスクロール
    if (results.length > 0) {
      results[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function clearSearchResults() {
    const highlights = document.querySelectorAll('.search-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      parent.replaceChild(
        document.createTextNode(highlight.textContent),
        highlight
      );
      parent.normalize();
    });
  }

  // 右サイドバー設定
  function setupRightSidebar() {
    // DOM読み込み後に確実行
    const readyState = document.readyState;

    const moveFootnotesWhenReady = () => {
      moveFootnotesToRightSidebar();
      // さらに0.5秒後にも実行（確実行のため）
      setTimeout(moveFootnotesToRightSidebar, 500);
    };

    if (readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', moveFootnotesWhenReady);
    } else {
      moveFootnotesWhenReady();
    }

    // ウィンドウリサイズ対応
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1200) {
        moveFootnotesWhenReady();
      }
    });
  }

  function moveFootnotesToRightSidebar() {
    console.log('右サイドバーに脚注を移動中...');

    // 右サイドバーが存在するか確認
    const rightSidebar = document.querySelector('.right-sidebar');
    if (!rightSidebar) {
      console.log('右サイドバーが見つかりません');
      return;
    }

    // 脚注要素を探して移動
    const footnotes = document.querySelector('.footnotes');
    if (!footnotes) {
      console.log('脚注要素が見つかりません');
      return;
    }

    // コンテナを取得または作成
    let container = rightSidebar.querySelector('#footnotes-container');
    if (!container) {
      // 既存の内容をクリア
      const h2 = rightSidebar.querySelector('h2');
      rightSidebar.innerHTML = '';
      if (h2) rightSidebar.appendChild(h2);

      container = document.createElement('div');
      container.id = 'footnotes-container';
      rightSidebar.appendChild(container);
    }

    // 脚注のクローンを作成して追加
    const footnotesClone = footnotes.cloneNode(true);
    container.innerHTML = '';
    container.appendChild(footnotesClone);

    // 元の脚注を非表示
    footnotes.style.display = 'none';

    // コンソールで確認
    console.log('脚注を右サイドバーに移動しました');
    console.log('移動した脚注数:', footnotesClone.querySelectorAll('li').length);

    // 脚注リンクのバックリンクを処理
    setupBackLinks(container);
  }

  function setupBackLinks(container) {
    const backLinks = container.querySelectorAll('.footnote-back');
    backLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        const targetId = href.substring(1); // # を除去
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetElement.classList.add('highlight');
          setTimeout(() => {
            targetElement.classList.remove('highlight');
          }, 2000);
        }
      });
    });
  }

  // スクロール位置保存
  function setupScrollPosition() {
    let scrollTimer;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const position = window.scrollY;
        const pageKey = location.pathname.replace(/.*\/|\.html/g, '');
        localStorage.setItem(`${STORAGE_KEYS.scrollPosition}:${pageKey}`, position);
      }, 1000);
    });

    // 復元
    const savedPosition = localStorage.getItem(`${STORAGE_KEYS.scrollPosition}:${location.pathname.replace(/.*\/|\.html/g, '')}`);
    if (savedPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedPosition));
      }, 100);
    }
  }

  // キーボードショートカット
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // ESC: サイドバートグル
      if (e.key === 'Escape') {
        document.body.classList.toggle('sidebar-open');
      }

      // Ctrl+K: 検索
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && !document.activeElement.matches('input, textarea')) {
        e.preventDefault();
        const searchInput = document.querySelector('.sidebar-search input');
        if (searchInput && searchInput.closest('.sidebar')) {
          document.body.classList.add('sidebar-open');
          searchInput.focus();
          searchInput.select();
        }
      }

      // 前後章
      if (e.key === '[' && !document.activeElement.matches('input, textarea')) {
        const prevLink = document.querySelector('.nav-footer .prev');
        if (prevLink) prevLink.click();
      }
      if (e.key === ']' && !document.activeElement.matches('input, textarea')) {
        const nextLink = document.querySelector('.nav-footer .next');
        if (nextLink) nextLink.click();
      }
    });
  }

  // 検索機能
  function setupSearch() {
    const searchInput = document.querySelector('.sidebar-search input');
    if (searchInput) {
      searchInput.addEventListener('input', handleSearch);
      searchInput.addEventListener('keydown', handleSearchKeydown);
    }
  }

  function handleSearch(e) {
    const query = e.target.value.toLowerCase();

    if (query.length < 2) {
      clearSearchHighlight();
      return;
    }

    searchInContent(query);
  }

  function handleSearchKeydown(e) {
    if (e.key === 'Escape') {
      e.target.value = '';
      e.target.blur();
      clearSearchHighlight();
    }
  }

  function searchInContent(query) {
    // 簡易的な検索ハイライト
    clearSearchHighlight();

    if (elements.mainContent) {
      const walker = document.createTreeWalker(
        elements.mainContent,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      const results = [];
      let node;

      while (node = walker.nextNode()) {
        const text = node.textContent.toLowerCase();
        const index = text.indexOf(query);

        if (index >= 0) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + query.length);
          results.push(range);
        }
      }

      // 検索結果の強調表示
      results.forEach(range => {
        const span = document.createElement('mark');
        span.className = 'search-highlight';
        range.surroundContents(span);
      });

      if (results.length > 0) {
        results[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  function clearSearchHighlight() {
    const highlights = document.querySelectorAll('.search-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      parent.replaceChild(
        document.createTextNode(highlight.textContent),
        highlight
      );
      parent.normalize();
    });
  }

  // トップへ戻るボタン
  function setupBackToTop() {
    const button = document.createElement('button');
    button.id = 'back-to-top';
    button.innerHTML = '↑';
    button.textContent = '↑';
    button.title = 'ページトップへ';

    button.style.cssText = '
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
    background: #007bff;
    color: white;
    border: none;
    border - radius: 50 %;
    cursor: pointer;
    display: none;
    align - items: center;
    justify - content: center;
    z - index: 999;
    box - shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    font - size: 18px;
    ';

    button.addEventListener('click', () => {
      window.scrollTo(0, 0);
    });

    window.addEventListener('scroll', () => {
      button.style.display = window.scrollY > 800 ? 'flex' : 'none';
    });

    document.body.appendChild(button);
  }

  // ヘッダー制御設定
  function setupHeaderControls() {
    const fontSizeSelect = document.getElementById('font-size-select');
    const themeSelect = document.getElementById('theme-select');
    const tocLocationBtn = document.getElementById('toc-location-btn');
    const pinMenuBtn = document.getElementById('pin-menu-btn');
    const tocMobileBtn = document.getElementById('toc-mobile-btn');

    // 文字サイズ制御
    if (fontSizeSelect) {
      fontSizeSelect.addEventListener('change', (e) => {
        const size = e.target.value;
        setFontSize(size);
        localStorage.setItem(STORAGE_KEYS.fontSize, size);
      });
    }

    // テーマ制御
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        setTheme(theme);
        localStorage.setItem(STORAGE_KEYS.theme, theme);
      });
    }

    // ToC位置制御
    if (tocLocationBtn) {
      tocLocationBtn.addEventListener('click', () => {
        const current = document.documentElement.classList.contains('toc-right-on') ? 'body' : 'right';
        setToCLocation(current);
        localStorage.setItem(STORAGE_KEYS.tocLocation, current);
      });
    }

    // メニュー固定制御
    if (pinMenuBtn) {
      pinMenuBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('menu-pinned');
        pinMenuBtn.textContent = document.documentElement.classList.contains('menu-pinned') ? '解除' : '固定';
      });
    }

    // モバイルToC制御
    if (tocMobileBtn) {
      tocMobileBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('toc-open');
      });
    }

    // リストア設定
    restoreUserPreferences();
  }

  // ToCオーバーレイ設定
  function setupToCOverlay() {
    // オーバーレイクリックで閉じる
    const overlay = document.querySelector('.toc-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          document.documentElement.classList.remove('toc-open');
        }
      });
    }

    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.documentElement.classList.contains('toc-open')) {
        document.documentElement.classList.remove('toc-open');
      }
    });
  }

  // PDFダウンロード設定
  function setupPDFDownload() {
    const pdfBtn = document.getElementById('pdf-download-btn');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', () => {
        const currentPage = window.location.pathname.split('/').pop();
        const pdfUrl = `out/${currentPage.replace(/\.(html|qmd)$/, '.pdf')}`;

        // PDFが存在するかチェック
        fetch(pdfUrl, { method: 'HEAD' })
          .then(response => {
            if (response.ok) {
              window.open(pdfUrl, '_blank');
            } else {
              alert('PDFの生成が完了していません。管理者にお問い合わせください。');
            }
          })
          .catch(() => {
            alert('PDFの確認中にエラーが発生しました。');
          });
      });
    }
  }

  // 文字サイズ設定
  function setFontSize(size) {
    const sizeMap = { S: 15, M: 17, L: 19, XL: 21 };
    const fontSize = sizeMap[size] || 17;
    document.documentElement.style.setProperty('--font-base', `${fontSize}px`);
  }

  // テーマ設定
  function setTheme(theme) {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  // ToC位置設定
  function setToCLocation(location) {
    document.documentElement.classList.toggle('toc-right-on', location === 'right');
    document.documentElement.classList.toggle('toc-body-on', location === 'body');
  }

  // ユーザー設定のリストア
  function restoreUserPreferences() {
    // 文字サイズ
    const fontSize = localStorage.getItem(STORAGE_KEYS.fontSize) || 'M';
    setFontSize(fontSize);
    const fontSizeSelect = document.getElementById('font-size-select');
    if (fontSizeSelect) fontSizeSelect.value = fontSize;

    // テーマ
    const theme = localStorage.getItem(STORAGE_KEYS.theme) || 'auto';
    setTheme(theme);
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = theme;

    // ToC位置
    const tocLocation = localStorage.getItem(STORAGE_KEYS.tocLocation) || 'right';
    setToCLocation(tocLocation);
  }

  // 左パネルタブ機能
  function setupLeftPanelTabs() {
    // margin-sidebar内のTOCをターゲット
    const tocElement = document.querySelector('#quarto-margin-sidebar #TOC');
    if (!tocElement) {
      console.log('margin-sidebar内のTOC要素が見つかりません');
      // メインTOCを試す
      const mainTocElement = document.querySelector('#TOC');
      if (mainTocElement) {
        setupTabsForToc(mainTocElement);
      }
      return;
    }

    setupTabsForToc(tocElement);
  }

  // TOC要素にタブをセットアップする共通関数
  function setupTabsForToc(tocElement) {
    // 既存のTOC内容を保存
    const originalTocElement = tocElement.querySelector('ul');
    let originalTocContent = '';

    if (originalTocElement) {
      originalTocContent = originalTocElement.outerHTML;
    }

    // タブを挿入
    const tabsHtml = '
      < div class="toc-tabs" >
        <button class="tab-button active" data-tab="site">サイト目次</button>
        <button class="tab-button" data-tab="page">このページ</button>
      </div >
      ';

    // TOCをクリアして再構築
    const fullTocContent = `<div class="toc-content-wrapper">${tabsHtml}<div class="site-toc-content">${originalTocContent}</div><div class="page-toc-content"></div></div>`;
    tocElement.innerHTML = fullTocContent;

    // イベントリスナー設定
    const tabButtons = tocElement.querySelectorAll('.tab-button');
    const siteContent = tocElement.querySelector('.site-toc-content');
    const pageContent = tocElement.querySelector('.page-toc-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;

        // アクティブ状態を更新
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // コンテンツを切り替え
        if (targetTab === 'site') {
          siteContent.style.display = 'block';
          pageContent.style.display = 'none';
        } else {
          siteContent.style.display = 'none';
          pageContent.style.display = 'block';

          // ページ内目次を生成（まだ生成されていない場合）
          if (pageContent.children.length === 0) {
            generatePageTocList(pageContent);
          }
        }
      });
    });

    // デフォルト状態を設定
    if (siteContent) siteContent.style.display = 'block';
    if (pageContent) pageContent.style.display = 'none';

    console.log('タブ機能を初期化しました');
  }

  // ページ内目次リストを生成
  function generatePageTocList(container) {
    const headings = document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6');
    if (headings.length === 0) {
      container.innerHTML = '<p style="color: #6c757d; font-style: italic;">このページには目次項目がありません</p>';
      return;
    }

    const tocList = document.createElement('ul');
    tocList.style.cssText = 'list-style: none; padding: 0; margin: 0;';

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      const text = heading.textContent.trim();
      const id = heading.id || `heading-${index}`;

      // 見出しにIDがない場合設定
      if (!heading.id) {
        heading.id = id;
      }

      const listItem = document.createElement('li');
      listItem.style.cssText = `margin: 4px 0; padding-left: ${(level - 1) * 16}px;`;

      const link = document.createElement('a');
      link.href = `#${id}`;
      link.textContent = text;
      link.style.cssText = 'color: #1a73e8; text-decoration: none; font-size: 14px; display: block; padding: 4px 8px; border-radius: 4px; transition: background-color 0.2s ease;';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      link.addEventListener('mouseover', () => {
        link.style.backgroundColor = '#f8f9fa';
      });
      link.addEventListener('mouseout', () => {
        link.style.backgroundColor = 'transparent';
      });

      listItem.appendChild(link);
      tocList.appendChild(listItem);
    });

    container.appendChild(tocList);
    console.log(`ページ内目次を生成しました（${headings.length}項目）`);
  }

  // タブとコンテンツをTOCコンテナの前に挿入
  const tabsHtml = '
    < div class="left-panel-tabs" >
        <button class="left-panel-tab active" data-tab="site">サイト目次</button>
        <button class="left-panel-tab" data-tab="page">このページ</button>
      </div >
    <div class="left-panel-content">
      <div class="left-panel-section site-toc-section active">
        <div class="site-toc-list"></div>
      </div>
      <div class="left-panel-section page-toc-section">
        <div class="page-toc-list"></div>
      </div>
    </div>
  ';

  // TOCコンテナの先頭にタブを挿入
  tocContainer.insertAdjacentHTML('afterbegin', tabsHtml);

  // タブ切り替えイベント
  const tabs = tocContainer.querySelectorAll('.left-panel-tab');
  const sections = tocContainer.querySelectorAll('.left-panel-section');

  // 既存のTOCサイト項目をサイト目次セクションに移動
  const existingTocItems = tocContainer.querySelectorAll('ul > li');
  const siteTocList = tocContainer.querySelector('.site-toc-list');
  if (siteTocList && existingTocItems.length > 0) {
    existingTocItems.forEach(item => {
      siteTocList.appendChild(item);
    });
  }

  // タブ切り替え機能
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // タブ状態更新
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // セクション表示切替
      sections.forEach(section => {
        if (section.classList.contains(`${targetTab}-toc-section`)) {
          section.classList.add('active');
        } else {
          section.classList.remove('active');
        }
      });

      // サイト目次タブがクリックされた場合、元のTOCを表示
      if (targetTab === 'site') {
        siteTocList.style.display = 'block';
      } else {
        siteTocList.style.display = 'none';
      }
    });
  });



  // 目次生成
  generateSiteToc();
  generatePageToc();
}

  // サイト目次生成
  function generateSiteToc() {
  const siteTocList = document.querySelector('.site-toc-list');
  if (!siteTocList) return;

  const pages = [
    { title: '平和への課題：補遺', url: 'index.html', chapter: '序章' },
    { title: 'フロント挨拶', url: 'content/00_front.html', chapter: '序章' },
    { title: 'プロジェクト概要', url: 'content/01_ch01.html', chapter: '第1章' },
    { title: '技術的課題', url: 'content/02_ch02.html', chapter: '第2章' },
    { title: '実装方針', url: 'content/03_ch03.html', chapter: '第3章' },
    { title: 'Webフォントの歴史', url: 'content/20_col01.html', chapter: 'コラム' },
    { title: 'アクセシビリティの重要性', url: 'content/21_col02.html', chapter: 'コラム' },
    { title: 'ユーザーインタフェース', url: 'content/04_ch04.html', chapter: '第4章' },
    { title: 'パフォーマンス最適化', url: 'content/05_ch05.html', chapter: '第5章' },
    { title: '品質保証', url: 'content/06_ch06.html', chapter: '第6章' },
    { title: 'プロジェクト完了', url: 'content/07_ch07.html', chapter: '第7章' },
    { title: '未来技術トレンド', url: 'content/22_col03.html', chapter: 'コラム' },
    { title: '編集後記', url: 'content/90_afterword.html', chapter: '付録' },
    { title: '参考文献', url: 'content/95_references.html', chapter: '付録' },
    { title: '索引', url: 'content/96_index.html', chapter: '付録' }
  ];

  let html = '';
  let currentChapter = '';

  pages.forEach(page => {
    // 章ラベル
    if (page.chapter !== currentChapter) {
      currentChapter = page.chapter;
      html += `<div class="site-toc-chapter">${currentChapter}</div>`;
    }

    // ページリンク
    const currentPage = window.location.pathname.split('/').pop();
    const isActive = currentPage === page.url ||
      (currentPage === '' && page.url === 'index.html');

    html += '
      < div class="site-toc-item" >
        <a href="' + page.url + '" class="site-toc-link ' + (isActive ? 'current-page' : '') + '">
          ' + page.title + '
        </a>
        </div >
      ';
  });

  siteTocList.innerHTML = html;
}

// ページ内目次生成
function generatePageToc() {
  const pageTocList = document.querySelector('.page-toc-list');
  if (!pageTocList) return;

  const headings = document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6');
  if (headings.length === 0) return;

  let html = '';
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent.trim();
    const id = heading.id || `heading-${index}`;

    // 見出しにIDがない場合設定
    if (!heading.id) {
      heading.id = id;
    }

    const activeClass = window.location.hash === `#${id}` ? 'active' : '';
    const levelClass = level > 1 ? `page-toc-level-${level}` : '';

    html += '
      < div class="page-toc-item ' + levelClass + '" >
        <a href="#' + id + '" class="page-toc-link ' + activeClass + '" data-level="' + level + '">
          ' + text + '
        </a>
        </div >
      ';
  });

  pageTocList.innerHTML = html;

  // スクロール追従
  setupPageToCScroll();
}

// ページ内目次スクロール追従
function setupPageToCScroll() {
  const pageTocLinks = document.querySelectorAll('.page-toc-link');
  if (pageTocLinks.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // アクティブ状態更新
        pageTocLinks.forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`.page-toc-link[href="#${entry.target.id}"]`);
        if (activeLink) {
          activeLink.classList.add('active');
        }
      }
    });
  }, {
    rootMargin: '-20% 0px -70% 0px' // 中央付近をアクティブ判定
  });

  // 見出しで監視
  document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6')
    .forEach(heading => observer.observe(heading));
}

// モバイル用目次生成
function generateMobileToC() {
  const tocSheetContent = document.querySelector('.toc-sheet__content');
  if (!tocSheetContent) return;

  // ページ内目次とシンプルなサイト目次をマージ
  const headings = document.querySelectorAll('main h1, main h2, main h3');
  let html = '';

  headings.forEach((heading, index) => {
    const text = heading.textContent.trim();
    const id = heading.id || `heading-${index}`;
    if (!heading.id) heading.id = id;

    html += '
      < li >
      <a href="#' + id + '">' + text + '</a>
        </li >
      ';
  });

  if (html) {
    tocSheetContent.innerHTML = `<ul>${html}</ul>`;

    // クローズボタン
    const closeBtn = document.querySelector('.toc-sheet__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.documentElement.classList.remove('toc-open');
      });
    }
  }
}

// 全章検索機能
function setupGlobalSearch() {
  // 検索ダイアログの作成
  const searchHtml = '
    < div id = "global-search-overlay" class="global-search-overlay" >
      <div id="global-search-dialog" class="global-search-dialog">
        <div class="global-search-header">
          <h3>全章検索</h3>
          <button class="global-search-close">×</button>
        </div>
        <div class="global-search-input-wrapper">
          <input type="search" id="global-search-input" placeholder="すべての章を検索...">
            <button id="global-search-btn">検索</button>
        </div>
        <div id="global-search-results" class="global-search-results"></div>
      </div>
      </div >
    ';

  document.body.insertAdjacentHTML('beforeend', searchHtml);

  // 検索ボタンの追加（ヘッダー）
  const headerControls = document.querySelector('.js-header__controls');
  if (headerControls) {
    const searchBtn = document.createElement('button');
    searchBtn.className = 'js-global-search-btn';
    searchBtn.textContent = '全章検索';
    searchBtn.title = 'すべての章を検索';

    headerControls.appendChild(searchBtn);

    // 検索ダイアログ開閉
    searchBtn.addEventListener('click', () => {
      openGlobalSearch();
    });
  }

  // ダイアログ内のイベント設定
  setupSearchDialogEvents();
  setupSearchIndex();
}

function setupSearchDialogEvents() {
  const overlay = document.getElementById('global-search-overlay');
  const closeBtn = document.querySelector('.global-search-close');
  const searchInput = document.getElementById('global-search-input');
  const searchBtn = document.getElementById('global-search-btn');

  if (!overlay) return;

  // 閉じる処理
  const closeSearch = () => {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    searchInput.value = '';
    document.getElementById('global-search-results').innerHTML = '';
  };

  closeBtn.addEventListener('click', closeSearch);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeSearch();
    }
  });

  // ESCキー
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display === 'block') {
      closeSearch();
    }

    // Ctrl+Kで検索開始
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openGlobalSearch();
    }
  });

  // 検索実行
  searchBtn.addEventListener('click', performGlobalSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      performGlobalSearch();
    }
  });

  // 入力中の検索（遅延実行）
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if (query.length >= 2) {
      searchTimeout = setTimeout(() => {
        performGlobalSearch();
      }, 300);
    }
  });
}

function openGlobalSearch() {
  const overlay = document.getElementById('global-search-overlay');
  const searchInput = document.getElementById('global-search-input');

  if (overlay) {
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      searchInput.focus();
    }, 100);
  }
}

function setupSearchIndex() {
  // 章構成のインデックスを構築
  window.searchIndex = {
    pages: [
      {
        url: 'index.html',
        title: '平和への課題：補遺',
        content: getDocumentContent('main'),
        chapter: '序章'
      },
      {
        url: 'content/00_front.html',
        title: 'フロント挨拶',
        content: '',
        chapter: '序章'
      },
      {
        url: 'content/01_ch01.html',
        title: 'プロジェクト概要',
        content: '',
        chapter: '第1章'
      },
      {
        url: 'content/02_ch02.html',
        title: '技術的課題',
        content: '',
        chapter: '第2章'
      },
      {
        url: 'content/03_ch03.html',
        title: '実装方針',
        content: '',
        chapter: '第3章'
      },
      {
        url: 'content/20_col01.html',
        title: 'Webフォントの歴史',
        content: '',
        chapter: 'コラム'
      },
      {
        url: 'content/21_col02.html',
        title: 'アクセシビリティの重要性',
        content: '',
        chapter: 'コラム'
      },
      {
        url: 'content/04_ch04.html',
        title: 'ユーザーインタフェース',
        content: '',
        chapter: '第4章'
      },
      {
        url: 'content/05_ch05.html',
        title: 'パフォーマンス最適化',
        content: '',
        chapter: '第5章'
      },
      {
        url: 'content/06_ch06.html',
        title: '品質保証',
        content: '',
        chapter: '第6章'
      },
      {
        url: 'content/07_ch07.html',
        title: 'プロジェクト完了',
        content: '',
        chapter: '第7章'
      },
      {
        url: 'content/22_col03.html',
        title: '未来技術トレンド',
        content: '',
        chapter: 'コラム'
      },
      {
        url: 'content/90_afterword.html',
        title: '編集後記',
        content: '',
        chapter: '付録'
      },
      {
        url: 'content/95_references.html',
        title: '参考文献',
        content: '',
        chapter: '付録'
      },
      {
        url: 'content/96_index.html',
        title: '索引',
        content: '',
        chapter: '付録'
      }
    ]
  };
}

function getDocumentContent(selector) {
  const element = document.querySelector(selector);
  if (!element) return '';

  // スクリプトやスタイルタグを除外
  const clone = element.cloneNode(true);
  const scriptsAndStyles = clone.querySelectorAll('script, style, nav, .header-ui, .toc-overlay');
  scriptsAndStyles.forEach(el => el.remove());

  return clone.textContent || clone.innerText || '';
}

async function performGlobalSearch() {
  const query = document.getElementById('global-search-input').value.trim();
  const resultsContainer = document.getElementById('global-search-results');

  if (!query || query.length < 2) {
    resultsContainer.innerHTML = '<p class="search-help">検索語を2文字以上入力してください</p>';
    return;
  }

  resultsContainer.innerHTML = '<div class="search-loading">検索中...</div>';

  const results = await searchAcrossPages(query);
  displaySearchResults(results, query);
}

async function searchAcrossPages(query) {
  const results = [];
  const searchIndex = window.searchIndex;

  for (const page of searchIndex.pages) {
    // 現在ページの場合、直接検索
    let content = page.content;
    if (window.location.pathname.includes(page.url) || page.url === 'index.html') {
      content = getDocumentContent('main');
    }

    const pageResults = searchInContent(content, query, page);
    results.push(...pageResults);
  }

  return results.sort((a, b) => b.score - a.score);
}

function searchInContent(content, query, page) {
  const results = [];
  const regex = new RegExp(escapeRegExp(query), 'gi');
  const matches = content.match(regex);

  if (matches && matches.length > 0) {
    const textContent = content.replace(/\s+/g, ' ');
    const index = textContent.toLowerCase().indexOf(query.toLowerCase());

    // 文脈を取得（前後50文字）
    const start = Math.max(0, index - 50);
    const end = Math.min(textContent.length, index + query.length + 50);
    let context = textContent.substring(start, end);

    // クエリをハイライト
    context = context.replace(regex, '<mark>$&</mark>');

    // 文頭に...を追加
    if (start > 0) {
      context = '...' + context;
    }

    if (end < textContent.length) {
      context = context + '...';
    }

    results.push({
      page: page,
      score: matches.length,
      context: context,
      matchCount: matches.length
    });
  }

  return results;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\\]/g, '\\$&');
}

function displaySearchResults(results, query) {
  const resultsContainer = document.getElementById('global-search-results');

  if (results.length === 0) {
    resultsContainer.innerHTML = '
      < div class="search-no-results" >
          <p>「' + query + '」に一致する結果が見つかりませんでした</p>
          <ul>
            <li>検索語の綴りを確認してください</li>
            <li>別のキーワードで試してください</li>
            <li>部分一致でも検索できます</li>
          </ul>
        </div >
      ';
    return;
  }

  const currentChapter = results[0]?.page?.chapter || '';
  let html = '
    < div class="search-results-header" >
      <p>' + results.length + '件の結果（「' + query + '」）</p>
      </div >
    <div class="search-results-list">
      ';
    
    results.forEach((result, index) => {
      const isNewChapter = result.page.chapter !== currentChapter;
      if (isNewChapter) {
        currentChapter = result.page.chapter;
      html += `<div class="search-chapter-section">`;
        html += `<h4 class="search-chapter-title">${currentChapter}</h4>`;
        html += `</div>`;
      }

      html += '
      <div class="search-result-item">
        <div class="search-result-title">
          <a href="' + result.page.url + '" class="search-result-link">
            ' + result.page.title + '
          </a>
          <span class="search-match-count">' + result.matchCount + '件</span>
        </div>
        <div class="search-result-context">
          ' + result.context + '
        </div>
      </div>
      ';
    });

      html += `</div>`;
    resultsContainer.innerHTML = html;
    
    // リンククリック後のイベント設定
    setupSearchResultLinks();
  }

  function setupSearchResultLinks() {
    const links = document.querySelectorAll('.search-result-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        
        // 同じウィンドウで開く
        window.location.href = href;
        
        // 検索ダイアログを閉じる
        document.getElementById('global-search-overlay').style.display = 'none';
        document.body.style.overflow = '';
      });
    });
  }

// DOMContentLoaded時の実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // デバッグ用コンソール出力
  console.log('UI JS loaded successfully');
  console.log('SetupLeftPanelTabs available');
  
  // 実行
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    init();
    addAnnotationStyles();
    setupExportControls();
    
    // タブの初期化を確認
    setTimeout(() => {
      const tabs = document.querySelectorAll('.left-panel-tab');
      console.log('Found tabs:', tabs.length);
      const sidebar = document.querySelector('#quarto-sidebar');
      console.log('Sidebar found:', !!sidebar);
    }, 1000);
  });
  
// 実行
  // デバッグ用コンソール出力
  console.log('UI JS loaded successfully');
  console.log('SetupLeftPanelTabs available');
  
  // DOM監視を追加してタブ初期化を実行
  const observeTargetNode = document.querySelector('#TOC');
  
  if (observeTargetNode) {
    const observer = new MutationObserver(() => {
      if (observeTargetNode.querySelector('.tab-menu')) {
        observer.disconnect();
          console.log('TOC構造が準備できました');
          initializeTabs();
        }
    });
      
      observer.observe(observeTargetNode, {
      childList: true,
      subtree: true,
      attributes: true
    });
    } else {
      // DOM監視（フォールバック）
      const observer = new MutationObserver(() => {
        if (document.querySelector('.tab-menu')) {
          observer.disconnect();
          console.log('TOC構造が準備できました');
          initializeTabs();
        }
      });
      
      observer.observe(observeTargetNode); // observeTargetNodeがnullの場合、エラーになる可能性がある
    }
  }
  
  // タブ機能の初期化
  function initializeTabs() {
    console.log('初期化タブ機能開始');
  
    const sidebar = document.querySelector('#quarto-sidebar');
    const toc = document.querySelector('#TOC');
    
    if (!sidebar || !toc) {
      console.error('必要な要素が見つかりません');
      return;
    }
    
    console.log('既存のTOC項目数:', document.querySelectorAll('.toc-item').length);
    
    // 新しいタブメニューの作成
    const tabsHtml = '
      <div class="tab-menu">
        <button class="tab-item active" data-tab="site">サイト目次</button>
        <button class="tab-item" data-tab="page">このページ</button>
      </div>
      <div class="tab-content">
        <div class="site-toc-list"></div>
        <div class="page-toc-list"></div>
      </div>
    ';
    
    // TOCコンテナの先頭にタブを挿入
    const tocContainer = document.querySelector('#TOC');
    if (tocContainer) {
      tocContainer.insertAdjacentHTML('afterbegin', tabsHtml);
    }
    
    // イベントリスナー設定
    const tabs = tocContainer.querySelectorAll('.tab-item');
    const sections = tocContainer.querySelectorAll('.tab-section');
    setupTabSwitching(tabs, sections);
    
    console.log('タブ機能初期化完了');
  }

  // マーカー機能
  function setupMarkerFunctionality() {
    // 既存のマーカーをすべて削除して初期化
    document.querySelectorAll('.text-marker').forEach(el => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });
    
    // オーバーレイを作成
    const overlay = document.createElement('div');
    overlay.className = 'text-highlight-overlay';
    document.body.appendChild(overlay);
    
    // コンテナを作成
    const container = document.createElement('div');
    container.className = 'text-highlight-container';
    document.body.appendChild(container);
    
    // ツ書き込み
    let currentSelection = null;
    let selectedColor = '#fff59d';
    
    // イベントリスナー
    document.addEventListener('mouseup', (e) => {
      // テキスト選択チェック
      const selection = window.getSelection();
      if (selection.rangeCount === 0) return;
      
      const selectedText = selection.toString().trim();
      if (selectedText.length > 0) {
        currentSelection = selection;
        showTextHighlightDialog(selection, e);
      }
    });
    
    // ESCキーでダイアログを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideTextHighlightDialog();
      }
    });
    
    function showTextHighlightDialog(selection, event) {
      // ダイアログの位置を設定
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 位置が右端に近い場合は左に調整
      if (rect.left + 300 > viewportWidth) {
        left = viewportWidth - 320;
      }
      
      // 位置が下端に近い場合は上に調整
      if (rect.bottom + 150 > viewportHeight) {
        top = viewportHeight - 160;
      }
      
      // ダイアログを表示
      overlay.classList.add('show');
      container.classList.add('show');
      
      // 位置を設定
      overlay.style.display = 'block';
      container.style.left = `${ left } px`;
      container.style.top = `${ top } px`;
      
      // 選択コンテキストを表示
      const context = document.getElementById('highlight-context');
      if (context) {
        context.textContent = `「${ selection.toString() }」をマーカーします。色を選択して適用してください。`;
      }
    }
    
    function hideTextHighlightDialog() {
      overlay.classList.remove('show');
      container.classList.remove('show');
      currentSelection = null;
    }
    
    // マーカー適用
    function applyMarkerToSelection(color, selection) {
      if (selection.rangeCount === 0) return;
      
      try {
        const range = selection.getRangeAt(0);
        
        // フォーマットを保持したマーカーを適用
        const walker = document.createTreeWalker(
          range.cloneContents(),
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        const textNodes = [];
        while (walker.nextNode()) {
          textNodes.push(walker.currentNode);
        }
        
        if (textNodes.length === 0) return;
        
        // 各テキストノードにマーカーを適用
        textNodes.forEach(node => {
          const markerSpan = document.createElement('span');
          markerSpan.className = 'text-marker';
          markerSpan.style.backgroundColor = color;
          
          // ダブルクリックで消去
          markerSpan.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const parent = markerSpan.parentNode;
            parent.replaceChild(document.createTextNode(markerSpan.textContent), markerSpan);
            parent.normalize();
          });
          
          node.parentNode.replaceChild(markerSpan, node);
        });
        
        // 選択範囲を空に戻す
        selection.removeAllRanges();
        
        hideTextHighlightDialog();
      } catch (error) {
        console.error('マーカー適用エラー:', error);
      }
    }
    
    console.log('マーカー機能を初期化しました');
  }

    // テキスト選択イベント
    let currentColor = '#fff59d';
    const colorButtons = toolbar.querySelectorAll('.marker-color-btn');
    const clearButton = toolbar.querySelector('.marker-clear-btn');

    colorButtons.forEach(button => {
      button.addEventListener('click', () => {
        colorButtons.forEach(btn => btn.classList.remove('active'));
        if (button.dataset.color === 'clear') {
          currentColor = null;
        } else {
          button.classList.add('active');
          currentColor = button.dataset.color;
        }
      });
    });

    clearButton.addEventListener('click', () => {
      // すべてのマーカーを消去
      document.querySelectorAll('.marker-highlight').forEach(element => {
        const parent = element.parentNode;
        parent.replaceChild(document.createTextNode(element.textContent), element);
        parent.normalize();
      });
      showNotification('すべてのマーカーを消去しました');
    });

    // テキスト選択イベントリスナー
    document.addEventListener('mouseup', (e) => {
      setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText.length > 0 && currentColor && !isSelectionInToolbar(e)) {
          applyMarker(currentColor, selection);
        }
      }, 10);
    });

    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
      // Mキーでマーカーツールバーを表示/非表示
      if (e.key === 'm' && !isInputFocused() && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toolbar.classList.toggle('visible');
      }
      
      // Escapeでツールバーを非表示
      if (e.key === 'Escape') {
        toolbar.classList.remove('visible');
      }
    });

    console.log('マーカー機能を初期化しました');
  }

  // マーカーを適用する関数
  function applyMarker(color, selection) {
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedContents = range.extractContents();
    
    // マーカースパンを作成
    const markerSpan = document.createElement('span');
    markerSpan.className = 'marker-highlight';
    markerSpan.style.backgroundColor = color;
    markerSpan.title = 'マーカーをクリックして消去';
    
    // クリックでマーカーを消去するイベント
    markerSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = markerSpan.parentNode;
      parent.replaceChild(document.createTextNode(markerSpan.textContent), markerSpan);
      parent.normalize();
    });

    markerSpan.appendChild(selectedContents);
    range.insertNode(markerSpan);
    
    // 選択を解除
    selection.removeAllRanges();
  }

  // ツールバー内の選択かどうかをチェック
  function isSelectionInToolbar(e) {
    const toolbar = document.querySelector('.marker-toolbar');
    return toolbar && toolbar.contains(e.target);
  }

  // 通知表示関数
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = '
      position: fixed;
      top: 70px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      opacity: 0;
      transition: opacity 0.3s ease;
    ';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // フェードイン
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // 3秒後にフェードアウト
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

})();
