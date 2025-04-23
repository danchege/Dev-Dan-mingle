// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  updateProfile 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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
auth.useDeviceLanguage();
auth.settings.appVerificationDisabledForTesting = true;

// Enable offline persistence
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.error("Multiple tabs open, persistence can only be enabled in one tab.");
  } else if (err.code === 'unimplemented') {
    console.error("The current browser does not support offline persistence.");
  }
});

// Firebase Security Rules
const securityRules = {
  "rules": {
    "messages": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
};

// UI Elements
const authSection = document.getElementById("auth-section");
const chatSection = document.getElementById("chat-section");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const chatWindow = document.getElementById("chat-window");
const logoutBtn = document.getElementById("logout");
const userStatus = document.getElementById("user-status");

// Format timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate();
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

// Google Sign-In
document.getElementById("google-signin").addEventListener("click", () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then(result => {
      const user = result.user;
      if (!user.displayName) {
        const displayName = prompt("Enter a display name:");
        if (displayName) {
          updateProfile(user, { displayName });
        }
      }
    })
    .catch(error => {
      showToast(error.message, 'error');
    });
});

// Email/Password Sign-In
document.getElementById("email-login-form").addEventListener("submit", e => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  
  signInWithEmailAndPassword(auth, email, pass)
    .then(userCredential => {
      const user = userCredential.user;
      if (!user.displayName) {
        const displayName = prompt("Enter a display name:");
        if (displayName) {
          updateProfile(user, { displayName });
        }
      }
    })
    .catch(error => {
      showToast(error.message, 'error');
    });
});

// Auth State Change
onAuthStateChanged(auth, user => {
  if (user) {
    authSection.style.display = "none";
    chatSection.style.display = "block";
    userStatus.textContent = user.displayName || user.email;
    listenForMessages();
    messageInput.focus();
  } else {
    authSection.style.display = "block";
    chatSection.style.display = "none";
    userStatus.textContent = "";
  }
});

// Send message
messageForm.addEventListener("submit", async e => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (msg === "") return;

  try {
    await addDoc(collection(db, "messages"), {
      text: msg,
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
      timestamp: serverTimestamp()
    });
    messageInput.value = "";
  } catch (error) {
    showToast("Failed to send message", 'error');
  }
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
      
      const displayName = msg.displayName || "Anonymous";
      const timestamp = formatTimestamp(msg.timestamp);
      
      div.innerHTML = `
        <span class="msg-info">${displayName} • ${timestamp}</span>
        ${msg.text}
      `;
      
      chatWindow.appendChild(div);
    });
    // Auto-scroll to bottom
    chatWindow.scrollTop = chatWindow.scrollHeight;
  });
}

// Logout
logoutBtn.addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      showToast("Logged out successfully", 'success');
    })
    .catch(error => {
      showToast("Logout failed", 'error');
    });
});

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Add toast styles dynamically
const toastStyles = document.createElement("style");
toastStyles.textContent = `
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast.show {
  opacity: 1;
}

.toast-success {
  background-color: var(--success);
}

.toast-error {
  background-color: var(--danger);
}

.toast-info {
  background-color: var(--info);
}
`;
document.head.appendChild(toastStyles);

// Prevent form submission on Enter key in inputs
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.type !== 'text') {
      e.preventDefault();
    }
  });
});

// Only for testing!
