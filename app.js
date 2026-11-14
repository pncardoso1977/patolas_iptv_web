(() => {
  const $ = id => document.getElementById(id);
  const state = {server:'', username:'', password:'', section:'home', categories:[], items:[], favorites:[], series:null};
  const names = {home:'Início',live:'Canais',movie:'Filmes',series:'Séries'};
  const endpoint = action => {
    const url = new URL(state.server.replace(/\/+$/,'') + '/player_api.php');
    url.searchParams.set('username', state.username); url.searchParams.set('password', state.password);
    if (action) url.searchParams.set('action', action);
    return url;
  };
  async function api(action, extra={}) {
    const url = endpoint(action); Object.entries(extra).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,v)});
    const response = await fetch(url, {mode:'cors'});
    if (!response.ok) throw new Error(`Servidor respondeu com HTTP ${response.status}.`);
    return response.json();
  }
  function showError(target, error) {
    const message = error?.message || 'Ocorreu um erro inesperado.';
    target.textContent = /Failed to fetch|NetworkError|Load failed/i.test(message)
      ? 'Não foi possível contactar o servidor. Pode estar indisponível ou bloquear pedidos CORS do navegador.' : message;
  }
  function validServer(value) {
    const url = new URL(value.trim());
    if (!['http:','https:'].includes(url.protocol)) throw new Error('O endereço tem de começar por http:// ou https://.');
    return url.origin + url.pathname.replace(/\/+$/,'');
  }
  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault(); $('loginError').textContent=''; $('loginButton').disabled=true; $('loginButton').textContent='A validar…';
    try {
      state.server = validServer($('server').value); state.username=$('username').value.trim(); state.password=$('password').value;
      const data = await api('');
      if (Number(data?.user_info?.auth) !== 1) throw new Error('Credenciais inválidas ou conta sem autorização.');
      if ($('remember').checked) localStorage.setItem('iptv-session', JSON.stringify({server:state.server,username:state.username,password:state.password}));
      else localStorage.removeItem('iptv-session');
      $('loginView').classList.add('hidden'); $('appView').classList.remove('hidden');
      $('accountInfo').textContent = data.user_info?.exp_date ? `Conta válida até: ${data.user_info.exp_date}` : '';
      await openSection('home');
    } catch(error) { showError($('loginError'),error); }
    finally { $('loginButton').disabled=false; $('loginButton').textContent='Entrar'; }
  });
  function setActive(section){state.section=section;$('pageTitle').textContent=names[section];document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.section===section));}
  async function openSection(section){setActive(section);$('homePanel').classList.toggle('hidden',section!=='home');$('catalogPanel').classList.toggle('hidden',section==='home');$('search').value='';
    if(section==='home')return;
    $('status').textContent='A carregar conteúdos…';$('items').replaceChildren();
    const actions={live:['get_live_categories','get_live_streams'],movie:['get_vod_categories','get_vod_streams'],series:['get_series_categories','get_series']};
    try { const [cats,items]=await Promise.all([api(actions[section][0]),api(actions[section][1])]); state.categories=Array.isArray(cats)?cats:[];state.items=Array.isArray(items)?items:[];fillCategories();renderItems(state.items);$('status').textContent=`${state.items.length} conteúdos`; }
    catch(error){showError($('status'),error);}
  }
  function fillCategories(){const select=$('categorySelect');select.replaceChildren(new Option('Todas as categorias',''));state.categories.forEach(c=>select.add(new Option(c.category_name,c.category_id)));}
  function renderItems(items){$('items').replaceChildren();const q=$('search').value.trim().toLocaleLowerCase('pt-PT');const filtered=items.filter(x=>(x.name||'').toLocaleLowerCase('pt-PT').includes(q));
    if(!filtered.length){$('items').innerHTML='<p class="muted">Não foram encontrados conteúdos.</p>';return;}
    filtered.forEach(item=>{const card=document.createElement('button');card.className='content-card '+(state.section==='live'?'live-card':'');card.type='button';const art=document.createElement('span');art.className='content-art';art.textContent=state.section==='live'?'TV':'▶';const title=document.createElement('span');title.className='content-name';title.textContent=item.name||'Sem título';card.append(art,title);card.addEventListener('click',()=>state.section==='series'?openSeries(item):play(item));$('items').append(card);});
  }
  $('search').addEventListener('input',()=>renderItems(state.items));
  $('categorySelect').addEventListener('change',async()=>{const action={live:'get_live_streams',movie:'get_vod_streams',series:'get_series'}[state.section];$('status').textContent='A carregar…';try{state.items=await api(action,{category_id:$('categorySelect').value});renderItems(state.items);$('status').textContent=`${state.items.length} conteúdos`;}catch(e){showError($('status'),e);}});
  document.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>openSection(b.dataset.section)));
  function streamUrl(item, type){const id=item.stream_id??item.series_id;const ext=type==='live'?'ts':(item.container_extension||'mp4');return `${state.server.replace(/\/+$/,'')}/${type}/${encodeURIComponent(state.username)}/${encodeURIComponent(state.password)}/${id}.${ext}`;}
  function play(item,type=state.section){const kind=type==='live'?'live':type==='movie'?'movie':'series';const url=streamUrl(item,kind);$('playerTitle').textContent=item.name||'Reprodução';$('playerMessage').textContent='';const video=$('video');video.pause();video.removeAttribute('src');if(video.hls){video.hls.destroy();video.hls=null;}
    if(url.toLowerCase().includes('.m3u8')&&window.Hls&&Hls.isSupported()){const hls=new Hls();hls.loadSource(url);hls.attachMedia(video);video.hls=hls;hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)$('playerMessage').textContent='Não foi possível reproduzir este conteúdo. Verifica o suporte do servidor a CORS e o formato do stream.';});}
    else if(video.canPlayType('application/vnd.apple.mpegurl'))video.src=url;else video.src=url;
    $('playerDialog').showModal();video.play().catch(()=>{$('playerMessage').textContent='A reprodução automática foi bloqueada. Carrega no botão de reprodução.';});
  }
  async function openSeries(item){state.series=item;$('seriesTitle').textContent=item.name;const box=$('episodes');box.textContent='A carregar episódios…';$('seriesDialog').showModal();try{const data=await api('get_series_info',{series_id:item.series_id});box.replaceChildren();const seasons=data.episodes||{};Object.keys(seasons).sort((a,b)=>Number(a)-Number(b)).forEach(season=>{const heading=document.createElement('h3');heading.textContent=`Temporada ${season}`;box.append(heading);seasons[season].forEach(ep=>{const b=document.createElement('button');b.className='episode';b.textContent=ep.title||ep.name||`Episódio ${ep.episode_num||''}`;b.addEventListener('click',()=>{ $('seriesDialog').close();play({stream_id:ep.id,name:b.textContent,container_extension:ep.container_extension},'series');});box.append(b);});});if(!box.children.length)box.textContent='O servidor não devolveu episódios para esta série.';}catch(e){showError(box,e);}}
  $('closePlayer').addEventListener('click',()=>{$('video').pause();$('playerDialog').close();});$('closeSeries').addEventListener('click',()=>$('seriesDialog').close());
  $('logoutButton').addEventListener('click',()=>{localStorage.removeItem('iptv-session');state.server='';state.username='';state.password='';$('appView').classList.add('hidden');$('loginView').classList.remove('hidden');$('loginForm').reset();});
  try{const saved=JSON.parse(localStorage.getItem('iptv-session')||'null');if(saved){$('server').value=saved.server;$('username').value=saved.username;$('password').value=saved.password;$('remember').checked=true;}}catch{}
})();
