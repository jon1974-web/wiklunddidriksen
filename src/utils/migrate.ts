import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

const FAMILY_ID = 'AVCUsb8X6GdRM3f0EBf0';

export async function migrateAddFamilyId(): Promise<Record<string, number>> {
  const collections = ['events', 'chat', 'shoppingLists', 'trips'];
  const results: Record<string, number> = {};

  for (const colName of collections) {
    const snapshot = await getDocs(collection(db, colName));
    let updated = 0;
    for (const d of snapshot.docs) {
      if (d.data().familyId !== FAMILY_ID) {
        await updateDoc(doc(db, colName, d.id), { familyId: FAMILY_ID });
        updated++;
      }
    }
    results[colName] = updated;
  }

  return results;
}
