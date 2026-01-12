// 알림 소리 유틸리티
// 인앱: 기본, 푸시: 기본, 쪽지: 대안2

export const NotificationSound = {
  // 인앱 알림 - 부드러운 딩동 (댓글, 좋아요 등)
  playInApp: () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 880;
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1174.66;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.1);
      gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  },

  // 푸시 알림 - 트리플 비프 (공지사항 등)
  playPush: () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = (startTime: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.12);
        osc.start(startTime);
        osc.stop(startTime + 0.12);
      };

      playBeep(ctx.currentTime, 587.33);
      playBeep(ctx.currentTime + 0.15, 783.99);
      playBeep(ctx.currentTime + 0.30, 987.77);
    } catch (e) {
      console.log('Audio not supported');
    }
  },

  // 쪽지 - 우편함 열기 (대안2)
  playMessage: () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 낮은 음 먼저
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 392;
      osc1.type = 'triangle';
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.2);

      // 높은 음
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 784;
      osc2.type = 'triangle';
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  },

  // 타입에 따라 자동 재생
  play: (type: 'inapp' | 'push' | 'message') => {
    switch (type) {
      case 'inapp':
        NotificationSound.playInApp();
        break;
      case 'push':
        NotificationSound.playPush();
        break;
      case 'message':
        NotificationSound.playMessage();
        break;
    }
  }
};

export default NotificationSound;
