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
                <h1 class="text-4xl font-black text-ink uppercase tracking-tighter mb-4">Scenario Not Found</h1>
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
            <div class="flex justify-between items-end border-b-4 border-ink pb-4">
                <div>
                    <p class="font-mono text-xs font-bold uppercase tracking-widest text-ink mb-2 bg-cyan inline-block px-2 border-2 border-ink">SYS // AUDIT_MODE</p>
                    <h1 class="text-4xl sm:text-5xl font-black text-ink uppercase tracking-tighter leading-none">
                        ${currentScenario.title}
                    </h1>
                </div>
            </div>
            <p class="font-mono text-sm mt-4 text-ink opacity-80">${currentScenario.description || ''}</p>
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
                <div class="bg-canvas border-b-2 border-ink p-3 flex justify-between items-center">
                    <span id="viewer-title" class="font-mono text-sm font-bold uppercase tracking-widest">> Select a file</span>
                    <div id="viewer-actions" class="hidden flex gap-2">
                        <button id="btn-export-pdf" class="btn-secondary !text-[10px] !py-1 !px-2 hidden">Export PDF</button>
                        <button id="btn-submit-findings" class="btn-primary !text-[10px] !py-1 !px-2 hidden">Submit Findings</button>
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
}

function renderFileList() {
    const listContainer = document.getElementById('file-list');
    const dept = currentScenario.departments.find(d => d.id === currentDeptId);
    
    if (!dept || !dept.files || dept.files.length === 0) {
        listContainer.innerHTML = `<div class="font-mono text-xs text-ink opacity-60 text-center py-4">No files available.</div>`;
        return;
    }

    let html = '';
    for (const f of dept.files) {
        const isActive = f.id === currentFileId;
        const baseClass = "font-mono text-xs text-left p-2 border-2 transition-colors duration-75 block w-full truncate";
        const activeClass = isActive 
            ? "bg-cyan border-ink font-bold shadow-[2px_2px_0_0_#0b0b0b]" 
            : "bg-canvas border-transparent hover:border-ink hover:bg-white";
            
        html += `<button class="${baseClass} ${activeClass}" onclick="window.switchFile('${f.id}')" title="${f.name}">📄 ${f.name}</button>`;
    }
    
    listContainer.innerHTML = html;
}

async function renderFileViewer(fileDef) {
    const titleEl = document.getElementById('viewer-title');
    const contentEl = document.getElementById('viewer-content');
    const actionsEl = document.getElementById('viewer-actions');
    const pdfBtn = document.getElementById('btn-export-pdf');
    const submitBtn = document.getElementById('btn-submit-findings');
    
    // Clear old state
    pdfBtn.classList.add('hidden');
    pdfBtn.onclick = null;
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
    
    const content = await fetchFileContent(fileDef.path);
    
    if (fileDef.type === 'csv') {
        renderCSV(content, contentEl);
    } else if (fileDef.type === 'markdown') {
        renderMarkdown(content, contentEl, fileDef, pdfBtn, submitBtn);
    } else {
        contentEl.innerHTML = `<pre class="font-mono text-sm whitespace-pre-wrap">${DOMPurify.sanitize(content)}</pre>`;
    }
}

function renderCSV(csvText, container) {
    const lines = csvText.split('\\n').filter(l => l.trim() !== '');
    if (lines.length === 0) {
        container.innerHTML = "Empty CSV";
        return;
    }
    
    let html = '<table class="w-full text-left font-sans text-sm border-collapse border-2 border-ink">';
    lines.forEach((line, i) => {
        const cols = line.split(',');
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
    html += '</table>';
    
    container.innerHTML = html;
}

function renderMarkdown(mdText, container, fileDef, pdfBtn, submitBtn) {
    if (!fileDef.interactive) {
        // Standard MD render
        const rawHtml = marked.parse(mdText);
        container.innerHTML = `<div class="prose max-w-none text-ink">${DOMPurify.sanitize(rawHtml)}</div>`;
    } else {
        // Interactive line-by-line render
        // We split by double newlines for paragraphs, or single lines if list items
        // To keep it simple, we'll split by newline, and render each line separately if it has content
        const lines = mdText.split('\\n');
        let html = '<div class="font-sans text-base leading-relaxed text-ink" id="interactive-md-container">';
        
        lines.forEach((line, index) => {
            if (line.trim() === '') {
                html += '<br/>';
                return;
            }
            // Parse line with marked (inline mostly)
            let parsed = marked.parse(line);
            // Remove wrapping p tags that marked adds
            parsed = parsed.replace(/^<p>/, '').replace('</p>', '').trim();
            
            html += `<div class="md-interactive-line" data-line-index="${index}" data-raw="${DOMPurify.sanitize(line)}">${DOMPurify.sanitize(parsed)}</div>`;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
        // Attach click listeners
        const lineEls = container.querySelectorAll('.md-interactive-line');
        lineEls.forEach(el => {
            el.addEventListener('click', () => {
                el.classList.toggle('highlighted');
            });
        });
        
        // Show Submit Button
        submitBtn.classList.remove('hidden');
        submitBtn.onclick = () => evaluateSubmission(fileDef);
    }
    
    // Enable PDF export
    pdfBtn.classList.remove('hidden');
    pdfBtn.onclick = () => {
        const element = document.createElement('div');
        element.innerHTML = marked.parse(mdText);
        element.className = 'prose p-8 bg-white text-black'; // ensure black text on white bg for PDF
        
        const opt = {
            margin:       0.5,
            filename:     fileDef.name.replace('.md', '.pdf'),
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };
}

function evaluateSubmission(fileDef) {
    const container = document.getElementById('interactive-md-container');
    if (!container) return;
    
    const highlightedEls = container.querySelectorAll('.md-interactive-line.highlighted');
    if (highlightedEls.length === 0) {
        showToast('error', 'No findings selected. Please highlight the relevant text.');
        return;
    }
    
    const solutions = fileDef.solutionTexts || [];
    let allFound = true;
    
    // Check if every solution text is present in at least one highlighted line
    for (const sol of solutions) {
        let found = false;
        highlightedEls.forEach(el => {
            if (el.getAttribute('data-raw').includes(sol)) {
                found = true;
            }
        });
        if (!found) allFound = false;
    }
    
    // Also might want to check for false positives, but let's keep it simple: 
    // as long as they highlighted the correct lines, they pass.
    
    if (allFound && solutions.length > 0) {
        showToast('success', 'ACCESS GRANTED: Correct findings identified. Scenario Solved.');
        // Could mark scenario as complete here via an API or localStorage
    } else {
        showToast('error', 'ACCESS DENIED: Incorrect or incomplete findings. Review the policy again.');
    }
}

// Simple toast helper since we don't have global toast access directly imported
function showToast(type, msg) {
    const tc = document.getElementById('toast-container');
    if (!tc) return alert(msg);
    
    const t = document.createElement('div');
    const color = type === 'success' ? 'bg-success text-ink' : type === 'error' ? 'bg-danger text-white' : 'bg-ink text-white';
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
