// js/pages/voicemessage.js
const VoiceMessage = (() => {
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  let recordingTimer = null;
  let seconds = 0;

  function getBtn() {
    return document.getElementById('btn-voice-record');
  }

  function updateTimer() {
    seconds++;
    const btn = getBtn();
    if (btn) btn.textContent = '⏹️ ' + seconds + 's';
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      seconds = 0;
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = function(e) {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.onstop = async function() {
        stream.getTracks().forEach(function(t) { t.stop(); });
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        await uploadAndSend(blob);
      };
      mediaRecorder.start();
      isRecording = true;
      const btn = getBtn();
      if (btn) btn.style.color = '#EF4444';
      recordingTimer = setInterval(updateTimer, 1000);
      Toast.info('🎙️ Enregistrement... Appuyez pour arrêter');
    } catch(err) {
      Toast.error('Impossible d\'accéder au micro');
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    isRecording = false;
    clearInterval(recordingTimer);
    const btn = getBtn();
    if (btn) { btn.textContent = '🎙️'; btn.style.color = ''; }
    Toast.info('Envoi du message vocal...');
  }

  async function uploadAndSend(blob) {
    try {
      // Upload vers Cloudinary
      const cloudName = 'dt6ukj8yj';
      const uploadPreset = 'mixte_meet_voices';
      const formData = new FormData();
      formData.append('file', blob, 'voice_' + Date.now() + '.webm');
      formData.append('upload_preset', uploadPreset);
      formData.append('resource_type', 'video');

      const uploadRes = await fetch('https://api.cloudinary.com/v1_1/' + cloudName + '/video/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.secure_url) throw new Error('Upload échoué');

      // Envoyer comme message
      const convId = VoiceMessage._currentConvId;
      if (convId) {
        await API.post('/conversations/' + convId + '/messages?t=' + Date.now(), {
          content: '[🎙️ Message vocal]',
          voice_url: uploadData.secure_url,
          duration: VoiceMessage._seconds || 0
        });
        Toast.success('Message vocal envoyé ✓');
      }
    } catch(err) {
      Toast.error('Erreur envoi vocal: ' + err.message);
    }
  }

  function toggle(convId, match) {
    VoiceMessage._currentConvId = convId;
    VoiceMessage._seconds = seconds;
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  }

  return { toggle, _currentConvId: null, _seconds: 0 };
})();