// Subnet Calculator with CIDR slider/select sync, validation, copy/export, theme & autosave
(function(){
  const $ = (s)=>document.querySelector(s);
  const els = {
    themeToggle: $('#themeToggle'),
    ip: $('#ip'),
    cidr: $('#cidr'),
    cidrOut: $('#cidrOut'),
    maskText: $('#maskText'),
    maskSelect: $('#maskSelect'),
    calcBtn: $('#calcBtn'),
    resetBtn: $('#resetBtn'),
    saveBtn: $('#saveBtn'),
    copyBtn: $('#copyBtn'),
    exportBtn: $('#exportBtn'),
    err: $('#err'),
    resultsWrap: $('#results'),
    rInput: $('#r-input'),
    rCidr: $('#r-cidr'),
    rMask: $('#r-mask'),
    rWildcard: $('#r-wildcard'),
    rNetwork: $('#r-network'),
    rBroadcast: $('#r-broadcast'),
    rFirst: $('#r-first'),
    rLast: $('#r-last'),
    rAddrs: $('#r-addrs'),
    rUsable: $('#r-usable'),
    rClass: $('#r-class'),
    rScope: $('#r-scope'),
  };

  // Theme
  (function initTheme(){
    const saved = localStorage.getItem('subnet-theme');
    if(saved === 'light') document.documentElement.classList.add('light');
    els.themeToggle.textContent = document.documentElement.classList.contains('light') ? '🌙' : '☀️';
  })();
  els.themeToggle.addEventListener('click', ()=>{
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem('subnet-theme', isLight ? 'light' : 'dark');
    els.themeToggle.textContent = isLight ? '🌙' : '☀️';
  });

  // Populate mask select
  (function buildMaskSelect(){
    let html = '';
    for(let p=32;p>=0;p--){
      html += `<option value="${p}">${prefixToMask(p)} (/${p})</option>`;
    }
    els.maskSelect.innerHTML = html;
    els.maskSelect.value = '24';
  })();

  // Sync CIDR slider <-> output <-> mask text/select
  function updateCIDRUI(p){
    els.cidr.value = String(p);
    els.cidrOut.textContent = `/${p}`;
    els.maskText.textContent = prefixToMask(p);
    els.maskSelect.value = String(p);
  }
  els.cidr.addEventListener('input', ()=> updateCIDRUI(parseInt(els.cidr.value,10)));
  els.maskSelect.addEventListener('change', ()=> updateCIDRUI(parseInt(els.maskSelect.value,10)));

  function prefixToMask(p){
    p = Math.max(0, Math.min(32, p|0));
    let mask = p===0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0;
    return intToIP(mask);
  }

  // Parse IP and optional /prefix
  function parseInput(){
    const raw = (els.ip.value || '').trim();
    const m = raw.match(/^\s*([0-9]{1,3}(?:\.[0-9]{1,3}){3})(?:\s*\/\s*([0-9]|[12][0-9]|3[0-2]))?\s*$/);
    if(!m) return { error: 'Enter IPv4 like 192.168.1.10 or 192.168.1.10/24' };
    const ipStr = m[1];
    const prefix = m[2] !== undefined ? parseInt(m[2],10) : parseInt(els.cidr.value,10);
    const ip = ipToInt(ipStr);
    if(ip === null) return { error: 'Each octet must be 0–255.' };
    return { ipStr, ip, prefix };
  }

  function ipToInt(s){
    const parts = s.split('.').map(n => parseInt(n,10));
    if(parts.length !== 4 || parts.some(n => isNaN(n) || n<0 || n>255)) return null;
    return ((parts[0]<<24)>>>0) + (parts[1]<<16) + (parts[2]<<8) + parts[3];
  }
  function intToIP(n){
    return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
  }

  function classifyScope(ip){
    const first = ip>>>24;
    const isPrivate = (first===10) || (first===172 && ((ip>>>16)&240)===16) || (first===192 && ((ip>>>16)&255)===168);
    const isLoopback = first===127;
    const isLinkLocal = first===169 && ((ip>>>16)&255)===254;
    const isMulticast = first>=224 && first<=239;
    const isReserved = first>=240 && first<=255;
    let cls = 'Class ';
    if(first<=127) cls += 'A';
    else if(first<=191) cls += 'B';
    else if(first<=223) cls += 'C';
    else if(first<=239) cls += 'D (multicast)';
    else cls += 'E (reserved)';
    let scope = [];
    if(isPrivate) scope.push('Private');
    if(isLoopback) scope.push('Loopback');
    if(isLinkLocal) scope.push('Link-local');
    if(isMulticast) scope.push('Multicast');
    if(isReserved) scope.push('Reserved');
    if(scope.length===0) scope.push('Public');
    return { cls, scope: scope.join(', ') };
  }

  function calc(){
    const parsed = parseInput();
    if(parsed.error){
      showError(parsed.error);
      return;
    }
    hideError();
    const { ipStr, ip, prefix } = parsed;
    updateCIDRUI(prefix);

    const mask = prefix===0 ? 0 : (0xFFFFFFFF << (32-prefix)) >>> 0;
    const wildcard = (~mask) >>> 0;
    const network = (ip & mask) >>> 0;
    const broadcast = (network | wildcard) >>> 0;
    const total = 2 ** (32 - prefix);

    let firstUsable, lastUsable, usable;
    if(prefix===32){
      firstUsable = lastUsable = ip;
      usable = 1;
    }else if(prefix===31){
      firstUsable = network;
      lastUsable = broadcast;
      usable = 2; // RFC 3021
    }else{
      firstUsable = total>=2 ? (network + 1) >>> 0 : network;
      lastUsable = total>=2 ? (broadcast - 1) >>> 0 : broadcast;
      usable = total>=2 ? total - 2 : 0;
    }

    const cls = classifyScope(ip);

    // Fill UI
    els.rInput.textContent = `${ipStr}/${prefix}`;
    els.rCidr.textContent = `/${prefix}`;
    els.rMask.textContent = intToIP(mask);
    els.rWildcard.textContent = intToIP(wildcard);
    els.rNetwork.textContent = intToIP(network);
    els.rBroadcast.textContent = intToIP(broadcast);
    els.rFirst.textContent = intToIP(firstUsable);
    els.rLast.textContent = intToIP(lastUsable);
    els.rAddrs.textContent = total.toLocaleString();
    els.rUsable.textContent = usable.toLocaleString() + (prefix===31? ' (both usable, no broadcast)' : '');
    els.rClass.textContent = cls.cls;
    els.rScope.textContent = cls.scope;

    els.resultsWrap.classList.remove('hidden');
    els.copyBtn.disabled = false;
    els.exportBtn.disabled = false;

    // Save last
    autosave();
  }

  function showError(msg){
    els.err.textContent = msg;
    els.err.classList.remove('hidden');
    els.resultsWrap.classList.add('hidden');
    els.copyBtn.disabled = true;
    els.exportBtn.disabled = true;
  }
  function hideError(){
    els.err.classList.add('hidden');
  }

  function autosave(){
    const s = { ip: els.ip.value, cidr: parseInt(els.cidr.value,10) };
    localStorage.setItem('subnet-state', JSON.stringify(s));
  }
  function restore(){
    try{
      const s = JSON.parse(localStorage.getItem('subnet-state')||'{}');
      if(s.ip) els.ip.value = s.ip;
      if(Number.isInteger(s.cidr)) updateCIDRUI(s.cidr);
    }catch{}
  }

  els.calcBtn.addEventListener('click', calc);
  els.resetBtn.addEventListener('click', ()=>{
    els.ip.value=''; updateCIDRUI(24); hideError();
    els.resultsWrap.classList.add('hidden');
    els.copyBtn.disabled = true; els.exportBtn.disabled = true;
  });
  els.saveBtn.addEventListener('click', autosave);
  els.ip.addEventListener('change', ()=>{
    // If user typed CIDR in the field, sync slider
    const m = els.ip.value.match(/\/([0-9]|[12][0-9]|3[0-2])$/);
    if(m){ updateCIDRUI(parseInt(m[1],10)); }
  });
  window.addEventListener('keydown', (e)=>{ if((e.ctrlKey||e.metaKey) && e.key==='Enter') calc(); });

  // Copy & Export
  els.copyBtn.addEventListener('click', async ()=>{
    const rows = collect();
    const text = rows.map(r => `${r.k}: ${r.v}`).join('\n');
    try{
      await navigator.clipboard.writeText(text);
      els.copyBtn.textContent = 'Copied!';
      setTimeout(()=> els.copyBtn.textContent = 'Copy', 1200);
    }catch{ alert('Copy failed.'); }
  });
  els.exportBtn.addEventListener('click', ()=>{
    const rows = collect();
    const csv = 'Key,Value\n' + rows.map(r => `"${r.k}","${r.v}"`).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'subnet-results.csv';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
  });
  function collect(){
    return [
      {k:'Input', v: els.rInput.textContent},
      {k:'CIDR', v: els.rCidr.textContent},
      {k:'Netmask', v: els.rMask.textContent},
      {k:'Wildcard', v: els.rWildcard.textContent},
      {k:'Network', v: els.rNetwork.textContent},
      {k:'Broadcast', v: els.rBroadcast.textContent},
      {k:'First usable', v: els.rFirst.textContent},
      {k:'Last usable', v: els.rLast.textContent},
      {k:'Addresses', v: els.rAddrs.textContent},
      {k:'Usable hosts', v: els.rUsable.textContent},
      {k:'Class', v: els.rClass.textContent},
      {k:'Scope', v: els.rScope.textContent},
    ];
  }

  // Init
  restore();
  updateCIDRUI(parseInt(els.cidr.value,10));
})();
