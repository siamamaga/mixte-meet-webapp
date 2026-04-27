// js/pages/videocall.js — Pro Final v2
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
  let ringtoneCtx = null;
  let ringtoneInterval = null;
  let isMuted = false;
  let isCamOff = false;
  let isSpeakerOn = true;
  let pendingOffer = null;
  let pendingFrom = null;

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: [
          'turn:79.143.189.106:3478',
          'turns:79.143.189.106:5349'
        ],
        username: 'mixtemeet',
        credential: 'TurnPassword2026'
      }
    ]
  };

  // ── Sonnerie
  function startRingtone(isIncoming) {
    stopRingtone();
    try {
      ringtoneCtx = new (window.AudioContext || window.webkitAudioContext)();
      var play = function() {
        if (!ringtoneCtx) return;
        var freqs = isIncoming ? [880, 880, 0, 0] : [440, 550, 440, 0];
        freqs.forEach(function(freq, i) {
          if (!freq) return;
          var osc = ringtoneCtx.createOscillator();
          var gain = ringtoneCtx.createGain();
          osc.connect(gain); gain.connect(ringtoneCtx.destination);
          osc.frequency.value = freq; osc.type = 'sine';
          var t = ringtoneCtx.currentTime + i * 0.3;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.35, t + 0.05);
          gain.gain.linearRampToValueAtTime(0, t + 0.25);
          osc.start(t); osc.stop(t + 0.3);
        });
      };
      play();
      ringtoneInterval = setInterval(play, isIncoming ? 2500 : 3500);
    } catch(e) {}
  }

  function stopRingtone() {
    if (ringtoneInterval) { clearInterval(ringtoneInterval); ringtoneInterval = null; }
    if (ringtoneCtx) { try { ringtoneCtx.close(); } catch(e) {} ringtoneCtx = null; }
  }

  // ── Timeout 30s sans réponse
  function startRingTimeout() {
    clearTimeout(ringTimeout);
    ringTimeout = setTimeout(function() {
      stopRingtone();
      if (currentConvId && currentMatch && currentMatch.userId) {
        API.post('/call/' + currentConvId + '/signal', { type: 'no-answer', data: {}, to: currentMatch.userId }).catch(function(){});
      }
      saveCallHistory('missed');
      Toast.info('Appel sans réponse');
      endCall(false);
    }, 30000);
  }

  function clearRingTimeout() { clearTimeout(ringTimeout); }

  // ── Historique appel dans le chat
  function saveCallHistory(status) {
    if (!currentConvId) return;
    var dur = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
    var icon = isAudioOnly ? '📞' : '📹';
    var label = status === 'missed'   ? (icon + ' Appel manqué') :
                status === 'rejected' ? (icon + ' Appel refusé') :
                (icon + ' Appel · ' + Math.floor(dur/60) + ':' + String(dur%60).padStart(2,'0'));
    API.post('/conversations/' + currentConvId + '/messages?t=' + Date.now(), {
      content: label, type: 'text'
    }).catch(function(){});
  }

  // ── UI
  function removeUI() {
    var ui = document.getElementById('call-ui');
    if (ui) ui.remove();
    var ra = document.getElementById('remote-audio');
    if (ra) ra.remove();
  }

  function showCallUI(match, calling, audioOnly) {
    removeUI();
    var name = (match && match.first_name) || 'Appel';
    var avatar = (match && match.main_photo)
      ? '<img src="' + match.main_photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
      : '<div style="font-size:52px;display:flex;align-items:center;justify-content:center;height:100%;">👤</div>';

    var ui = document.createElement('div');
    ui.id = 'call-ui';
    ui.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;font-family:Outfit,sans-serif;background:' +
      (audioOnly ? 'linear-gradient(160deg,#1a0d2e,#0D0810)' : '#0a0614') + ';';

    var activeControls =
      '<div style="display:flex;justify-content:space-around;align-items:flex-end;padding-bottom:8px;">' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">' +
          '<button id="btn-mute" onclick="VideoCall.toggleMute()" style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:white;font-size:22px;cursor:pointer;">🎤</button>' +
          '<span style="font-size:10px;color:rgba(255,255,255,0.5);">Micro</span>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">' +
          '<button onclick="VideoCall.endCall(true)" style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#EF4444,#B91C1C);border:none;color:white;font-size:28px;cursor:pointer;box-shadow:0 8px 32px rgba(239,68,68,0.7);">📵</button>' +
          '<span style="font-size:10px;color:#EF4444;font-weight:700;">Raccrocher</span>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">' +
          (audioOnly
            ? '<button id="btn-speaker" onclick="VideoCall.toggleSpeaker()" style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:white;font-size:22px;cursor:pointer;">🔊</button><span style="font-size:10px;color:rgba(255,255,255,0.5);">HP</span>'
            : '<button id="btn-cam" onclick="VideoCall.toggleCamera()" style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:white;font-size:22px;cursor:pointer;">📷</button><span style="font-size:10px;color:rgba(255,255,255,0.5);">Caméra</span>') +
        '</div>' +
      '</div>' +
      (!audioOnly
        ? '<div style="display:flex;justify-content:center;gap:24px;margin-top:8px;">' +
            '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">' +
              '<button onclick="VideoCall.flipCamera()" style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:white;font-size:18px;cursor:pointer;">🔄</button>' +
              '<span style="font-size:10px;color:rgba(255,255,255,0.5);">Retourner</span>' +
            '</div>' +
          '</div>'
        : '');

    var incomingControls =
      '<div style="display:flex;justify-content:space-around;align-items:center;">' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">' +
          '<button onclick="VideoCall.rejectCall()" style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,#EF4444,#B91C1C);border:none;color:white;font-size:28px;cursor:pointer;box-shadow:0 8px 32px rgba(239,68,68,0.5);">📵</button>' +
          '<span style="font-size:11px;color:#EF4444;">Refuser</span>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">' +
          '<button onclick="VideoCall.acceptCall()" style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,#22C55E,#15803D);border:none;color:white;font-size:28px;cursor:pointer;box-shadow:0 8px 32px rgba(34,197,94,0.5);">📞</button>' +
          '<span style="font-size:11px;color:#22C55E;">Répondre</span>' +
        '</div>' +
      '</div>';

    var statusText = calling
      ? (audioOnly ? '📞 Appel...' : '📹 Appel...')
      : (audioOnly ? '📞 Appel audio entrant' : '📹 Appel vidéo entrant');

    ui.innerHTML =
      '<style>' +
        '@keyframes cpulse{0%{box-shadow:0 0 0 0 rgba(232,49,122,0.5)}70%{box-shadow:0 0 0 24px rgba(232,49,122,0)}100%{box-shadow:0 0 0 0 rgba(232,49,122,0)}}' +
        '@keyframes fadein{from{opacity:0}to{opacity:1}}' +
      '</style>' +
      '<div id="call-main" style="flex:1;position:relative;overflow:hidden;">' +
        '<video id="remote-video" autoplay playsinline style="width:100%;height:100%;object-fit:cover;display:none;animation:fadein 0.5s;"></video>' +
        '<div id="call-info" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;">' +
          '<div style="width:110px;height:110px;border-radius:50%;overflow:hidden;' + (!calling ? 'animation:cpulse 1.5s infinite;' : '') + 'border:3px solid rgba(232,49,122,0.6);">' + avatar + '</div>' +
          '<div style="font-size:22px;font-weight:700;color:white;">' + name + '</div>' +
          '<div id="call-status" style="font-size:13px;color:rgba(255,255,255,0.6);">' + statusText + '</div>' +
          '<div id="call-timer" style="font-size:16px;font-weight:600;color:white;font-variant-numeric:tabular-nums;display:none;">0:00</div>' +
        '</div>' +
        '<div id="pip-container" style="position:absolute;bottom:130px;right:12px;width:88px;height:128px;border-radius:14px;overflow:hidden;border:2px solid rgba(255,255,255,0.4);box-shadow:0 4px 20px rgba(0,0,0,0.5);display:none;cursor:grab;z-index:100;">' +
          '<video id="local-video" autoplay muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>' +
        '</div>' +
      '</div>' +
      '<div style="padding:20px 16px 44px;background:rgba(0,0,0,0.8);backdrop-filter:blur(20px);">' +
        (calling ? activeControls : incomingControls) +
      '</div>';

    document.body.appendChild(ui);

    var pip = document.getElementById('pip-container');
    if (pip) {
      pip.addEventListener('touchstart', function(e) {
        var t = e.touches[0];
        var r = pip.getBoundingClientRect();
        var ox = t.clientX - r.left, oy = t.clientY - r.top;
        pip.ontouchmove = function(e2) {
          e2.preventDefault();
          var t2 = e2.touches[0];
          pip.style.left = (t2.clientX - ox) + 'px';
          pip.style.top = (t2.clientY - oy) + 'px';
          pip.style.right = 'auto'; pip.style.bottom = 'auto';
        };
      }, { passive: true });
    }
  }

  function startCallTimer() {
    callStartTime = Date.now();
    var st = document.getElementById('call-status');
    var ti = document.getElementById('call-timer');
    if (st) st.style.display = 'none';
    if (ti) ti.style.display = 'block';
    callTimerInterval = setInterval(function() {
      var e = Math.floor((Date.now() - callStartTime) / 1000);
      var el = document.getElementById('call-timer');
      if (el) el.textContent = Math.floor(e/60) + ':' + String(e%60).padStart(2,'0');
    }, 1000);
  }

  function stopCallTimer() { clearInterval(callTimerInterval); callTimerInterval = null; }

  function onRemoteTrack(event) {
    remoteStream = event.streams[0];
    stopRingtone();
    clearRingTimeout();
    if (isAudioOnly) {
      var ra = document.getElementById('remote-audio');
      if (!ra) { ra = document.createElement('audio'); ra.id = 'remote-audio'; document.body.appendChild(ra); }
      ra.autoplay = true; ra.srcObject = remoteStream;
    } else {
      var rv = document.getElementById('remote-video');
      var ci = document.getElementById('call-info');
      if (rv) { rv.srcObject = remoteStream; rv.style.display = 'block'; }
      if (ci) ci.style.display = 'none';
    }
    startCallTimer();
  }

  function createPC() {
    if (peerConnection) { try { peerConnection.close(); } catch(e) {} }
    peerConnection = new RTCPeerConnection(ICE_SERVERS);
    if (localStream) localStream.getTracks().forEach(function(t) { peerConnection.addTrack(t, localStream); });
    peerConnection.ontrack = onRemoteTrack;
    peerConnection.onicecandidate = function(e) {
      if (e.candidate && currentConvId && currentMatch && currentMatch.userId) {
        API.post('/call/' + currentConvId + '/signal', {
          type: 'ice-candidate', data: e.candidate, to: currentMatch.userId
        }).catch(function(){});
      }
    };
    peerConnection.onconnectionstatechange = function() {
      var s = peerConnection ? peerConnection.connectionState : '';
      if (s === 'connected') {
        var st = document.getElementById('call-status');
        if (st) st.textContent = '📞 Appel en cours';
      }
      if (s === 'disconnected' || s === 'failed') {
        saveCallHistory('ended');
        endCall(false);
      }
    };
    return peerConnection;
  }

  // ── Appel audio sortant
  async function startAudioCall(match, convId) {
    var user = AuthService.getUser();
    if (!user || !user.is_premium) { Toast.info('Appels audio — Premium ⭐'); App.navigate('pricing'); return; }
    currentMatch = match; currentConvId = convId; isAudioOnly = true; isCallActive = true;
    showCallUI(match, true, true);
    startRingtone(false);
    startRingTimeout();
    try {
      // Demander permission micro explicitement
      var stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch(permErr) {
        Toast.error('Autorisez l\'accès au microphone dans votre navigateur');
        endCall(false);
        return;
      }
      localStream = stream;
      createPC();
      var offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await API.post('/call/' + convId + '/signal', { type: 'offer', data: offer, to: match.userId, audioOnly: true });
      startSignalPolling();
    } catch(err) {
      console.error('Audio call error:', err);
      Toast.error('Impossible d\'accéder au micro');
      endCall(false);
    }
  }

  // ── Appel vidéo sortant
  async function startCall(match, convId) {
    var user = AuthService.getUser();
    if (!user || !user.is_premium) { Toast.info('Appels vidéo — Premium ⭐'); App.navigate('pricing'); return; }
    currentMatch = match; currentConvId = convId; isAudioOnly = false; isCallActive = true;
    showCallUI(match, true, false);
    startRingtone(false);
    startRingTimeout();
try {
      var stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      } catch(permErr) {
        // Fallback audio seulement
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          isAudioOnly = true;
          showCallUI(match, true, true);
        } catch(e) {
          Toast.error('Autorisez l\'accès au microphone dans votre navigateur');
          endCall(false);
          return;
        }
      }
      localStream = stream;
      var lv = document.getElementById('local-video');
      var pip = document.getElementById('pip-container');
      if (lv) lv.srcObject = localStream;
      if (pip) pip.style.display = 'block';
      createPC();
      var offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await API.post('/call/' + convId + '/signal', { type: 'offer', data: offer, to: match.userId, audioOnly: false });
      startSignalPolling();
    } catch(err) {
      console.error('Video call error:', err);
      Toast.error('Impossible d\'accéder à la caméra');
      endCall(false);
    }
  }

  // ── Accepter appel entrant
  async function acceptCall() {
    clearRingTimeout();
    stopRingtone();
    isCallActive = true;
    var st = document.getElementById('call-status');
    if (st) st.textContent = 'Connexion...';

    try {
      // Essayer avec caméra, fallback audio si échec
      var gotStream = false;
      if (!isAudioOnly) {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
          gotStream = true;
        } catch(e) {
          console.warn('Caméra indisponible, fallback audio:', e.message);
          isAudioOnly = true;
        }
      }
      if (!gotStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }

      createPC();

      if (pendingOffer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(pendingOffer));
        var answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await API.post('/call/' + currentConvId + '/signal', { type: 'answer', data: answer, to: currentMatch.userId });
      }

      // Reconstruire UI en mode actif
      showCallUI(currentMatch, true, isAudioOnly);
      if (!isAudioOnly) {
        var lv = document.getElementById('local-video');
        var pip = document.getElementById('pip-container');
        if (lv) lv.srcObject = localStream;
        if (pip) pip.style.display = 'block';
      }

      // Si piste distante déjà arrivée
      if (remoteStream) {
        if (isAudioOnly) {
          var ra = document.getElementById('remote-audio');
          if (!ra) { ra = document.createElement('audio'); ra.id = 'remote-audio'; document.body.appendChild(ra); }
          ra.autoplay = true; ra.srcObject = remoteStream;
        } else {
          var rv = document.getElementById('remote-video');
          if (rv) { rv.srcObject = remoteStream; rv.style.display = 'block'; }
        }
        startCallTimer();
      }

      startSignalPolling();
    } catch(err) {
      console.error('Accept call error:', err);
      Toast.error('Impossible d\'accéder au micro/caméra');
      endCall(false);
    }
  }

  function rejectCall() {
    stopRingtone();
    clearRingTimeout();
    if (currentConvId && currentMatch && currentMatch.userId) {
      API.post('/call/' + currentConvId + '/signal', { type: 'reject', data: {}, to: currentMatch.userId }).catch(function(){});
    }
    saveCallHistory('rejected');
    endCall(false);
  }

  function endCall(sendSignal) {
    if (sendSignal !== false && isCallActive && currentConvId && currentMatch && currentMatch.userId) {
      API.post('/call/' + currentConvId + '/signal', { type: 'end', data: {}, to: currentMatch.userId }).catch(function(){});
      saveCallHistory('ended');
    }
    isCallActive = false;
    stopRingtone();
    clearRingTimeout();
    stopSignalPolling();
    stopCallTimer();
    isMuted = false; isCamOff = false; isSpeakerOn = true;
    pendingOffer = null; pendingFrom = null;
    if (localStream) { localStream.getTracks().forEach(function(t) { t.stop(); }); localStream = null; }
    if (peerConnection) { try { peerConnection.close(); } catch(e) {} peerConnection = null; }
    removeUI();
    currentConvId = null;
    currentMatch = null;
  }

  // ── Polling signaux pendant appel
  function startSignalPolling() {
    stopSignalPolling();
    var convId = currentConvId;
    pollingInterval = setInterval(async function() {
      if (!isCallActive || !convId) return stopSignalPolling();
      try {
        var res = await API.get('/call/' + convId + '/signal');
        var sigs = (res && res.data) ? res.data : [];
        for (var i = 0; i < sigs.length; i++) { await handleSignal(sigs[i]); }
      } catch(e) {}
    }, 800);
  }

  function stopSignalPolling() {
    if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
  }

  async function handleSignal(signal) {
    if (signal.type === 'answer' && peerConnection) {
      if (peerConnection.signalingState === 'have-local-offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
      }
    } else if (signal.type === 'ice-candidate' && peerConnection) {
      try {
        if (peerConnection.remoteDescription) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.data));
        }
      } catch(e) {}
    } else if (signal.type === 'reject') {
      stopRingtone(); clearRingTimeout();
      Toast.info((currentMatch ? currentMatch.first_name : '') + ' a refusé l\'appel');
      endCall(false);
    } else if (signal.type === 'no-answer') {
      Toast.info('Appel sans réponse');
      endCall(false);
    } else if (signal.type === 'end') {
      var dur = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
      Toast.info('Appel terminé · ' + Math.floor(dur/60) + ':' + String(dur%60).padStart(2,'0'));
      endCall(false);
    }
  }

  // ── Appel entrant via polling global
  function _handleIncoming(signal, conv) {
    if (isCallActive) return;
    currentConvId = conv.conversation_id;
    isAudioOnly = signal.audioOnly || false;
    currentMatch = Object.assign({}, conv, { userId: signal.from });
    pendingOffer = signal.data;
    pendingFrom = signal.from;
    showCallUI(currentMatch, false, isAudioOnly);
    startRingtone(true);
    startRingTimeout();
    startSignalPolling();
  }

  // ── Contrôles
  function toggleMute() {
    if (!localStream) return;
    var track = localStream.getAudioTracks()[0];
    if (!track) return;
    isMuted = !isMuted;
    track.enabled = !isMuted;
    var btn = document.getElementById('btn-mute');
    if (btn) { btn.textContent = isMuted ? '🔇' : '🎤'; btn.style.background = isMuted ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.15)'; }
  }

  function toggleCamera() {
    if (!localStream) return;
    var track = localStream.getVideoTracks()[0];
    if (!track) return;
    isCamOff = !isCamOff;
    track.enabled = !isCamOff;
    var btn = document.getElementById('btn-cam');
    if (btn) { btn.textContent = isCamOff ? '🚫' : '📷'; btn.style.background = isCamOff ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.15)'; }
  }

  async function flipCamera() {
    if (!localStream || isAudioOnly) return;
    var track = localStream.getVideoTracks()[0];
    if (!track) return;
    var settings = track.getSettings();
    var newFacing = settings.facingMode === 'user' ? 'environment' : 'user';
    try {
      var newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacing }, audio: false });
      var newTrack = newStream.getVideoTracks()[0];
      var sender = peerConnection && peerConnection.getSenders().find(function(s) { return s.track && s.track.kind === 'video'; });
      if (sender) await sender.replaceTrack(newTrack);
      track.stop();
      var lv = document.getElementById('local-video');
      if (lv) lv.srcObject = new MediaStream([newTrack].concat(localStream.getAudioTracks()));
    } catch(e) { Toast.info('Impossible de retourner la caméra'); }
  }

  function toggleSpeaker() {
    isSpeakerOn = !isSpeakerOn;
    var ra = document.getElementById('remote-audio');
    if (ra) ra.muted = !isSpeakerOn;
    var btn = document.getElementById('btn-speaker');
    if (btn) { btn.textContent = isSpeakerOn ? '🔊' : '🔈'; btn.style.background = isSpeakerOn ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.3)'; }
  }

  return { startCall, startAudioCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera, flipCamera, toggleSpeaker, _handleIncoming };
})();








