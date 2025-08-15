import { db } from "./src/services/firebase.js";
import { collection, addDoc } from "firebase/firestore";

async function seedBosses() {
  const bosses = [
    { name: "Orshabaal" },
    { name: "Morgaroth" },
    { name: "Ghazbaran" },
    { name: "Ferumbras" },
    { name: "Zushuka" },
    { name: "The Plasmother" },
    { name: "Tyrn" },
    { name: "Ragiaz" },
    { name: "Zanakeph" },
    { name: "Dharalion" }
    // Pode adicionar mais bosses aqui
  ];

  try {
    for (let boss of bosses) {
      await addDoc(collection(db, "bosses"), boss);
      console.log(`✅ Boss "${boss.name}" adicionado`);
    }
    console.log("🎯 Todos os bosses foram adicionados!");
  } catch (error) {
    console.error("❌ Erro ao adicionar bosses:", error);
  }
}

seedBosses();
