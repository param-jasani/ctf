import { getAlert, getScenarioSummary, submitTriage as submitTriageApi } from '../api.js';
import { getTriage, recordTriage, getScenarioTriages } from '../triageStore.js';
import { getVisibleCount, initScenarioStream } from '../alertStream.js';

const SKIP_FIELDS = new Set(['index', 'sourcetype', 'status', '_index', 'alert_name', 'alert_severity', 'source', 'host', '_time', 'mitre_tactic', 'mitre_technique']);

function renderJsonViewer(data, name) {
  const isObject = typeof data === 'object' && data !== null;
  const isArray = Array.isArray(data);
  
  if (!isObject) {
    return `<div class="flex gap-2">
      ${name ? `<span class="text-ink opacity-70 shrink-0">${name}:</span>` : ''}
      <span class="text-cyan-700 font-bold break-all text-[#008b8b]">${String(data)}</span>
    </div>`;
  }
  
  const keys = Object.keys(data).filter(k => !k.toLowerCase().includes('verdict'));
  const isEmpty = keys.length === 0;
  
  if (isEmpty) return '';

  return `
    <details class="font-mono text-[10px] group" open>
      <summary class="cursor-pointer hover:bg-ink/10 inline-flex items-center gap-1 select-none text-ink py-0.5 px-1 -ml-1 transition-colors outline-none list-none [&::-webkit-details-marker]:hidden">
        <span class="inline-block transition-transform group-open:rotate-90 text-[8px] opacity-50">▶</span>
        ${name ? `<span class="text-ink opacity-70">${name}: </span>` : ''}
        <span class="text-ink opacity-50 italic">
          ${isArray ? `[${keys.length} items]` : `{${keys.length} keys}`}
        </span>
      </summary>
      <div class="pl-4 border-l-2 border-ink/20 ml-1.5 mt-0.5 space-y-0.5">
        ${keys.map(key => `
          <div>${renderJsonViewer(data[key], isArray ? undefined : key)}</div>
        `).join('')}
      </div>
    </details>
  `;
}

function renderFields(alert) {
  const displayFields = Object.entries(alert).filter(([key, val]) => {
    if (SKIP_FIELDS.has(key)) return false;
    if (val === null || val === undefined || val === '') return false;
    if (key === 'mitre_technique' || key === 'mitre_tactic') return false;
    if (key.toLowerCase().includes('verdict')) return false;
    return true;
  });

  return displayFields.map(([key, val]) => {
    let parsedData = null;
    let isJson = false;
    if (typeof val === 'object' && val !== null) {
      isJson = true;
      parsedData = val;
    } else if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (typeof parsed === 'object' && parsed !== null) {
          isJson = true;
          parsedData = parsed;
        }
      } catch(e) {}
    }
    
    const isCmdline = key === 'cmdline';
    const strVal = String(val);

    const valueHtml = isJson 
      ? `<div class="col-span-2 overflow-x-auto bg-canvas p-2 border-2 border-ink shadow-[inset_2px_2px_0_0_#e5e5e5]">${renderJsonViewer(parsedData)}</div>`
      : isCmdline
      ? `<div class="col-span-2 bg-ink p-3 border-2 border-ink shadow-[2px_2px_0_0_#0b0b0b]">
           <code class="font-mono text-xs text-cyan break-all block whitespace-pre-wrap">${strVal}</code>
           <div class="mt-2 text-[10px] text-white/50 italic uppercase">// ENCODED PAYLOAD DETECTED</div>
         </div>`
      : `<span class="col-span-2 font-mono text-xs text-ink break-all">${strVal}</span>`;

    return `
      <div class="grid grid-cols-3 bg-white border-2 border-ink p-3 items-start shadow-[4px_4px_0_0_#0b0b0b] mb-2 hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_#0b0b0b] transition-all">
        <span class="font-mono text-[10px] font-bold uppercase text-ink opacity-70">${key}</span>
        ${valueHtml}
      </div>
    `;
  }).join('');
}

let startTime = 0;
let currentAlert = null;
let currentScenarioId = null;
let currentTotalAlerts = 0; 
let selectedVerdict = null;

export async function renderTriage(scenarioId, alertIndex) {
  const container = document.getElementById('view-triage');
  if (container) container.innerHTML = `<div class="text-center py-20 animate-pulse font-mono font-bold uppercase tracking-widest text-ink">Accessing Logs...</div>`;
  
  currentScenarioId = scenarioId;
  startTime = Date.now();
  selectedVerdict = null;
  
  try {
    const [alertData, summary] = await Promise.all([
      getAlert(scenarioId, alertIndex),
      getScenarioSummary(scenarioId)
    ]);
    
    if (getVisibleCount() === 0) {
      initScenarioStream(scenarioId, summary.totalAlerts);
    }
    
    const triages = getScenarioTriages(scenarioId);
    if (triages.length === summary.totalAlerts && summary.totalAlerts > 0) {
      if (container) container.innerHTML = `
        <div class="max-w-3xl mx-auto pt-10 px-4">
          <div class="bg-danger text-white border-2 border-ink p-6 font-mono shadow-[4px_4px_0_0_#0b0b0b]">
            <h2 class="text-xl font-bold mb-2">ACCESS DENIED</h2>
            <p>This scenario has already been completed. You cannot access or modify alerts post-completion.</p>
            <button onclick="window.navigateSoc('/soc/scenarios/${scenarioId}')" class="mt-6 border-2 border-white px-4 py-2 hover:bg-white hover:text-danger transition-colors font-bold uppercase tracking-widest text-xs">Return to Dashboard</button>
          </div>
        </div>
      `;
      return;
    }
    
    if (alertIndex >= getVisibleCount()) {
      if (container) container.innerHTML = `
        <div class="max-w-3xl mx-auto pt-10 px-4">
          <div class="bg-danger text-white border-2 border-ink p-6 font-mono shadow-[4px_4px_0_0_#0b0b0b]">
            <h2 class="text-xl font-bold mb-2">ACCESS DENIED</h2>
            <p>Alert #${alertIndex} has not yet been ingested by the SOC stream.</p>
            <button onclick="window.navigateSoc('/soc/scenarios/${scenarioId}')" class="mt-6 border-2 border-white px-4 py-2 hover:bg-white hover:text-danger transition-colors font-bold uppercase tracking-widest text-xs">Return to Dashboard</button>
          </div>
        </div>
      `;
      return;
    }

    currentAlert = alertData;
    currentTotalAlerts = summary.totalAlerts;
    updateTriageUI();
  } catch (err) {
    if (container) container.innerHTML = `<div class="bg-danger text-white border-2 border-ink p-4 font-mono font-bold shadow-[4px_4px_0_0_#0b0b0b]">${err.message || 'Failed to load alert'}</div>`;
  }
}

function updateTriageUI() {
  const container = document.getElementById('view-triage');
  if (!container) return;
  const existing = getTriage(`${currentScenarioId}-${currentAlert._index}`);
  
  const SEV_COLORS = {
    critical: 'bg-soc_critical',
    high:     'bg-soc_high',
    medium:   'bg-soc_medium',
    low:      'bg-soc_low',
    informational: 'bg-soc_info',
  };
  const badgeColor = SEV_COLORS[currentAlert.alert_severity] || 'bg-soc_info';

  let triagePanelHtml = '';
  
  if (existing) {
    const isCorrect = existing.isCorrect;
    const isLast = currentAlert._index >= currentTotalAlerts - 1;
    triagePanelHtml = `
      <div class="border-2 border-ink bg-white p-6 space-y-6 shadow-[8px_8px_0_0_#0b0b0b]">
        <h2 class="font-mono text-[10px] font-bold uppercase text-ink flex items-center gap-2">
          <span class="text-success text-xl">✓</span>
          // TRIAGE SUBMITTED
        </h2>
        <div class="space-y-[1px] bg-ink border-2 border-ink">
          <div class="grid grid-cols-3 bg-white p-3 border-b-2 border-ink">
            <span class="font-mono text-[10px] text-ink font-bold opacity-70">VERDICT</span>
            <span class="col-span-2 font-mono text-xs font-bold text-ink">${String(existing.verdict || 'UNKNOWN').toUpperCase()}</span>
          </div>
          <div class="grid grid-cols-3 bg-white p-3 border-b-2 border-ink">
            <span class="font-mono text-[10px] text-ink font-bold opacity-70">SUBMITTED</span>
            <span class="col-span-2 font-mono text-xs text-ink">${existing.submittedAt.split('T')[0]}</span>
          </div>
          <div class="grid grid-cols-3 bg-white p-3">
            <span class="font-mono text-[10px] text-ink font-bold opacity-70">ACCURACY</span>
            <span class="col-span-2 font-mono text-xs font-bold ${isCorrect ? 'text-success' : 'text-danger'}">${isCorrect ? 'CORRECT' : 'INCORRECT'}</span>
          </div>
        </div>
        <div class="flex gap-4">
          <button id="btn-next-alert" class="btn-primary flex-1 !text-xs text-center flex justify-center items-center gap-2">
            ${isLast ? 'BACK TO SCENARIO' : 'NEXT ALERT →'}
          </button>
          ${isLast ? '' : '<button id="btn-back-scenario" class="btn-secondary">SCENARIO SUMMARY</button>'}
        </div>
      </div>
    `;
  } else {
    triagePanelHtml = `
      <div class="border-2 border-ink bg-white p-6 shadow-[8px_8px_0_0_#0b0b0b]">
        <h2 class="font-mono text-[10px] font-bold uppercase text-ink mb-6 flex items-center gap-2">
          <span class="text-cyan text-xl">🛡️</span>
          // TRIAGE ACTION
        </h2>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <button id="btn-verdict-tp" class="border-2 font-mono font-bold text-xs p-4 uppercase transition-all shadow-[4px_4px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] ${selectedVerdict === 'true_positive' ? 'border-danger bg-danger/10 text-danger' : 'border-ink bg-white text-ink'}">
              TRUE POSITIVE
            </button>
            <button id="btn-verdict-fp" class="border-2 font-mono font-bold text-xs p-4 uppercase transition-all shadow-[4px_4px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] ${selectedVerdict === 'false_positive' ? 'border-success bg-success/10 text-success' : 'border-ink bg-white text-ink'}">
              FALSE POSITIVE
            </button>
          </div>
          <div id="submit-error" class="hidden font-mono text-[10px] font-bold text-danger uppercase mt-2"></div>
          <button id="btn-submit-triage" class="${selectedVerdict ? 'btn-danger' : 'border-2 border-ink bg-gray-200 text-gray-500 cursor-not-allowed shadow-[4px_4px_0_0_#0b0b0b]'} w-full !text-sm mt-4 p-4 font-bold uppercase flex justify-center items-center gap-2 transition-all">
            SUBMIT VERDICT
          </button>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="max-w-7xl mx-auto h-full flex flex-col pt-2">
      <!-- Header -->
      <div class="bg-white border-2 border-ink shadow-[4px_4px_0_0_#0b0b0b] p-4 flex items-center gap-4 mb-6">
        <button onclick="window.navigateSoc('/soc/scenarios/${currentScenarioId}')" class="btn-secondary !px-3 !py-1 flex items-center justify-center shrink-0">
          <span class="mr-1">←</span> BACK
        </button>
        
        <div class="w-1 ${badgeColor} self-stretch"></div>
        
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono text-[10px] font-bold uppercase border-2 border-ink ${badgeColor} text-white px-1 shadow-[2px_2px_0_0_#0b0b0b]">
              ${currentAlert.alert_severity === 'informational' ? 'INFO' : String(currentAlert.alert_severity || 'UNKNOWN').toUpperCase()}
            </span>
            <span class="font-mono text-[10px] text-ink opacity-70 truncate">${currentAlert._time}</span>
          </div>
          <h1 class="font-bold font-mono text-base text-ink truncate">${currentAlert.alert_name}</h1>
        </div>
        
        <div class="hidden md:flex items-center gap-6 font-mono text-[10px] text-ink uppercase text-right shrink-0">
          <div class="flex flex-col">
            <span class="opacity-50">SOURCE</span>
            <span class="font-bold border-b-2 border-cyan">${currentAlert.source}</span>
          </div>
          <div class="flex flex-col">
            <span class="opacity-50">HOST</span>
            <span class="font-bold border-b-2 border-cyan">${currentAlert.host}</span>
          </div>
        </div>
      </div>
      
      <!-- Layout -->
      <div class="grid grid-cols-12 gap-8 flex-1 min-h-0">
        <section class="col-span-12 md:col-span-7 lg:col-span-8 overflow-y-auto pr-2 pb-10">
          <h3 class="font-mono text-[10px] font-bold uppercase text-ink mb-4 flex items-center gap-2">
            <span class="text-cyan">//</span> EVENT DETAILS
          </h3>
          ${renderFields(currentAlert)}
        </section>
        
        <aside class="col-span-12 md:col-span-5 lg:col-span-4 flex flex-col gap-6">
          ${triagePanelHtml}
        </aside>
      </div>
    </div>
  `;

  if (!existing) {
    document.getElementById('btn-verdict-tp').addEventListener('click', () => { selectedVerdict = 'true_positive'; updateTriageUI(); });
    document.getElementById('btn-verdict-fp').addEventListener('click', () => { selectedVerdict = 'false_positive'; updateTriageUI(); });
    
    const submitBtn = document.getElementById('btn-submit-triage');
    if (selectedVerdict) {
      submitBtn.addEventListener('click', async () => {
        submitBtn.innerText = 'SUBMITTING...';
        submitBtn.disabled = true;
        
        let actualVerdict = '';
        for (const val of Object.values(currentAlert)) {
          if (typeof val === 'string') {
            try { const p = JSON.parse(val); if (p && p.verdict) actualVerdict = p.verdict; } catch(e){}
          } else if (val && typeof val === 'object') {
            if (val.verdict) actualVerdict = val.verdict;
          }
        }
        
        const isCorrect = actualVerdict ? selectedVerdict === actualVerdict : true;
        const timeToRespondMs = Date.now() - startTime;
        
        const result = {
          scenarioId: currentScenarioId,
          alertIndex: currentAlert._index,
          alertName: currentAlert.alert_name,
          verdict: selectedVerdict,
          submittedAt: new Date().toISOString(),
          isCorrect,
          timeToRespondMs
        };
        
        recordTriage(`${currentScenarioId}-${currentAlert._index}`, result);
        updateTriageUI();
      });
    }
  } else {
    const isLast = currentAlert._index >= currentTotalAlerts - 1;
    const backBtn = document.getElementById('btn-back-scenario');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.navigateSoc(`/soc/scenarios/${currentScenarioId}`);
      });
    }
    document.getElementById('btn-next-alert').addEventListener('click', () => {
      if (isLast) {
        window.navigateSoc(`/soc/scenarios/${currentScenarioId}`);
      } else {
        if (currentAlert._index + 1 >= getVisibleCount()) {
          const btn = document.getElementById('btn-next-alert');
          const originalText = btn.innerText;
          btn.innerText = 'WAITING FOR STREAM...';
          btn.classList.add('opacity-50', 'cursor-not-allowed');
          setTimeout(() => {
            btn.innerText = originalText;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
          }, 2000);
          return;
        }
        window.navigateSoc(`/soc/scenarios/${currentScenarioId}/alerts/${currentAlert._index + 1}`);
      }
    });
  }
}
