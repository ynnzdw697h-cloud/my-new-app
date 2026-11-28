import { useState } from 'react';
import PinKeypad from './PinKeypad';
import { pinCall, teamErrorText } from '../utils/teamApi';

/**
 * First login: the chef got an automatic code and may choose his own 4-digit code.
 *   currentPin: the code he just used to log in
 *   onDone():   continue to the app (he chose a new code, or kept the one he got)
 */
export default function ChoosePin({ currentPin, onDone }) {
  const [stage, setStage]   = useState('ask');   // ask | first | again
  const [first, setFirst]   = useState('');
  const [value, setValue]   = useState('');
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState('');

  async function keep() {
    setBusy(true);
    try { await pinCall({ action: 'keepPin', pin: currentPin }); } catch (_) { /* asked again next time */ }
    onDone();
  }

  function onFirst(v) {
    setFirst(v);
    setValue('');
    setError('');
    setStage('again');
  }

  async function onAgain(v) {
    if (v !== first) {
      setError('הקודים לא זהים. נסה שוב מההתחלה.');
      setValue('');
      setFirst('');
      setStage('first');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await pinCall({ action: 'changePin', pin: currentPin, newPin: v });
      onDone();
    } catch (e) {
      setError(teamErrorText(e));
      setValue('');
      setFirst('');
      setStage('first');
    } finally {
      setBusy(false);
    }
  }

  if (stage === 'ask') {
    return (
      <div className="w-full max-w-sm flex flex-col gap-4" dir="rtl">
        <h2 className="text-center font-bold text-3xl text-white">הקוד האישי שלך</h2>
        <p className="text-center text-lg" style={{ color: 'rgba(255,255,255,0.7)' }}>
          קיבלת קוד אוטומטי. אפשר להחליף אותו בקוד של 4 ספרות שקל לך לזכור.
        </p>
        <button
          type="button" onClick={() => { setError(''); setStage('first'); }} disabled={busy}
          className="w-full rounded-xl min-h-[64px] text-xl font-semibold text-[#121212] bg-white active:bg-white/75"
        >
          אני רוצה קוד משלי
        </button>
        <button
          type="button" onClick={keep} disabled={busy}
          className="w-full rounded-xl min-h-[64px] text-xl font-semibold text-white transition-colors duration-150 active:bg-white/10"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          להשאיר את הקוד שקיבלתי
        </button>
      </div>
    );
  }

  const isFirst = stage === 'first';
  return (
    <div className="w-full flex flex-col items-center gap-6" dir="rtl">
      <p className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {isFirst ? 'בחר קוד חדש, 4 ספרות' : 'הקלד שוב לאישור'}
      </p>
      <PinKeypad
        key={stage}
        value={value}
        onChange={v => { setError(''); setValue(v); }}
        onComplete={isFirst ? onFirst : onAgain}
        disabled={busy}
        error={!!error}
      />
      <p className="text-lg font-semibold min-h-[56px] text-center" style={{ color: '#ef4444' }} role="alert">{error}</p>
    </div>
  );
}
