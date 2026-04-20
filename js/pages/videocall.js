// js/pages/videocall.js — Pro Level avec sonnerie + timeout
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
  let ringTimeout = null;
  let ringtoneAudio = null;
  let isDragging = false;
  let dragOffX = 0, dragOffY = 0;

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  // ── Sonnerie via Web Audio API
  function startRingtone(isIncoming) {
    stopRingtone();
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var play = function() {
        if (!ringtoneAudio) return;
        // Mélodie simple style téléphone
        var notes = isIncoming ? [880, 0, 880, 0, 880, 0] : [440, 550, 440, 550];
        var time = ctx.currentTime;
        notes.forEach(function(freq, i) {
          if (freq === 0) return;
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0, time + i * 0.3);
          gain.gain.linearRampToValueAtTime(0.3, time + i * 0.3 + 0.05);
          gain.gain.linearRampToValueAtTime(0, time + i * 0.3 + 0.25);
          osc.start(time + i * 0.3);
          osc.stop(time + i * 0.3 + 0.3);
        });
      };
      ringtoneAudio = { ctx: ctx, interval: setInterval(play, isIncoming ? 2000 : 3000) };
      play();
    } catch(e) {}
  }

  function stopRingtone() {
    if (ringtoneAudio) {
      clearInterval(ringtoneAudio.interval);
      try { ringtoneAudio.ctx.close(); } catch(e) {}
      ringtoneAudio = null;
    }
  }

  // ── Timeout sonnerie (30s sans réponse → raccrocher)
  function startRingTimeout() {
    clearTimeout(ringTimeout);
    ringTimeout = setTimeout(function() {
      stopRingtone();
      Toast.info('Appel sans réponse');
      // Envoyer signal "no-answer"
      if (currentConvId && currentMatch) {
        API.post('/call/' + currentConvId + '/signal', {
          type: 'no-answer', data: {}, to: currentMatch.userId
        }).catch(function() {});
      }
      endCall();
    }, 30000);
  }

  function clearRingTimeout() {
    clearTimeout(ringTimeout);
  }

  // ── UI
  function removeUI() {
    var ui = document.getElementById('call-ui');
    if (ui) ui.remove();
  }

  function showCallUI(match, calling, audioOnly) {
    removeUI();
    var avatar = (match && match.main_photo)
      ? '<img src="' + match.main_photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
      : '<div style="font-size:56px;display:flex;align-items:center;justify-content:center;height:100%;">👤</div>';

    var ui = document.createElement('div');
    ui.id = 'call-ui';
    ui.style.cssText = 'position:fixed;inset:0;z-index:9999;background:' +
      (audioOnly ? 'linear-gradient(160deg,#1a0d2e 0%,#0D0810 100%)' : '#0a0614') +
      ';display:flex;flex-direction:column;font-family:Outfit,sans-serif;';

    var controlsHTML = calling
      ? '<div style="display:flex;justify-content:space-around;align-items:center;">' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">' +
            '<button id="btn-mute" onclick="VideoCall.toggleMute()" style="width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:white;font-size:22px;cursor:pointer;">🎤</button>' +
            '<span style="font-size:11px;color:rgba(255,255,255,0.5);">Micro</span>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">' +
            '<button onclick="VideoCall.endCall()" style="width:74px;height:74px;border-radius:50%;background:linear-gradient(135deg,#EF4444,#DC2626);border:none;color:white;font-size:30px;cursor:pointer;box-shadow:0 8px 32px rgba(239,68,68,0.6);">📵</button>' +
            '<span style="font-size:11px;color:#EF4444;font-weight:700;">Raccrocher</span>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">' +
            (audioOnly
              ? '<button id="btn-speaker" onclick="VideoCall.toggleSpeaker()" style="width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:white;font-size:22px;cursor:pointer;">🔊</button><span style="font-size:11px;color:rgba(255,255,255,0.5);">HP</span>'
              : '<button id="btn-cam" onclick="VideoCall.toggleCamera()" style="width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:white;font-size:22px;cursor:pointer;">📷</button><span style="font-size:11px;color:rgba(255,255,255,0.5);">Caméra</span>') +
          '</div>' +
        '</div>'
      : '<div style="display:flex;justify-content:space-around;align-items:center;">' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">' +
            '<button onclick="VideoCall.rejectCall()" style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,#EF4444,#DC2626);border:none;color:white;font-size:28px;cursor:pointer;box-shadow:0 8px 32px rgba(239,68,68,0.5);">📵</button>' +
            '<span style="font-size:11px;color:#EF4444;">Refuser</span>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">' +
            '<button onclick="VideoCall.acceptCall()" style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,#22C55E,#16A34A);border:none;color:white;font-size:28px;cursor:pointer;box-shadow:0 8px 32px rgba(34,197,94,0.5);">📞</button>' +
            '<span style="font-size:11px;color:#22C55E;">Répondre</span>' +
          '</div>' +
        '</div>';

    ui.innerHTML =
      '<style>' +
        '@keyframes callPulse{0%{box-shadow:0 0 0 0 rgba(232,49,122,0.5)}70%{box-shadow:0 0 0 24px rgba(232,49,122,0)}100%{box-shadow:0 0 0 0 rgba(232,49,122,0)}}' +
        '@keyframes fadeIn{from{opacity:0}to{opacity:1}}' +
        '.call-pip{position:absolute;bottom:130px;right:16px;width:90px;height:130px;border-radius:14px;overflow:hidden;border:2px solid rgba(255,255,255,0.4);box-shadow:0 8px 24px rgba(0,0,0,0.5);cursor:grab;z-index:10001;display:none;}' +
      '</style>' +
      '<div id="call-main" style="flex:1;position:relative;overflow:hidden;background:' + (audioOnly ? 'transparent' : '#0a0614') + ';">' +
        '<video id="remote-video" autoplay playsinline style="width:100%;height:100%;object-fit:cover;display:none;animation:fadeIn 0.5s;"></video>' +
        '<div id="remote-avatar" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;">' +
          '<div style="width:120px;height:120px;border-radius:50%;overflow:hidden;' + (calling ? '' : 'animation:callPulse 1.5s infinite;') + 'border:3px solid rgba(232,49,122,0.6);">' + avatar + '</div>' +
          '<div style="font-size:24px;font-weight:700;color:white;">' + ((match && match.first_name) || 'Appel') + '</div>' +
          '<div id="call-status" style="font-size:14px;color:rgba(255,255,255,0.6);">' +
            (calling ? (audioOnly ? '📞 Appel audio en cours...' : '📹 Appel vidéo en cours...') : (audioOnly ? '📞 Appel audio entrant...' : '📹 Appel vidéo entrant...')) +
          '</div>' +
          '<div id="call-timer" style="font-size:13px;color:rgba(255,255,255,0.4);display:none;font-variant-numeric:tabular-nums;">0:00</div>' +
        '</div>' +
        '<div class="call-pip" id="local-video-pip"><video id="local-video" autoplay muted playsinline style="width:100%;height:100%;object-fit:cover;"></video></div>' +
      '</div>' +
      '<div style="padding:24px 16px 44px;background:rgba(0,0,0,0.85);backdrop-filter:blur(20px);">' + controlsHTML + '</div>';

    document.body.appendChild(ui);

    // PiP draggable
    var pip = document.getElementById('local-video-pip');
    if (pip) {
      pip.addEventListener('touchstart', function(e) {
        var t = e.touches[0];
        var r = pip.getBoundingClientRect();
        dragOffX = t.clientX - r.left;
        dragOffY = t.clientY - r.top;
        pip.ontouchmove = function(e2) {
          var t2 = e2.touches[0];
          pip.style.left = (t2.clientX - dragOffX) + 'px';
          pip.style.top = (t2.clientY - dragOffY) + 'px';
          pip.style.right = 'auto'; pip.style.bottom = 'auto';
        };
      }, { passive: true });
    }
  }

  function startCallTimer() {
    callStartTime = Date.now();
    var timerEl = document.getElementById('call-timer');
    if (timerEl) timerEl.style.display = 'block';
    callTimerInterval = setInterval(function() {
      var elapsed = Math.floor((Date.now() - callStartTime) / 1000);
      var el = document.getElementById('call-timer');
      if (el) el.textContent = Math.floor(elapsed / 60) + ':' + String(elapsed % 60).padStart(2, '0');
    }, 1000);
  }

  function stopCallTimer() {
    clearInterval(callTimerInterval);
    callTimerInterval = null;
  }

  function onRemoteTrack(event) {
    remoteStream = event.streams[0];
    stopRingtone();
    clearRingTimeout();
    if (isAudioOnly) {
      var audio = document.createElement('audio');
      audio.id = 'remote-audio';
      audio.autoplay = true;
      audio.srcObject = remoteStream;
      document.body.appendChild(audio);
    } else {
      var rv = document.getElementById('remote-video');
      var ra = document.getElementById('remote-avatar');
      if (rv) { rv.srcObject = remoteStream; rv.style.display = 'block'; }
      if (ra) ra.style.display = 'none';
    }
    var st = document.getElementById('call-status');
    if (st) st.style.display = 'none';
    startCallTimer();
  }

  function createPC(convId, toUserId) {
    if (peerConnection) { try { peerConnection.close(); } catch(e) {} }
    peerConnection = new RTCPeerConnection(ICE_SERVERS);
    if (localStream) localStream.getTracks().forEach(function(t) { peerConnection.addTrack(t, localStream); });
    peerConnection.ontrack = onRemoteTrack;
    peerConnection.onicecandidate = function(e) {
      if (e.candidate) {
        API.post('/call/' + convId + '/signal', { type: 'ice-candidate', data: e.candidate, to: toUserId }).catch(function() {});
      }
    };
    peerConnection.onconnectionstatechange = function() {
      var state = peerConnection.connectionState;
      if (state === 'disconnected' || state === 'failed') {
        var dur = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
        Toast.info('Appel terminé · ' + Math.floor(dur / 60) + ':' + String(dur % 60).padStart(2, '0'));
        endCall();
      }
    };
    return peerConnection;
  }

  // ── Appel vidéo
  async function startCall(match, convId) {
    var user = AuthService.getUser();
    if (!user || !user.is_premium) { Toast.info('Appels vidéo — Premium ⭐'); App.navigate('pricing'); return; }
    currentMatch = match; currentConvId = convId; isAudioOnly = false; isCallActive = true;
    showCallUI(match, true, false);
    startRingtone(false);
    startRingTimeout();
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      var lv = document.getElementById('local-video');
      var pip = document.getElementById('local-video-pip');
      if (lv) lv.srcObject = localStream;
      if (pip) pip.style.display = 'block';
      createPC(convId, match.userId);
      var offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await API.post('/call/' + convId + '/signal', { type: 'offer', data: offer, to: match.userId });
      startSignalPolling(convId, match.userId);
    } catch(err) { Toast.error('Impossible d\'accéder à la caméra'); endCall(); }
  }

  // ── Appel audio
  async function startAudioCall(match, convId) {
    var user = AuthService.getUser();
    if (!user || !user.is_premium) { Toast.info('Appels audio — Premium ⭐'); App.navigate('pricing'); return; }
    currentMatch = match; currentConvId = convId; isAudioOnly = true; isCallActive = true;
    showCallUI(match, true, true);
    startRingtone(false);
    startRingTimeout();
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      createPC(convId, match.userId);
      var offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await API.post('/call/' + convId + '/signal', { type: 'offer', data: offer, to: match.userId, audioOnly: true });
      startSignalPolling(convId, match.userId);
    } catch(err) { Toast.error('Impossible d\'accéder au micro'); endCall(); }
  }

  // ── Accepter appel
  async function acceptCall() {
    clearRingTimeout();
    stopRingtone();
    isCallActive = true;
    var st = document.getElementById('call-status');
    if (st) st.textContent = 'Connexion...';
    try {
      var constraints = isAudioOnly ? { audio: true, video: false } : { video: { facingMode: 'user' }, audio: true };
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!isAudioOnly) {
        var lv = document.getElementById('local-video');
        var pip = document.getElementById('local-video-pip');
        if (lv) lv.srcObject = localStream;
        if (pip) pip.style.display = 'block';
      }
      createPC(currentConvId, currentMatch.userId);
      if (peerConnection._pendingOffer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(peerConnection._pendingOffer));
        var answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await API.post('/call/' + currentConvId + '/signal', { type: 'answer', data: answer, to: currentMatch.userId });
      }
      // Reconstruire UI mode actif
      showCallUI(currentMatch, true, isAudioOnly);
      if (!isAudioOnly) {
        var lv2 = document.getElementById('local-video');
        var pip2 = document.getElementById('local-video-pip');
        if (lv2) lv2.srcObject = localStream;
        if (pip2) pip2.style.display = 'block';
      }
      startSignalPolling(currentConvId, currentMatch.userId);
    } catch(err) { Toast.error('Impossible d\'accéder à la caméra/micro'); endCall(); }
  }

  function rejectCall() {
    stopRingtone();
    clearRingTimeout();
    if (currentConvId && currentMatch) {
      API.post('/call/' + currentConvId + '/signal', { type: 'reject', data: {}, to: currentMatch.userId }).catch(function() {});
    }
    endCall();
  }

  function endCall() {
    if (isCallActive && currentConvId && currentMatch) {
      API.post('/call/' + currentConvId + '/signal', { type: 'end', data: {}, to: currentMatch.userId }).catch(function() {});
    }
    isCallActive = false;
    stopRingtone();
    clearRingTimeout();
    stopSignalPolling();
    stopCallTimer();
    if (localStream) { localStream.getTracks().forEach(function(t) { t.stop(); }); localStream = null; }
    if (peerConnection) { try { peerConnection.close(); } catch(e) {} peerConnection = null; }
    var remAudio = document.getElementById('remote-audio');
    if (remAudio) remAudio.remove();
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
        var res = await API.get('/call/' + convId + '/signal');
        var sigs = (res && res.data) ? res.data : [];
        for (var i = 0; i < sigs.length; i++) { await handleSignal(sigs[i]); }
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
      stopRingtone();
      clearRingTimeout();
      Toast.info((currentMatch ? currentMatch.first_name : '') + ' a refusé l\'appel');
      endCall();
    } else if (signal.type === 'no-answer') {
      Toast.info('Appel sans réponse');
      endCall();
    } else if (signal.type === 'end') {
      var dur = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
      Toast.info('Appel terminé · ' + Math.floor(dur / 60) + ':' + String(dur % 60).padStart(2, '0'));
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
    startRingtone(true);
    startRingTimeout();
    startSignalPolling(currentConvId, signal.from);
  }

  function toggleMute() {
    if (!localStream) return;
    var track = localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      var btn = document.getElementById('btn-mute');
      if (btn) { btn.textContent = track.enabled ? '🎤' : '🔇'; btn.style.background = track.enabled ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.3)'; }
    }
  }

  function toggleCamera() {
    if (!localStream) return;
    var track = localStream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      var btn = document.getElementById('btn-cam');
      if (btn) { btn.textContent = track.enabled ? '📷' : '🚫'; btn.style.background = track.enabled ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.3)'; }
    }
  }

  function toggleSpeaker() {
    Toast.info('Haut-parleur — bientôt disponible');
  }

  return { startCall, startAudioCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera, toggleSpeaker, _handleIncoming };
})();