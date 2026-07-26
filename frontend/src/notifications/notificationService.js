// notifications/notificationService.js
// Local notification service using device's native notification API
// No server required - all scheduling happens on-device

const SCHEDULED_ALARMS_KEY = 'scheduled_alarms';

class NotificationService {
  constructor() {
    this.checkInterval = null;
    this.alarmChecks = new Map(); // note_id -> last_notified timestamp
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  hasPermission() {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  playSound(soundType = 'bell') {
    try {
      // Create a simple beep using Web Audio API (no external files needed)
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      // Different sounds for different types
      const soundConfig = {
        bell: { freq: 800, duration: 0.3, type: 'sine' },
        chime: { freq: 1200, duration: 0.5, type: 'triangle' },
        signal: { freq: 600, duration: 0.2, type: 'square' },
      };

      const config = soundConfig[soundType] || soundConfig.bell;
      oscillator.type = config.type;
      oscillator.frequency.value = config.freq;

      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + config.duration);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + config.duration);
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  }

  triggerHaptic() {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  showNotification(title, options = {}) {
    if (!this.hasPermission()) return null;

    const notification = new Notification(title, {
      body: options.body || '',
      icon: options.icon || '/favicon.ico',
      badge: options.icon || '/favicon.ico',
      tag: options.tag,
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
    });

    return notification;
  }

  triggerAlarm(note) {
    // Show notification
    this.showNotification(`Reminder: ${note.title}`, {
      body: note.content?.substring(0, 100) || 'Time for your task!',
      tag: `alarm-${note.id}`,
      requireInteraction: true,
    });

    // Play sound
    if (note.alarm?.sound) {
      this.playSound(note.alarm.sound);
    }

    // Vibrate if haptic enabled
    if (note.alarm?.haptic) {
      this.triggerHaptic();
    }
  }

  startAlarmChecker(getNotes) {
    // Check every 30 seconds for alarms
    if (this.checkInterval) clearInterval(this.checkInterval);

    const check = () => {
      const now = new Date();
      const notes = getNotes();
      
      notes.forEach((note) => {
        // Main alarm
        if (note.alarm?.enabled && note.alarm?.datetime) {
          const alarmTime = new Date(note.alarm.datetime);
          const diff = alarmTime - now;
          if (diff > 0 && diff < 30000) {
            const key = `main-${note.id}`;
            const lastNotified = this.alarmChecks.get(key);
            if (!lastNotified || (now - lastNotified) > 60000) {
              this.triggerAlarm(note);
              this.alarmChecks.set(key, now);
            }
          }
        }
        // Per-event alarms
        (note.events || []).forEach(evt => {
          if (!evt.alarm_enabled || !evt.datetime) return;
          const t = new Date(evt.datetime);
          const diff = t - now;
          if (diff > 0 && diff < 30000) {
            const key = `evt-${evt.id}`;
            const lastNotified = this.alarmChecks.get(key);
            if (!lastNotified || (now - lastNotified) > 60000) {
              this.triggerAlarm({
                id: `${note.id}-${evt.id}`,
                title: `${note.title} — ${evt.title}`,
                content: evt.notes || note.title,
                alarm: { sound: note.alarm?.sound || "bell", haptic: note.alarm?.haptic },
              });
              this.alarmChecks.set(key, now);
            }
          }
        });
      });
    };

    this.checkInterval = setInterval(check, 15000);
    check(); // Initial check
  }

  stopAlarmChecker() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export default new NotificationService();
