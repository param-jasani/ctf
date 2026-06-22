export function renderCompete() {
  const container = document.getElementById('view-compete');
  
  container.innerHTML = `
    <div class="max-w-2xl mx-auto mt-20">
      <div class="bg-white border-2 border-ink p-8 shadow-[8px_8px_0_0_#0b0b0b]">
        <div class="flex items-center gap-4 mb-6 border-b-2 border-ink pb-4">
          <span class="w-4 h-4 bg-danger border-2 border-ink animate-pulse inline-block"></span>
          <h2 class="font-black text-2xl uppercase tracking-widest text-danger">ACCESS DENIED</h2>
        </div>
        
        <div class="font-mono text-sm space-y-4 opacity-80">
          <p>> INITIATING HANDSHAKE...</p>
          <p>> VERIFYING CLEARANCE LEVEL...</p>
          <p class="text-danger">> ERROR: CLEARANCE LEVEL INSUFFICIENT FOR ACTIVE OPERATIONS</p>
          <p>> Compete mode is currently restricted to authorized personnel only.</p>
          <p>> Please return to the <a href="/soc/practice" class="text-cyan underline hover:bg-cyan hover:text-ink transition-colors" data-nav>practice range</a> to elevate your credentials.</p>
        </div>
      </div>
    </div>
  `;
}
