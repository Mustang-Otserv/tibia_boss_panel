import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const addHistoryEntry = async (userId, action) => {
  await addDoc(collection(db, "history"), {
    userId,
    action,
    timestamp: serverTimestamp()
  });
};

export const getHistory = async () => {
  const q = query(collection(db, "history"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getHistoryByUser = async (userId) => {
  const q = query(
    collection(db, "history"),
    where("userId", "==", userId),
    orderBy("timestamp", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
