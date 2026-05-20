import { API_BASE_URL, state } from './config.js';
import { checkAuth, login, logout, updateAuthUI } from './auth.js';
import { createRouter } from './router.js';

window.allChallenges = [];
window.currentChallengeData = null;
window.currentTab = 'practice'; 
window.currentMode = 'practice-challenges'; 
window.activeEventId = null;
window.miniSearch = null;
window.currentChallengesList = null; 
let dataLoaded = false;

const CTF_STATIC_API = 'https://a-y-u-s-h-y-a.github.io/project-haxnation/api'; 

const appHandlers = {
    switchTab,
    switchPracticeView,
    switchCompeteView,
    openChallenge,
    setActiveEventId: (id) => { window.activeEventId = id; },
    closeChallengeUI: () => document.getElementById('detail-view').classList.add('hidden'),
    ensureDataLoaded: async () => {
        if (!dataLoaded) await fetchStaticData();
    }
};

window.router = createRouter(appHandlers);

// ==========================================
// SKELETON LOADER
// ==========================================

function injectSkeletonCards(count = 9) {
    const loadingEl = document.getElementById('loading-practice');
    if (!loadingEl) return;
    loadingEl.innerHTML = Array.from({ length: count }).map(() => `
        <div class="border-2 border-ink bg-white p-5 shadow-[4px_4px_0_0_#0b0b0b] flex flex-col gap-3 pointer-events-none">
            <div class="flex justify-between items-start pb-2 border-b-2 border-ink gap-3">
                <div class="skeleton h-6 rounded-none flex-1 border border-gray-300"></div>
                <div class="skeleton h-6 w-16 rounded-none border border-gray-300 flex-shrink-0"></div>
            </div>
            <div class="flex gap-2 mt-1">
                <div class="skeleton h-5 w-20 rounded-none border border-gray-300"></div>
                <div class="skeleton h-5 w-16 rounded-none border border-gray-300"></div>
            </div>
            <div class="mt-auto pt-3 border-t-2 border-ink">
                <div class="skeleton h-4 w-32 rounded-none border border-gray-300"></div>
            </div>
        </div>
    `).join('');
    loadingEl.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', async () => {
    window.login = login;
    window.toggleHint = toggleHint;
    window.showEventsList = showEventsList;
    window.openEvent = openEvent;
    window.showLeaderboard = showLeaderboard;
    window.hideLeaderboard = hideLeaderboard;
    window.selectSuggestion = selectSuggestion;

    // Inject skeleton cards immediately so the UI feels instant
    injectSkeletonCards(9);

    setupListeners();
    await checkAuth();
    updateAuthUI();

    await fetchStaticData();
    window.router.handleRoute(); 
});

async function fetchStaticData() {
    if (dataLoaded) return;
    try {
        const response = await fetch(`${CTF_STATIC_API}/challenges-lite.json`);
        if (!response.ok) throw new Error("Could not load static challenges.");
        
        window.allChallenges = await response.json();
        
        const categories = new Set();
        window.allChallenges.forEach(c => {
            if (Array.isArray(c.category)) {
                c.category.forEach(cat => categories.add(cat));
            } else if (c.category) {
                categories.add(c.category);
            }
        });
        
        const catSelect = document.getElementById('filterCategory');
        if (catSelect) {
            Array.from(categories).sort().forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.toLowerCase();
                opt.textContent = cat.toUpperCase();
                catSelect.appendChild(opt);
            });
        }

        window.miniSearch = new MiniSearch({
            fields: ['name', 'category', 'difficulty', 'authors'],
            storeFields: ['id', 'name', 'category', 'difficulty', 'authors'],
            searchOptions: { fuzzy: 0.2, prefix: true }
        });
        window.miniSearch.addAll(window.allChallenges);
        dataLoaded = true;
    } catch (error) {
        console.error("Database boot failure.", error);
    }
}

// ==========================================
// PRACTICE CACHE & SYNC SYSTEM
// ==========================================
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function syncPracticeSolvesFromServer() {
    if (!state.currentUser) return [];
    try {
        const res = await fetch(`${API_BASE_URL}/practice/solves`, { credentials: 'include' });
        const data = await res.json();
        const solves = data.solvedChallenges || [];
        
        localStorage.setItem('practice_solves_data', JSON.stringify({
            solves: solves,
            expiresAt: Date.now() + CACHE_TTL
        }));
        return solves;
    } catch (err) {
        console.error("Error syncing practice solves:", err);
        const oldCacheRaw = localStorage.getItem('practice_solves_data');
        return oldCacheRaw ? JSON.parse(oldCacheRaw).solves : [];
    }
}

async function getPracticeSolves() {
    if (!state.currentUser) return [];
    const cachedDataRaw = localStorage.getItem('practice_solves_data');
    
    if (cachedDataRaw) {
        const cachedData = JSON.parse(cachedDataRaw);
        if (Date.now() < cachedData.expiresAt) {
            return cachedData.solves; 
        }
    }
    return await syncPracticeSolvesFromServer();
}


// ==========================================
// SEARCH & FILTER SYSTEM
// ==========================================

async function applyFilters() {
    const query = document.getElementById('searchBar')?.value.toLowerCase() || '';
    const diff = document.getElementById('filterDifficulty')?.value || 'all';
    const cat = document.getElementById('filterCategory')?.value || 'all';

    let results = window.allChallenges;

    if (query.length > 0) {
        results = results.filter(c => {
            const nameMatch = c.name.toLowerCase().includes(query);
            const diffMatch = (c.difficulty || '').toLowerCase().includes(query);
            const catMatch = Array.isArray(c.category) 
                ? c.category.some(catItem => catItem.toLowerCase().includes(query))
                : (c.category || '').toLowerCase().includes(query);
            const authorMatch = c.authors && c.authors.some(a => a.toLowerCase().includes(query));
            
            return nameMatch || diffMatch || catMatch || authorMatch;
        });
    }

    if (diff !== 'all') {
        results = results.filter(c => (c.difficulty || '').toLowerCase() === diff);
    }

    if (cat !== 'all') {
        results = results.filter(c => {
            if (Array.isArray(c.category)) {
                return c.category.some(catItem => catItem.toLowerCase() === cat);
            }
            return (c.category || '').toLowerCase() === cat;
        });
    }

    await renderPracticeGrid(results);
}

let searchTimeout;
function handleSearchInput(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
    const query = e.target.value;
    applyFilters(); 

    const suggestionsBox = document.getElementById('searchSuggestions');
    if (query.length > 1 && window.miniSearch) {
        const searchResults = window.miniSearch.search(query, { fuzzy: 0.2, prefix: true }).slice(0, 5);
        
        if (searchResults.length > 0) {
            suggestionsBox.innerHTML = searchResults.map(res => {
                const chal = window.allChallenges.find(c => c.id === res.id);
                if(!chal) return '';
                const safeId = DOMPurify.sanitize(String(chal.id));
                const safeName = DOMPurify.sanitize(chal.name);
                return `<button class="w-full text-left font-mono text-xs font-bold uppercase tracking-widest p-3 border-b-2 border-transparent hover:border-ink hover:bg-ink hover:text-white transition-colors duration-0 truncate" onclick="window.selectSuggestion('${safeId}')">> ${safeName}</button>`;
            }).join('');
            suggestionsBox.classList.remove('hidden');
        } else {
            suggestionsBox.classList.add('hidden');
        }
    } else {
        suggestionsBox.classList.add('hidden');
    }
    }, 300);
}

function selectSuggestion(id) {
    const chal = window.allChallenges.find(c => c.id === id);
    if (chal) {
        const searchBar = document.getElementById('searchBar');
        searchBar.value = chal.name;
        document.getElementById('searchSuggestions').classList.add('hidden');
        applyFilters();
    }
}

function setupListeners() {
    document.getElementById('login-btn')?.addEventListener('click', login);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    
    document.getElementById('searchBar')?.addEventListener('input', handleSearchInput);
    document.getElementById('filterDifficulty')?.addEventListener('change', applyFilters);
    document.getElementById('filterCategory')?.addEventListener('change', applyFilters);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#searchBar') && !e.target.closest('#searchSuggestions')) {
            document.getElementById('searchSuggestions')?.classList.add('hidden');
        }
    });

    // ==========================================
    // STANDARD CTF FLAG SUBMISSION
    // ==========================================
    document.getElementById('submitFlagBtn')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        const origTxt = btn.innerText;
        btn.innerText = 'EXECUTING...';
        btn.disabled = true;
        if (!window.currentChallengeData) return;
        
        const userInput = document.getElementById('flagInput').value.trim();
        const statusEl = document.getElementById('flagStatus');
        if (!userInput) return;

        if (window.currentMode === 'practice-challenges') {
             if (window.currentChallengeData.flags && window.currentChallengeData.flags.includes(userInput)) {
                
                statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-ink bg-cyan inline-block px-2 border-2 border-ink animate-pulse';
                statusEl.innerText = "> VERIFYING_RECORD...";

                if (state.currentUser) {
                    try {
                        const res = await fetch(`${API_BASE_URL}/practice/${window.currentChallengeData.id}/record-solve`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include'
                        });
                        const data = await res.json();

                        if (data.success || data.alreadySolved) {
                            if (data.alreadySolved) {
                                await syncPracticeSolvesFromServer();
                            } else {
                                const cachedDataRaw = localStorage.getItem('practice_solves_data');
                                if (cachedDataRaw) {
                                    const cachedData = JSON.parse(cachedDataRaw);
                                    if (!cachedData.solves.includes(window.currentChallengeData.id)) {
                                        cachedData.solves.push(window.currentChallengeData.id);
                                        localStorage.setItem('practice_solves_data', JSON.stringify(cachedData));
                                    }
                                }
                            }
                            statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-ink bg-cyan inline-block px-2 border-2 border-ink';
                            statusEl.innerText = "> SYSTEM: FLAG_VERIFIED & RECORDED";
                            applyFilters(); 
                        } else {
                            statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-white bg-danger inline-block px-2 border-2 border-ink';
                            statusEl.innerText = `> ERR: ${data.error || 'RECORD_FAILED'}`;
                        }
                    } catch (err) {
                        statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-white bg-danger inline-block px-2 border-2 border-ink';
                        statusEl.innerText = "> ERR: NETWORK_ANOMALY WHILE RECORDING";
                    }
                } else {
                    statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-ink bg-cyan inline-block px-2 border-2 border-ink';
                    statusEl.innerText = "> SYSTEM: FLAG_VERIFIED (NOT RECORDED - LOGIN REQ)";
                }
            } else {
                statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-white bg-danger inline-block px-2 border-2 border-ink';
                statusEl.innerText = "> ERR: HASH_MISMATCH";
            }
            btn.innerText = origTxt;
            btn.disabled = false;
        } else {
            try {
                statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-ink bg-canvas border-2 border-ink inline-block px-2 animate-pulse';
                statusEl.innerText = "> VERIFYING_SIGNATURE...";

                const endpointUrl = window.currentMode === 'compete-event' 
                    ? `${API_BASE_URL}/events/${window.activeEventId}/challenges/${window.currentChallengeData.id}/submit`
                    : `${API_BASE_URL}/challenges/${window.currentChallengeData.id}/submit`;

                const res = await fetch(endpointUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ flag: userInput })
                });

                const data = await res.json();
                
                if (data.success) {
                    statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-ink bg-cyan inline-block px-2 border-2 border-ink';
                    statusEl.innerText = `> SUCCESS: +${data.points} PTS`;
                } else {
                    statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-white bg-danger inline-block px-2 border-2 border-ink';
                    statusEl.innerText = `> ERR: ${data.error || data.message || 'VERIFICATION_FAILED'}`;
                }
                btn.innerText = origTxt;
                btn.disabled = false;
            } catch (err) {
                statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-white bg-danger inline-block px-2 border-2 border-ink';
                statusEl.innerText = "> ERR: NETWORK_ANOMALY";
            }
            btn.innerText = origTxt;
            btn.disabled = false;
        }
    });

    // ==========================================
    // WEB3: METAMASK CONNECTION & VALIDATION
    // ==========================================
    let userWallet = null;

    document.getElementById('connectWalletBtn')?.addEventListener('click', async () => {
        const statusEl = document.getElementById('flagStatus');
        
        if (!window.ethereum) {
            statusEl.className = 'mt-4 font-mono text-sm font-bold text-white bg-danger inline-block px-2 border-2 border-ink';
            statusEl.innerText = "> ERR: METAMASK NOT DETECTED";
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            
            // Force Sepolia network
            const network = await provider.getNetwork();
            if (network.chainId !== 11155111n) {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xaa36a7' }], // 11155111 in hex
                });
            }

            const accounts = await provider.send("eth_requestAccounts", []);
            userWallet = accounts[0];
            
            document.getElementById('connectWalletBtn').classList.add('hidden');
            document.getElementById('validateWeb3Btn').classList.remove('hidden');
            
            statusEl.className = 'mt-4 font-mono text-sm font-bold text-ink bg-cyan inline-block px-2 border-2 border-ink';
            statusEl.innerText = `> CONNECTED: ${userWallet.substring(0,6)}...${userWallet.substring(38)}`;
        } catch (err) {
            statusEl.className = 'mt-4 font-mono text-sm font-bold text-white bg-danger inline-block px-2 border-2 border-ink';
            statusEl.innerText = "> ERR: WALLET CONNECTION FAILED OR WRONG NETWORK";
        }
    });

    document.getElementById('validateWeb3Btn')?.addEventListener('click', async () => {
        const statusEl = document.getElementById('flagStatus');
        
        if (!state.currentUser) {
            statusEl.className = 'mt-4 font-mono text-sm font-bold text-white bg-danger inline-block px-2 border-2 border-ink';
            statusEl.innerText = "> ERR: PLEASE LOGIN TO PLATFORM FIRST";
            return;
        }

        if (!userWallet) return;

        try {
            statusEl.className = 'mt-4 font-mono text-sm font-bold text-ink bg-canvas border-2 border-ink inline-block px-2 animate-pulse';
            statusEl.innerText = "> SIGNING_PAYLOAD...";

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const message = `HaxNation_Auth_${state.currentUser.user_id}`;
            const signature = await signer.signMessage(message);

            statusEl.innerText = "> QUERYING_BLOCKCHAIN...";

            const endpointUrl = window.currentMode === 'compete-event' 
                ? `${API_BASE_URL}/events/${window.activeEventId}/challenges/${window.currentChallengeData.id}/submit-web3`
                : `${API_BASE_URL}/challenges/${window.currentChallengeData.id}/submit-web3`;

            const res = await fetch(endpointUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    walletAddress: userWallet,
                    signature: signature 
                })
            });

            const data = await res.json();
            
            if (data.success) {
                statusEl.className = 'mt-4 font-mono text-sm font-bold text-ink bg-cyan inline-block px-2 border-2 border-ink';
                statusEl.innerText = `> SUCCESS: +${data.points} PTS`;
            } else {
                statusEl.className = 'mt-4 font-mono text-sm font-bold text-white bg-danger inline-block px-2 border-2 border-ink';
                statusEl.innerText = `> ERR: ${data.error || data.message || 'VERIFICATION_FAILED'}`;
            }
        } catch (err) {
            statusEl.className = 'mt-4 font-mono text-sm font-bold text-white bg-danger inline-block px-2 border-2 border-ink';
            statusEl.innerText = "> ERR: TRANSACTION_OR_NETWORK_ERROR";
        }
    });
}

// ==========================================
// VIEW SWITCHING
// ==========================================

function updateNavStyles(activeTabId, activeSubnavId) {
    document.getElementById('tab-practice').className = 'text-gray-400 hover:text-ink hover:border-ink border-b-4 border-transparent pb-1 transition-colors duration-0';
    document.getElementById('tab-compete').className = 'text-gray-400 hover:text-ink hover:border-ink border-b-4 border-transparent pb-1 transition-colors duration-0';
    document.getElementById(activeTabId).className = 'text-ink border-b-4 border-ink pb-1 font-bold';

    const subnavs = ['subnav-practice-events', 'subnav-practice-challenges', 'subnav-compete-events', 'subnav-compete-challenges'];
    subnavs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = 'text-gray-400 hover:text-ink hover:border-ink border-b-4 border-transparent pb-3 transition-colors duration-0';
    });
    const activeSub = document.getElementById(activeSubnavId);
    if (activeSub) activeSub.className = 'text-ink border-b-4 border-ink pb-3 font-bold transition-colors duration-0';
}

function switchTab(tab) {
    window.currentTab = tab;
    document.getElementById('section-practice').classList.add('hidden');
    document.getElementById('section-compete').classList.add('hidden');
    document.getElementById(`section-${tab}`).classList.remove('hidden');
}

function switchPracticeView(view) {
    updateNavStyles('tab-practice', `subnav-practice-${view}`);
    
    document.getElementById('practice-view-events').classList.add('hidden');
    document.getElementById('practice-view-challenges').classList.add('hidden');
    document.getElementById(`practice-view-${view}`).classList.remove('hidden');

    if (view === 'challenges') {
        applyFilters(); 
    }
}

function switchCompeteView(view) {
    updateNavStyles('tab-compete', `subnav-compete-${view}`);
    
    document.getElementById('compete-view-events').classList.add('hidden');
    document.getElementById('compete-view-challenges').classList.add('hidden');
    document.getElementById(`compete-view-${view}`).classList.remove('hidden');

    if (view === 'events') {
        window.showEventsList(); 
    } else {
        loadIndependentChallenges();
    }
}

// ==========================================
// DATA LOADING & EVENT LOGIC
// ==========================================

async function loadLiveEvents() {
    const eventsList = document.getElementById('compete-events-list');
    
    if (!state.currentUser) {
        eventsList.innerHTML = `
            <div class="bg-white border-4 border-ink shadow-[8px_8px_0_0_#0b0b0b] p-16 text-center">
                <p class="font-mono text-xl font-bold uppercase tracking-widest text-white bg-danger inline-block px-4 py-2 border-2 border-ink mb-6 shadow-[4px_4px_0_0_#0b0b0b]">CLEARANCE REQUIRED</p><br/>
                <button onclick="window.login()" class="font-mono uppercase tracking-widest font-bold bg-ink text-white border-2 border-ink px-8 py-3 shadow-[4px_4px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] transition-all duration-75">Execute Auth</button>
            </div>`;
        return;
    }

    try {
        eventsList.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-ink animate-pulse">> FETCHING LIVE OPERATIONS...</p></div>`;
        const res = await fetch(`${API_BASE_URL}/events`, { credentials: 'include' });
        const data = await res.json();

        if (data.success && data.events.length > 0) {
            eventsList.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">` + data.events.map(ev => {
                
                // Set structural styles based on true playability
                const badgeColor = ev.isPlayable ? 'bg-cyan text-ink' : 'bg-canvas text-ink';
                const safeEvId = DOMPurify.sanitize(String(ev.id));
                const safeEvName = DOMPurify.sanitize(ev.name || '');
                const safeEvDesc = DOMPurify.sanitize(ev.description || 'Active operational environment.');
                const safeBadgeText = DOMPurify.sanitize(ev.isPlayable ? '● LIVE' : (ev.reason || 'OFFLINE'));
                const safeRegLink = DOMPurify.sanitize(ev.registrationLink || '');

                // If the user isn't allowed to play, strip the hover effects and interactive behaviors
                const cardStyle = ev.isPlayable 
                    ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#0b0b0b] hover:bg-ink hover:text-white cursor-pointer group' 
                    : 'opacity-70 grayscale';
                
                const onClickAttr = ev.isPlayable ? `onclick="window.openEvent('${safeEvId}', '${safeEvName}')"` : '';

                // Generate the aggressive neo-brutalist registration action if they are missing required access
                const regButton = (!ev.isRegistered && safeRegLink) 
                    ? `<a href="${safeRegLink}" target="_blank" class="mt-4 font-mono text-[10px] uppercase tracking-widest font-bold bg-danger text-white border-2 border-ink px-4 py-2 shadow-[2px_2px_0_0_#0b0b0b] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#0b0b0b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none inline-block text-center transition-all duration-75">Initiate Registration</a>`
                    : '';

                return `
                <div class="bg-white border-2 border-ink p-6 rounded-none shadow-[6px_6px_0_0_#0b0b0b] transition-all duration-75 flex flex-col ${cardStyle}" ${onClickAttr}>
                    <div class="flex justify-between items-start mb-4 border-b-2 border-ink ${ev.isPlayable ? 'group-hover:border-white' : ''} pb-2 gap-2">
                        <h3 class="font-black text-2xl uppercase tracking-tighter">${safeEvName}</h3>
                        <span class="border-2 border-ink px-2 py-1 font-mono text-[10px] whitespace-nowrap font-bold uppercase shadow-[2px_2px_0_0_#0b0b0b] ${ev.isPlayable ? 'group-hover:shadow-[2px_2px_0_0_#0b0b0b] group-hover:border-white' : ''} ${badgeColor}">${safeBadgeText}</span>
                    </div>
                    <p class="font-sans text-sm flex-1">${safeEvDesc}</p>
                    ${regButton}
                </div>`;
            }).join('') + `</div>`;
        } else {
            eventsList.innerHTML = `<div class="bg-white border-4 border-ink shadow-[8px_8px_0_0_#0b0b0b] p-16 text-center"><p class="font-mono text-lg font-bold uppercase tracking-widest text-ink">> NO ACTIVE OPERATIONS</p></div>`;
        }
    } catch (err) {
        eventsList.innerHTML = `<div class="bg-white border-4 border-ink shadow-[8px_8px_0_0_#0b0b0b] p-16 text-center"><p class="font-mono text-sm font-bold uppercase tracking-widest text-white bg-danger inline-block px-4 py-2 border-2 border-ink">> CONNECTION_LOST</p></div>`;
    }
}

async function loadIndependentChallenges() {
    const grid = document.getElementById('compete-independent-grid');
    
    if (!state.currentUser) {
        grid.innerHTML = `<div class="col-span-full bg-white border-4 border-ink shadow-[8px_8px_0_0_#0b0b0b] p-16 text-center"><p class="font-mono text-xl font-bold uppercase tracking-widest text-white bg-danger inline-block px-4 py-2 border-2 border-ink mb-6 shadow-[4px_4px_0_0_#0b0b0b]">CLEARANCE REQUIRED</p><br/><button onclick="window.login()" class="font-mono uppercase tracking-widest font-bold bg-ink text-white border-2 border-ink px-8 py-3 shadow-[4px_4px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] transition-all duration-75">Execute Auth</button></div>`;
        return;
    }

    grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-ink animate-pulse">> FETCHING TARGETS...</p></div>`;

    try {
        const res = await fetch(`${API_BASE_URL}/challenges`, { credentials: 'include' });
        const data = await res.json();

        if (!data.success) throw new Error(data.error);
        if (data.challenges.length === 0) {
            grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-ink">> NO TARGETS FOUND</p></div>`;
            return;
        }

        window.currentChallengesList = data.challenges; 
        grid.innerHTML = data.challenges.map(chal => renderCompeteCard(chal, data.solved, 'compete-independent')).join('');
    } catch (err) {
        grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-white bg-danger inline-block px-4 py-2 border-2 border-ink">> SYSTEM_ERR</p></div>`;
    }
}

async function openEvent(eventId, eventName) {
    window.activeEventId = eventId;
    document.getElementById('compete-events-list').classList.add('hidden');
    document.getElementById('compete-event-dashboard').classList.remove('hidden');
    document.getElementById('compete-event-title').innerText = eventName || "LIVE OPERATION";
    
    const grid = document.getElementById('compete-event-challenges-grid');
    grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-ink animate-pulse">> AUTHORIZING ACCESS...</p></div>`;

    try {
        const res = await fetch(`${API_BASE_URL}/events/${eventId}/challenges`, { credentials: 'include' });
        const data = await res.json();

        if (!res.ok || !data.success) {
            if (data.notAuthorized) {
                const safeError = DOMPurify.sanitize(data.error || '');
                const safeRegLink = DOMPurify.sanitize(data.registrationLink || '');
                grid.innerHTML = `<div class="col-span-full bg-white border-4 border-ink shadow-[8px_8px_0_0_#0b0b0b] p-10 text-center"><h3 class="font-black text-3xl uppercase tracking-tighter text-danger mb-4">ACCESS DENIED</h3><p class="font-mono text-sm mb-6">${safeError}</p><a href="${safeRegLink}" target="_blank" class="font-mono uppercase tracking-widest font-bold bg-danger text-white border-2 border-ink px-8 py-3 shadow-[4px_4px_0_0_#0b0b0b] inline-block hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] transition-all duration-75">Initiate Override Protocol</a></div>`;
            } else {
                const safeErrorMsg = DOMPurify.sanitize(data.error || 'FAILED TO LOAD');
                grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-white bg-danger inline-block px-4 py-2 border-2 border-ink">> ${safeErrorMsg}</p></div>`;
            }
            return;
        }

        if (data.challenges.length === 0) {
            grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-ink">> NO TARGETS FOUND IN OPERATION</p></div>`;
            return;
        }

        window.currentChallengesList = data.challenges; 
        grid.innerHTML = data.challenges.map(chal => renderCompeteCard(chal, data.solved, 'compete-event')).join('');
    } catch (err) {
        grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-white bg-danger inline-block px-4 py-2 border-2 border-ink">> SYSTEM_ERR</p></div>`;
    }
}

// ==========================================
// RENDER HELPERS
// ==========================================

async function renderPracticeGrid(data) {
    const grid = document.getElementById('practice-challenges-grid');
    const loadingEl = document.getElementById('loading-practice');

    if (data.length === 0) {
        if (loadingEl) loadingEl.classList.add('hidden');
        grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-ink">> NO TARGETS FOUND</p></div>`;
        return;
    }

    // --- PASS 1: Render cards instantly using only cached solve data (no network) ---
    const cachedRaw = localStorage.getItem('practice_solves_data');
    const cachedSolves = (cachedRaw ? JSON.parse(cachedRaw).solves : null) || [];

    grid.innerHTML = data.map(chal => renderPracticeCard(chal, cachedSolves)).join('');
    if (loadingEl) loadingEl.classList.add('hidden');

    // --- PASS 2: If user is logged in, silently reconcile solve status in the background ---
    if (state.currentUser) {
        getPracticeSolves().then(freshSolves => {
            // Only re-render if the solved set actually changed
            const cachedSet = new Set(cachedSolves);
            const freshSet = new Set(freshSolves);
            const changed = freshSolves.some(id => !cachedSet.has(id)) || cachedSolves.some(id => !freshSet.has(id));
            if (changed) {
                grid.innerHTML = data.map(chal => renderPracticeCard(chal, freshSolves)).join('');
            }
        });
    }
}

function renderPracticeCard(chal, solvedIds) {
    const isSolved = solvedIds.includes(chal.id);

    let diffColorClass = 'bg-canvas text-ink';
    if(chal.difficulty === 'Easy') diffColorClass = 'bg-cyan text-ink';
    if(chal.difficulty === 'Medium') diffColorClass = 'bg-ink text-white';
    if(chal.difficulty === 'Hard') diffColorClass = 'bg-danger text-white';

    const safeName = DOMPurify.sanitize(chal.name || '');
    const safeDiff = DOMPurify.sanitize(chal.difficulty || '');
    const safeCat = DOMPurify.sanitize(Array.isArray(chal.category) ? chal.category.join(', ') : (chal.category || ''));
    const safeAuthors = DOMPurify.sanitize(chal.authors && chal.authors.length > 0 ? chal.authors.join(', ') : 'UNKNOWN_AUTHOR');

    let cardBgClass = isSolved ? 'bg-cyan' : 'bg-white';
    let solvedBadge = isSolved
        ? `<span class="font-mono text-[12px] font-bold uppercase border-2 border-ink bg-white text-ink px-2 py-1 shadow-[2px_2px_0_0_#0b0b0b]">SOLVED</span>`
        : '';

    return `
    <a href="/challenge/practice/${chal.id}" data-nav class="border-2 border-ink ${cardBgClass} p-5 rounded-none shadow-[4px_4px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] hover:bg-ink hover:text-white transition-all duration-75 flex flex-col cursor-pointer group block text-left">
        <div class="flex justify-between items-start mb-4 border-b-2 border-ink group-hover:border-white pb-2">
            <h3 class="font-black text-xl uppercase tracking-tighter truncate">${safeName}</h3>
            ${solvedBadge}
        </div>
        <div class="flex flex-wrap gap-2 mb-6">
            <span class="border-2 border-ink px-2 py-1 font-mono text-[10px] font-bold uppercase shadow-[2px_2px_0_0_#0b0b0b] group-hover:border-white ${diffColorClass}">${safeDiff}</span>
            <span class="border-2 border-ink bg-white text-ink px-2 py-1 font-mono text-[10px] font-bold uppercase group-hover:border-white shadow-[2px_2px_0_0_#0b0b0b]">${safeCat}</span>
        </div>
        <div class="mt-auto pt-4 border-t-2 border-ink group-hover:border-white">
            <p class="font-mono text-[10px] font-bold uppercase truncate">> ${safeAuthors}</p>
        </div>
    </a>`;
}

function renderCompeteCard(chal, solvedList, mode) {
    const isSolved = solvedList.includes(chal.id);
    const isArchived = chal.state === 'archived'; 
    
    let statusStyle = 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] hover:bg-ink hover:text-white'; 
    let badgeStyle = 'bg-ink text-white';
    
    if (isSolved) {
        statusStyle = 'bg-cyan text-ink hover:bg-cyan';
        badgeStyle = 'bg-white text-ink';
    } else if (chal.state === 'upcoming' || isArchived) {
        statusStyle = 'opacity-60 bg-canvas grayscale pointer-events-none hover:shadow-[4px_4px_0_0_#0b0b0b]'; 
    }
    
    let pointsDisplay = chal.points + ' PTS';
    if (isSolved) pointsDisplay = 'SOLVED';
    else if (isArchived) pointsDisplay = 'EXPIRED';

    let href = `/challenge/compete/${chal.id}`;
    if (mode === 'compete-event') {
        href = `/challenge/event/${window.activeEventId}/${chal.id}`;
    }

    const safeName = DOMPurify.sanitize(chal.name || '');
    const safeCat = DOMPurify.sanitize(Array.isArray(chal.category) ? chal.category.join(', ') : (chal.category || 'General'));
    const safeDiff = DOMPurify.sanitize(chal.difficulty || 'Unknown');
    const safePointsDisplay = DOMPurify.sanitize(pointsDisplay);

    return `
    <a href="${href}" data-nav class="border-2 border-ink bg-white p-5 rounded-none shadow-[4px_4px_0_0_#0b0b0b] transition-all duration-75 flex flex-col cursor-pointer group block text-left ${statusStyle}">
        <div class="flex justify-between items-start mb-4 border-b-2 border-ink group-hover:border-white pb-2">
            <h3 class="font-black text-xl uppercase tracking-tighter truncate">${safeName}</h3>
            <span class="font-mono text-[12px] font-bold uppercase border-2 border-ink px-2 py-1 shadow-[2px_2px_0_0_#0b0b0b] group-hover:border-white ${badgeStyle}">${safePointsDisplay}</span>
        </div>
        <div class="flex flex-wrap gap-2 mb-2">
            <span class="border-2 border-ink bg-white text-ink px-2 py-1 font-mono text-[10px] font-bold uppercase group-hover:border-white shadow-[2px_2px_0_0_#0b0b0b]">${safeCat}</span>
            <span class="border-2 border-ink bg-canvas text-ink px-2 py-1 font-mono text-[10px] font-bold uppercase group-hover:border-white shadow-[2px_2px_0_0_#0b0b0b]">${safeDiff}</span>
        </div>
    </a>`;
}

// ==========================================
// GLOBAL DETAIL VIEW & WEB3 INJECTION
// ==========================================

async function openChallenge(id, mode) {
    window.currentMode = mode;
    document.getElementById('section-practice').classList.add('hidden');
    document.getElementById('section-compete').classList.add('hidden');
    document.getElementById('detail-view').classList.remove('hidden');

    // 1. GET THE STAT ELEMENTS AND RESET THEM
    const solvesEl = document.getElementById('det-solves');
    const fbEl = document.getElementById('det-firstblood');
    
    if (solvesEl) {
        solvesEl.classList.add('hidden');
        solvesEl.innerText = '';
    }
    if (fbEl) {
        fbEl.classList.add('hidden');
        fbEl.innerText = '';
    }

    document.getElementById('det-title').innerText = "FETCHING DATA...";
    document.getElementById('flagInput').value = '';
    document.getElementById('flagStatus').className = '';
    document.getElementById('flagStatus').innerText = '';
    window.currentChallengeData = null;

    try {
        let chal;
        
        if (mode === 'practice-challenges') {
            try {
                const response = await fetch(`${CTF_STATIC_API}/challenges/${id}.json`);
                if (!response.ok) throw new Error("File missing");
                chal = await response.json();
            } catch (error) {
                console.warn(`Could not load full JSON for ${id}. Falling back to lite data.`);
                chal = window.allChallenges.find(c => c.id === id);
                if (!chal) throw new Error("Challenge completely missing");
            }
        } else {
            if (window.currentChallengesList) {
                chal = window.currentChallengesList.find(c => c.id === id);
            }
            
            if (!chal) {
                if (mode === 'compete-independent') {
                    const res = await fetch(`${API_BASE_URL}/challenges`, { credentials: 'include' });
                    const data = await res.json();
                    if(data.success) chal = data.challenges.find(c => c.id === id);
                } else if (mode === 'compete-event') {
                    if (!window.activeEventId) throw new Error("Missing Event ID Context.");
                    const res = await fetch(`${API_BASE_URL}/events/${window.activeEventId}/challenges`, { credentials: 'include' });
                    const data = await res.json();
                    if(data.success) chal = data.challenges.find(c => c.id === id);
                }
            }
            
            if (!chal) throw new Error("Target missing from API list.");
        }

        window.currentChallengeData = chal;
        const categories = Array.isArray(chal.category) ? chal.category.join(', ') : chal.category;

        document.getElementById('det-title').innerText = chal.name;
        document.getElementById('det-cat').innerText = `CAT: ${categories || 'N/A'}`;
        document.getElementById('det-diff').innerText = `DIFF: ${chal.difficulty || 'N/A'}`;
        
        // 2. POPULATE STATS IF IN INDEPENDENT COMPETE MODE
        if (mode === 'compete-independent') {
            if (solvesEl && chal.solveCount !== undefined) {
                solvesEl.innerText = `SOLVES: ${chal.solveCount}`;
                solvesEl.classList.remove('hidden');
            }
            if (fbEl && chal.firstBlood) {
                fbEl.innerText = `FIRST BLOOD: ${chal.firstBlood}`;
                fbEl.classList.remove('hidden');
            }
        }

        // Always show author
        const authors = chal.authors ? chal.authors.map(a => `<a href="${DOMPurify.sanitize(a.url)}" target="_blank" class="hover:underline hover:text-cyan">${DOMPurify.sanitize(a.name)}</a>`).join(', ') : 'UNKNOWN';
        document.getElementById('det-author').innerHTML = DOMPurify.sanitize(`AUTH: ${authors}`);
        
        // Always show points (Practice challenges might have 0 points, which is fine)
        document.getElementById('det-points').innerText = `PTS: ${chal.points || 0}`;

        // Web3 Check & UI Override
        const isWeb3 = chal.category && (Array.isArray(chal.category) ? chal.category.some(c => c.toLowerCase() === 'web3') : chal.category.toLowerCase() === 'web3');
        const flagInput = document.getElementById('flagInput');
        const submitFlagBtn = document.getElementById('submitFlagBtn');
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        const validateWeb3Btn = document.getElementById('validateWeb3Btn');

        let rawDescription = chal.description 
            ? chal.description.replace(/\[REDACTED\]/g, '<span class="bg-ink text-ink hover:text-cyan selection:bg-danger cursor-crosshair transition-none select-none">CLASSIFIED</span>')
            : "> NO_DESCRIPTION_PROVIDED";

        if (isWeb3) {
            flagInput.classList.add('hidden');
            submitFlagBtn.classList.add('hidden');
            connectWalletBtn.classList.remove('hidden');
            validateWeb3Btn.classList.add('hidden'); // Remains hidden until wallet connects

            // Inject Contract Address into description
            document.getElementById('det-desc').innerHTML = `
                <div class="mb-4 bg-canvas border-2 border-ink p-4">
                    <span class="font-bold text-xs uppercase block mb-1">> Target Contract (Sepolia)</span>
                    <code class="text-cyan bg-ink px-2 py-1 select-all">${DOMPurify.sanitize(chal.contractAddress || 'ADDRESS_MISSING')}</code>
                </div>
                ${DOMPurify.sanitize(rawDescription)}
            `;
        } else {
            flagInput.classList.remove('hidden');
            submitFlagBtn.classList.remove('hidden');
            connectWalletBtn.classList.add('hidden');
            validateWeb3Btn.classList.add('hidden');
            
            document.getElementById('det-desc').innerHTML = DOMPurify.sanitize(rawDescription);
        }

        const assetsDiv = document.getElementById('det-assets');
        if (chal.assets && chal.assets.length > 0) {
            assetsDiv.innerHTML = chal.assets.map(asset => {
                let downloadUrl = asset;
                if (mode === 'practice-challenges') {
                    const cleanAsset = asset.replace('./', '');
                    const folderPath = chal.repo_path || `${chal.category[0]}/${chal.name}`;
                    downloadUrl = `https://raw.githubusercontent.com/A-Y-U-S-H-Y-A/project-haxnation/main/${folderPath}/${cleanAsset}`;
                }
                const safeDownloadUrl = DOMPurify.sanitize(downloadUrl);
                return `<a href="${safeDownloadUrl}" target="_blank" class="font-mono text-xs uppercase tracking-widest font-bold bg-white text-ink border-2 border-ink px-4 py-2 shadow-[4px_4px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] hover:bg-cyan transition-all duration-75">[↓] ACQUIRE_ASSET</a>`;
            }).join('');
        } else {
            assetsDiv.innerHTML = '';
        }

        const hintsDiv = document.getElementById('det-hints');
        if (chal.hints && chal.hints.length > 0) {
            hintsDiv.innerHTML = DOMPurify.sanitize(chal.hints.map((hint, index) => `
                <div class="border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b] rounded-none overflow-hidden">
                    <button class="w-full text-left px-4 py-3 bg-white hover:bg-ink hover:text-white font-mono text-xs font-bold uppercase tracking-widest transition-colors duration-0 border-b-2 border-transparent" onclick="window.toggleHint(${index})">> DECRYPT HINT ${index + 1}</button>
                    <div class="hidden p-4 bg-canvas border-t-2 border-ink text-sm text-ink font-mono" id="hint-${index}">${hint}</div>
                </div>`).join(''));
        } else {
            hintsDiv.innerHTML = '';
        }
    } catch (error) {
        document.getElementById('det-title').innerText = "FATAL ERROR LOADING TARGET.";
    }
}

function toggleHint(index) {
    document.getElementById(`hint-${index}`).classList.toggle('hidden');
}

// ==========================================
// LEADERBOARD & EVENT HELPERS
// ==========================================

function showEventsList() {
    window.activeEventId = null;
    document.getElementById('compete-event-dashboard').classList.add('hidden');
    document.getElementById('compete-events-list').classList.remove('hidden');
    loadLiveEvents();
}

async function showLeaderboard() {
    if (!window.activeEventId) return;
    document.getElementById('compete-event-dashboard').classList.add('hidden');
    document.getElementById('compete-leaderboard').classList.remove('hidden');
    
    const tbody = document.getElementById('leaderboard-content');
    tbody.innerHTML = `<tr><td colspan="3" class="text-center p-8 text-ink font-mono font-bold animate-pulse">> FETCHING_RANKS...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE_URL}/events/${window.activeEventId}/leaderboard`, { credentials: 'include' });
        const data = await res.json();

        if (data.success && data.leaderboard.length > 0) {
            tbody.innerHTML = data.leaderboard.map((user, index) => {
                const safeName = DOMPurify.sanitize(user.name || '');
                const safePoints = DOMPurify.sanitize(String(user.points));
                return `
                <tr class="border-b-2 border-ink hover:bg-ink hover:text-white transition-colors duration-0">
                    <td class="p-4 border-r-2 border-ink font-bold ${index < 3 ? 'bg-cyan text-ink' : ''}">#${index + 1}</td>
                    <td class="p-4 border-r-2 border-ink font-bold">${safeName}</td>
                    <td class="p-4 text-right font-bold">${safePoints}</td>
                </tr>`;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center p-8 text-ink font-mono font-bold">> NO_FLAGS_CAPTURED</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center p-8 text-white bg-danger font-mono font-bold">> ERR_LOADING_LEADERBOARD</td></tr>`;
    }
}

function hideLeaderboard() {
    document.getElementById('compete-leaderboard').classList.add('hidden');
    document.getElementById('compete-event-dashboard').classList.remove('hidden');
}
