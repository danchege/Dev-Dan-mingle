// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDr7CaCwIJo2VnelZxIgnalTSQo92TAtMY",
  authDomain: "dev-dan-mingle.firebaseapp.com",
  projectId: "dev-dan-mingle",
  storageBucket: "dev-dan-mingle.firebasestorage.app",
  messagingSenderId: "1071692042947",
  appId: "1:1071692042947:web:eabd5d000c69ef37f0c876",
  measurementId: "G-PVKX1D9043"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI Elements
const authSection = document.getElementById("auth-section");
const chatSection = document.getElementById("chat-section");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const chatWindow = document.getElementById("chat-window");
const logoutBtn = document.getElementById("logout");

// Google Sign-In
document.getElementById("google-signin").addEventListener("click", () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider).catch(error => alert(error.message));
});

// Email/Password Sign-In
document.getElementById("email-login-form").addEventListener("submit", e => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  signInWithEmailAndPassword(auth, email, pass)
    .catch(error => alert(error.message));
});

// Auth State Change
onAuthStateChanged(auth, user => {
  if (user) {
    authSection.style.display = "none";
    chatSection.style.display = "block";
    listenForMessages();
  } else {
    authSection.style.display = "block";
    chatSection.style.display = "none";
  }
});

// Send message
messageForm.addEventListener("submit", async e => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (msg === "") return;

  await addDoc(collection(db, "messages"), {
    text: msg,
    uid: auth.currentUser.uid,
    email: auth.currentUser.email,
    timestamp: serverTimestamp()
  });

  messageInput.value = "";
});

// Display messages
function listenForMessages() {
  const q = query(collection(db, "messages"), orderBy("timestamp"));
  onSnapshot(q, snapshot => {
    chatWindow.innerHTML = "";
    snapshot.forEach(doc => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.className = msg.uid === auth.currentUser.uid ? "my-msg" : "other-msg";
      div.innerHTML = `<strong>${msg.email}:</strong> ${msg.text}`;
      chatWindow.appendChild(div);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    });
  });
}

// Logout
logoutBtn.addEventListener("click", () => {
  signOut(auth);
});
