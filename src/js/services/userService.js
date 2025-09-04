// =============================================================================
// USER SERVICE - Perfil de usuario en Firestore
// =============================================================================

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFirestore, getAuth } from '../core/firebase.js';

class UserService {
  constructor() {
    this.db = null;
    this.auth = null;
  }

  initialize() {
    if (!this.db) this.db = getFirestore();
    if (!this.auth) this.auth = getAuth();
  }

  async saveProfile(data = {}) {
    this.initialize();
    const user = this.auth.currentUser;
    if (!user) throw new Error('No hay usuario');
    const ref = doc(this.db, 'usuarios', user.uid);
    await setDoc(ref, {
      uid: user.uid,
      email: user.email || '',
      displayName: data.displayName || user.displayName || '',
      updated_at: new Date().toISOString()
    }, { merge: true });
  }

  async getProfile(uid = null) {
    this.initialize();
    const id = uid || (this.auth.currentUser && this.auth.currentUser.uid);
    if (!id) throw new Error('No hay usuario');
    const ref = doc(this.db, 'usuarios', id);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  async getProfiles(uids = []) {
    this.initialize();
    const results = {};
    await Promise.all((uids || []).map(async (uid) => {
      try {
        const ref = doc(this.db, 'usuarios', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          results[uid] = snap.data();
        }
      } catch (_) {}
    }));
    return results;
  }
}

export const userService = new UserService();
