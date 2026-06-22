export function createRouter(appHandlers) {
    const navigate = (url) => {
        if (url.startsWith('/soc')) {
            window.location.href = url;
            return;
        }
        if (window.location.pathname === url) return;
        window.history.pushState(null, null, url);
        handleRoute();
    };

    const handleRoute = async () => {
        const path = window.location.pathname;

        if (path.startsWith('/soc')) {
            // Attempt to explicitly request the index file if we got caught in the root SPA fallback
            if (path === '/soc' || path === '/soc/') {
                window.location.replace('/soc/index.html');
                return;
            }
            appHandlers.show404();
            return;
        }

        if (path === '/') {
            appHandlers.switchTab('landing');
            return;
        }

        if (path === '/ctf' || path === '/ctf/' || path === '/ctf/practice' || path === '/practice') {
            navigate('/ctf/practice/challenges');
            return;
        }

        if (path === '/ctf/compete' || path === '/compete') {
            navigate('/ctf/compete/events');
            return;
        }

        if (!path.includes('/ctf/challenge/') && !path.includes('/challenge/')) {
            appHandlers.closeChallengeUI();
        }

        if (path.startsWith('/ctf/practice/events') || path.startsWith('/practice/events')) {
            appHandlers.switchTab('practice');
            appHandlers.switchPracticeView('events');
        } else if (path.startsWith('/ctf/practice/challenges') || path.startsWith('/practice/challenges')) {
            appHandlers.switchTab('practice');
            appHandlers.switchPracticeView('challenges');
        } else if (path.startsWith('/ctf/compete/events') || path.startsWith('/compete/events')) {
            appHandlers.switchTab('compete');
            appHandlers.switchCompeteView('events');
        } else if (path.startsWith('/ctf/compete/challenges') || path.startsWith('/compete/challenges')) {
            appHandlers.switchTab('compete');
            appHandlers.switchCompeteView('challenges');
        } else if (path.startsWith('/ctf/challenge/') || path.startsWith('/challenge/')) {
            // handle both old /challenge/ and new /ctf/challenge/ routes
            const offset = path.startsWith('/ctf/challenge/') ? 1 : 0;
            const parts = path.split('/');
            const segment = parts[2 + offset]; // 'practice', 'compete', or 'event'
            
            await appHandlers.ensureDataLoaded(); 

            if (segment === 'practice') {
                const id = parts.slice(3 + offset).join('/');
                appHandlers.openChallenge(id, 'practice-challenges');
            } else if (segment === 'compete') {
                const id = parts.slice(3 + offset).join('/');
                appHandlers.openChallenge(id, 'compete-independent');
            } else if (segment === 'event') {
                // Route format: /ctf/challenge/event/:eventId/:challengeId
                const eventId = parts[3 + offset];
                const id = parts.slice(4 + offset).join('/');
                appHandlers.setActiveEventId(eventId);
                appHandlers.openChallenge(id, 'compete-event');
            }
        } else {
            appHandlers.show404();
        }
    };

    document.body.addEventListener('click', e => {
        const link = e.target.closest('[data-nav]');
        if (link) {
            e.preventDefault();
            navigate(link.getAttribute('href'));
        }
    });

    window.addEventListener('popstate', handleRoute);

    return { navigate, handleRoute };
}