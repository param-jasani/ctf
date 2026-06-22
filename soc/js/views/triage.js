import { getAlert, submitTriage as submitTriageApi } from '../api.js';
import { getTriage, recordTriage } from '../triageStore.js';

const SKIP_FIELDS = new Set(['index', 'sourcetype', 'status', '_index', 'alert_name', 'alert_severity', 'source', 'host', '_time', 'mitre_tactic', 'mitre_technique']);

function renderJsonViewer(data, name) {
  const isObject = typeof data === 'object' && data !== null;
  const isArray = Array.isArray(data);
  
  if (!isObject) {
    return \`<div class="flex gap-2">
      \${name ? \`<span class="text-ink opacity-70 shrink-0">\${name}:</span>\` : ''}
      <span class="text-cyan break-all">\${String(data)}</span>
    </div>\`;
  }
  
  const keys = Object.keys(data).filter(k => !k.toLowerCase().includes('verdict'));
  const isEmpty = keys.length === 0;
  
  if (isEmpty) return '';

  return \`
    <details class="font-mono text-[10px]" open>
      <summary class="cursor-pointer hover:bg-ink/10 inline-flex items-center gap-1 select-none text-ink py-0.5 px-1 -ml-1 transition-colors outline-none">
        \${name ? \`<span class="text-ink opacity-70">\${name}: </span>\` : ''}
        <span class="text-ink opacity-50 italic">
          \${isArray ? \`[\${keys.length} items]\` : \`{\${keys.length} keys}\`}
        </span>
      </summary>
      <div class="pl-4 border-l-2 border-ink/20 ml-1.5 mt-0.5 space-y-0.5">
        \${keys.map(key => \`
          <div>\${renderJsonViewer(data[key], isArray ? undefined : key)}</div>
        \`).join('')}
      </div>
    </details>
  \`;
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
      ? \`<div class="col-span-2 overflow-x-auto bg-canvas p-2 border-2 border-ink shadow-[inset_2px_2px_0_0_#e5e5e5]">\${renderJsonViewer(parsedData)}</div>\`
      : isCmdline
      ? \`<div class="col-span-2 bg-ink p-3 border-2 border-ink shadow-[2px_2px_0_0_#0b0b0b]">
           <code class="font-mono text-xs text-cyan break-all block whitespace-pre-wrap">\${strVal}</code>
           <div class="mt-2 text-[10px] text-white/50 italic uppercase">// ENCODED PAYLOAD DETECTED</div>
         </div>\`
      : \`<span class="col-span-2 font-mono text-xs text-ink break-all">\${strVal}</span>\`;

    return \`
      <div class="grid grid-cols-3 bg-white border-2 border-ink p-3 items-start shadow-[4px_4px_0_0_#0b0b0b] mb-2 hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_#0b0b0b] transition-all">
        <span class="font-mono text-[10px] font-bold uppercase text-ink opacity-70">\${key}</span>
        \${valueHtml}
      </div>
    \`;
  }).join('');
}

let startTime = 0;
let currentAlert = null;
let currentScenarioId = null;
let currentTotalAlerts = 0; // Ideally fetched from summary, but we just use basic logic for next button
let selectedVerdict = null;

export async function renderTriage(scenarioId, alertIndex) {
  const container = document.getElementById('view-triage');
  container.innerHTML = \`<div class="text-center py-20 animate-pulse font-mono font-bold uppercase tracking-widest text-ink">Accessing Logs...</div>\`;
  
  currentScenarioId = scenarioId;
  startTime = Date.now();
  selectedVerdict = null;
  
  try {
    const alertData = await getAlert(scenarioId, alertIndex);
    currentAlert = alertData;
    
    // Attempt to guess totalAlerts if we can via the _index or just rely on API for next failure
    // A better approach is checking if it's the last alert, but for now we'll allow Next always, 
    // and if it fails, fallback to scenario view.
    
    updateTriageUI();
  } catch (err) {
    container.innerHTML = \`<div class="bg-danger text-white border-2 border-ink p-4 font-mono font-bold shadow-[4px_4px_0_0_#0b0b0b]">\${err.message || 'Failed to load alert'}</div>\`;
  }
}

function updateTriageUI() {
  const container = document.getElementById('view-triage');
  const existing = getTriage(\`\${currentScenarioId}-\${currentAlert._index}\`);
  
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
    triagePanelHtml = \`
      <div class="border-2 border-ink bg-white p-6 space-y-6 shadow-[8px_8px_0_0_#0b0b0b]">
        <h2 class="font-mono text-[10px] font-bold uppercase text-ink flex items-center gap-2">
          <span class="text-success text-xl">✓</span>
          // TRIAGE SUBMITTED
        </h2>
        <div class="space-y-[1px] bg-ink border-2 border-ink">
          <div class="grid grid-cols-3 bg-white p-3 border-b-2 border-ink">
            <span class="font-mono text-[10px] text-ink font-bold opacity-70">VERDICT</span>
            <span class="col-span-2 font-mono text-xs font-bold text-ink">\${existing.verdict.toUpperCase()}</span>
          </div>
          <div class="grid grid-cols-3 bg-white p-3 border-b-2 border-ink">
            <span class="font-mono text-[10px] text-ink font-bold opacity-70">SUBMITTED</span>
            <span class="col-span-2 font-mono text-xs text-ink">\${existing.submittedAt.split('T')[0]}</span>
          </div>
          <div class="grid grid-cols-3 bg-white p-3">
            <span class="font-mono text-[10px] text-ink font-bold opacity-70">ACCURACY</span>
            <span class="col-span-2 font-mono text-xs font-bold \${isCorrect ? 'text-success' : 'text-danger'}">\${isCorrect ? 'CORRECT' : 'INCORRECT'}</span>
          </div>
        </div>
        <div class="flex gap-4">
          <button id="btn-next-alert" class="btn-primary flex-1 !text-xs text-center flex justify-center items-center gap-2">NEXT ALERT →</button>
          <button id="btn-back-scenario" class="btn-secondary">SCENARIO SUMMARY</button>
        </div>
      </div>
    \`;
  } else {
    triagePanelHtml = \`
      <div class="border-2 border-ink bg-white p-6 shadow-[8px_8px_0_0_#0b0b0b]">
        <h2 class="font-mono text-[10px] font-bold uppercase text-ink mb-6 flex items-center gap-2">
          <span class="text-cyan text-xl">🛡️</span>
          // TRIAGE ACTION
        </h2>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <button id="btn-verdict-tp" class="border-2 font-mono font-bold text-xs p-4 uppercase transition-all shadow-[4px_4px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] \${selectedVerdict === 'true_positive' ? 'border-danger bg-danger/10 text-danger' : 'border-ink bg-white text-ink'}">
              TRUE POSITIVE
            </button>
            <button id="btn-verdict-fp" class="border-2 font-mono font-bold text-xs p-4 uppercase transition-all shadow-[4px_4px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] \${selectedVerdict === 'false_positive' ? 'border-success bg-success/10 text-success' : 'border-ink bg-white text-ink'}">
              FALSE POSITIVE
            </button>
          </div>
          <div id="submit-error" class="hidden font-mono text-[10px] font-bold text-danger uppercase mt-2"></div>
          <button id="btn-submit-triage" class="\${selectedVerdict ? 'btn-danger' : 'border-2 border-ink bg-gray-200 text-gray-500 cursor-not-allowed shadow-[4px_4px_0_0_#0b0b0b]'} w-full !text-sm mt-4 p-4 font-bold uppercase flex justify-center items-center gap-2 transition-all">
            SUBMIT VERDICT
          </button>
        </div>
      </div>
    \`;
  }

  container.innerHTML = \`
    <div class="max-w-7xl mx-auto h-full flex flex-col pt-2">
      <!-- Header -->
      <div class="bg-white border-2 border-ink shadow-[4px_4px_0_0_#0b0b0b] p-4 flex items-center gap-4 mb-6">
        <button onclick="window.navigateSoc('/soc/scenarios/\${currentScenarioId}')" class="btn-secondary !px-3 !py-1 flex items-center justify-center shrink-0">
          <span class="mr-1">←</span> BACK
        </button>
        
        <div class="w-1 \${badgeColor} self-stretch"></div>
        
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono text-[10px] font-bold uppercase border-2 border-ink \${badgeColor} text-white px-1 shadow-[2px_2px_0_0_#0b0b0b]">
              \${currentAlert.alert_severity === 'informational' ? 'INFO' : currentAlert.alert_severity.toUpperCase()}
            </span>
            <span class="font-mono text-[10px] text-ink opacity-70 truncate">\${currentAlert._time}</span>
          </div>
          <h1 class="font-bold font-mono text-base text-ink truncate">\${currentAlert.alert_name}</h1>
        </div>
        
        <div class="hidden md:flex items-center gap-6 font-mono text-[10px] text-ink uppercase text-right shrink-0">
          <div class="flex flex-col">
            <span class="opacity-50">SOURCE</span>
            <span class="font-bold border-b-2 border-cyan">\${currentAlert.source}</span>
          </div>
          <div class="flex flex-col">
            <span class="opacity-50">HOST</span>
            <span class="font-bold border-b-2 border-cyan">\${currentAlert.host}</span>
          </div>
        </div>
      </div>
      
      <!-- Layout -->
      <div class="grid grid-cols-12 gap-8 flex-1 min-h-0">
        <section class="col-span-12 md:col-span-7 lg:col-span-8 overflow-y-auto pr-2 pb-10">
          <h3 class="font-mono text-[10px] font-bold uppercase text-ink mb-4 flex items-center gap-2">
            <span class="text-cyan">//</span> EVENT DETAILS
          </h3>
          \${renderFields(currentAlert)}
        </section>
        
        <aside class="col-span-12 md:col-span-5 lg:col-span-4 flex flex-col gap-6">
          \${triagePanelHtml}
        </aside>
      </div>
    </div>
  \`;

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
        
        recordTriage(\`\${currentScenarioId}-\${currentAlert._index}\`, result);
        updateTriageUI();
      });
    }
  } else {
    document.getElementById('btn-back-scenario').addEventListener('click', () => {
      window.navigateSoc(\`/soc/scenarios/\${currentScenarioId}\`);
    });
    document.getElementById('btn-next-alert').addEventListener('click', () => {
      window.navigateSoc(\`/soc/scenarios/\${currentScenarioId}/alerts/\${currentAlert._index + 1}\`);
    });
  }
}
