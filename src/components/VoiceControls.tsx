import { useEffect, useState, useSyncExternalStore } from 'react';
import type { VoiceChat, VoiceSnapshot } from '../net/voice';
import { updateSettings, useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';

const noSubscribe = () => () => {};
const noSnapshot = () => null;

/** Voice chat state for React (null outside online rooms). */
export function useVoice(voice?: VoiceChat): VoiceSnapshot | null {
  return useSyncExternalStore(voice ? voice.subscribe : noSubscribe, voice ? voice.getSnapshot : noSnapshot);
}

export function MicIcon({ off = false, size = 18 }: { off?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2.5" width="6" height="12" rx="3" fill={off ? 'none' : 'currentColor'} />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3.5M8.5 21.5h7" />
      {off && <path d="M3.5 3.5l17 17" stroke="#d91f27" strokeWidth="3" />}
    </svg>
  );
}

export function HeadsetIcon({ off = false, size = 18 }: { off?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="2.5" y="14" width="5" height="7" rx="2" fill="currentColor" />
      <rect x="16.5" y="14" width="5" height="7" rx="2" fill="currentColor" />
      {off && <path d="M3.5 3.5l17 17" stroke="#d91f27" strokeWidth="3" />}
    </svg>
  );
}

/** Mic on/off. Lights up green while it's on and pulses while you talk. */
export function MicButton({ voice, snap, compact = false }: { voice: VoiceChat; snap: VoiceSnapshot; compact?: boolean }) {
  const [tip, setTip] = useState<string | null>(null);
  useEffect(() => {
    if (!snap.error) return;
    setTip(snap.error);
    const t = setTimeout(() => setTip(null), 3200);
    return () => clearTimeout(t);
  }, [snap.error]);
  const on = snap.mic;
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => {
          sfx.click();
          void voice.toggleMic();
        }}
        className={`icon-btn relative ${compact ? '!h-9 !min-w-9 !px-0' : ''} ${on ? '!bg-[#3ddc84]' : ''} ${snap.asking ? 'animate-pulse' : ''}`}
        aria-pressed={on}
        aria-label={on ? 'Turn your mic off' : 'Turn your mic on'}
        title={on ? 'Mic on — tap to mute yourself' : 'Mic off — tap to talk'}
      >
        <MicIcon off={!on} size={compact ? 17 : 18} />
        {!compact && <span className="hidden lg:inline">{on ? 'Mic on' : 'Mic'}</span>}
        {on && snap.speaking && <span className="voice-ring !-inset-1 !rounded-[14px]" aria-hidden="true" />}
      </button>
      {tip && (
        <span className="font-body absolute right-0 top-full z-50 mt-2 w-max max-w-[min(70vw,240px)] rounded-xl border-2 border-[var(--ink)] bg-[#ffe1e1] px-2 py-1 text-[12px] font-semibold leading-tight text-[#a3121a] shadow-[0_2px_0_var(--ink)] animate-popIn">
          {tip}
        </span>
      )}
    </span>
  );
}

/** Hear the others, or not. */
export function SpeakerButton({ compact = false }: { compact?: boolean }) {
  const { voiceSpeaker } = useSettings();
  return (
    <button
      type="button"
      onClick={() => {
        sfx.click();
        updateSettings({ voiceSpeaker: !voiceSpeaker });
      }}
      className={`icon-btn ${compact ? '!h-9 !min-w-9 !px-0' : ''}`}
      aria-pressed={voiceSpeaker}
      aria-label={voiceSpeaker ? 'Stop hearing voice chat' : 'Hear voice chat'}
      title={voiceSpeaker ? 'Voice chat on — tap to stop hearing it' : 'Voice chat off — tap to hear everyone'}
    >
      <HeadsetIcon off={!voiceSpeaker} size={compact ? 17 : 18} />
    </button>
  );
}

/** For the lobby: both switches and who's talking. */
export function VoiceBar({ voice, snap }: { voice: VoiceChat; snap: VoiceSnapshot }) {
  const linked = Object.keys(snap.linked).length;
  return (
    <div className="flex items-center gap-2 rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)] px-2 py-1.5">
      <MicButton voice={voice} snap={snap} compact />
      <SpeakerButton compact />
      <div className="min-w-0 leading-tight">
        <div className="font-ui text-sm text-[var(--ink)]">Voice chat</div>
        <div className="font-body truncate text-xs font-semibold text-[var(--muted)]">
          {snap.mic ? (snap.speaking ? 'You’re talking…' : 'Your mic is on') : 'Tap the mic to talk'}
          {linked > 0 ? ` · ${linked} linked` : ''}
        </div>
      </div>
    </div>
  );
}
