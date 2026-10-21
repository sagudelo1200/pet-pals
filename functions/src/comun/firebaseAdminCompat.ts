import type {App} from 'firebase-admin/app';
import {getApps, initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {
  FieldValue as FirestoreFieldValue,
  getFirestore,
  Timestamp as FirestoreTimestampCtor,
} from 'firebase-admin/firestore';

type FirestoreCompat = (() => FirebaseFirestore.Firestore) & {
  FieldValue: typeof FirestoreFieldValue
  Timestamp: typeof FirestoreTimestampCtor
};

/**
 * Exposes Firestore using the legacy `admin.firestore()` shape.
 */
const firestore: FirestoreCompat = Object.assign(
  () => getFirestore(),
  {
    FieldValue: FirestoreFieldValue,
    Timestamp: FirestoreTimestampCtor,
  }
);

/**
 * Exposes Auth using the legacy `admin.auth()` shape.
 */
function auth() {
  return getAuth();
}

const admin = {
  get apps(): App[] {
    return getApps();
  },
  initializeApp,
  firestore,
  auth,
};

export type FirestoreTimestamp = FirebaseFirestore.Timestamp;
export type FirestoreDocumentData = FirebaseFirestore.DocumentData;

export default admin;
