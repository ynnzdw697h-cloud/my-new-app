import { useState, useRef } from 'react';
import { Camera, ImageIcon, AlertTriangle, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { SUPPLIERS } from '../../data/suppliers';
import ReviewStep from './ReviewStep';

function compressImage(file, maxDim = 1500, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('שגיאה בקריאת התמונה'));
    img.src = url;
  });
}

export default function ScanStep({ user, onSaved, onCancel }) {
  const [image, setImage]           = useState(null); // base64
  const [supplierId, setSupplierId] = useState(SUPPLIERS[0].id);
  const [scanning, setScanning]     = useState(false);
  const [scanError, setScanError]   = useState(null);
  const [ocrResult, setOcrResult]   = useState(null);
  const fileRef                     = useRef();
  const camRef                      = useRef();

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setScanError(null);
    try {
      const b64 = await compressImage(file);
      setImage(b64);
    } catch (err) {
      setScanError(`שגיאה בטעינת התמונה: ${err.message}`);
    }
    e.target.value = '';
  }

  async function runOCR() {
    if (!image) return;
    setScanning(true);
    setScanError(null);
    try {
      let res;
      try {
        res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: image }),
        });
      } catch (networkErr) {
        throw new Error(`Network Error — ${networkErr.message}`);
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Error ${res.status}: ${res.statusText}${text ? ` — ${text.slice(0, 120)}` : ''}`);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.message || data.error);
      setOcrResult(data);
    } catch (err) {
      setScanError(`שגיאה בסריקה: ${err.message}`);
    } finally {
      setScanning(false);
    }
  }

  if (ocrResult) {
    return (
      <ReviewStep
        ocrResult={ocrResult}
        supplierId={supplierId}
        invoiceImageBase64={image}
        user={user}
        onSaved={onSaved}
        onBack={() => setOcrResult(null)}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#0d0d0d' }}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 pt-12">
        <button onClick={onCancel} className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>
          ← ביטול
        </button>
        <h2 className="text-white font-black text-lg">סרוק חשבונית</h2>
        <div style={{ width: 60 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-6">

        {/* Upload buttons */}
        {!image ? (
          <div className="flex gap-3">
            <button
              onClick={() => camRef.current.click()}
              className="flex-1 rounded-3xl p-6 flex flex-col items-center gap-3 active:scale-95 transition-transform"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <Camera size={32} style={{ color: 'rgba(255,255,255,0.6)' }} strokeWidth={1.25} />
              <span className="text-white font-bold text-sm">צלם</span>
            </button>
            <button
              onClick={() => fileRef.current.click()}
              className="flex-1 rounded-3xl p-6 flex flex-col items-center gap-3 active:scale-95 transition-transform"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <ImageIcon size={32} style={{ color: 'rgba(255,255,255,0.6)' }} strokeWidth={1.25} />
              <span className="text-white font-bold text-sm">העלה</span>
            </button>
          </div>
        ) : (
          <div className="relative rounded-3xl overflow-hidden" style={{ maxHeight: 280 }}>
            <img src={image} alt="חשבונית" className="w-full object-cover" style={{ maxHeight: 280 }} />
            <button
              onClick={() => { setImage(null); setScanError(null); }}
              className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'rgba(0,0,0,0.7)' }}
            >✕</button>
          </div>
        )}

        {/* Supplier selector */}
        <div>
          <p className="text-sm font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>בחר ספק</p>
          <div className="flex gap-2 flex-wrap">
            {SUPPLIERS.map(s => (
              <button
                key={s.id}
                onClick={() => setSupplierId(s.id)}
                className="flex items-center gap-2 rounded-2xl px-4 py-2.5 font-bold text-sm transition-all"
                style={{
                  background: supplierId === s.id ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)',
                  border: supplierId === s.id ? '1px solid #10B98155' : '1px solid rgba(255,255,255,0.08)',
                  color: supplierId === s.id ? '#10B981' : 'rgba(255,255,255,0.6)',
                }}
              >
                <Truck size={13} strokeWidth={1.5} /> {s.name}
              </button>
            ))}
          </div>
        </div>

        {scanError && (
          <div
            className="rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)' }}
          >
            <AlertTriangle size={18} style={{ color: '#FCA5A5', flexShrink: 0 }} strokeWidth={1.5} />
            <p className="text-sm font-semibold break-all" style={{ color: '#FCA5A5' }}>{scanError}</p>
          </div>
        )}

        {/* Continue */}
        {image && (
          <button
            onClick={runOCR}
            disabled={scanning}
            className="w-full rounded-2xl py-4 font-black text-white text-base"
            style={{ background: scanning ? 'rgba(16,185,129,0.5)' : '#10B981', boxShadow: '0 0 20px rgba(16,185,129,0.4)' }}
          >
            {scanning ? 'מנתח חשבונית...' : 'המשך לניתוח →'}
          </button>
        )}

        {/* Manual entry fallback */}
        {!image && (
          <button
            onClick={() => setOcrResult({ supplierName: null, invoiceNumber: null, invoiceDate: null, items: [] })}
            className="w-full rounded-2xl py-3 font-semibold text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
          >
            הזן ידנית ללא סריקה
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      <input ref={camRef}  type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
    </motion.div>
  );
}
