import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyABW4JtPU7r4dR6hzjCBL-PGopcNXPV5QI",
  authDomain: "bw-heirloom-dev.firebaseapp.com",
  projectId: "bw-heirloom-dev",
  storageBucket: "bw-heirloom-dev.firebasestorage.app",
  messagingSenderId: "174694943962",
  appId: "1:174694943962:web:312afefaf0f2781ea0a9e3"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);