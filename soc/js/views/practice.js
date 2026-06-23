import { listScenarios } from '../api.js';

let glitchIntervals = {};

export async function renderPractice() {
  const container = document.getElementById('view-practice');
  
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  container.innerHTML = `
    <div class="mb-8 border-b-2 border-ink pb-4 flex justify-between items-end">
      <div>
        <h2 class="font-black text-4xl uppercase tracking-widest text-ink">
          // AVAILABLE SCENARIOS
        </h2>
        <p class="font-mono text-sm text-ink opacity-80 mt-2">
          SELECT OPERATIONAL PARAMETERS TO INITIATE ENVIRONMENT
        </p>
      </div>
      <div class="flex gap-4 font-mono text-xs font-bold text-ink uppercase" id="practice-stats">
        <span class="flex items-center gap-2">
          <span class="w-3 h-3 bg-cyan border-2 border-ink inline-block"></span>
          ACTIVE: <span id="stat-active">...</span>
        </span>
        <span class="flex items-center gap-2">
          <span class="w-3 h-3 bg-danger border-2 border-ink inline-block"></span>
          CRITICAL: <span id="stat-critical">...</span>
        </span>
      </div>
    </div>
    
    <div id="practice-error" class="hidden mb-6 bg-danger text-white border-2 border-ink p-4 font-mono text-sm font-bold shadow-[4px_4px_0_0_#0b0b0b]"></div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="practice-grid">
      <!-- Skeletons -->
      ${[1,2,3].map(() => `
        <div class="card opacity-50 relative pointer-events-none">
          <div class="animate-pulse">
            <div class="h-6 w-48 bg-gray-200 mb-4"></div>
            <div class="h-4 w-full bg-gray-200 mb-2"></div>
            <div class="h-4 w-3/4 bg-gray-200 mb-6"></div>
          </div>
        </div>
      `).join('')}
    </div>

    <div id="practice-terminal" class="hidden mt-12 bg-white border-2 border-ink p-6 font-mono text-xs text-ink shadow-[4px_4px_0_0_#0b0b0b]">
      <div class="flex items-center gap-3 mb-4 pb-2 border-b-2 border-ink">
        <span class="w-3 h-3 bg-success border-2 border-ink inline-block animate-pulse"></span>
        <span class="font-bold tracking-widest uppercase">SYSTEM STATUS: OPTIMAL</span>
        <span class="ml-auto opacity-50">v1.0.0-STABLE</span>
      </div>
      <div class="opacity-80 space-y-2">
        <div>[${now}] Session authenticated</div>
        <div id="term-loaded-msg"></div>
        <div>
          [SYS] Waiting for mission selection <span class="block-cursor"></span>
        </div>
      </div>
    </div>
  `;

  try {
    const res = await listScenarios();
    const scenarios = res.scenarios;
    
    const statActive = document.getElementById('stat-active');
    if (statActive) statActive.textContent = scenarios.length;
    const statCritical = document.getElementById('stat-critical');
    if (statCritical) statCritical.textContent = scenarios.filter(s => s.difficulty === 'advanced').length;
    
    const grid = document.getElementById('practice-grid');
    if (grid) grid.innerHTML = '';
    
    scenarios.forEach(scenario => {
      const card = document.createElement('div');
      card.className = 'card relative cursor-pointer group flex flex-col justify-between overflow-hidden';
      card.onclick = () => window.navigateSoc(`/soc/scenarios/${scenario.id}`);
      
      const titleText = `> ${String(scenario.title || 'UNKNOWN').toUpperCase()}`;
      
      let badgeClass = 'bg-cyan';
      if (scenario.difficulty === 'intermediate') badgeClass = 'bg-warning';
      if (scenario.difficulty === 'advanced') badgeClass = 'bg-danger text-white';
      
      let stripeClass = 'severity-stripe-low';
      if (scenario.difficulty === 'intermediate') stripeClass = 'severity-stripe-medium';
      if (scenario.difficulty === 'advanced') stripeClass = 'severity-stripe-critical';
      
      card.innerHTML = `
        <div class="absolute left-0 top-0 w-2 h-full ${stripeClass}"></div>
        <div class="pl-2">
          <div class="flex justify-between items-start mb-4">
            <h3 class="font-black text-xl uppercase tracking-tighter text-ink transition-colors group-hover:text-[#008b8b] mr-2 glitch-title" data-text="${titleText}">
              ${titleText}
            </h3>
            <span class="font-mono text-[10px] font-bold uppercase tracking-widest border-2 border-ink px-2 py-1 ${badgeClass}">
              ${scenario.difficulty}
            </span>
          </div>
          
          <p class="font-mono text-sm opacity-80 mb-6 leading-relaxed">
            ${scenario.description}
          </p>
          
          <div class="flex flex-wrap gap-2 mb-8">
            ${scenario.tags.map(t => `<span class="bg-canvas border-2 border-ink px-2 py-1 font-mono text-[10px] font-bold uppercase">[ ${t} ]</span>`).join('')}
          </div>
        </div>
        
        <div class="flex justify-between items-center border-t-2 border-ink pt-4 pl-2 mt-auto">
          <div class="font-mono text-[10px] font-bold uppercase text-ink flex items-center gap-2">
            <span class="text-xs">⚠️</span> ${scenario.alertCount} ALERTS
          </div>
          <button class="font-mono text-xs font-bold uppercase text-ink group-hover:text-cyan transition-colors">
            [ START → ]
          </button>
        </div>
      `;
      
      const titleEl = card.querySelector('.glitch-title');
      
      card.addEventListener('mouseenter', () => {
        let iterations = 0;
        clearInterval(glitchIntervals[scenario.id]);
        glitchIntervals[scenario.id] = setInterval(() => {
          titleEl.innerText = titleText
            .split('')
            .map((char, i) => {
              if (char === ' ') return ' ';
              if (i < iterations) return titleText[i];
              return String.fromCharCode(65 + Math.floor(Math.random() * 26));
            })
            .join('');
          
          if (iterations >= titleText.length) {
            clearInterval(glitchIntervals[scenario.id]);
            titleEl.innerText = titleText;
          }
          iterations += 1/3;
        }, 30);
      });
      
      card.addEventListener('mouseleave', () => {
        clearInterval(glitchIntervals[scenario.id]);
        titleEl.innerText = titleText;
      });
      
      if (grid) grid.appendChild(card);
    });
    
    const loadedMsg = document.getElementById('term-loaded-msg');
    if (loadedMsg) loadedMsg.innerText = `[${now}] Simulation environments loaded: ${scenarios.length} scenario(s) available`;
    const terminal = document.getElementById('practice-terminal');
    if (terminal) terminal.classList.remove('hidden');
    
  } catch (err) {
    const errEl = document.getElementById('practice-error');
    if (errEl) {
      errEl.innerText = err.message || 'Failed to load scenarios';
      errEl.classList.remove('hidden');
    }
    const grid = document.getElementById('practice-grid');
    if (grid) grid.innerHTML = '';
  }
}
