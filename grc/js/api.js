export async function fetchScenarios() {
    try {
        // Since we don't have a backend listing, we'll hardcode the known practice scenarios for now.
        // In a real app, this would be an API call to get available scenarios.
        const scenarios = ['scenario-1', 'scenario-2'];
        const results = [];
        for (const id of scenarios) {
            const data = await fetchScenario(id);
            if (data) {
                results.push(data);
            }
        }
        return results;
    } catch (e) {
        console.error("Failed to fetch scenarios list", e);
        return [];
    }
}

export async function fetchScenario(id) {
    try {
        const res = await fetch(`/grc/scenarios/${id}/scenario.json`);
        if (!res.ok) throw new Error('Not found');
        return await res.json();
    } catch (e) {
        console.error(`Failed to fetch scenario ${id}`, e);
        return null;
    }
}

export async function fetchFileContent(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error('File not found');
        return await res.text();
    } catch (e) {
        console.error(`Failed to fetch file ${path}`, e);
        return "Error loading file content.";
    }
}
