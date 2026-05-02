// js/pages/stories.js
const StoriesPage = (() => {
  let allGroups = [];
  let currentGroup = 0;
  let currentStory = 0;
  let timer = null;

  const FLAG = (code) => {
    if (!code || code.length !== 2) return '';
    try { return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)); } catch { return ''; }
  };

  async function loadStories() {
    try {
      const data = await API.get('/stories');
      return data?.data || [];
    } catch(e) { return []; }
  }

  function renderBar() {
    const container = document.getElementById('stories-bar');
    if (!container) return;
    container.innerHTML = '';
    const myStory = allGroups.find(g => g.is_mine);
    if (!myStory) {
      const addBtn = document.createElement('div');
      addBtn.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex-shrink:0;';
      addBtn.onclick = () => StoriesPage.openUpload();
      addBtn.innerHTML = '<div style="width:46px;height:46px;border-radius:50%;background:rgba(232,49,122,0.2);border:2px dashed #E8317A;display:flex;align-items:center;justify-content:center;font-size:20px;">+</div><span style="font-size:9px;color:#E8317A;">Ma story</span>';
      container.appendChild(addBtn);
    }
    allGroups.forEach((group, idx) => {
      const hasUnseen = group.stories.some(s => !s.seen);
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex-shrink:0;';
      div.onclick = () => openViewer(idx);
      const ring = hasUnseen
        ? 'background:linear-gradient(135deg,#E8317A,#F59E0B);padding:2px;'
        : 'background:rgba(255,255,255,0.2);padding:2px;';
      const avatar = group.avatar
        ? '<img src="' + group.avatar + '" style="width:100%;height:100%;object-fit:cover;">'
        : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;">👤</div>';
      div.innerHTML = '<div style="' + ring + 'border-radius:50%;width:46px;height:46px;"><div style="width:42px;height:42px;border-radius:50%;overflow:hidden;background:#2D1F38;border:2px solid #140F17;">' + avatar + '</div></div><span style="font-size:9px;color:rgba(255,255,255,0.8);max-width:50px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (group.is_mine ? 'Ma story' : group.first_name) + '</span>';
      container.appendChild(div);
    });
  }

  function openViewer(groupIdx) {
    currentGroup = groupIdx;
    currentStory = 0;
    if (!document.getElementById('story-viewer')) createViewer();
    showStory();
  }

  function createViewer() {
    const v = document.createElement('div');
    v.id = 'story-viewer';
    v.style.cssText = 'position:fixed;inset:0;z-index:1000;background:#000;display:none;';
    document.body.appendChild(v);
  }

  function showStory() {
    clearTimeout(timer);
    const group = allGroups[currentGroup];
    if (!group) return StoriesPage.closeViewer();
    const story = group.stories[currentStory];
    if (!story) return StoriesPage.closeViewer();
    API.post('/stories/' + story.id + '/view', {}).catch(() => {});
    const duration = story.media_type === 'video' ? 15000 : 5000;
    const viewer = document.getElementById('story-viewer');
    const bars = group.stories.map((_, i) =>
      '<div style="flex:1;height:3px;border-radius:2px;background:' +
      (i < currentStory ? 'white' : i === currentStory ? 'transparent' : 'rgba(255,255,255,0.3)') +
      ';overflow:hidden;">' +
      (i === currentStory ? '<div id="progress-bar" style="height:100%;background:white;width:0%;transition:width ' + duration + 'ms linear;"></div>' : '') +
      '</div>'
    ).join('');
    const avatarHtml = group.avatar
      ? '<img src="' + group.avatar + '" style="width:100%;height:100%;object-fit:cover;">'
      : '👤';
    const mediaHtml = story.media_type === 'video'
      ? '<video src="' + story.media_url + '" style="width:100%;height:100%;object-fit:cover;" autoplay muted playsinline></video>'
      : '<img src="' + story.media_url + '" style="width:100%;height:100%;object-fit:cover;">';
    viewer.innerHTML =
      '<div style="position:relative;width:100%;height:100%;background:#000;">' +
      mediaHtml +
      '<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.4) 0%,transparent 30%,transparent 70%,rgba(0,0,0,0.4) 100%);"></div>' +
      '<div style="position:absolute;top:0;left:0;right:0;padding:12px 12px 0;display:flex;gap:4px;">' + bars + '</div>' +
      '<div style="position:absolute;top:20px;left:12px;right:12px;display:flex;align-items:center;gap:10px;padding-top:8px;">' +
      '<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;border:2px solid white;">' + avatarHtml + '</div>' +
      '<div><div style="color:white;font-weight:700;font-size:14px;">' + group.first_name + ' ' + FLAG(group.country_code) + '</div>' +
      '<div style="color:rgba(255,255,255,0.7);font-size:11px;">' + timeAgo(story.created_at) + '</div></div>' +
      '<button onclick="StoriesPage.closeViewer()" style="margin-left:auto;background:none;border:none;color:white;font-size:24px;cursor:pointer;">X</button></div>' +
      (story.caption ? '<div style="position:absolute;bottom:40px;left:16px;right:16px;color:white;font-size:15px;text-align:center;">' + story.caption + '</div>' : '') +
      '<div style="position:absolute;top:0;left:0;width:40%;height:100%;" onclick="StoriesPage.prevStory()"></div>' +
      '<div style="position:absolute;top:0;right:0;width:40%;height:100%;" onclick="StoriesPage.nextStory()"></div>' +
      (group.is_mine ? '<button onclick="StoriesPage.deleteCurrentStory(' + story.id + ')" style="position:absolute;bottom:16px;right:16px;background:rgba(239,68,68,0.8);border:none;color:white;padding:8px 16px;border-radius:50px;font-size:12px;cursor:pointer;">Supprimer</button>' : '<div style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.6);font-size:12px;">👁 ' + story.views_count + ' vues</div>') +
      '</div>';
    viewer.style.display = 'flex';
    setTimeout(() => { const bar = document.getElementById('progress-bar'); if (bar) bar.style.width = '100%'; }, 50);
    timer = setTimeout(() => StoriesPage.nextStory(), duration);
  }

  function timeAgo(dateStr) {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    const diff = Math.floor((Date.now() - d) / 60000);
    if (diff < 1) return "A l instant";
    if (diff < 60) return diff + ' min';
    if (diff < 1440) return Math.floor(diff / 60) + 'h';
    return Math.floor(diff / 1440) + 'j';
  }

  return {
    async init() {
      allGroups = await loadStories();
      renderBar();
    },
    openViewer,
    closeViewer() {
      clearTimeout(timer);
      const v = document.getElementById('story-viewer');
      if (v) v.style.display = 'none';
    },
    nextStory() {
      const group = allGroups[currentGroup];
      if (!group) return StoriesPage.closeViewer();
      if (currentStory < group.stories.length - 1) { currentStory++; showStory(); }
      else if (currentGroup < allGroups.length - 1) { currentGroup++; currentStory = 0; showStory(); }
      else StoriesPage.closeViewer();
    },
    prevStory() {
      if (currentStory > 0) { currentStory--; showStory(); }
      else if (currentGroup > 0) { currentGroup--; currentStory = 0; showStory(); }
    },
    openUpload() {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*,video/*';
      inp.onchange = () => StoriesPage.uploadFromFile(inp.files[0]);
      inp.click();
    },
    uploadFromFile(file) {
      if (!file) return;
      Toast.info('Publication en cours...');
      const fd = new FormData();
      fd.append('media', file);
      const token = AuthService.getToken();
      fetch('https://api.mixte-meet.fr/api/stories', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: fd
      }).then(r => r.json()).then(data => {
        if (data.success) { Toast.success('Story publiee !'); StoriesPage.init(); }
        else Toast.error(data.message || 'Erreur');
      }).catch(() => Toast.error('Erreur upload'));
    },
    async deleteCurrentStory(id) {
      await API.delete('/stories/' + id);
      Toast.success('Story supprimee');
      StoriesPage.closeViewer();
      allGroups = await loadStories();
      renderBar();
    }
  };
})();