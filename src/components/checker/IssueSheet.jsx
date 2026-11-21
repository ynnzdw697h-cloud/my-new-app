import { useState, useRef } from 'react';
import { AlertTriangle, TrendingDown, Clock, Camera, CheckCircle2 } from 'lucide-react';
import { Sheet } from '../ui';

const ISSUE_TYPES = [
  { id: 'quality',     label: 'איכות ירודה',   Icon: AlertTriangle },
  { id: 'missing_qty', label: 'כמות חסרה',      Icon: TrendingDown  },
  { id: 'expired',     label: 'פג תוקף',         Icon: Clock         },
];

function compressImage(file, maxWidth = 800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('שגיאה'));
    img.src = url;
  });
}

export default function IssueSheet({ item, user, onSave, onClose }) {
  const [type, setType]       = useState(item.issue?.type || 'quality');
  const [note, setNote]       = useState(item.issue?.note || '');
  const [photo, setPhoto]     = useState(item.issue?.photoBase64 || null);
  const [uploading, setUploading] = useState(false);
  const fileRef               = useRef();

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const b64 = await compressImage(file, 800, 0.82);
      setPhoto(b64);
    } catch { /* ignore */ }
    finally { setUploading(false); e.target.value = ''; }
  }

  function handleSave() {
    onSave({
      type,
      note,
      photoBase64:  photo,
      reportedAt:   Date.now(),
      reportedBy:   user,
    });
  }

  return (
    <Sheet open onClose={onClose} title="דיווח בעיה">
      <div>
        <p className="text-base mb-5" style={{ color: 'rgba(255,255,255,0.62)' }}>{item.name}</p>

        {/* Issue type */}
        <div className="flex gap-2 mb-5">
          {ISSUE_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className="flex-1 rounded-2xl py-3 flex flex-col items-center gap-1 font-semibold text-sm transition-all"
              style={{
                background: type === t.id ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.05)',
                border:     type === t.id ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.08)',
                color:      type === t.id ? '#EF4444' : 'rgba(255,255,255,0.5)',
              }}
            >
              <t.Icon size={18} strokeWidth={1.5} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Note */}
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="הערה (אופציונלי)"
          rows={2}
          className="w-full rounded-2xl px-4 py-3 text-lg text-white mb-4 resize-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', outline: 'none', textAlign: 'right' }}
        />

        {/* Photo */}
        <button
          onClick={() => fileRef.current.click()}
          className="w-full rounded-2xl py-3 mb-5 flex items-center justify-center gap-2 font-semibold text-sm"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}
        >
          {uploading ? '...' : photo ? (
            <><CheckCircle2 size={15} strokeWidth={1.5} /> תמונה צורפה — החלף</>
          ) : (
            <><Camera size={15} strokeWidth={1.5} /> צרף תמונה</>
          )}
        </button>
        {photo && (
          <img src={photo} alt="issue" className="w-full rounded-2xl object-cover mb-5" style={{ maxHeight: 140 }} />
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />

        <button
          onClick={handleSave}
          className="w-full rounded-2xl py-4 font-black text-white text-base"
          style={{ background: '#EF4444' }}
        >
          שמור דיווח
        </button>
      </div>
    </Sheet>
  );
}
