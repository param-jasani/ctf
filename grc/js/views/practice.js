import { fetchScenarios } from '../api.js';

export async function renderPractice() {
    const container = document.getElementById('view-practice');
    
    // Skeleton loading state
    container.innerHTML = `
        <div class="mb-10">
            <p class="font-mono text-xs font-bold uppercase tracking-widest text-ink mb-2 bg-cyan inline-block px-2 border-2 border-ink">SYS // TRAINING GROUNDS</p>
            <h1 class="text-5xl sm:text-7xl font-black text-ink uppercase tracking-tighter leading-none border-b-4 border-ink pb-4">
                Practice Arena<span class="inline-block w-4 h-[0.8em] bg-cyan animate-pulse align-middle ml-2 border-2 border-ink"></span>
            </h1>
        </div>
        <div id="loading-scenarios" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-canvas border-2 border-ink h-48 animate-pulse"></div>
            <div class="bg-canvas border-2 border-ink h-48 animate-pulse"></div>
        </div>
    `;

    const scenarios = await fetchScenarios();

    let gridHtml = '';
    if (scenarios.length === 0) {
        gridHtml = `<p class="font-mono text-sm">No scenarios available.</p>`;
    } else {
        gridHtml = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">`;
        for (const s of scenarios) {
            gridHtml += `
                <a href="/grc/scenarios/${s.id}" data-nav class="group block bg-white border-2 border-ink shadow-[6px_6px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#0b0b0b] transition-all p-6">
                    <div class="flex items-center justify-between mb-4 border-b-2 border-ink pb-2">
                        <h3 class="font-black text-2xl uppercase tracking-tighter group-hover:text-cyan transition-colors">${s.title}</h3>
                        <span class="font-mono text-xl">↗</span>
                    </div>
                    <p class="font-mono text-sm text-ink opacity-80 mb-4">${s.description}</p>
                    <div class="flex flex-wrap gap-2">
                        ${s.departments.map(d => `<span class="font-mono text-[10px] bg-canvas border border-ink px-2 py-1">${d.name}</span>`).join('')}
                    </div>
                </a>
            `;
        }
        gridHtml += `</div>`;
    }

    container.innerHTML = `
        <div class="mb-10">
            <p class="font-mono text-xs font-bold uppercase tracking-widest text-ink mb-2 bg-cyan inline-block px-2 border-2 border-ink">SYS // TRAINING GROUNDS</p>
            <h1 class="text-5xl sm:text-7xl font-black text-ink uppercase tracking-tighter leading-none border-b-4 border-ink pb-4">
                Practice Arena<span class="inline-block w-4 h-[0.8em] bg-cyan animate-pulse align-middle ml-2 border-2 border-ink"></span>
            </h1>
        </div>
        ${gridHtml}
    `;

    // Re-attach nav listeners for new dynamically added links
    container.querySelectorAll('a[data-nav]').forEach(a => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (href) {
                e.preventDefault();
                window.navigateGrc(href);
            }
        });
    });
}
