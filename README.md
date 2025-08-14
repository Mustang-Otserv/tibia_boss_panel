# Tibia Boss Panel — Firebase (Auth Email/Senha + Firestore Realtime)

Projeto React + Vite + Tailwind + Firebase Authentication (email/senha) e Cloud Firestore em tempo real.
Inclui painel admin (somente para `VITE_ADMIN_EMAIL`) com gerenciamento de usuários e gráficos em pizza.

## Como rodar
```bash
npm install
cp .env.example .env    # no Windows crie .env e copie os valores
npm run dev
```

## Configurar Firebase
1. Crie um projeto no console do Firebase.
2. Adicione um **App da Web** e copie o `firebaseConfig` para o `.env` (variáveis VITE_*).
3. **Authentication** → Habilite **Email/senha**.
4. **Firestore** → Crie o banco (modo de teste enquanto desenvolve).
5. Faça **cadastro** com o email que você definiu em `VITE_ADMIN_EMAIL`. Na primeira vez ele já vira admin/autorizado.
6. Para produção, crie regras restritas de Firestore.

### Regras (DEV - use apenas para teste)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2099, 1, 1);
    }
  }
}
```
Depois, aplique regras de produção verificando `request.auth != null` e flags de admin no doc de `users`.

## Scripts
- `npm run dev` — desenvolvimento
- `npm run build` — build para produção
- `npm run preview` — testar o build localmente
