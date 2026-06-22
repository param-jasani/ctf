import { renderPractice } from './views/practice.js';
import { renderCompete } from './views/compete.js';
import { renderScenario } from './views/scenario.js';
import { renderTriage } from './views/triage.js';

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
      nav.classList.add('text-ink', 'border-ink');
      nav.classList.remove('text-gray-400', 'border-transparent');
    } else if (id === 'view-compete') {
      const nav = document.getElementById('nav-compete');
      nav.classList.add('text-ink', 'border-ink');
      nav.classList.remove('text-gray-400', 'border-transparent');
    }
  },
  
  async handleRoute() {
    const path = window.location.pathname;
    
    if (path === '/soc' || path === '/soc/' || path === '/soc/index.html') {
      window.history.replaceState({}, '', '/soc/practice');
      return this.handleRoute();
    }
    
    if (path.startsWith('/soc/practice')) {
      this.showView('view-practice');
      await renderPractice();
    } else if (path.startsWith('/soc/compete')) {
      this.showView('view-compete');
      renderCompete();
    } else if (path.match(/^\/soc\/scenarios\/[^\/]+\/alerts\/\d+$/)) {
      const parts = path.split('/');
      const scenarioId = parts[3];
      const alertIndex = parseInt(parts[5], 10);
      this.showView('view-triage');
      await renderTriage(scenarioId, alertIndex);
    } else if (path.match(/^\/soc\/scenarios\/[^\/]+$/)) {
      const parts = path.split('/');
      const scenarioId = parts[3];
      this.showView('view-scenario');
      await renderScenario(scenarioId);
    } else {
      // 404
      this.showView('view-practice');
      await renderPractice();
    }
  }
};

window.addEventListener('popstate', () => app.handleRoute());

document.addEventListener('DOMContentLoaded', () => {
  // Override all links within SOC nav
  document.querySelectorAll('a[data-nav], a[href^="/soc/"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.startsWith('/soc/')) {
        e.preventDefault();
        window.history.pushState({}, '', href);
        app.handleRoute();
      }
    });
  });
  
  // Expose global navigation for JS rendering
  window.navigateSoc = (url) => {
    window.history.pushState({}, '', url);
    app.handleRoute();
  };

  app.handleRoute();
});
