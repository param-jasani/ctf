import { renderPractice } from './views/practice.js';
import { renderScenario } from './views/scenario.js';
import { renderCompete } from './views/compete.js';

const app = {
  currentView: null,
  showView(id) {
    document.querySelectorAll('main > div').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    this.currentView = id;
    
    // Update nav styles
    document.querySelectorAll('nav [data-nav]').forEach(el => {
      el.classList.remove('text-ink', 'border-ink');
      el.classList.add('text-gray-400', 'border-transparent');
    });
    
    if (id === 'view-practice') {
      const nav = document.getElementById('nav-practice');
      if (nav) {
          nav.classList.add('text-ink', 'border-ink');
          nav.classList.remove('text-gray-400', 'border-transparent');
      }
    } else if (id === 'view-compete' || id === 'view-scenario') {
      // Determine which nav to highlight based on the current path
      const isCompete = window.location.pathname.startsWith('/grc/compete');
      const navId = isCompete ? 'nav-compete' : 'nav-practice';
      const nav = document.getElementById(navId);
      if (nav) {
          nav.classList.add('text-ink', 'border-ink');
          nav.classList.remove('text-gray-400', 'border-transparent');
      }
    }
  },
  
  async handleRoute() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPath = urlParams.get('p');
    if (redirectPath) {
      window.history.replaceState({}, '', redirectPath);
    }
    const path = window.location.pathname;
    
    if (path === '/grc' || path === '/grc/' || path === '/grc/index.html') {
      window.history.replaceState({}, '', '/grc/practice');
      return this.handleRoute();
    }
    
    if (path.match(/^\/grc\/compete\/scenarios\/[^\/]+$/)) {
      const parts = path.split('/');
      const scenarioId = parts[4];
      this.showView('view-scenario');
      await renderScenario(scenarioId, true);
    } else if (path.startsWith('/grc/practice')) {
      this.showView('view-practice');
      await renderPractice();
    } else if (path.startsWith('/grc/compete')) {
      this.showView('view-compete');
      await renderCompete();
    } else if (path.match(/^\/grc\/scenarios\/[^\/]+$/)) {
      const parts = path.split('/');
      const scenarioId = parts[3];
      this.showView('view-scenario');
      await renderScenario(scenarioId);
    } else {
      // Fallback
      this.showView('view-practice');
      await renderPractice();
    }
  }
};

window.addEventListener('popstate', () => app.handleRoute());

document.addEventListener('DOMContentLoaded', () => {
  // Override all links within GRC nav
  document.querySelectorAll('a[data-nav], a[href^="/grc/"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.startsWith('/grc/')) {
        e.preventDefault();
        window.history.pushState({}, '', href);
        app.handleRoute();
      }
    });
  });
  
  // Expose global navigation for JS rendering
  window.navigateGrc = (url) => {
    window.history.pushState({}, '', url);
    app.handleRoute();
  };

  app.handleRoute();
});
