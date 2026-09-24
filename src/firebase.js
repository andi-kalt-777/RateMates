// Firebase-Zugang. Der Web-API-Schlüssel ist ein öffentlicher Projekt-Identifikator,
// die Zugriffskontrolle machen die Regeln in database.rules.json.
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import "firebase/compat/auth";

const firebaseConfig={
  apiKey: "AIzaSyALr6jetmhTYj9XIGZQ7aBs_gxAFLnt4x4",
  authDomain: "montagabendrestaurants.firebaseapp.com",
  databaseURL: "https://montagabendrestaurants-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "montagabendrestaurants",
  storageBucket: "montagabendrestaurants.firebasestorage.app",
  messagingSenderId: "977029677061",
  appId: "1:977029677061:web:d2b7b3d94820f710e1dc6c",
  measurementId: "G-FG9LH4LK9H"
};
firebase.initializeApp(firebaseConfig);
const db=firebase.database();
const auth=firebase.auth();
auth.languageCode="de"; // Reset- und Bestätigungs-Mails auf Deutsch

export { firebase, db, auth };
