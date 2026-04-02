import { useState } from 'react';
import { useFirestoreArray } from '../hooks/useFirestoreArray';

// Both lists are global (shared across all stations/cooks)
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

  // ── Missing items ──
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

  // ── Shift notes ──
  function addNote() {
    const text = noteInput.trim();
    if (!text) return;
    setShiftNotes(prev => [...prev, {
      id:     Date.now(),
      text,
      author: user,
      time:   nowLabel(),
    }]);
    setNoteInput('');
  }

  function deleteNote(id) {
    setShiftNotes(prev => prev.filter(n => n.id !== id));
  }

  // ── Clear all ──
  function clearAll() {
    setMissingItems([]);
    setShiftNotes([]);
    setConfirmClear(false);
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto" dir="rtl">

      {/* ── Page header ── */}
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-1">
          <span>📝</span> חוסרים והערות משמרת
        </h2>
        <p className="text-slate-400 text-sm">משותף לכל הטבחים בכל התחנות</p>
      </div>

      {/* ══════════════════════════════════════
          Section 1 — רשימת 86 (חוסרים)
      ══════════════════════════════════════ */}
      <section className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚫</span>
            <h3 className="text-white font-bold text-lg">רשימת 86 — חוסרים</h3>
            {missingItems.length > 0 && (
              <span className="bg-red-900 text-red-300 text-xs font-bold px-2 py-0.5 rounded-lg">
                {missingItems.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowMissingForm(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold
                       bg-red-900/50 text-red-300 border border-red-800
                       hover:bg-red-900 transition-all duration-150"
          >
            <span className="text-base leading-none">+</span> הוסף פריט
          </button>
        </div>

        {/* Add form */}
        {showMissingForm && (
          <div className="px-5 py-3 border-b border-slate-700 flex gap-2">
            <input
              autoFocus
              type="text"
              value={missingInput}
              onChange={e => setMissingInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMissingItem()}
              placeholder="שם הפריט החסר..."
              className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5
                         text-white placeholder-slate-500 text-sm
                         focus:outline-none focus:border-red-600"
            />
            <button
              onClick={addMissingItem}
              className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-sm transition-colors"
            >
              הוסף
            </button>
            <button
              onClick={() => { setShowMissingForm(false); setMissingInput(''); }}
              className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-400 text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Items list */}
        <div className="divide-y divide-slate-700">
          {missingItems.length === 0 ? (
            <div className="px-5 py-6 text-center text-slate-500 text-sm">
              אין חוסרים כרגע ✓
            </div>
          ) : (
            missingItems.map(item => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-red-400 font-black text-lg leading-none flex-shrink-0">86</span>
                  <span className="text-white font-medium truncate">{item.text}</span>
                </div>
                <button
                  onClick={() => deleteMissingItem(item.id)}
                  className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-700 hover:bg-red-900
                             text-slate-400 hover:text-red-300 flex items-center justify-center
                             transition-all duration-150 text-sm"
                  aria-label="מחק"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════
          Section 2 — הערות משמרת
      ══════════════════════════════════════ */}
      <section className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        {/* Section header */}
        <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h3 className="text-white font-bold text-lg">הערות משמרת</h3>
          {shiftNotes.length > 0 && (
            <span className="bg-blue-900 text-blue-300 text-xs font-bold px-2 py-0.5 rounded-lg">
              {shiftNotes.length}
            </span>
          )}
        </div>

        {/* Input area */}
        <div className="px-5 py-4 border-b border-slate-700 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <span>👤</span>
            <span className="text-white font-semibold">{user}</span>
            <span>•</span>
            <span>{nowLabel()}</span>
          </div>
          <textarea
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.ctrlKey && addNote()}
            placeholder="כתוב הערה לצוות הבא..."
            rows={3}
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3
                       text-white placeholder-slate-500 text-sm resize-none
                       focus:outline-none focus:border-blue-600"
          />
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs">Ctrl+Enter לשליחה</span>
            <button
              onClick={addNote}
              disabled={!noteInput.trim()}
              className="px-5 py-2 rounded-xl text-sm font-bold transition-all duration-150
                         bg-blue-700 text-white hover:bg-blue-600
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              שלח הערה
            </button>
          </div>
        </div>

        {/* Notes list */}
        <div className="divide-y divide-slate-700">
          {shiftNotes.length === 0 ? (
            <div className="px-5 py-6 text-center text-slate-500 text-sm">
              אין הערות עדיין
            </div>
          ) : (
            [...shiftNotes].reverse().map(note => (
              <div key={note.id} className="px-5 py-4 flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-white font-bold text-sm">{note.author}</span>
                    <span className="text-slate-500 text-xs">{note.time}</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{note.text}</p>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-700 hover:bg-red-900
                             text-slate-400 hover:text-red-300 flex items-center justify-center
                             transition-all duration-150 text-sm mt-0.5"
                  aria-label="מחק"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════
          Clear all button
      ══════════════════════════════════════ */}
      <div className="pt-2">
        {!confirmClear ? (
          <button
            onClick={() => setConfirmClear(true)}
            className="w-full py-3 rounded-2xl border border-slate-700 text-slate-400
                       hover:border-red-800 hover:text-red-400 hover:bg-red-900/20
                       text-sm font-medium transition-all duration-150"
          >
            🗑️ נקה הכל בסוף יום
          </button>
        ) : (
          <div className="bg-red-900/30 border border-red-800 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <span className="text-red-300 text-sm font-medium">
              למחוק את כל החוסרים וההערות?
            </span>
            <div className="flex gap-2">
              <button
                onClick={clearAll}
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition-colors"
              >
                כן, נקה הכל
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
