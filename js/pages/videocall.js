// js/pages/videocall.js
const VideoCall = (() => {
  let localStream = null;
  let remoteStream = null;
  let peerConnection = null;
  let currentConvId = null;
  let currentMatch = null;
  let isCaller = false;
  let pollingInterval = null;
  let isCallActive = false;

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  function getCallUI() {
    return document.getElementById('video-call-ui');
  }

  function showCallUI(match, calling = true) {
    const existing = getCallUI();
    if (existing) existing.remove();

    const avatar = match?.main_photo
      ? `<img src="${match.main_photo}" style="width:100%;height:100%;object-fit:cover;">`
      : `<div style="font-size:64px;display:flex;align-items:center;justify-content:center;height:100%;">👤</div>`;

    const ui = document.createElement('div');
    ui.id = 'video-call-ui';
    ui.style.cssText = 'position:fixed;inset:0;background:#0D0810;z-index:9999;display:flex;flex-direction:column;';
    ui.innerHTML = `
      <!-- Vidéo distante (plein écran) -->
      <div id="remote-video-container" style="flex:1;position:relative;background:#1a1025;">
        <video id="remote-video" autoplay playsinline style="width:100%;height:100%;object-fit:cover;display:none;"></video>
        <div id="remote-avatar" style="width:100%;height:100%;overflow:hidden;">${avatar}</div>
        <!-- Infos appelant -->
        <div style="position:absolute;top:0;left:0;right:0;padding:48px 24px 16px;background:linear-gradient(to bottom,rgba(0,0,0,0.7),transparent);">
          <div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:white;">${match?.first_name || 'Appel'}</div>
          <div id="call-status" style="font-size:14px;color:rgba(255,255,255,0.7);margin-top:4px;">${calling ? 'Appel en cours...' : 'Appel entrant...'}</div>
        </div>
      </div>

      <!-- Vidéo locale (petite) -->
      <video id="local-video" autoplay muted playsinline style="position:absolute;bottom:140px;right:16px;width:100px;height:140px;object-fit:cover;border-radius:12px;border:2px solid rgba(255,255,255,0.3);z-index:10000;display:none;"></video>

      <!-- Boutons de contrôle -->
      <div id="call-controls" style="padding:24px;background:rgba(0,0,0,0.8);backdrop-filter:blur(10px);">
        <div style="display:flex;justify-content:center;align-items:center;gap:20px;">
          ${calling ? `
          <button id="btn-mute" onclick="VideoCall.toggleMute()" style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:white;font-size:24px;cursor:pointer;">🎤</button>
          <button onclick="VideoCall.endCall()" style="width:70px;height:70px;border-radius:50%;background:#EF4444;border:none;color:white;font-size:28px;cursor:pointer;">📵</button>
          <button id="btn-cam" onclick="VideoCall.toggleCamera()" style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:white;font-size:24px;cursor:pointer;">📷</button>
          ` : `
          <button onclick="VideoCall.rejectCall()" style="width:70px;height:70px;border-radius:50%;background:#EF4444;border:none;color:white;font-size:28px;cursor:pointer;">📵</button>
          <button onclick="VideoCall.acceptCall()" style="width:70px;height:70px;border-radius:50%;background:#22C55E;border:none;color:white;font-size:28px;cursor:pointer;">📞</button>
          `}
        </div>
      </div>
    `;
    document.body.appendChild(ui);
  }

  async function startCall(match, convId) {
    const user = AuthService.getUser();
    if (!user?.is_premium) {
      Toast.info('Appels vidéo HD — fonctionnalité Premium ⭐');
      App.navigate('pricing');
      return;
    }
    currentMatch = match;
    currentConvId = convId;
    isCaller = true;
    isCallActive = true;

    showCallUI(match, true);

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const localVideo = document.getElementById('local-video');
      if (localVideo) { localVideo.srcObject = localStream; localVideo.style.display = 'block'; }

      peerConnection = new RTCPeerConnection(ICE_SERVERS);
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

      peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        const remoteVideo = document.getElementById('remote-video');
        const remoteAvatar = document.getElementById('remote-avatar');
        if (remoteVideo) { remoteVideo.srcObject = remoteStream; remoteVideo.style.display = 'block'; }
        if (remoteAvatar) remoteAvatar.style.display = 'none';
        const status = document.getElementById('call-status');
        if (status) status.textContent = 'Connecté ✓';
      };

      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          await API.post(`/call/${convId}/signal`, {
            type: 'ice-candidate', data: event.candidate, to: match.userId
          }).catch(() => {});
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await API.post(`/call/${convId}/signal`, { type: 'offer', data: offer, to: match.userId });

      startSignalPolling(convId, match.userId);
    } catch(err) {
      console.error('Erreur appel:', err);
      Toast.error('Impossible d\'accéder à la caméra/micro');
      endCall();
    }
  }

  async function acceptCall() {
    isCallActive = true;
    const status = document.getElementById('call-status');
    if (status) status.textContent = 'Connexion...';

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const localVideo = document.getElementById('local-video');
      if (localVideo) { localVideo.srcObject = localStream; localVideo.style.display = 'block'; }

      peerConnection = new RTCPeerConnection(ICE_SERVERS);
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

      peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        const remoteVideo = document.getElementById('remote-video');
        const remoteAvatar = document.getElementById('remote-avatar');
        if (remoteVideo) { remoteVideo.srcObject = remoteStream; remoteVideo.style.display = 'block'; }
        if (remoteAvatar) remoteAvatar.style.display = 'none';
        const status = document.getElementById('call-status');
        if (status) status.textContent = 'Connecté ✓';
      };

      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          await API.post(`/call/${currentConvId}/signal`, {
            type: 'ice-candidate', data: event.candidate, to: currentMatch.userId
          }).catch(() => {});
        }
      };

      if (peerConnection._pendingOffer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(peerConnection._pendingOffer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await API.post(`/call/${currentConvId}/signal`, {
          type: 'answer', data: answer, to: currentMatch.userId
        });
      }

      startSignalPolling(currentConvId, currentMatch.userId);
    } catch(err) {
      Toast.error('Impossible d\'accéder à la caméra/micro');
      endCall();
    }
  }

  function rejectCall() {
    API.post(`/call/${currentConvId}/signal`, {
      type: 'reject', data: {}, to: currentMatch?.userId
    }).catch(() => {});
    endCall();
  }

  function endCall() {
    isCallActive = false;
    stopSignalPolling();
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    if (peerConnection) { peerConnection.close(); peerConnection = null; }
    const ui = getCallUI();
    if (ui) ui.remove();
    currentConvId = null;
    currentMatch = null;
  }

  function startSignalPolling(convId, toUserId) {
    stopSignalPolling();
    pollingInterval = setInterval(async () => {
      if (!isCallActive) return stopSignalPolling();
      try {
        const res = await API.get(`/call/${convId}/signal`);
        const signals = res?.data || [];
        for (const signal of signals) {
          await handleSignal(signal);
        }
      } catch(e) {}
    }, 1000);
  }

  function stopSignalPolling() {
    if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
  }

  async function handleSignal(signal) {
    if (!peerConnection && signal.type !== 'offer') return;

    if (signal.type === 'offer') {
      // Appel entrant
      currentMatch = { ...currentMatch, userId: signal.from };
      showCallUI(currentMatch, false);
      if (!peerConnection) {
        peerConnection = new RTCPeerConnection(ICE_SERVERS);
        peerConnection._pendingOffer = signal.data;
      }
    } else if (signal.type === 'answer' && peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
    } else if (signal.type === 'ice-candidate' && peerConnection) {
      try { await peerConnection.addIceCandidate(new RTCIceCandidate(signal.data)); } catch(e) {}
    } else if (signal.type === 'reject') {
      Toast.info('Appel refusé');
      endCall();
    } else if (signal.type === 'end') {
      Toast.info('Appel terminé');
      endCall();
    }
  }

  function toggleMute() {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const btn = document.getElementById('btn-mute');
      if (btn) btn.textContent = audioTrack.enabled ? '🎤' : '🔇';
    }
  }

  function toggleCamera() {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const btn = document.getElementById('btn-cam');
      if (btn) btn.textContent = videoTrack.enabled ? '📷' : '📵';
    }
  }

_handleIncoming(signal, conv) {
      if (isCallActive) return;
      currentConvId = conv.conversation_id;
      currentMatch = { ...conv, userId: signal.from };
      showCallUI(currentMatch, false);
      if (!peerConnection) {
        peerConnection = new RTCPeerConnection(ICE_SERVERS);
        peerConnection._pendingOffer = signal.data;
      }
      startSignalPolling(currentConvId, signal.from);
    },
    return { startCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera, _handleIncoming };
  return { startCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera };
})();
