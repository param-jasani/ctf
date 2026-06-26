import { fetchScenario } from '../api.js';
import { checkCompeteStatus } from '../api.js';

export async function renderCompete() {
    const container = document.getElementById('view-compete');
    container.innerHTML = `<div class="text-center py-20 animate-pulse font-mono uppercase tracking-widest">> Checking Competition Status...</div>`;

    let scenario = null;
    let status = { open: true };

    // Fetch scenario and status in parallel
    try {
        [scenario, status] = await Promise.all([
            fetchScenario('compete-1'),
            checkCompeteStatus('compete-1')
        ]);
    } catch (e) {
        console.error('Failed to load compete data', e);
    }

    // If scenario fetch failed, create a fallback
    if (!scenario) {
        scenario = {
            id: 'compete-1',
            title: 'Live Competition',
            description: 'A live GRC audit challenge. Compete against others to find all policy violations first.',
            departments: []
        };
    }

    const deptCount = scenario.departments ? scenario.departments.length : 0;
    const isOpen = status && status.open !== false;

    let html = `
        <div class="mb-8">
            <div class="border-b-4 border-ink pb-4 mb-8">
                <p class="font-mono text-xs font-bold uppercase tracking-widest text-ink mb-2 bg-danger text-ink border-2 border-ink inline-block px-2 animate-pulse">SYS // LIVE_COMPETITION</p>
                <h1 class="text-4xl sm:text-5xl font-extrabold text-ink uppercase tracking-tighter leading-none">
                    Compete Arena
                </h1>
            </div>
    `;

    if (!isOpen) {
        // Competition closed
        html += `
            <div class="card max-w-2xl mx-auto text-center">
                <div class="mb-6">
                    <p class="font-mono text-xs font-bold uppercase tracking-widest text-ink mb-4 bg-danger text-ink inline-block px-3 py-1 border-2 border-ink shadow-[2px_2px_0_0_#0b0b0b]">SYS // COMPETITION_CLOSED</p>
                    <h2 class="text-3xl sm:text-4xl font-extrabold text-ink uppercase tracking-tighter mb-4">${scenario.title}</h2>
                    <p class="font-sans text-ink leading-relaxed mb-6">${scenario.description || ''}</p>
                </div>
                <div class="bg-canvas border-2 border-ink p-6 shadow-[4px_4px_0_0_#0b0b0b] mb-6">
                    <p class="font-mono text-sm font-bold uppercase tracking-widest text-danger">
                        > COMPETITION CLOSED — WINNER DECLARED
                    </p>
                </div>
                <button onclick="window.navigateGrc('/grc/practice')" class="btn-secondary mt-4">
                    > Back to Practice
                </button>
            </div>
        `;
    } else {
        // Competition open
        html += `
            <div class="card max-w-2xl mx-auto">
                <div class="mb-6">
                    <p class="font-mono text-xs font-bold uppercase tracking-widest text-ink mb-4 bg-danger text-ink inline-block px-3 py-1 border-2 border-ink shadow-[2px_2px_0_0_#0b0b0b] animate-pulse">LIVE</p>
                    <h2 class="text-3xl sm:text-4xl font-extrabold text-ink uppercase tracking-tighter mb-4">${scenario.title}</h2>
                    <p class="font-sans text-ink leading-relaxed mb-6">${scenario.description || ''}</p>
                </div>
                <div class="bg-canvas border-2 border-ink p-4 shadow-[2px_2px_0_0_#0b0b0b] mb-6">
                    <ul class="font-mono text-sm space-y-3">
                        <li class="flex justify-between border-b border-ink border-dashed pb-2">
                            <span>> Departments</span>
                            <span class="font-bold">${deptCount}</span>
                        </li>
                        <li class="flex justify-between border-b border-ink border-dashed pb-2">
                            <span>> Mode</span>
                            <span class="font-bold text-danger">COMPETITIVE</span>
                        </li>
                        <li class="flex justify-between">
                            <span>> Status</span>
                            <span class="font-bold text-success">OPEN</span>
                        </li>
                    </ul>
                </div>
                <button onclick="window.navigateGrc('/grc/compete/scenarios/compete-1')" class="btn-danger w-full text-center">
                    > Begin Audit
                </button>
            </div>
        `;
    }

    html += `</div>`;
    container.innerHTML = html;
}
