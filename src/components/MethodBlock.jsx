import { useState } from 'react';
import { ListOrdered, Play, Pencil, Timer } from 'lucide-react';
import { Block } from './recipeShared';
import CookMode from './CookMode';
import StepEditor from './StepEditor';
import { formatDuration } from '../data/cookSteps';

/* "אופן הכנה": the steps + a big "start step-by-step" button + step editing. */
export default function MethodBlock({ title, steps, hasEdited, color, onSave, onReset }) {
  const [cooking, setCooking] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Block
        title="אופן הכנה"
        icon={ListOrdered}
        aside={
          <button type="button" onClick={() => setEditing(true)} className="min-h-[48px] px-3 -my-1 rounded-xl flex items-center gap-1.5 text-base font-semibold" style={{ color: 'var(--text-2)' }}>
            <Pencil size={18} /> ערוך שלבים
          </button>
        }
      >
        {steps.length > 0 && (
          <div className="px-4 pt-4">
            <button type="button" onClick={() => setCooking(true)} className="w-full min-h-[56px] rounded-xl flex items-center justify-center gap-2 text-lg font-semibold" style={{ background: color, color: '#fff' }}>
              <Play size={22} /> התחל הכנה שלב אחרי שלב
            </button>
          </div>
        )}
        <div className="px-4 py-4 space-y-5">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-base font-semibold" style={{ background: color, color: '#fff' }}>{i + 1}</div>
              <div className="min-w-0">
                <p className="text-lg leading-relaxed" style={{ color: 'var(--text)' }}>{s.text}</p>
                {(s.seconds || s.note) && (
                  <p className="mt-1 text-base flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-2)' }}>
                    {s.seconds ? <span className="inline-flex items-center gap-1"><Timer size={16} />{formatDuration(s.seconds)}</span> : null}
                    {s.note ? <span style={{ color: '#fbbf24' }}>{s.note}</span> : null}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Block>

      {cooking && <CookMode title={title} steps={steps} color={color} onClose={() => setCooking(false)} />}
      {editing && (
        <StepEditor title={title} steps={steps} color={color} hasEdited={hasEdited} onSave={onSave} onReset={onReset} onClose={() => setEditing(false)} />
      )}
    </>
  );
}
