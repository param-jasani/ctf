import { getScenarioSummary, listAlerts } from '../api.js';
import { initScenarioStream, subscribeToStream, resetScenarioStream } from '../alertStream.js';
import { getScenarioTriages, clearScenarioTriages } from '../triageStore.js';

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'informational'];
const SEV_COLORS = {
  critical:     'bg-soc_critical',
  high:         'bg-soc_high',
  medium:       'bg-soc_medium',
  low:          'bg-soc_low',
  informational:'bg-soc_info',
};

function formatMs(ms) {
  return (ms / 1000).toFixed(1) + 's';
}

function renderDashboard(triages) {
  if (triages.length === 0) return '';
  
  const total = triages.length;
  const correct = triages.filter(t => t.isCorrect).length;
  const avgAccuracy = Math.round((correct / total) * 100);
  
  const validTimes = triages.map(t => t.timeToRespondMs || 0).filter(t => t > 0);
  const mttr = validTimes.length ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length : 0;
  const bestTtr = validTimes.length ? Math.min(...validTimes) : 0;
  const worstTtr = validTimes.length ? Math.max(...validTimes) : 0;

  const maxTtr = Math.max(...validTimes, 1);
  const ttrGraphHtml = validTimes.length > 0 ? `
    <div class="mt-6">
      <h3 class="font-mono text-[10px] font-bold text-ink mb-4 flex items-center gap-2 uppercase">
        <span class="text-cyan">//</span> RESPONSE TIME (TTR) BY ALERT
      </h3>
      <div class="flex items-end gap-2 h-[120px] bg-canvas border-2 border-ink p-4 shadow-[inset_2px_2px_0_0_#e5e5e5]">
        ${triages.map(t => {
          const ttr = t.timeToRespondMs || 0;
          const pct = Math.round((ttr / maxTtr) * 100) || 1;
          const color = t.isCorrect ? 'bg-cyan' : 'bg-danger';
          return `
            <div class="flex-1 flex flex-col items-center justify-end gap-1 h-full group relative">
              <div class="absolute -top-8 bg-ink text-white px-2 py-1 text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-[2px_2px_0_0_#5ce1e6]">
                #${t.alertIndex}: ${formatMs(ttr)}
              </div>
              <div class="w-full ${color} opacity-80 hover:opacity-100 transition-all duration-300 border border-ink/20" style="height: ${pct}%"></div>
              <span class="text-[8px] font-mono opacity-80 truncate w-full text-center">#${t.alertIndex}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  return `
    <div class="p-6 bg-white border-b-2 border-ink space-y-6 shrink-0 shadow-[4px_4px_0_0_#0b0b0b] mb-6">
      <h2 class="font-mono text-[10px] font-bold uppercase text-ink flex items-center gap-2">
        <span>📊</span>
        // SCENARIO COMPLETE: POST-INCIDENT REPORT
      </h2>
      
      <div class="grid grid-cols-2 gap-4">
        ${[
          ['AVG ACCURACY', `${avgAccuracy}%`],
          ['AVG TTR', formatMs(mttr)],
        ].map(([k, v]) => `
          <div class="p-4 border-2 border-ink bg-canvas flex flex-col items-center justify-center gap-1 shadow-[2px_2px_0_0_#0b0b0b]">
            <span class="text-[10px] text-ink opacity-80 font-bold uppercase">${k}</span>
            <span class="text-xl font-black text-cyan uppercase">${v}</span>
          </div>
        `).join('')}
      </div>
      ${ttrGraphHtml}
      <button id="btn-replay" class="btn-primary w-full mt-4 !py-3 !text-sm flex justify-center uppercase tracking-widest font-bold">REPLAY SCENARIO</button>
    </div>
  `;
}

let activeScenarioId = null;
let currentFilters = { severity: '', source: '' };
let unsubscribeStream = null;

export async function renderScenario(scenarioId) {
  if (unsubscribeStream) {
    unsubscribeStream();
    unsubscribeStream = null;
  }
  
  const container = document.getElementById('view-scenario');
  activeScenarioId = scenarioId;
  
  container.innerHTML = `
    <div class="flex items-center gap-4 mb-6">
      <button onclick="window.navigateSoc('/soc/practice')" class="btn-secondary">&lt; BACK</button>
      <h2 class="font-black text-3xl uppercase tracking-widest text-ink">
        <span class="text-cyan animate-pulse">#</span> ${scenarioId}
      </h2>
    </div>
    
    <div id="scenario-error" class="hidden mb-6 bg-danger text-white border-2 border-ink p-4 font-mono text-sm font-bold shadow-[4px_4px_0_0_#0b0b0b]"></div>
    
    <div class="grid grid-cols-12 gap-8 h-[70vh] min-h-[600px]" id="scenario-content">
      <!-- Loading skeletons -->
      <div class="col-span-12 md:col-span-4 border-2 border-ink bg-white p-6 opacity-50 flex flex-col gap-8 shadow-[4px_4px_0_0_#0b0b0b]">
        <div class="animate-pulse space-y-4">
          <div class="h-4 w-32 bg-gray-200"></div>
          <div class="h-32 w-full bg-gray-200"></div>
        </div>
      </div>
      <div class="col-span-12 md:col-span-8 border-2 border-ink bg-white flex flex-col shadow-[4px_4px_0_0_#0b0b0b] opacity-50">
        <div class="h-14 border-b-2 border-ink bg-canvas flex items-center px-6">
           <div class="animate-pulse h-4 w-48 bg-gray-200"></div>
        </div>
      </div>
    </div>
  `;

  try {
    const summary = await getScenarioSummary(scenarioId);
    
    initScenarioStream(scenarioId, summary.totalAlerts);
    
    const triages = getScenarioTriages(scenarioId);
    const isDone = triages.length === summary.totalAlerts && summary.totalAlerts > 0;
    
    const allAlerts = await listAlerts(scenarioId);
    const allSources = Array.from(new Set(allAlerts.alerts.map(a => a.source))).sort();
    
    const summaryHtml = `
      <section class="col-span-12 md:col-span-4 border-2 border-ink bg-white p-6 flex flex-col gap-8 overflow-y-auto shadow-[4px_4px_0_0_#0b0b0b]">
        <div id="dynamic-charts-container" class="space-y-8"></div>

        <div class="mt-auto border-2 border-ink p-4 bg-canvas shadow-[inset_2px_2px_0_0_#e5e5e5]">
          <p class="font-mono text-xs text-ink leading-relaxed mb-4">
            <span class="font-bold">&gt; SCENARIO_STATUS:</span> ACTIVE<br />
            <span class="font-bold">&gt; TOTAL_ALERTS:</span> ${summary.totalAlerts}<br />
            <span class="font-bold">&gt; TITLE:</span> ${summary.title}
            <span class="block-cursor"></span>
          </p>
          <button id="btn-restart" class="btn-danger w-full !px-2 !py-2 !text-[10px] uppercase font-bold tracking-widest">RESTART SCENARIO</button>
        </div>
      </section>
    `;
    
    function renderDynamicCharts(streamedAlerts) {
      const bySev = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };
      const bySrc = {};
      streamedAlerts.forEach(a => {
        bySev[a.alert_severity] = (bySev[a.alert_severity] || 0) + 1;
        bySrc[a.source] = (bySrc[a.source] || 0) + 1;
      });
      
      const maxSev = Math.max(...Object.values(bySev), 1);
      const maxSrc = Math.max(...Object.values(bySrc), 1);
      
      const chartsContainer = document.getElementById('dynamic-charts-container');
      if (!chartsContainer) return;
      
      chartsContainer.innerHTML = `
        <div>
          <h2 class="font-mono text-[10px] font-bold text-ink uppercase mb-4 flex items-center gap-2">
            <span class="text-cyan">//</span> SUMMARY
          </h2>
          <div class="w-full h-[160px] border-2 border-ink relative bg-canvas p-4 flex flex-col justify-end overflow-hidden shadow-[inset_2px_2px_0_0_#e5e5e5]">
            <div class="absolute top-0 left-0 w-full h-[2px] bg-cyan/20 animate-[scan_8s_linear_infinite] z-10 pointer-events-none"></div>
            <div class="flex items-end gap-2 h-full">
              ${SEVERITIES.map(sev => {
                const count = bySev[sev] || 0;
                const pct = Math.round((count / maxSev) * 100);
                return `
                  <div class="flex-1 flex flex-col items-center justify-end gap-1 h-full text-ink">
                    <span class="text-[10px] font-mono opacity-80">${count}</span>
                    <div class="w-full ${SEV_COLORS[sev]} opacity-80 transition-all duration-300" style="height: ${pct}%"></div>
                    <span class="text-[10px] font-bold shrink-0 opacity-80">${sev === 'informational' ? 'INFO' : sev.slice(0,4).toUpperCase()}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <div>
          <h3 class="font-mono text-[10px] font-bold text-ink mb-4 flex items-center gap-2 uppercase">
            <span class="text-cyan">//</span> BY SOURCE
          </h3>
          <div class="space-y-3">
            ${Object.entries(bySrc)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([src, count]) => `
                <div class="flex flex-col gap-1">
                  <div class="flex justify-between text-[10px] font-bold text-ink uppercase">
                    <span class="truncate mr-2">${src}</span>
                    <span>${count}</span>
                  </div>
                  <div class="h-1 w-full bg-canvas border border-ink shadow-[inset_1px_1px_0_0_#e5e5e5]">
                    <div class="h-full bg-cyan" style="width: ${Math.round((count / maxSrc) * 100)}%"></div>
                  </div>
                </div>
              `).join('')}
          </div>
        </div>
      `;
    }
    
    const mainHtml = `
      <section class="col-span-12 md:col-span-8 flex flex-col bg-white border-2 border-ink shadow-[4px_4px_0_0_#0b0b0b] h-full overflow-hidden">
        <div class="h-14 border-b-2 border-ink flex items-center px-6 gap-4 bg-canvas shrink-0">
          <h2 class="font-mono text-[10px] font-bold uppercase text-ink flex items-center gap-2 shrink-0">
            <span class="text-cyan">//</span> ALERTS (<span id="alert-count">0</span>)
          </h2>
          <div class="h-4 w-px bg-ink"></div>
          <div class="flex items-center gap-2 flex-wrap">
            <select id="filter-sev" class="input !py-1 !text-[10px]">
              <option value="">SEVERITY: ALL</option>
              ${['informational', 'low', 'medium', 'high', 'critical'].map(s => 
                `<option value="${s}" ${currentFilters.severity === s ? 'selected' : ''}>${s.toUpperCase()}</option>`
              ).join('')}
            </select>
            <select id="filter-src" class="input !py-1 !text-[10px]">
              <option value="">SOURCE: ALL</option>
              ${allSources.map(s => 
                `<option value="${s}" ${currentFilters.source === s ? 'selected' : ''}>${String(s || 'UNKNOWN').toUpperCase()}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        
        <div class="flex-1 overflow-auto flex flex-col relative bg-canvas">
          ${isDone ? renderDashboard(triages) : ''}
          <div id="alerts-table-container" class="flex-1"></div>
        </div>
      </section>
    `;
    
    document.getElementById('scenario-content').innerHTML = summaryHtml + mainHtml;
    
    const updateTable = async () => {
      if (isDone) {
        renderDynamicCharts(allAlerts.alerts);
        document.getElementById('alerts-table-container').innerHTML = `
          <div class="flex flex-col items-center justify-center h-64 text-ink opacity-80">
            <span class="text-4xl mb-2">✅</span>
            <p class="font-mono text-[10px] font-bold uppercase">// ALL ALERTS RESOLVED. SYSTEM SECURE.</p>
          </div>
        `;
        return;
      }
      
      const filteredRes = await listAlerts(scenarioId, currentFilters);
      let visibleAlerts = filteredRes.alerts;
      
      if (unsubscribeStream) unsubscribeStream();
      unsubscribeStream = subscribeToStream((count) => {
        const streamedAlerts = allAlerts.alerts.filter(a => a._index < count);
        renderDynamicCharts(streamedAlerts);
        
        const displayAlerts = visibleAlerts.filter(a => a._index < count);
        const countEl = document.getElementById('alert-count');
        if (countEl) countEl.innerText = displayAlerts.length;
        
        if (displayAlerts.length === 0) {
          document.getElementById('alerts-table-container').innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-ink opacity-40">
              <span class="text-4xl mb-2">⏳</span>
              <p class="font-mono text-[10px] font-bold uppercase">// NO ALERTS MATCH ACTIVE FILTERS OR AWAITING STREAM</p>
            </div>
          `;
          return;
        }
        
        document.getElementById('alerts-table-container').innerHTML = `
          <div class="overflow-x-auto">
            <table class="w-full min-w-[900px] border-collapse text-left bg-white">
            <thead class="sticky top-0 bg-canvas z-10 border-b-2 border-ink shadow-sm">
              <tr>
                ${['_TIME', 'ALERT_NAME', 'SEV', 'SOURCE', 'HOST', ''].map(h => 
                  `<th class="px-4 py-3 font-mono text-[10px] font-bold uppercase text-ink whitespace-nowrap">${h}</th>`
                ).join('')}
              </tr>
            </thead>
            <tbody class="divide-y-2 divide-ink/20">
              ${[...displayAlerts].reverse().map(alert => `
                <tr class="hover:bg-cyan/10 transition-colors group cursor-pointer" onclick="window.navigateSoc('/soc/scenarios/${scenarioId}/alerts/${alert._index}')">
                  <td class="px-4 py-4 font-mono text-xs text-ink opacity-80 whitespace-nowrap">
                    ${alert._time.split('T')[1]?.replace('Z', '') || alert._time}
                  </td>
                  <td class="px-4 py-4 font-mono text-sm font-bold text-ink max-w-xs truncate">
                    ${alert.alert_name}
                  </td>
                  <td class="px-4 py-4">
                    <span class="font-mono text-[10px] font-bold text-white px-2 py-1 ${SEV_COLORS[alert.alert_severity] || 'bg-soc_info'} shadow-[2px_2px_0_0_#0b0b0b]">
                      ${alert.alert_severity === 'informational' ? 'INFO' : String(alert.alert_severity || 'UNKNOWN').toUpperCase()}
                    </span>
                  </td>
                  <td class="px-4 py-4 font-mono text-xs text-ink truncate max-w-[150px]">
                    ${alert.source}
                  </td>
                  <td class="px-4 py-4 font-mono text-xs text-ink truncate max-w-[150px]">
                    ${alert.host}
                  </td>
                  <td class="px-4 py-4 text-right">
                    ${getScenarioTriages(scenarioId).some(t => t.alertIndex === alert._index) 
                      ? '<span class="text-success text-xs border border-success px-1">RESOLVED</span>' 
                      : '<span class="text-cyan font-bold opacity-0 group-hover:opacity-100 transition-opacity">Triage →</span>'
                    }
                  </td>
                </tr>
              `).join('')}
            </tbody>
            </table>
          </div>
        `;
      });
    };
    
    document.getElementById('filter-sev').addEventListener('change', (e) => {
      currentFilters.severity = e.target.value;
      updateTable();
    });
    document.getElementById('filter-src').addEventListener('change', (e) => {
      currentFilters.source = e.target.value;
      updateTable();
    });
    
    await updateTable();

    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to restart the scenario? All progress will be lost.')) {
          clearScenarioTriages(scenarioId);
          resetScenarioStream(scenarioId);
          window.navigateSoc(`/soc/scenarios/${scenarioId}`);
        }
      });
    }

    const replayBtn = document.getElementById('btn-replay');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to replay the scenario? All past triages will be cleared.')) {
          clearScenarioTriages(scenarioId);
          resetScenarioStream(scenarioId);
          window.navigateSoc(`/soc/scenarios/${scenarioId}`);
        }
      });
    }
    
  } catch (err) {
    const errEl = document.getElementById('scenario-error');
    if (errEl) {
      errEl.innerText = err.message || 'Failed to load scenario details';
      errEl.classList.remove('hidden');
    }
    const contentEl = document.getElementById('scenario-content');
    if (contentEl) contentEl.innerHTML = '';
  }
}
