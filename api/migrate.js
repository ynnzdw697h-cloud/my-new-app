/**
 * GET /api/migrate
 * One-time migration: copies all documents from the old `kitchen/` collection
 * to the new `tenants/villa-acadia/kitchen/` subcollection.
 * Safe to run multiple times (overwrites with same data).
 * DELETE this file after migration is confirmed.
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const TENANT_ID = 'villa-acadia';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const db = admin.firestore();

  try {
    // List all docs in the old kitchen/ collection
    const oldSnap = await db.collection('kitchen').get();

    if (oldSnap.empty) {
      return res.status(200).json({ message: 'Nothing to migrate — kitchen/ collection is empty.', copied: 0 });
    }

    const batch = db.batch();
    const copied = [];

    for (const docSnap of oldSnap.docs) {
      const newRef = db
        .collection('tenants')
        .doc(TENANT_ID)
        .collection('kitchen')
        .doc(docSnap.id);

      batch.set(newRef, docSnap.data(), { merge: true });
      copied.push(docSnap.id);
    }

    await batch.commit();

    return res.status(200).json({
      message: `Migration complete. ${copied.length} documents copied to tenants/${TENANT_ID}/kitchen/`,
      documents: copied,
    });

  } catch (err) {
    console.error('[Migrate]', err);
    return res.status(500).json({ error: err.message });
  }
};
