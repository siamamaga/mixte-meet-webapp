// js/pages/voicemessage.js — Pro Level
const VoiceMessage = (() => {
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  let isPreviewing = false;
  let recordingTimer = null;
  let seconds = 0;
  let audioContext = null;
  let analyser = null;
  let animFrame = null;
  let recordedBlob = null;
  let previewAudio = null;
  let currentConvId = null;
  let currentMatch = null;
  let waveformData = [];

  const CLOUD_NAME = 'dt6ukj8yj';
  const UPLOAD_PRESET = 'mixte_meet_voices';

  function showRecorderUI() {
    removeUI();
    const ui = document.createElement('div');
    ui.id = 'voice-recorder-ui';
    ui.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:8000;background:linear-gradient(to top,#1a0d2e,#0D0810);border-top:1px solid rgba(232,49,122,0.3);border-radius:20px 20px 0 0;padding:20px 24px 36px;';
    ui.innerHTML = '<style>@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}.vm-btn{border:none;cursor:pointer;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all 0.2s;font-size:20px}.vm-btn:active{transform:scale(0.9)}</style>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><span style="font-size:13px;color:rgba(255,255,255,0.5);">Message vocal</span><button onclick="VoiceMessage.cancel()" style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:22px;cursor:pointer;">✕</button></div>' +
      '<div style="text-align:center;margin-bottom:12px;"><span id="vm-timer" style="font-size:28px;font-weight:700;color:white;">0:00</span><span id="vm-rec-dot" style="display:inline-block;width:8px;height:8px;background:#E8317A;border-radius:50%;margin-left:8px;animation:pulse 1s infinite;"></span></div>' +
      '<div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:8px;margin-bottom:20px;"><canvas id="vm-waveform" width="340" height="60" style="width:100%;height:60px;display:block;"></canvas></div>' +
      '<div id="vm-controls-record" style="display:flex;justify-content:space-around;align-items:center;">' +
        '<button class="vm-btn" onclick="VoiceMessage.cancel()" style="width:52px;height:52px;background:rgba(239,68,68,0.2);color:#EF4444;">🗑️</button>' +
        '<button class="vm-btn" onclick="VoiceMessage.stopRecording()" style="width:68px;height:68px;background:linear-gradient(135deg,#E8317A,#C41F65);color:white;box-shadow:0 8px 24px rgba(232,49,122,0.4);">⏹️</button>' +
        '<div style="width:52px;height:52px;"></div>' +
      '</div>' +
      '<div id="vm-controls-preview" style="display:none;flex-direction:column;gap:12px;">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<button id="vm-play-btn" class="vm-btn" onclick="VoiceMessage.togglePlay()" style="width:52px;height:52px;background:rgba(255,255,255,0.1);color:white;flex-shrink:0;">▶️</button>' +
          '<div style="flex:1;position:relative;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;cursor:pointer;" onclick="VoiceMessage.seekTo(event)">' +
            '<div id="vm-progress" style="height:100%;width:0%;background:#E8317A;border-radius:2px;"></div>' +
            '<div id="vm-thumb" style="position:absolute;top:-6px;left:0%;width:16px;height:16px;background:white;border-radius:50%;transform:translateX(-50%);"></div>' +
          '</div>' +
          '<span id="vm-duration" style="font-size:12px;color:rgba(255,255,255,0.5);flex-shrink:0;">0:00</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<button class="vm-btn" onclick="VoiceMessage.startRecording()" style="width:52px;height:52px;background:rgba(255,255,255,0.1);color:white;font-size:16px;">🔄</button>' +
          '<button class="vm-btn" onclick="VoiceMessage.cancel()" style="width:52px;height:52px;background:rgba(239,68,68,0.15);color:#EF4444;">🗑️</button>' +
          '<button id="vm-send-btn" class="vm-btn" onclick="VoiceMessage.send()" style="width:68px;height:68px;background:linear-gradient(135deg,#22C55E,#16A34A);color:white;font-size:24px;box-shadow:0 8px 24px rgba(34,197,94,0.4);">➤</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ui);
  }

  function removeUI() {
    var ui = document.getElementById('voice-recorder-ui');
    if (ui) ui.remove();
  }

  function drawWaveform(data, progress) {
    progress = progress || 0;
    var canvas = document.getElementById('vm-waveform');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    var bars = Math.min(data.length, 60);
    var barW = (W / bars) * 0.6;
    var gap = (W / bars) * 0.4;
    for (var i = 0; i < bars; i++) {
      var val = data[i] || 0;
      var barH = Math.max(4, val * H * 0.85);
      var x = i * (barW + gap);
      var y = (H - barH) / 2;
      var isPast = i / bars < progress;
      ctx.fillStyle = isPast ? '#E8317A' : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, barW, barH, 2);
      else ctx.rect(x, y, barW, barH);
      ctx.fill();
    }
  }

  function startWaveformAnimation(stream) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      var src = audioContext.createMediaStreamSource(stream);
      src.connect(analyser);
    } catch(e) { return; }
    waveformData = [];
    function animate() {
      if (!isRecording) return;
      var data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      var sum = 0;
      for (var i = 0; i < 20; i++) sum += data[i];
      var avg = sum / 20 / 255;
      waveformData.push(avg);
      if (waveformData.length > 60) waveformData.shift();
      drawWaveform(waveformData);
      animFrame = requestAnimationFrame(animate);
    }
    animate();
  }

  function startTimer() {
    seconds = 0;
    recordingTimer = setInterval(function() {
      seconds++;
      var el = document.getElementById('vm-timer');
      if (el) el.textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
      if (seconds >= 120) stopRecording();
    }, 1000);
  }

  function stopTimer() {
    clearInterval(recordingTimer);
  }

  async function startRecording() {
    if (isRecording) return;
    isPreviewing = false;
    if (previewAudio) { previewAudio.pause(); previewAudio = null; }
    recordedBlob = null;
    audioChunks = [];
    showRecorderUI();
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      var opts = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) opts = { mimeType: 'audio/webm;codecs=opus' };
      else if (MediaRecorder.isTypeSupported('audio/webm')) opts = { mimeType: 'audio/webm' };
      mediaRecorder = new MediaRecorder(stream, opts);
      mediaRecorder.ondataavailable = function(e) { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = function() {
        stream.getTracks().forEach(function(t) { t.stop(); });
        var blobType = (opts.mimeType) || 'audio/webm';
        recordedBlob = new Blob(audioChunks, { type: blobType });
        showPreview();
      };
      mediaRecorder.start(100);
      isRecording = true;
      startTimer();
      startWaveformAnimation(stream);
    } catch(err) {
      Toast.error('Impossible d\'accéder au micro');
      removeUI();
    }
  }

  function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    stopTimer();
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (audioContext) { audioContext.close(); audioContext = null; }
    var dot = document.getElementById('vm-rec-dot');
    if (dot) dot.style.display = 'none';
  }

  function showPreview() {
    isPreviewing = true;
    var rec = document.getElementById('vm-controls-record');
    var prev = document.getElementById('vm-controls-preview');
    if (rec) rec.style.display = 'none';
    if (prev) prev.style.display = 'flex';
    var finalData = waveformData.slice();
    while (finalData.length < 60) finalData.push(Math.random() * 0.3 + 0.05);
    drawWaveform(finalData);
    var url = URL.createObjectURL(recordedBlob);
    previewAudio = new Audio(url);
    previewAudio.ontimeupdate = function() {
      var pct = previewAudio.currentTime / (previewAudio.duration || 1);
      var prog = document.getElementById('vm-progress');
      var thumb = document.getElementById('vm-thumb');
      var dur = document.getElementById('vm-duration');
      if (prog) prog.style.width = (pct * 100) + '%';
      if (thumb) thumb.style.left = (pct * 100) + '%';
      if (dur) {
        var rem = (previewAudio.duration || 0) - previewAudio.currentTime;
        dur.textContent = Math.floor(rem / 60) + ':' + String(Math.floor(rem % 60)).padStart(2, '0');
      }
      drawWaveform(finalData, pct);
    };
    previewAudio.onended = function() {
      var btn = document.getElementById('vm-play-btn');
      if (btn) btn.textContent = '▶️';
      drawWaveform(finalData, 0);
    };
    var durEl = document.getElementById('vm-duration');
    if (durEl) durEl.textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  }

  function togglePlay() {
    if (!previewAudio) return;
    var btn = document.getElementById('vm-play-btn');
    if (previewAudio.paused) { previewAudio.play(); if (btn) btn.textContent = '⏸️'; }
    else { previewAudio.pause(); if (btn) btn.textContent = '▶️'; }
  }

  function seekTo(event) {
    if (!previewAudio) return;
    var bar = event.currentTarget;
    var rect = bar.getBoundingClientRect();
    var pct = (event.clientX - rect.left) / rect.width;
    previewAudio.currentTime = pct * (previewAudio.duration || 0);
  }

  function cancel() {
    isRecording = false;
    isPreviewing = false;
    stopTimer();
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') { try { mediaRecorder.stop(); } catch(e) {} }
    if (audioContext) { try { audioContext.close(); } catch(e) {} audioContext = null; }
    if (previewAudio) { previewAudio.pause(); previewAudio = null; }
    recordedBlob = null;
    removeUI();
  }

  async function send() {
    if (!recordedBlob) { Toast.error('Aucun enregistrement'); return; }
    if (!currentConvId) { Toast.error('Conversation introuvable'); return; }

    var sendBtn = document.getElementById('vm-send-btn');
    if (sendBtn) { sendBtn.textContent = '⏳'; sendBtn.disabled = true; }

    try {
      // 1. Upload vers Cloudinary
      var formData = new FormData();
      var ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
      formData.append('file', recordedBlob, 'voice_' + Date.now() + '.' + ext);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('resource_type', 'video');

      var uploadRes = await fetch('https://api.cloudinary.com/v1_1/' + CLOUD_NAME + '/video/upload', {
        method: 'POST',
        body: formData
      });
      var uploadData = await uploadRes.json();

      if (!uploadData.secure_url) {
        throw new Error('Upload Cloudinary échoué: ' + JSON.stringify(uploadData));
      }

      // 2. Envoyer le message avec voice_url
      var convId = currentConvId;
      var dur = seconds;
      var voiceUrl = uploadData.secure_url;

      var msgRes = await API.post('/conversations/' + convId + '/messages?t=' + Date.now(), {
        content: '[Message vocal]',
        voice_url: voiceUrl,
        duration: dur
      });

      console.log('Message vocal envoyé:', msgRes);
      Toast.success('Message vocal envoyé ✓');
      cancel();
    } catch(err) {
      console.error('ERREUR envoi vocal:', err);
      Toast.error('Erreur: ' + (err.message || 'Connexion'));
      if (sendBtn) { sendBtn.textContent = '➤'; sendBtn.disabled = false; }
    }
  }

  function toggle(convId, match) {
    currentConvId = convId;
    currentMatch = match;
    if (isRecording) {
      stopRecording();
    } else if (!document.getElementById('voice-recorder-ui')) {
      startRecording();
    }
  }

  return { toggle, cancel, stopRecording, startRecording, togglePlay, seekTo, send };
})();