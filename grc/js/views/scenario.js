import { fetchScenario, fetchFileContent } from '../api.js';

let currentScenario = null;
let currentDeptId = null;
let currentFileId = null;

export async function renderScenario(id) {
    const container = document.getElementById('view-scenario');
    container.innerHTML = `<div class="text-center py-20 animate-pulse font-mono uppercase tracking-widest">> Loading Scenario Data...</div>`;

    currentScenario = await fetchScenario(id);
    if (!currentScenario) {
        container.innerHTML = `
            <div class="text-center py-20">
                <p class="font-mono text-xs font-bold uppercase tracking-widest text-ink mb-4 bg-danger text-white inline-block px-3 py-1 border-2 border-ink">SYS // ERROR</p>
                <h1 class="text-4xl font-extrabold text-ink uppercase tracking-tighter mb-4">Scenario Not Found</h1>
                <button onclick="window.navigateGrc('/grc/practice')" class="btn-primary mt-6">Return</button>
            </div>`;
        return;
    }

    // Default selection
    if (currentScenario.departments && currentScenario.departments.length > 0) {
        // Find GRC Desk if it exists, otherwise first one
        const grcDept = currentScenario.departments.find(d => d.id === 'grc');
        currentDeptId = grcDept ? grcDept.id : currentScenario.departments[0].id;
    }

    renderLayout();
}

function renderLayout() {
    const container = document.getElementById('view-scenario');
    
    // Header
    let html = `
        <div class="mb-8">
            <button onclick="window.navigateGrc('/grc/practice')" class="btn-secondary mb-4 shadow-[2px_2px_0_0_#0b0b0b]">
                [←] Back to Arena
            </button>
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b-4 border-ink pb-4">
                <div>
                    <p class="font-mono text-xs font-bold uppercase tracking-widest text-ink mb-2 bg-cyan inline-block px-2 border-2 border-ink">SYS // AUDIT_MODE</p>
                    <h1 class="text-4xl sm:text-5xl font-extrabold text-ink uppercase tracking-tighter leading-none">
                        ${currentScenario.title}
                    </h1>
                </div>
                <div class="text-left sm:text-right w-full sm:w-auto">
                    <p class="font-mono text-xs font-bold uppercase tracking-widest text-ink mb-1">> Global Findings</p>
                    <div class="font-mono font-bold text-xl bg-warning border-2 border-ink px-4 py-1 shadow-[2px_2px_0_0_#0b0b0b] inline-block" id="global-progress">
                        - / -
                    </div>
                </div>
            </div>
            <div class="mt-4 p-4 bg-white border-2 border-ink shadow-[4px_4px_0_0_#0b0b0b]">
                <h2 class="font-mono text-xs font-bold uppercase tracking-widest text-ink mb-2 border-b-2 border-ink pb-1">> Mission Objective</h2>
                <p class="font-sans text-sm text-ink">${currentScenario.description || ''}</p>
            </div>
        </div>
    `;

    // Department Tabs
    html += `<div class="flex flex-wrap gap-2 mb-6 border-b-2 border-ink pb-4">`;
    for (const dept of currentScenario.departments) {
        const isActive = dept.id === currentDeptId;
        const btnClass = isActive 
            ? "font-mono text-xs font-bold uppercase bg-ink text-white border-2 border-ink px-4 py-2"
            : "font-mono text-xs font-bold uppercase bg-white text-ink border-2 border-ink px-4 py-2 hover:bg-canvas cursor-pointer shadow-[2px_2px_0_0_#0b0b0b]";
        html += `<button class="${btnClass}" onclick="window.switchDept('${dept.id}')">${dept.name}</button>`;
    }
    html += `</div>`;

    // Content Area (Sidebar for files + Main for content)
    html += `
        <div class="flex flex-col md:flex-row gap-6">
            <!-- File Browser -->
            <div class="w-full md:w-64 flex-shrink-0">
                <div class="bg-white border-2 border-ink shadow-[4px_4px_0_0_#0b0b0b]">
                    <div class="bg-ink text-white font-mono text-xs font-bold uppercase p-2 border-b-2 border-ink">
                        > Available Files
                    </div>
                    <div id="file-list" class="p-2 flex flex-col gap-2">
                        <!-- File buttons rendered here -->
                    </div>
                </div>
            </div>

            <!-- Main Viewer -->
            <div class="flex-grow bg-white border-2 border-ink shadow-[6px_6px_0_0_#0b0b0b] min-h-[500px] flex flex-col">
                <div class="bg-canvas border-b-2 border-ink p-3 flex justify-between items-center sticky top-16 z-30">
                    <span id="viewer-title" class="font-mono text-sm font-bold uppercase tracking-widest">> Select a file</span>
                    <div id="viewer-actions" class="hidden flex flex-wrap gap-2 justify-end">
                        <button id="btn-download-raw" class="btn-secondary !text-xs !py-1 !px-2 hidden">Download File</button>
                        <button id="btn-export-pdf" class="btn-secondary !text-xs !py-1 !px-2 hidden">Export PDF</button>
                        <button id="btn-submit-findings" class="btn-primary !text-xs !py-1 !px-2 hidden">Submit Findings</button>
                    </div>
                </div>
                <div id="viewer-content" class="p-6 overflow-auto flex-grow relative">
                    <div class="absolute inset-0 flex items-center justify-center font-mono text-gray-400 uppercase tracking-widest">
                        Awaiting input...
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    
    // Define global helper for dept switching
    window.switchDept = (id) => {
        currentDeptId = id;
        currentFileId = null;
        renderFileList();
        renderFileViewer(null);
        
        // Re-render layout to update tab styles
        const tabs = container.querySelectorAll('.border-b-2.pb-4 button');
        tabs.forEach((tab, index) => {
             const dept = currentScenario.departments[index];
             if(dept.id === currentDeptId) {
                 tab.className = "font-mono text-xs font-bold uppercase bg-ink text-white border-2 border-ink px-4 py-2";
             } else {
                 tab.className = "font-mono text-xs font-bold uppercase bg-white text-ink border-2 border-ink px-4 py-2 hover:bg-canvas cursor-pointer shadow-[2px_2px_0_0_#0b0b0b]";
             }
        });
    };

    window.switchFile = (fileId) => {
        currentFileId = fileId;
        renderFileList(); // to update active state
        
        const dept = currentScenario.departments.find(d => d.id === currentDeptId);
        const file = dept.files.find(f => f.id === fileId);
        renderFileViewer(file);
    };

    renderFileList();
    window.updateProgress();
}

window.updateProgress = function() {
    const progressEl = document.getElementById('global-progress');
    if (!progressEl) return;
    
    let totalRequired = 0;
    let totalFound = 0;
    
    window.grcHighlights = JSON.parse(localStorage.getItem('grcHighlights') || '{}');
    
    currentScenario.departments.forEach(dept => {
        if (dept.files) {
            dept.files.forEach(f => {
                if (f.interactive && f.solutionTexts) {
                    totalRequired += f.solutionTexts.length;
                    const fileKey = currentScenario.id + '_' + f.id;
                    const highlights = window.grcHighlights[fileKey] || [];
                    
                    f.solutionTexts.forEach(sol => {
                        let found = false;
                        highlights.forEach(h => {
                            if (h.includes(sol)) found = true;
                        });
                        if (found) totalFound++;
                    });
                }
            });
        }
    });
    
    if (totalRequired === 0) {
        progressEl.innerText = '- / -';
    } else {
        progressEl.innerText = `${totalFound} / ${totalRequired}`;
        if (totalFound === totalRequired) {
            progressEl.classList.remove('bg-warning');
            progressEl.classList.add('bg-success');
        } else {
            progressEl.classList.remove('bg-success');
            progressEl.classList.add('bg-warning');
        }
    }
};

function renderFileList() {
    const listContainer = document.getElementById('file-list');
    const dept = currentScenario.departments.find(d => d.id === currentDeptId);
    
    if (!dept || !dept.files || dept.files.length === 0) {
        listContainer.innerHTML = `<div class="font-mono text-xs text-ink opacity-60 text-center py-4">No files available.</div>`;
        return;
    }

    let html = '';
    const fileIcon = `<svg class="inline-block w-4 h-4 mr-1 align-text-bottom" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"><rect x="4" y="2" width="16" height="20"></rect><path d="M4 6h16M4 18h16M8 10h8M8 14h8"></path></svg>`;
    for (const f of dept.files) {
        const isActive = f.id === currentFileId;
        const baseClass = "font-mono text-xs text-left p-2 border-2 transition-colors duration-75 block w-full truncate";
        const activeClass = isActive 
            ? "bg-cyan border-ink font-bold shadow-[2px_2px_0_0_#0b0b0b]" 
            : "bg-canvas border-transparent hover:border-ink hover:bg-white";
        const interactiveBadge = f.interactive ? `<span class="bg-warning text-ink px-1 ml-2 text-[10px] font-bold border border-ink">GRADING</span>` : '';
            
        html += `<button class="${baseClass} ${activeClass}" onclick="window.switchFile('${f.id}')" title="${f.name}">${fileIcon}${f.name}${interactiveBadge}</button>`;
    }
    
    listContainer.innerHTML = html;
}

async function renderFileViewer(fileDef) {
    const titleEl = document.getElementById('viewer-title');
    const contentEl = document.getElementById('viewer-content');
    const actionsEl = document.getElementById('viewer-actions');
    const pdfBtn = document.getElementById('btn-export-pdf');
    const rawBtn = document.getElementById('btn-download-raw');
    const submitBtn = document.getElementById('btn-submit-findings');
    
    // Clear old state
    pdfBtn.classList.add('hidden');
    pdfBtn.onclick = null;
    rawBtn.classList.add('hidden');
    rawBtn.onclick = null;
    submitBtn.classList.add('hidden');
    submitBtn.onclick = null;
    
    if (!fileDef) {
        titleEl.innerText = "> Select a file";
        contentEl.innerHTML = `<div class="absolute inset-0 flex items-center justify-center font-mono text-gray-400 uppercase tracking-widest">Awaiting input...</div>`;
        actionsEl.classList.add('hidden');
        return;
    }

    titleEl.innerText = `> ${fileDef.name}`;
    actionsEl.classList.remove('hidden');
    
    // Show Loading
    contentEl.innerHTML = `<div class="font-mono animate-pulse">Reading file block data...</div>`;
    
    // Always allow generic download directly from the path to save memory
    rawBtn.classList.remove('hidden');
    rawBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = fileDef.path;
        a.download = fileDef.name;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    let content;
    if (fileDef.type !== 'markdown') {
        try {
            content = await Promise.race([
                fetchFileContent(fileDef.path),
                new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 3000))
            ]);
        } catch (e) {
            if (e.message === 'TIMEOUT') {
                contentEl.innerHTML = `
                    <div class="absolute inset-0 flex flex-col items-center justify-center font-mono text-center px-4">
                        <p class="text-danger font-bold uppercase tracking-widest mb-4">> ERROR: RENDER TIMEOUT</p>
                        <p class="text-ink text-sm mb-6 max-w-sm">This file took too long to load and parse in the browser viewport. It may be too large.</p>
                        <button class="btn-primary" onclick="document.getElementById('btn-download-raw').click()">Download File Instead</button>
                    </div>
                `;
                return;
            } else {
                content = "Error loading file data.";
            }
        }
    } else {
        content = await fetchFileContent(fileDef.path);
    }
    
    if (fileDef.type === 'csv') {
        renderCSV(content, contentEl);
    } else if (fileDef.type === 'markdown') {
        renderMarkdown(content, contentEl, fileDef, pdfBtn, submitBtn);
    } else {
        contentEl.innerHTML = `<pre class="font-mono text-sm whitespace-pre-wrap">${DOMPurify.sanitize(content)}</pre>`;
    }
}

function renderCSV(csvText, container) {
    const lines = csvText.split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) {
        container.innerHTML = "Empty CSV";
        return;
    }
    
    let html = '<div class="overflow-x-auto w-full"><table class="w-full text-left font-sans text-sm border-collapse border-2 border-ink">';
    lines.forEach((line, i) => {
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, ''));
        html += '<tr class="border-b border-ink">';
        cols.forEach(col => {
            if (i === 0) {
                html += `<th class="p-2 border-r border-ink bg-canvas font-bold">${DOMPurify.sanitize(col)}</th>`;
            } else {
                html += `<td class="p-2 border-r border-ink">${DOMPurify.sanitize(col)}</td>`;
            }
        });
        html += '</tr>';
    });
    html += '</table></div>';
    
    container.innerHTML = html;
}

function renderMarkdown(mdText, container, fileDef, pdfBtn, submitBtn) {
    if (!fileDef.interactive) {
        // Standard MD render
        const rawHtml = marked.parse(mdText);
        container.innerHTML = `<div class="prose max-w-none text-ink">${DOMPurify.sanitize(rawHtml)}</div>`;
    } else {
        // Interactive block render
        const rawHtml = marked.parse(mdText);
        
        let bannerHtml = `
            <div class="mb-8 p-4 border-2 border-ink bg-warning shadow-[4px_4px_0_0_#0b0b0b]">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <p class="font-mono text-sm font-bold uppercase tracking-widest">> INTERACTIVE AUDIT MODE ENABLED</p>
                        <p class="font-sans text-ink font-semibold mt-1">Please review the document below carefully. To log a policy violation or finding, simply click directly on the specific sentence, list item, or table row to highlight it. You must highlight all relevant findings before submitting.</p>
                    </div>
                    <button id="btn-clear-markings" class="btn-secondary !text-xs !py-1 !px-2 whitespace-nowrap bg-white text-ink hover:bg-danger hover:text-white hover:border-danger transition-colors">Clear All Markings</button>
                </div>
            </div>
        `;
        
        container.innerHTML = bannerHtml + `<div class="prose max-w-none text-ink" id="interactive-md-container">${DOMPurify.sanitize(rawHtml)}</div>`;
        
        document.getElementById('btn-clear-markings').onclick = () => {
            if (confirm("Are you sure you want to clear all markings across all documents?")) {
                window.grcHighlights = {};
                localStorage.setItem('grcHighlights', JSON.stringify(window.grcHighlights));
                window.updateProgress();
                renderFileViewer(fileDef); // Re-render to drop highlighted classes
                showToast('success', 'All markings cleared.');
            }
        };

        const containerEl = document.getElementById('interactive-md-container');
        const blocks = containerEl.querySelectorAll('p, li, tr, h1, h2, h3, h4, h5, h6');
        
        window.grcHighlights = JSON.parse(localStorage.getItem('grcHighlights') || '{}');
        const fileKey = currentScenario.id + '_' + fileDef.id;
        if (!window.grcHighlights[fileKey]) {
            window.grcHighlights[fileKey] = [];
        }
        
        blocks.forEach((el, index) => {
            el.classList.add('md-interactive-line');
            // Store the text content for validation
            const rawText = el.innerText || el.textContent;
            el.setAttribute('data-raw', rawText);
            
            el.setAttribute('tabindex', '0');
            el.setAttribute('role', 'button');
            const isInitiallyHighlighted = window.grcHighlights[fileKey].includes(rawText);
            el.setAttribute('aria-pressed', isInitiallyHighlighted ? 'true' : 'false');
            
            // Restore previous highlighted state
            if (isInitiallyHighlighted) {
                el.classList.add('highlighted');
            }
            
            const toggleHighlight = (e) => {
                e.stopPropagation();
                const isHighlighted = el.classList.toggle('highlighted');
                el.setAttribute('aria-pressed', isHighlighted ? 'true' : 'false');
                
                // Save state
                if (isHighlighted) {
                    if (!window.grcHighlights[fileKey].includes(rawText)) {
                        window.grcHighlights[fileKey].push(rawText);
                    }
                } else {
                    window.grcHighlights[fileKey] = window.grcHighlights[fileKey].filter(t => t !== rawText);
                }
                localStorage.setItem('grcHighlights', JSON.stringify(window.grcHighlights));
                window.updateProgress();
            };

            el.addEventListener('click', toggleHighlight);
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleHighlight(e);
                }
            });
        });
        
        // Show Submit Button
        submitBtn.classList.remove('hidden');
        submitBtn.onclick = () => evaluateSubmission();
        window.updateProgress();
    }
    
    pdfBtn.classList.remove('hidden');
    pdfBtn.onclick = () => {
        // Create hidden container
        const printContainer = document.createElement('div');
        printContainer.id = 'print-container';
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        printContainer.innerHTML = `
            <div id="print-content" class="prose max-w-none text-black bg-white p-8">
                ${marked.parse(mdText)}
            </div>
        `;
        document.body.appendChild(printContainer);

        // Gather all existing styles (including Tailwind injected styles)
        const styleTags = Array.from(document.querySelectorAll('style'))
            .map(s => s.innerText)
            .join('\n');

        // Append specific print media CSS for layout optimization
        const customPrintStyle = `
            ${styleTags}
            @media print {
                @page { margin: 0.5in; }
                body { background: white !important; }
                #print-content { padding: 0 !important; }
            }
        `;

        printJS({
            printable: 'print-content',
            type: 'html',
            documentTitle: fileDef.name.replace('.md', ''),
            style: customPrintStyle, 
            scanStyles: false, // We pass all styles manually in the 'style' property
            onPrintDialogClose: () => {
                document.body.removeChild(printContainer);
            }
        });
    };
}

function evaluateSubmission() {
    window.grcHighlights = JSON.parse(localStorage.getItem('grcHighlights') || '{}');
    
    let allFound = true;
    let hasFalsePositives = false;
    let missingFindingsCount = 0;
    let extraneousLinesCount = 0;
    let totalSolutions = 0;
    
    currentScenario.departments.forEach(dept => {
        if (dept.files) {
            dept.files.forEach(f => {
                if (f.interactive && f.solutionTexts) {
                    totalSolutions += f.solutionTexts.length;
                    const fileKey = currentScenario.id + '_' + f.id;
                    const highlights = window.grcHighlights[fileKey] || [];
                    
                    f.solutionTexts.forEach(sol => {
                        let found = false;
                        highlights.forEach(h => {
                            if (h.includes(sol)) found = true;
                        });
                        if (!found) {
                            allFound = false;
                            missingFindingsCount++;
                        }
                    });
                    
                    highlights.forEach(h => {
                        let matchesASolution = false;
                        f.solutionTexts.forEach(sol => {
                            if (h.includes(sol)) matchesASolution = true;
                        });
                        if (!matchesASolution) {
                            hasFalsePositives = true;
                            extraneousLinesCount++;
                        }
                    });
                }
            });
        }
    });
    
    if (totalSolutions === 0) {
        showToast('error', 'No expected findings in this scenario. Submit not required.');
        return;
    }
    
    if (hasFalsePositives || !allFound) {
        let msgs = [];
        if (missingFindingsCount > 0) msgs.push(`Missing ${missingFindingsCount} required finding(s).`);
        if (extraneousLinesCount > 0) msgs.push(`${extraneousLinesCount} extraneous line(s) selected.`);
        showToast('error', `ACCESS DENIED: ${msgs.join(' ')}`);
        return;
    }
    
    if (allFound && totalSolutions > 0) {
        showToast('success', 'ACCESS GRANTED: Correct findings identified. Scenario Solved.');
        
        // Clear all highlights specifically for this scenario upon completion
        if (window.grcHighlights) {
            for (const key in window.grcHighlights) {
                if (key.startsWith(currentScenario.id + '_')) {
                    delete window.grcHighlights[key];
                }
            }
            localStorage.setItem('grcHighlights', JSON.stringify(window.grcHighlights));
        }
        
        // Mark scenario as completed
        localStorage.setItem('grc_completed_' + currentScenario.id, 'true');
        
        const mainContainer = document.getElementById('view-scenario');
        mainContainer.innerHTML = `
            <div class="text-center py-10 sm:py-20 max-w-2xl mx-auto">
                <p class="font-mono text-xs font-bold uppercase tracking-widest text-ink mb-4 bg-success inline-block px-3 py-1 border-2 border-ink shadow-[2px_2px_0_0_#0b0b0b]">SYS // AUDIT COMPLETE</p>
                <h1 class="text-4xl sm:text-6xl font-extrabold text-ink uppercase tracking-tighter mb-8 leading-none">Operation Successful</h1>
                
                <div class="bg-white border-4 border-ink p-6 sm:p-10 shadow-[8px_8px_0_0_#0b0b0b] mb-10 text-left">
                    <h2 class="text-2xl font-extrabold uppercase tracking-tighter mb-6 text-ink border-b-4 border-ink pb-2">> Audit Report</h2>
                    <ul class="font-mono text-sm space-y-4 mb-8">
                        <li class="flex justify-between border-b border-ink border-dashed pb-2"><span>Target:</span> <span class="font-bold text-right">${currentScenario.title}</span></li>
                        <li class="flex justify-between border-b border-ink border-dashed pb-2"><span>Findings Identified:</span> <span class="font-bold">${totalSolutions}</span></li>
                        <li class="flex justify-between border-b border-ink border-dashed pb-2"><span>Status:</span> <span class="text-success font-bold">COMPLIANT</span></li>
                    </ul>
                    <p class="font-sans text-ink leading-relaxed font-semibold">All necessary policy violations have been successfully flagged and logged for remediation. The network is now secure.</p>
                    ${currentScenario.justification ? `
                    <div class="mt-6 p-4 bg-canvas border-l-4 border-cyan">
                        <h3 class="font-mono text-xs font-bold text-ink uppercase tracking-widest mb-2">> Official Justification</h3>
                        <p class="font-sans text-sm text-ink leading-relaxed">${DOMPurify.sanitize(currentScenario.justification)}</p>
                    </div>
                    ` : ''}
                </div>
                
                <button onclick="window.navigateGrc('/grc/practice')" class="font-mono uppercase tracking-widest font-bold bg-cyan text-ink border-2 border-ink px-8 py-4 shadow-[4px_4px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 w-full sm:w-auto">
                    > Return to Arena
                </button>
            </div>
        `;
    }
}

// Simple toast helper since we don't have global toast access directly imported
function showToast(type, msg) {
    const tc = document.getElementById('toast-container');
    if (!tc) return alert(msg);
    
    const t = document.createElement('div');
    const color = type === 'success' ? 'bg-success text-ink' : type === 'error' ? 'bg-danger text-ink' : 'bg-ink text-white';
    t.className = `font-mono text-sm font-bold uppercase p-4 border-2 border-ink shadow-[4px_4px_0_0_#0b0b0b] ${color} transition-all duration-300 opacity-0 translate-x-10`;
    t.innerText = msg;
    
    tc.appendChild(t);
    
    // Animate in
    setTimeout(() => {
        t.classList.remove('opacity-0', 'translate-x-10');
    }, 10);
    
    // Remove after 3s
    setTimeout(() => {
        t.classList.add('opacity-0', 'translate-x-10');
        setTimeout(() => t.remove(), 300);
    }, 4000);
}
