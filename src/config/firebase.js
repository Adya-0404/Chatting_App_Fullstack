import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, setDoc, doc, query, getDoc, getDocs, collection, where } from "firebase/firestore";
import { toast } from "react-toastify";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "hi-app-gs.firebaseapp.com",
  projectId: "hi-app-gs",
  storageBucket: "hi-app-gs.firebasestorage.app",
  messagingSenderId: "412418577556",
  appId: "1:412418577556:web:16f7aa0b0ac0d45af21081"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const signup = async (userName, email, password) => {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;
    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      username: userName.toLowerCase(),
      email,
      name: "",
      avatar: "",
      bio: "Hey,There I am using chat app",
      lastSeen: Date.now()
    });
    await setDoc(doc(db, "chats", user.uid), {
      chatsData: []
    });
  } catch (error) {
    console.error(error);
    toast.error(error.code.split('/')[1].split('-').join(" "));
  }
};

const login = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    toast.error(error.code.split('/')[1].split('-').join(" "));
  }
};

const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
    toast.error(error.code.split('/')[1].split('-').join(" "));
  }
}; // FIXED: Added closing bracket for logout here

const resetPass = async (email) => {
  if (!email) {
    toast.error("Enter your email");
    return null;
  }
  try {
    const userRef = collection(db, 'users');
    const q = query(userRef, where("email", "==", email));
    const querySnap = await getDocs(q);
    
    // FIXED: Changed to !querySnap.empty so it fires if the user IS found
    if (!querySnap.empty) { 
      await sendPasswordResetEmail(auth, email);
      toast.success("Reset Email Sent");
    } else {
      toast.error("Email does not exist");
    }
  } catch (error) {
    console.error(error);
    toast.error(error.message);
  }
}; // FIXED: Removed the extra closing bracket from down here

export { signup, login, logout, auth, db, resetPass };