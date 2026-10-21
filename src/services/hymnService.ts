import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  getDocs,
  type Unsubscribe 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Hymn } from '../types/hymn';

const HYMNS_COLLECTION = 'hymns';

export const saveHymnToFirestore = async (hymn: Hymn): Promise<void> => {
  const hymnRef = doc(db, HYMNS_COLLECTION, hymn.id);
  const dataToSave = {
    ...hymn,
    updatedAt: new Date().toISOString(),
    createdAt: hymn.createdAt || new Date().toISOString(),
  };
  await setDoc(hymnRef, dataToSave, { merge: true });
};

export const subscribeToHymns = (
  onData: (hymns: Hymn[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const hymnsCol = collection(db, HYMNS_COLLECTION);
  
  return onSnapshot(
    hymnsCol,
    (snapshot) => {
      const liveHymns: Hymn[] = [];
      snapshot.forEach((docSnap) => {
        liveHymns.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      // Sort by hymn number
      liveHymns.sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
      onData(liveHymns);
    },
    (error) => {
      console.error('Live Firestore subscription error:', error);
      onError?.(error);
    }
  );
};

export const fetchHymnsFromFirestore = async (): Promise<Hymn[]> => {
  try {
    const snapshot = await getDocs(collection(db, HYMNS_COLLECTION));
    const liveHymns: Hymn[] = [];
    snapshot.forEach((docSnap) => {
      liveHymns.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    liveHymns.sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
    return liveHymns;
  } catch (error) {
    console.error('Error fetching live hymns from Firestore:', error);
    return [];
  }
};

export const deleteHymnFromFirestore = async (id: string): Promise<void> => {
  const hymnRef = doc(db, HYMNS_COLLECTION, id);
  await deleteDoc(hymnRef);
};
