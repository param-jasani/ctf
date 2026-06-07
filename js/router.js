export function createRouter(appHandlers) {
    const navigate = (url) => {
        if (url.startsWith('/soc-sim')) {
            window.location.href = url;
            return;
        }
        if (window.location.pathname === url) return;
        window.history.pushState(null, null, url);
        handleRoute();
    };

    const handleRoute = async () => {
        const path = window.location.pathname;

        if (path.startsWith('/soc-sim')) {
            // If router.js is executing on a /soc-sim route, it means the web server 
            // failed to serve the React app's index.html and incorrectly served this main app's index.html instead.
            // DO NOT redirect here or it will cause an infinite loop.
            appHandlers.show404();
            return;
        }

        if (path === '/' || path === '/practice') {
            navigate('/practice/challenges');
            return;
        }

        if (path === '/compete') {
            navigate('/compete/events');
            return;
        }

        if (!path.includes('/challenge/')) {
            appHandlers.closeChallengeUI();
        }

        if (path.startsWith('/practice/events')) {
            appHandlers.switchTab('practice');
            appHandlers.switchPracticeView('events');
        } else if (path.startsWith('/practice/challenges')) {
            appHandlers.switchTab('practice');
            appHandlers.switchPracticeView('challenges');
        } else if (path.startsWith('/compete/events')) {
            appHandlers.switchTab('compete');
            appHandlers.switchCompeteView('events');
        } else if (path.startsWith('/compete/challenges')) {
            appHandlers.switchTab('compete');
            appHandlers.switchCompeteView('challenges');
        } else if (path.startsWith('/challenge/')) {
            const parts = path.split('/');
            const segment = parts[2]; // 'practice', 'compete', or 'event'
            
            await appHandlers.ensureDataLoaded(); 

            if (segment === 'practice') {
                const id = parts.slice(3).join('/');
                appHandlers.openChallenge(id, 'practice-challenges');
            } else if (segment === 'compete') {
                const id = parts.slice(3).join('/');
                appHandlers.openChallenge(id, 'compete-independent');
            } else if (segment === 'event') {
                // Route format: /challenge/event/:eventId/:challengeId
                const eventId = parts[3];
                const id = parts.slice(4).join('/');
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