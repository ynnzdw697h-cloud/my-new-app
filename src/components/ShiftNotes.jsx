import { useState } from 'react';
import { FileText, AlertCircle, User, MessageSquare, Trash2 } from 'lucide-react';
import { useFirestoreArray } from '../hooks/useFirestoreArray';
import { Card, Button, Input, EmptyState, Chip, Sheet } from './ui';

const MISSING_KEY = 'missing_items';
const NOTES_KEY   = 'shift_notes';

function nowLabel() {
  return new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

export default function ShiftNotes({ user }) {
  const [missingItems, setMissingItems] = useFirestoreArray(MISSING_KEY);
  const [shiftNotes,   setShiftNotes]   = useFirestoreArray(NOTES_KEY);

  const [missingInput,    setMissingInput]    = useState('');
  const [showMissingForm, setShowMissingForm] = useState(false);
  const [noteInput,       setNoteInput]       = useState('');
  const [confirmClear,    setConfirmClear]    = useState(false);

  function addMissingItem() {
    const text = missingInput.trim();
    if (!text) return;
    setMissingItems(prev => [...prev, { id: Date.now(), text }]);
    setMissingInput('');
    setShowMissingForm(false);
  }

  function deleteMissingItem(id) {
    setMissingItems(prev => prev.filter(item => item.id !== id));
  }

  function addNote() {
    const text = noteInput.trim();
    if (!text) return;
    setShiftNotes(prev => [...prev, { id: Date.now(), text, author: user, time: nowLabel() }]);
    setNoteInput('');
  }

  function deleteNote(id) {
    setShiftNotes(prev => prev.filter(n => n.id !== id));
  }

  function clearAll() {
    setMissingItems([]);
    setShiftNotes([]);
    setConfirmClear(false);
  }

  return (
    <div className="p-5 md:p-6 space-y-5 max-w-2xl mx-auto" dir="rtl">

      {/* ── Page header ── */}
      <div className="flex items-center gap-2.5 mb-2">
        <FileText size={20} style={{ color: 'rgba(255,255,255,0.4)' }} strokeWidth={1.5} />
        <h2 className="text-h1 text-text-primary">חוסרים והערות</h2>
        <span className="text-body text-text-tertiary">משותף לכל הפסים</span>
      </div>

      {/* ══ Section 1 — רשימת 86 ══ */}
      <Card padded={false}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} strokeWidth={1.5} style={{ color: 'var(--danger)' }} />
            <h3 className="text-h3 text-text-primary">רשימת 86 — חוסרים</h3>
            {missingItems.length > 0 && (
              <Chip variant="danger">{missingItems.length}</Chip>
            )}
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowMissingForm(v => !v)}
            ariaLabel="הוסף פריט חסר"
          >
            + הוסף
          </Button>
        </div>

        {/* Add form */}
        {showMissingForm && (
          <div className="px-5 py-4 flex gap-2.5"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <Input
              className="flex-1"
              placeholder="שם הפריט החסר..."
              value={missingInput}
              onChange={e => setMissingInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMissingItem()}
              autoFocus
            />
            <Button variant="danger" onClick={addMissingItem}>הוסף</Button>
            <Button variant="ghost" size="sm"
              onClick={() => { setShowMissingForm(false); setMissingInput(''); }}
              ariaLabel="סגור">✕</Button>
          </div>
        )}

        {/* Items */}
        <div>
          {missingItems.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="אין חוסרים כרגע"
              description="כשיש פריט חסר, הוסף אותו כאן"
            />
          ) : (
            missingItems.map((item, i) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-5 py-3.5 gap-3"
                style={{ borderBottom: i < missingItems.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-h3 font-black flex-shrink-0" style={{ color: 'var(--danger)' }}>86</span>
                  <span className="text-body text-text-primary font-semibold truncate">{item.text}</span>
                </div>
                <button
                  onClick={() => deleteMissingItem(item.id)}
                  aria-label="מחק פריט"
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                             transition-all duration-150 active:scale-90 press"
                  style={{ background: 'rgba(248,113,113,0.08)', color: 'var(--danger)' }}
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* ══ Section 2 — הערות משמרת ══ */}
      <Card padded={false}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-2.5"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <MessageSquare size={18} strokeWidth={1.5} style={{ color: 'var(--info)' }} />
          <h3 className="text-h3 text-text-primary">הערות משמרת</h3>
          {shiftNotes.length > 0 && (
            <Chip variant="info">{shiftNotes.length}</Chip>
          )}
        </div>

        {/* Input */}
        <div className="px-5 py-4 space-y-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 text-meta text-text-secondary">
            <User size={13} strokeWidth={1.5} />
            <span className="text-text-primary font-semibold text-label">{user}</span>
            <span>·</span>
            <span>{nowLabel()}</span>
          </div>
          <textarea
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.ctrlKey && addNote()}
            placeholder="כתוב הערה לצוות הבא..."
            rows={3}
            className="w-full px-4 py-3 rounded-2xl resize-none text-body text-text-primary
                       placeholder:text-text-tertiary outline-none transition-all duration-200
                       focus:shadow-[0_0_0_3px_rgba(96,165,250,0.18)]"
            style={{
              background: 'var(--bg-inset)',
              border: '1px solid var(--border)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--info)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <div className="flex items-center justify-between">
            <span className="text-meta text-text-tertiary">Ctrl+Enter לשליחה</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={addNote}
              disabled={!noteInput.trim()}
            >
              שלח הערה
            </Button>
          </div>
        </div>

        {/* Notes list */}
        <div>
          {shiftNotes.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="אין הערות עדיין"
              description="הערות נשמרות לכל הצוות"
            />
          ) : (
            [...shiftNotes].reverse().map((note, i) => (
              <div
                key={note.id}
                className="px-5 py-4 flex gap-3"
                style={{ borderBottom: i < shiftNotes.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-label text-text-primary font-bold">{note.author}</span>
                    <span className="text-meta text-text-tertiary">{note.time}</span>
                  </div>
                  <p className="text-body text-text-secondary leading-relaxed whitespace-pre-wrap">{note.text}</p>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  aria-label="מחק הערה"
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                             transition-all duration-150 active:scale-90 press mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)' }}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* ══ Clear all ══ */}
      <div className="pt-1">
        <Button
          variant="danger"
          fullWidth
          icon={Trash2}
          onClick={() => setConfirmClear(true)}
        >
          נקה הכל בסוף יום
        </Button>
      </div>

      {/* Confirm sheet */}
      <Sheet
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="למחוק את כל החוסרים וההערות?"
      >
        <p className="text-body text-text-secondary mb-6">
          פעולה זו תמחק לצמיתות את כל הרשומות של המשמרת הנוכחית.
        </p>
        <div className="flex gap-3">
          <Button variant="danger" fullWidth onClick={clearAll}>כן, נקה הכל</Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmClear(false)}>ביטול</Button>
        </div>
      </Sheet>

    </div>
  );
}
