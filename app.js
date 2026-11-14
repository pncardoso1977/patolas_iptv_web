(() => {
  const $ = id => document.getElementById(id);
  const state = { playlistUrl:'', section:'home', categories:[], items:[] };
  const names = {home:'Início',live:'Canais'};
  function showError(target,error) {
    const message=error?.message||'Ocorreu um erro inesperado.';
    target.textContent=/Failed to fetch|NetworkError|Load failed|CORS/i.test(message)
      ? 'Não foi possível obter a lista M3U. O servidor pode bloquear pedidos CORS do navegador. Será necessário um intermediário HTTPS autorizado pelo fornecedor.' : message;
  }
  function parseM3U(text) {
    const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
    const result=[]; let meta=null;
    for(const raw of lines) {
      const line=raw.trim(); if(!line) continue;
      if(line.startsWith('#EXTINF:')) {
        const group=(line.match(/group-title="([^"]*)"/i)||[])[1]||'Sem categoria';
        const logo=(line.match(/tvg-logo="([^"]*)"/i)||[])[1]||'';
        const name=line.includes(',')?line.slice(line.lastIndexOf(',')+1).trim():'Canal';
        meta={name,group,logo};
      } else if(!line.startsWith('#') && meta) {
        result.push({...meta,url:line}); meta=null;
      }
    }
    return result;
  }
  $('loginForm').addEventListener('submit',async event=>{
    event.preventDefault(); $('loginError').textContent=''; $('loginButton').disabled=true; $('loginButton').textContent='A carregar…';
    try {
      const url=new URL($('playlistUrl').value.trim());
      if(!['http:','https:'].includes(url.protocol)) throw new Error('O endereço tem de começar por http:// ou https://.');
      state.playlistUrl=url.href;
      const response=await fetch('https://patolasiptv-m3u.pncardoso.workers.dev/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:state.playlistUrl}),cache:'no-store'});
      if(!response.ok) throw new Error(`O servidor respondeu com HTTP ${response.status}.`);
      const body=await response.text();
      if(!body.trim().startsWith('#EXTM3U')) throw new Error('A resposta não parece ser uma lista M3U válida (cabeçalho #EXTM3U não encontrado).');
      state.items=parseM3U(body);
      if(!state.items.length) throw new Error('A lista M3U foi recebida, mas não contém canais reconhecíveis.');
      if($('remember').checked) localStorage.setItem('iptv-m3u-session',state.playlistUrl);
      else localStorage.removeItem('iptv-m3u-session');
      $('loginView').classList.add('hidden'); $('appView').classList.remove('hidden');
      $('accountInfo').textContent=`${state.items.length} canais carregados`;
      await openSection('live');
    } catch(error){showError($('loginError'),error);}
    finally{$('loginButton').disabled=false;$('loginButton').textContent='Entrar';}
  });
  function setActive(section){state.section=section;$('pageTitle').textContent=names[section];document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.section===section));}
  async function openSection(section){
    setActive(section);$('homePanel').classList.toggle('hidden',section!=='home');$('catalogPanel').classList.toggle('hidden',section==='home');$('search').value='';
    if(section==='home') return;
    const groups=[...new Set(state.items.map(x=>x.group))].sort((a,b)=>a.localeCompare(b,'pt-PT'));
    const select=$('categorySelect');select.replaceChildren(new Option('Todos os grupos',''));groups.forEach(g=>select.add(new Option(g,g)));
    renderItems();$('status').textContent=`${state.items.length} canais`;
  }
  function renderItems(){
    const q=$('search').value.trim().toLocaleLowerCase('pt-PT'), group=$('categorySelect').value;
    const filtered=state.items.filter(x=>(!group||x.group===group)&&x.name.toLocaleLowerCase('pt-PT').includes(q));
    $('items').replaceChildren();
    if(!filtered.length){$('items').textContent='Não foram encontrados canais.';return;}
    filtered.forEach(item=>{
      const card=document.createElement('button');card.className='content-card live-card';card.type='button';
      const art=document.createElement('span');art.className='content-art';art.textContent='TV';
      if(item.logo){const img=document.createElement('img');img.src=item.logo;img.alt='';img.loading='lazy';img.style.cssText='max-width:100%;max-height:100%;object-fit:contain';img.onerror=()=>img.remove();art.replaceChildren(img);}
      const title=document.createElement('span');title.className='content-name';title.textContent=item.name;
      const group=document.createElement('span');group.className='content-name muted small';group.textContent=item.group;
      card.append(art,title,group);card.addEventListener('click',()=>play(item));$('items').append(card);
    });
    $('status').textContent=`${filtered.length} de ${state.items.length} canais`;
  }
  $('search').addEventListener('input',renderItems);
  $('categorySelect').addEventListener('change',renderItems);
  document.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>openSection(b.dataset.section)));
  function play(item){
    const video=$('video');$('playerTitle').textContent=item.name;$('playerMessage').textContent='';
    video.pause();video.removeAttribute('src');if(video.hls){video.hls.destroy();video.hls=null;}
    if(/\.m3u8($|\?)/i.test(item.url)&&window.Hls&&Hls.isSupported()){
      const hls=new Hls();hls.loadSource(item.url);hls.attachMedia(video);video.hls=hls;
      hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)$('playerMessage').textContent='Falha na reprodução. O servidor pode bloquear CORS ou o formato pode não ser suportado.';});
    } else video.src=item.url;
    $('playerDialog').showModal();video.play().catch(()=>$('playerMessage').textContent='A reprodução automática foi bloqueada. Carrega no botão de reprodução.');
  }
  $('closePlayer').addEventListener('click',()=>{$('video').pause();$('playerDialog').close();});
  $('logoutButton').addEventListener('click',()=>{localStorage.removeItem('iptv-m3u-session');state.playlistUrl='';state.items=[];$('appView').classList.add('hidden');$('loginView').classList.remove('hidden');$('loginForm').reset();});
  try{const saved=localStorage.getItem('iptv-m3u-session');if(saved){$('playlistUrl').value=saved;$('remember').checked=true;}}catch{}
})();