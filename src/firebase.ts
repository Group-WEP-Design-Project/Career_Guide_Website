import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA7s00U133oj9KY6D2Jak7SVAAD9u1ZfaQ",
  authDomain: "web-pesign-project.firebaseapp.com",
  databaseURL: "https://web-pesign-project-default-rtdb.firebaseio.com",
  projectId: "web-pesign-project",
  storageBucket: "web-pesign-project.firebasestorage.app",
  messagingSenderId: "727125075538",
  appId: "1:727125075538:web:34f638757bf9f01df6e18b",
  measurementId: "G-LHYBT1KZTG"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);