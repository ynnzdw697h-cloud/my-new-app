import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { useTenantId } from '../context/TenantContext';

// PERF-01: the recipe list loads only small thumbnails (~240px, one shared document).
// The full-size photo is loaded per recipe, only when that recipe is opened.
//
// Firestore layout (full photos unchanged):
//   recipe_images_col/{id}   { url }   full photo, one document per recipe
//   recipe_images            { id: url } legacy combined document (read only when needed)
//   recipe_thumbs            { id: url } NEW: small versions, one field per recipe
//
// A photo saved before this change has no thumbnail yet: the first time its recipe is
// opened, the thumbnail is created. To switch that off (e.g. when testing against the real
// database) set localStorage 'recipes_no_thumb_writes' to '1'.

const THUMB_WIDTH = 240;
const fullCache = new Map(); // safeId → url (survives leaving the screen)

const safeKey = id => String(id).replace(/\./g, '_');

function thumbWritesAllowed() {
  try { return localStorage.getItem('recipes_no_thumb_writes') !== '1'; } catch (_) { return true; }
}

// Shrink a data-URL photo to a small JPEG
export function makeThumb(dataUrl, maxWidth = THUMB_WIDTH, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('thumb failed'));
    img.src = dataUrl;
  });
}

export function useRecipeImages() {
  const tenantId            = useTenantId();
  const [thumbs, setThumbs] = useState({});

  useEffect(() => {
    if (!tenantId) return undefined;
    return onSnapshot(
      doc(db, 'tenants', tenantId, 'kitchen', 'recipe_thumbs'),
      snap => setThumbs(snap.exists() ? snap.data() : {}),
      err => console.warn('[recipe_thumbs]', err.code)
    );
  }, [tenantId]);

  const writeThumb = useCallback(async (id, fullUrl) => {
    const key   = safeKey(id);
    const thumb = await makeThumb(fullUrl);
    // merge: only this recipe's field is written, other thumbnails stay untouched
    await setDoc(doc(db, 'tenants', tenantId, 'kitchen', 'recipe_thumbs'), { [key]: thumb }, { merge: true });
    setThumbs(prev => ({ ...prev, [key]: thumb }));
  }, [tenantId]);

  // Save a new photo: full version + thumbnail
  const saveImage = useCallback(async (id, fullUrl) => {
    const key = safeKey(id);
    await setDoc(doc(db, 'tenants', tenantId, 'recipe_images_col', key), { url: fullUrl });
    fullCache.set(key, fullUrl);
    try { await writeThumb(id, fullUrl); } catch (e) { console.warn('[thumb]', e.message); }
  }, [tenantId, writeThumb]);

  return { images: thumbs, saveImage, writeThumb, tenantId };
}

// Full-size photo of the open recipe (null while loading, or when it has none).
// Pass id = null when no recipe is open.
export function useFullImage(id, { images, writeThumb, tenantId }) {
  const [full, setFull] = useState(() => (id != null ? fullCache.get(safeKey(id)) || null : null));
  const thumbsRef = useRef(images);
  useEffect(() => { thumbsRef.current = images; });

  useEffect(() => {
    if (id == null || !tenantId) { setFull(null); return undefined; }
    const key = safeKey(id);
    if (fullCache.has(key)) { setFull(fullCache.get(key)); return undefined; }
    setFull(null);
    let cancelled = false;
    (async () => {
      try {
        let url = null;
        const snap = await getDoc(doc(db, 'tenants', tenantId, 'recipe_images_col', key));
        if (snap.exists()) url = snap.data().url;
        if (!url) {
          const legacy = await getDoc(doc(db, 'tenants', tenantId, 'kitchen', 'recipe_images'));
          if (legacy.exists()) url = legacy.data()[key] || legacy.data()[String(id)] || null;
        }
        if (cancelled || !url) return;
        fullCache.set(key, url);
        setFull(url);
        if (!thumbsRef.current[key] && thumbWritesAllowed()) {
          writeThumb(id, url).catch(e => console.warn('[thumb]', e.message));
        }
      } catch (e) {
        console.warn('[recipe full image]', e.code || e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [id, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  return full;
}
