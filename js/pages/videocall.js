// js/pages/videocall.js — Pro Level WhatsApp Style
const VideoCall = (() => {
  let localStream = null;
  let remoteStream = null;
  let peerConnection = null;
  let currentConvId = null;
  let currentMatch = null;
  let pollingInterval = null;
  let isCallActive = false;
  let isAudioOnly = false;
  let callStartTime = null;
  let callTimerInterval = null;
  let isDragging = false;
  let dragOffX = 0, dragOffY = 0;

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ]
  };

  function removeUI() {
    const ui = document.getElementById('call-ui');
    if (ui) ui.remove();
  }

  function showCallUI(match, calling, audioOnly) {
    removeUI();
    const avatar = match && match.main_photo
      ? '<img src="' + match.main_photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
      : '<div style="font-size:48px;display:flex;align-items:center;justify-content:center;height:100%;">👤</div>';

    const ui = document.createElement('div');
    ui.id = 'call-ui';
    ui.style.cssText = `
      position:fixed; inset:0; z-index:9999;
      background: ${audioOnly ? 'linear-gradient(135deg,#1a0d2e,#0D0810)' : '#0D0810'};
      display:flex; flex-direction:column;
      font-family:'Outfit',sans-serif;
    `;

    ui.innerHTML = `
      <style>
        @keyframes callPulse {
          0% { box-shadow: 0 0 0 0 rgba(232,49,122,0.4); }
          70% { box-shadow: 0 0 0 20px rgba(232,49,122,0); }
          100% { box-shadow: 0 0 0 0 rgba(232,49,122,0); }
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .call-ctrl-btn {
          border:none; cursor:pointer; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          transition: all 0.2s; font-size:20px;
        }
        .call-ctrl-btn:active { transform:scale(0.9); }
        #local-video-pip {
          position:absolute; bottom:120px; right:16px;
          width:90px; height:130px;
          border-radius:14px; overflow:hidden;
          border:2px solid rgba(255,255,255,0.4);
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
          cursor:grab; z-index:10001;
          display:none;
        }
        #local-video-pip:active { cursor:grabbing; }
      </style>

      <!-- Zone principale vidéo/avatar -->
      <div id="call-main" style="flex:1;position:relative;overflow:hidden;background:#0a0614;">
        <!-- Vidéo distante -->
        <video id="remote-video" autoplay playsinline
          style="width:100%;height:100%;object-fit:cover;display:none;animation:fadeIn 0.5s;"></video>

        <!-- Avatar (quand pas encore connecté) -->
        <div id="remote-avatar" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;">
          <div style="width:110px;height:110px;border-radius:50%;overflow:hidden;animation:callPulse 1.5s infinite;border:3px solid rgba(232,49,122,0.5);">
            ${avatar}
          </div>
          <div style="font-size:22px;font-weight:700;color:white;">${(match && match.first_name) || 'Appel'}</div>
          <div id="call-status" style="font-size:14px;color:rgba(255,255,255,0.6);">
            ${calling ? (audioOnly ? '📞 Appel audio...' : '📹 Appel vidéo...') : '📲 Appel entrant...'}
          </div>
          <div id="call-timer" style="font-size:13px;color:rgba(255,255,255,0.4);display:none;">0:00</div>
        </div>

        <!-- PiP vidéo locale (draggable) -->
        <div id="local-video-pip">
          <video id="local-video" autoplay muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>
        </div>
      </div>

      <!-- Barre de contrôles -->
      <div style="padding:20px 16px 40px;background:rgba(0,0,0,0.85);backdrop-filter:blur(20px);">
        ${calling ? `
        <!-- Contrôles appel actif -->
        <div style="display:flex;justify-content:space-around;align-items:center;">
          <!-- Mute -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            <button id="btn-mute" class="call-ctrl-btn" onclick="VideoCall.toggleMute()"
              style="width:56px;height:56px;background:rgba(255,255,255,0.15);">
              🎤
            </button>
            <span style="font-size:11px;color:rgba(255,255,255,0.5);">Micro</span>
          </div>

          <!-- Raccrocher (centré, grand, rouge) -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            <button class="call-ctrl-btn" onclick="VideoCall.endCall()"
              style="width:72px;height:72px;background:linear-gradient(135deg,#EF4444,#DC2626);
                     box-shadow:0 8px 32px rgba(239,68,68,0.6);font-size:28px;">
              📵
            </button>
            <span style="font-size:11px;color:#EF4444;font-weight:600;">Raccrocher</span>
          </div>

          <!-- Caméra (seulement si vidéo) -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            ${audioOnly ? `
            <button id="btn-speaker" class="call-ctrl-btn" onclick="VideoCall.toggleSpeaker()"
              style="width:56px;height:56px;background:rgba(255,255,255,0.15);">🔊</button>
            <span style="font-size:11px;color:rgba(255,255,255,0.5);">HP</span>
            ` : `
            <button id="btn-cam" class="call-ctrl-btn" onclick="VideoCall.toggleCamera()"
              style="width:56px;height:56px;background:rgba(255,255,255,0.15);">📷</button>
            <span style="font-size:11px;color:rgba(255,255,255,0.5);">Caméra</span>
            `}
          </div>
        </div>
        ` : `
        <!-- Contrôles appel entrant -->
        <div style="display:flex;justify-content:space-around;align-items:center;">
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            <button class="call-ctrl-btn" onclick="VideoCall.rejectCall()"
              style="width:68px;height:68px;background:linear-gradient(135deg,#EF4444,#DC2626);
                     box-shadow:0 8px 32px rgba(239,68,68,0.5);font-size:26px;">
              📵
            </button>
            <span style="font-size:11px;color:#EF4444;">Refuser</span>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            <button class="call-ctrl-btn" onclick="VideoCall.acceptCall()"
              style="width:68px;height:68px;background:linear-gradient(135deg,#22C55E,#16A34A);
                     box-shadow:0 8px 32px rgba(34,197,94,0.5);font-size:26px;">
              📞
            </button>
            <span style="font-size:11px;color:#22C55E;">Répondre</span>
          </div>
        </div>
        `}
      </div>
    `;
    document.body.appendChild(ui);

    // Rendre le PiP draggable
    const pip = document.getElementById('local-video-pip');
    if (pip) {
      pip.addEventListener('mousedown', onPipMouseDown);
      pip.addEventListener('touchstart', onPipTouchStart, { passive: true });
    }
  }

  // ── PiP Drag
  function onPipMouseDown(e) {
    isDragging = true;
    const pip = document.getElementById('local-video-pip');
    const rect = pip.getBoundingClientRect();
    dragOffX = e.clientX - rect.left;
    dragOffY = e.clientY - rect.top;
    document.onmousemove = function(e) {
      if (!isDragging) return;
      pip.style.left = (e.clientX - dragOffX) + 'px';
      pip.style.top = (e.clientY - dragOffY) + 'px';
      pip.style.right = 'auto';
      pip.style.bottom = 'auto';
    };
    document.onmouseup = function() { isDragging = false; };
  }

  function onPipTouchStart(e) {
    const touch = e.touches[0];
    const pip = document.getElementById('local-video-pip');
    const rect = pip.getBoundingClientRect();
    dragOffX = touch.clientX - rect.left;
    dragOffY = touch.clientY - rect.top;
    pip.ontouchmove = function(e) {
      const t = e.touches[0];
      pip.style.left = (t.clientX - dragOffX) + 'px';
      pip.style.top = (t.clientY - dragOffY) + 'px';
      pip.style.right = 'auto';
      pip.style.bottom = 'auto';
    };
  }

  // ── Timer appel
  function startCallTimer() {
    callStartTime = Date.now();
    const timerEl = document.getElementById('call-timer');
    if (timerEl) timerEl.style.display = 'block';
    callTimerInterval = setInterval(function() {
      const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      const el = document.getElementById('call-timer');
      if (el) el.textContent = m + ':' + String(s).padStart(2, '0');
    }, 1000);
  }

  function stopCallTimer() {
    clearInterval(callTimerInterval);
  }

  // ── Connexion
  function onRemoteStream(event) {
    remoteStream = event.streams[0];
    if (isAudioOnly) {
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.play().catch(function() {});
    } else {
      const rv = document.getElementById('remote-video');
      const ra = document.getElementById('remote-avatar');
      if (rv) { rv.srcObject = remoteStream; rv.style.display = 'block'; }
      if (ra) ra.style.display = 'none';
    }
    const st = document.getElementById('call-status');
    if (st) st.style.display = 'none';
    startCallTimer();
  }

  function createPC(convId, toUserId) {
    peerConnection = new RTCPeerConnection(ICE_SERVERS);
    if (localStream) localStream.getTracks().forEach(function(t) { peerConnection.addTrack(t, localStream); });
    peerConnection.ontrack = onRemoteStream;
    peerConnection.onicecandidate = function(e) {
      if (e.candidate) {
        API.post('/call/' + convId + '/signal', { type: 'ice-candidate', data: e.candidate, to: toUserId }).catch(function() {});
      }
    };
    peerConnection.onconnectionstatechange = function() {
      if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
        Toast.info('Appel terminé');
        endCall();
      }
    };
    return peerConnection;
  }

  // ── Démarrer appel vidéo
  async function startCall(match, convId) {
    const user = AuthService.getUser();
    if (!user || !user.is_premium) { Toast.info('Appels vidéo — Premium ⭐'); App.navigate('pricing'); return; }
    currentMatch = match; currentConvId = convId; isAudioOnly = false; isCallActive = true;
    showCallUI(match, true, false);
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      const lv = document.getElementById('local-video');
      const pip = document.getElementById('local-video-pip');
      if (lv) lv.srcObject = localStream;
      if (pip) pip.style.display = 'block';
      createPC(convId, match.userId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await API.post('/call/' + convId + '/signal', { type: 'offer', data: offer, to: match.userId });
      startSignalPolling(convId, match.userId);
    } catch(err) { Toast.error('Impossible d\'accéder à la caméra'); endCall(); }
  }

  // ── Démarrer appel audio
  async function startAudioCall(match, convId) {
    const user = AuthService.getUser();
    if (!user || !user.is_premium) { Toast.info('Appels audio — Premium ⭐'); App.navigate('pricing'); return; }
    currentMatch = match; currentConvId = convId; isAudioOnly = true; isCallActive = true;
    showCallUI(match, true, true);
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      createPC(convId, match.userId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await API.post('/call/' + convId + '/signal', { type: 'offer', data: offer, to: match.userId });
      startSignalPolling(convId, match.userId);
    } catch(err) { Toast.error('Impossible d\'accéder au micro'); endCall(); }
  }

  // ── Accepter appel
  async function acceptCall() {
    isCallActive = true;
    const st = document.getElementById('call-status');
    if (st) st.textContent = 'Connexion en cours...';
    try {
      const constraints = isAudioOnly ? { audio: true, video: false } : { video: { facingMode: 'user' }, audio: true };
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!isAudioOnly) {
        const lv = document.getElementById('local-video');
        const pip = document.getElementById('local-video-pip');
        if (lv) lv.srcObject = localStream;
        if (pip) pip.style.display = 'block';
      }
      createPC(currentConvId, currentMatch.userId);
      if (peerConnection._pendingOffer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(peerConnection._pendingOffer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await API.post('/call/' + currentConvId + '/signal', { type: 'answer', data: answer, to: currentMatch.userId });
      }

      // Mettre à jour UI → mode appel actif
      const ui = document.getElementById('call-ui');
      if (ui) {
        showCallUI(currentMatch, true, isAudioOnly);
        if (!isAudioOnly) {
          const lv = document.getElementById('local-video');
          const pip = document.getElementById('local-video-pip');
          if (lv) lv.srcObject = localStream;
          if (pip) pip.style.display = 'block';
        }
      }
      startSignalPolling(currentConvId, currentMatch.userId);
    } catch(err) { Toast.error('Impossible d\'accéder à la caméra/micro'); endCall(); }
  }

  function rejectCall() {
    if (currentConvId && currentMatch) {
      API.post('/call/' + currentConvId + '/signal', { type: 'reject', data: {}, to: currentMatch.userId }).catch(function() {});
    }
    endCall();
  }

  function endCall() {
    if (currentConvId && currentMatch && isCallActive) {
      API.post('/call/' + currentConvId + '/signal', { type: 'end', data: {}, to: currentMatch.userId }).catch(function() {});
    }
    isCallActive = false;
    stopSignalPolling();
    stopCallTimer();
    if (localStream) { localStream.getTracks().forEach(function(t) { t.stop(); }); localStream = null; }
    if (peerConnection) { peerConnection.close(); peerConnection = null; }
    removeUI();
    currentConvId = null;
    currentMatch = null;
  }

  // ── Signal polling
  function startSignalPolling(convId, toUserId) {
    stopSignalPolling();
    pollingInterval = setInterval(async function() {
      if (!isCallActive) return stopSignalPolling();
      try {
        const res = await API.get('/call/' + convId + '/signal');
        const sigs = (res && res.data) ? res.data : [];
        for (let i = 0; i < sigs.length; i++) { await handleSignal(sigs[i]); }
      } catch(e) {}
    }, 1000);
  }

  function stopSignalPolling() {
    if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
  }

  async function handleSignal(signal) {
    if (signal.type === 'answer' && peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
    } else if (signal.type === 'ice-candidate' && peerConnection) {
      try { await peerConnection.addIceCandidate(new RTCIceCandidate(signal.data)); } catch(e) {}
    } else if (signal.type === 'reject') {
      Toast.info(currentMatch ? currentMatch.first_name + ' a refusé l\'appel' : 'Appel refusé');
      endCall();
    } else if (signal.type === 'end') {
      const elapsed = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
      const m = Math.floor(elapsed / 60), s = elapsed % 60;
      Toast.info('Appel terminé · ' + m + ':' + String(s).padStart(2, '0'));
      endCall();
    }
  }

  function _handleIncoming(signal, conv) {
    if (isCallActive) return;
    currentConvId = conv.conversation_id;
    isAudioOnly = signal.audioOnly || false;
    currentMatch = Object.assign({}, conv, { userId: signal.from });
    if (!peerConnection) {
      peerConnection = new RTCPeerConnection(ICE_SERVERS);
      peerConnection._pendingOffer = signal.data;
    }
    showCallUI(currentMatch, false, isAudioOnly);
    startSignalPolling(currentConvId, signal.from);
  }

  // ── Contrôles
  function toggleMute() {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      const btn = document.getElementById('btn-mute');
      if (btn) {
        btn.textContent = track.enabled ? '🎤' : '🔇';
        btn.style.background = track.enabled ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.3)';
      }
    }
  }

  function toggleCamera() {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      const btn = document.getElementById('btn-cam');
      if (btn) {
        btn.textContent = track.enabled ? '📷' : '🚫';
        btn.style.background = track.enabled ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.3)';
      }
    }
  }

  function toggleSpeaker() {
    Toast.info('Haut-parleur — bientôt disponible');
  }

  return { startCall, startAudioCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera, toggleSpeaker, _handleIncoming };
})();