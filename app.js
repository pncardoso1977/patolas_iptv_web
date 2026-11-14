(() => {
  const $ = id => document.getElementById(id);
  const state = { section: 'home', items: [] };
  const names = { home: 'Início', live: 'Canais' };

  function showError(target, error) {
    target.textContent = error?.message || 'Ocorreu um erro inesperado.';
  }

  function addXtreamFields() {
    const serverInput = $('playlistUrl');
    const form = $('loginForm');
    if (!serverInput || !form || $('xtreamUsername')) return;

    const serverLabel = form.querySelector('label[for="playlistUrl"]');
    if (serverLabel) serverLabel.textContent = 'Servidor';
    serverInput.value = 'http://everywheretv.fun:8080';
    serverInput.placeholder = 'http://servidor:porta';
    serverInput.autocomplete = 'url';
    serverInput.required = true;

    const usernameWrap = document.createElement('div');
    usernameWrap.className = serverInput.parentElement?.className || '';
    usernameWrap.innerHTML = '<label for="xtreamUsername">Utilizador</label><input id="xtreamUsername" name="username" type="text" autocomplete="username" required>';
    const passwordWrap = document.createElement('div');
    passwordWrap.className = serverInput.parentElement?.className || '';
    passwordWrap.innerHTML = '<label for="xtreamPassword">Palavra-passe</label><input id="xtreamPassword" name="password" type="password" autocomplete="current-password" required>';

    const button = $('loginButton');
    if (button?.parentElement) {
      button.parentElement.insertBefore(usernameWrap, button);
      button.parentElement.insertBefore(passwordWrap, button);
    } else {
      form.append(usernameWrap, passwordWrap);
    }
  }

  function parseServer(value) {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('O endereço do servidor tem de começar por http:// ou https://.');
    }
    if (url.hostname !== 'everywheretv.fun' || url.port !== '8080' || url.pathname !== '/') {
      throw new Error('Usa o endereço Xtream confirmado: http://everywheretv.fun:8080');
    }
    return url.origin;
  }

  async function loadXtream(username, password) {
    const response = await fetch('https://patolasiptv-m3u.pncardoso.workers.dev/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `O servidor respondeu com HTTP ${response.status}.`);
    if (!Array.isArray(data.items) || !data.items.length) {
      throw new Error('A autenticação foi aceite, mas não foram encontrados canais.');
    }
    return data;
  }

  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    $('loginError').textContent = '';
    $('loginButton').disabled = true;
    $('loginButton').textContent = 'A autenticar…';

    try {
      parseServer($('playlistUrl').value);
      const username = $('xtreamUsername').value.trim();
      const password = $('xtreamPassword').value;
      const data = await loadXtream(username, password);
      state.items = data.items;

      // Credentials are intentionally not written to localStorage.
      $('loginView').classList.add('hidden');
      $('appView').classList.remove('hidden');
      $('accountInfo').textContent = `${state.items.length} canais carregados`;
      $('xtreamPassword').value = '';
      await openSection('live');
    } catch (error) {
      showError($('loginError'), error);
    } finally {
      $('loginButton').disabled = false;
      $('loginButton').textContent = 'Entrar';
    }
  });

  function setActive(section) {
    state.section = section;
    $('pageTitle').textContent = names[section] || 'Canais';
    document.querySelectorAll('.tab').forEach(button =>
      button.classList.toggle('active', button.dataset.section === section)
    );
  }

  async function openSection(section) {
    setActive(section);
    $('homePanel').classList.toggle('hidden', section !== 'home');
    $('catalogPanel').classList.toggle('hidden', section === 'home');
    $('search').value = '';
    if (section === 'home') return;

    const groups = [...new Set(state.items.map(item => item.group))]
      .sort((a, b) => a.localeCompare(b, 'pt-PT'));
    const select = $('categorySelect');
    select.replaceChildren(new Option('Todos os grupos', ''));
    groups.forEach(group => select.add(new Option(group, group)));
    renderItems();
    $('status').textContent = `${state.items.length} canais`;
  }

  function renderItems() {
    const query = $('search').value.trim().toLocaleLowerCase('pt-PT');
    const group = $('categorySelect').value;
    const filtered = state.items.filter(item =>
      (!group || item.group === group) &&
      item.name.toLocaleLowerCase('pt-PT').includes(query)
    );

    $('items').replaceChildren();
    if (!filtered.length) {
      $('items').textContent = 'Não foram encontrados canais.';
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('button');
      card.className = 'content-card live-card';
      card.type = 'button';
      const art = document.createElement('span');
      art.className = 'content-art';
      art.textContent = 'TV';
      if (item.logo) {
        const img = document.createElement('img');
        img.src = item.logo;
        img.alt = '';
        img.loading = 'lazy';
        img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain';
        img.onerror = () => img.remove();
        art.replaceChildren(img);
      }
      const title = document.createElement('span');
      title.className = 'content-name';
      title.textContent = item.name;
      const groupLabel = document.createElement('span');
      groupLabel.className = 'content-name muted small';
      groupLabel.textContent = item.group;
      card.append(art, title, groupLabel);
      card.addEventListener('click', () => play(item));
      $('items').append(card);
    });
    $('status').textContent = `${filtered.length} de ${state.items.length} canais`;
  }

  $('search').addEventListener('input', renderItems);
  $('categorySelect').addEventListener('change', renderItems);
  document.querySelectorAll('[data-section]').forEach(button =>
    button.addEventListener('click', () => openSection(button.dataset.section))
  );

  function play(item) {
    const video = $('video');
    $('playerTitle').textContent = item.name;
    $('playerMessage').textContent = '';
    video.pause();
    video.removeAttribute('src');
    if (video.hls) {
      video.hls.destroy();
      video.hls = null;
    }

    if (/\.m3u8($|\?)/i.test(item.url) && window.Hls && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(item.url);
      hls.attachMedia(video);
      video.hls = hls;
      hls.on(Hls.Events.ERROR, (_, data) => {
  console.error('Erro HLS:', data);

  if (data.fatal) {
    $('playerMessage').textContent =
      `Erro HLS: ${data.type} | ${data.details} | ${data.response?.code || 'sem código HTTP'}`;
  }
});
    } else {
      video.src = item.url;
    }

    $('playerDialog').showModal();
    video.play().catch(() => {
      $('playerMessage').textContent =
        'A reprodução automática foi bloqueada. Carrega no botão de reprodução.';
    });
  }

  $('closePlayer').addEventListener('click', () => {
    $('video').pause();
    $('playerDialog').close();
  });

  $('logoutButton').addEventListener('click', () => {
    state.items = [];
    $('appView').classList.add('hidden');
    $('loginView').classList.remove('hidden');
    $('loginForm').reset();
    $('playlistUrl').value = 'http://everywheretv.fun:8080';
  });

  addXtreamFields();
})();
