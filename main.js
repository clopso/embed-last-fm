const API_ROOT = 'https://ws.audioscrobbler.com/2.0/';
const storageKey = 'laststats_api_key';
const elements = {
  hero: document.querySelector('#hero'), dashboard: document.querySelector('#dashboard'),
  searchForm: document.querySelector('#searchForm'), username: document.querySelector('#username'),
  compactSearchForm: document.querySelector('#compactSearchForm'), compactUsername: document.querySelector('#compactUsername'),
  periodSelect: document.querySelector('#periodSelect'), settingsButton: document.querySelector('#settingsButton'),
  apiDialog: document.querySelector('#apiDialog'), apiForm: document.querySelector('#apiForm'),
  apiKey: document.querySelector('#apiKey'), removeApiKey: document.querySelector('#removeApiKey'), toast: document.querySelector('#toast'),
};
let activeUser = ''; let pendingUser = ''; let toastTimer;
const getApiKey = () => localStorage.getItem(storageKey)?.trim() || window.LASTFM_API_KEY || '';
const formatNumber = (value) => new Intl.NumberFormat('pt-BR', { notation: Number(value) >= 1000000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(Number(value) || 0);
const imageFrom = (item) => item?.image?.find((image) => image.size === 'extralarge')?.['#text'] || item?.image?.at(-1)?.['#text'] || '';
const safeUrl = (url) => { try { const parsed = new URL(url); return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : '#'; } catch { return '#'; } };

function showToast(message) { clearTimeout(toastTimer); elements.toast.textContent = message; elements.toast.classList.add('visible'); toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 4200); }
function openApiDialog() { elements.apiKey.value = getApiKey(); elements.apiDialog.showModal(); setTimeout(() => elements.apiKey.focus(), 50); }
async function api(method, params = {}) {
  const query = new URLSearchParams({ method, api_key: getApiKey(), format: 'json', autocorrect: '1', ...params });
  const response = await fetch(`${API_ROOT}?${query}`); const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.message || 'Não foi possível consultar o Last.fm.');
  return data;
}
function createImage(src, alt, className = 'cover') { const img = document.createElement('img'); img.className = className; img.alt = alt; if (src) img.src = src; img.addEventListener('error', () => img.removeAttribute('src')); return img; }
function createLink(text, href) { const link = document.createElement('a'); link.className = 'item-name'; link.textContent = text; link.href = safeUrl(href); link.target = '_blank'; link.rel = 'noreferrer'; return link; }

function renderStats(user, totals) {
  const registered = Number(user.registered?.unixtime || 0) * 1000;
  const days = registered ? Math.max(1, Math.floor((Date.now() - registered) / 86400000)) : 0;
  const average = days ? Math.round(Number(user.playcount || 0) / days) : 0;
  const stats = [['Scrobbles', user.playcount, 'reproduções registradas'], ['Artistas', totals.artists, 'artistas diferentes'], ['Álbuns', totals.albums, 'álbuns diferentes'], ['Média diária', average, 'scrobbles por dia']];
  document.querySelector('#statsGrid').replaceChildren(...stats.map(([label, value, note]) => {
    const card = document.createElement('article'); card.className = 'stat';
    const labelEl = document.createElement('span'); labelEl.className = 'stat-label'; labelEl.textContent = label;
    const valueEl = document.createElement('strong'); valueEl.className = 'stat-value'; valueEl.textContent = formatNumber(value);
    const noteEl = document.createElement('span'); noteEl.className = 'stat-note'; noteEl.textContent = note;
    card.append(labelEl, valueEl, noteEl); return card;
  }));
}
function renderProfile(user) {
  document.querySelector('#profileName').textContent = user.realname || user.name;
  document.querySelector('#profileLink').href = safeUrl(user.url);
  const avatar = document.querySelector('#avatar'); avatar.replaceChildren(); const src = imageFrom(user);
  if (src) avatar.append(createImage(src, `Foto de ${user.name}`, 'avatar-image'));
  else { const fallback = document.createElement('span'); fallback.textContent = '♪'; avatar.append(fallback); }
}
function renderArtists(artists) {
  document.querySelector('#topArtists').replaceChildren(...artists.map((artist, index) => {
    const row = document.createElement('div'); row.className = 'artist-item';
    const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = String(index + 1).padStart(2, '0');
    const count = document.createElement('span'); count.className = 'item-count'; count.textContent = `${formatNumber(artist.playcount)} plays`;
    row.append(rank, createImage(imageFrom(artist), `Imagem de ${artist.name}`), createLink(artist.name, artist.url), count); return row;
  }));
}
function renderSimpleList(selector, items) {
  document.querySelector(selector).replaceChildren(...items.map((item, index) => {
    const row = document.createElement('li'); const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = String(index + 1).padStart(2, '0');
    const copy = document.createElement('div'); copy.className = 'list-copy'; copy.append(createLink(item.name, item.url));
    const detail = document.createElement('small'); detail.textContent = `${item.artist?.name || item.artist?.['#text'] || 'Artista'} · ${formatNumber(item.playcount)} plays`;
    copy.append(detail); row.append(rank, copy); return row;
  }));
}
function renderRecent(tracks) {
  document.querySelector('#recentTracks').replaceChildren(...tracks.map((track) => {
    const row = document.createElement('div'); row.className = 'recent-item'; const isNow = track['@attr']?.nowplaying === 'true';
    const marker = document.createElement('span'); marker.className = isNow ? 'playing' : 'rank'; marker.textContent = isNow ? '●' : '♪';
    const copy = document.createElement('div'); copy.className = 'list-copy'; copy.append(createLink(track.name, track.url));
    const artist = document.createElement('small'); artist.textContent = track.artist?.['#text'] || track.artist?.name || 'Artista desconhecido'; copy.append(artist);
    const time = document.createElement('span'); time.className = 'recent-meta'; time.textContent = isNow ? 'Ouvindo agora' : new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(Number(track.date?.uts) * 1000));
    row.append(marker, copy, time); return row;
  }));
}
async function loadRankings(user, period) {
  const [artistsData, tracksData, albumsData] = await Promise.all([
    api('user.getTopArtists', { user, period, limit:'6' }), api('user.getTopTracks', { user, period, limit:'6' }), api('user.getTopAlbums', { user, period, limit:'6' }),
  ]);
  renderArtists(artistsData.topartists?.artist || []); renderSimpleList('#topTracks', tracksData.toptracks?.track || []); renderSimpleList('#topAlbums', albumsData.topalbums?.album || []);
  return { artists: artistsData.topartists?.['@attr']?.total || 0, albums: albumsData.topalbums?.['@attr']?.total || 0 };
}
async function loadUser(username) {
  const cleanUser = username.trim().replace(/^@/, ''); if (!cleanUser) return;
  if (!getApiKey()) { pendingUser = cleanUser; openApiDialog(); return; }
  elements.dashboard.classList.add('loading'); elements.searchForm.classList.add('loading');
  try {
    const [infoData, recentData, totals] = await Promise.all([api('user.getInfo', { user:cleanUser }), api('user.getRecentTracks', { user:cleanUser, limit:'8', extended:'1' }), loadRankings(cleanUser, elements.periodSelect.value)]);
    activeUser = infoData.user.name; renderProfile(infoData.user); renderStats(infoData.user, totals); renderRecent(recentData.recenttracks?.track || []);
    elements.compactUsername.value = ''; elements.hero.hidden = true; elements.dashboard.hidden = false;
    history.replaceState(null, '', `?user=${encodeURIComponent(activeUser)}`); window.scrollTo({ top:0, behavior:'smooth' });
  } catch (error) { showToast(error.message === 'User not found' ? 'Usuário não encontrado. Confira o nome e tente novamente.' : error.message); }
  finally { elements.dashboard.classList.remove('loading'); elements.searchForm.classList.remove('loading'); }
}

elements.searchForm.addEventListener('submit', (event) => { event.preventDefault(); loadUser(elements.username.value); });
elements.compactSearchForm.addEventListener('submit', (event) => { event.preventDefault(); loadUser(elements.compactUsername.value); });
elements.settingsButton.addEventListener('click', openApiDialog);
elements.removeApiKey.addEventListener('click', () => { localStorage.removeItem(storageKey); elements.apiKey.value = ''; elements.apiDialog.close(); showToast('API key removida deste navegador.'); });
elements.apiForm.addEventListener('submit', (event) => {
  if (event.submitter?.value === 'cancel') return; event.preventDefault(); const key = elements.apiKey.value.trim(); if (!key) return;
  localStorage.setItem(storageKey, key); elements.apiDialog.close(); showToast('API key salva neste navegador.');
  if (pendingUser) { const user = pendingUser; pendingUser = ''; loadUser(user); }
});
elements.periodSelect.addEventListener('change', async () => {
  if (!activeUser) return; elements.dashboard.classList.add('loading');
  try { const totals = await loadRankings(activeUser, elements.periodSelect.value); const info = await api('user.getInfo', { user:activeUser }); renderStats(info.user, totals); }
  catch (error) { showToast(error.message); } finally { elements.dashboard.classList.remove('loading'); }
});
const initialUser = new URLSearchParams(location.search).get('user'); if (initialUser) { elements.username.value = initialUser; loadUser(initialUser); }
