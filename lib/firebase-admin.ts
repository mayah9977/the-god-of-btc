// lib/firebase-admin.ts
import admin, { ServiceAccount } from "firebase-admin";

// 이미 생성된 Firebase Admin 앱이 있으면 재사용, 없으면 새로 생성
let app: admin.app.App;

if (!admin.apps.length) {
  // .env.local 에 넣어둔 서비스 계정 JSON
  const serviceAccountJson = process.env.FIREBASE_ADMIN_KEY;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_ADMIN_KEY env var is missing");
  }

  const serviceAccount = JSON.parse(
    serviceAccountJson
  ) as ServiceAccount;

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
} else {
  app = admin.app();
}

// 🔹 여기서 서버용 Firestore / FieldValue / Messaging 등을 모두 export
export const adminDB = admin.firestore(app);
export const FieldValue = admin.firestore.FieldValue;
export const adminMsg = admin.messaging(app);
export const adminAuth = admin.auth(app);












