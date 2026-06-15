import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';

interface Props {
  onComplete: () => void;
  opponentName?: string;
}

const COUNTDOWN_VALUES = [3, 2, 1] as const;
const STEP_DURATION_MS = 667;

export function CountdownScreen({ onComplete, opponentName }: Props) {
  const [step, setStep] = useState(0);
  const { t } = useI18n();
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (step >= COUNTDOWN_VALUES.length) {
      onCompleteRef.current();
      return;
    }

    const timer = setTimeout(() => {
      setStep(s => s + 1);
    }, STEP_DURATION_MS);

    return () => clearTimeout(timer);
  }, [step]);

  const countdownValue = COUNTDOWN_VALUES[step];

  return (
    <div className="screen countdown-screen">
      <div className="countdown-content">
        {opponentName && (
          <div className="countdown-vs">
            <span className="countdown-opponent">{t.countdown1v1}</span>
          </div>
        )}
        <div className="countdown-target-label">{t.gameTitle}</div>
        <div className="countdown-subtitle">{t.countdownSubtitle}</div>
        {countdownValue !== undefined && (
          <div key={countdownValue} className="countdown-number">
            {countdownValue}
          </div>
        )}
      </div>
    </div>
  );
}
