// Updated Firebase imports
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
  enableIndexedDbPersistence,
  where,
  doc,
  setDoc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Firebase Config (same as before)
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

// Enable offline persistence
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.error("Multiple tabs open, persistence can only be enabled in one tab.");
  } else if (err.code === 'unimplemented') {
    console.error("The current browser does not support offline persistence.");
  }
});

// UI Elements
const authSection = document.getElementById("auth-section");
const chatSection = document.getElementById("chat-section");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const chatWindow = document.getElementById("chat-window");
const logoutBtn = document.getElementById("logout");
const userStatus = document.getElementById("user-status");
const contactsList = document.getElementById("contacts-list");
const newChatBtn = document.getElementById("new-chat-btn");
const newChatModal = document.getElementById("new-chat-modal");
const closeModalBtn = document.querySelector(".close-modal");
const userList = document.getElementById("user-list");
const userSearch = document.getElementById("user-search");
const backToContactsBtn = document.getElementById("back-to-contacts");
const currentChatInfo = document.getElementById("current-chat-info");
const contactsSidebar = document.getElementById("contacts-sidebar");

// Chat state
let currentChat = {
  id: null, // null for public chat, userID for private chat
  type: 'public', // 'public' or 'private'
  recipient: null // recipient user data for private chats
};

// Format timestamp (same as before)
function formatTimestamp(timestamp) {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate();
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

// Show modal
function showModal() {
  newChatModal.style.display = 'flex';
  loadAllUsers();
}

// Hide modal
function hideModal() {
  newChatModal.style.display = 'none';
}

// Load all users for new chat
async function loadAllUsers(searchTerm = '') {
  userList.innerHTML = '';
  const q = query(collection(db, "users"));
  const querySnapshot = await getDocs(q);
  
  querySnapshot.forEach((doc) => {
    const user = doc.data();
    if (user.uid !== auth.currentUser.uid && 
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase())) {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';
      userItem.innerHTML = `
        <div class="contact-avatar">${user.displayName.charAt(0).toUpperCase()}</div>
        <div class="contact-name">${user.displayName}</div>
        <div class="contact-status ${user.online ? 'online' : 'offline'}"></div>
      `;
      userItem.addEventListener('click', () => {
        startPrivateChat(user);
        hideModal();
      });
      userList.appendChild(userItem);
    }
  });
}

// Load contacts and add event listeners for private chats
async function loadContacts() {
  const contactsList = document.getElementById("contacts-list");
  contactsList.innerHTML = ''; // Clear the list

  // Add public chat option
  const publicChatItem = document.createElement('div');
  publicChatItem.className = `contact-item ${currentChat?.type === 'public' ? 'active' : ''}`;
  publicChatItem.innerHTML = `
    <div class="contact-avatar"><i class="fas fa-users"></i></div>
    <div class="contact-name">Public Chat</div>
  `;
  publicChatItem.addEventListener('click', () => {
    currentChat = { id: null, type: 'public', recipient: null };
    updateChatHeader();
    loadMessages();
  });
  contactsList.appendChild(publicChatItem);

  // Load users in the group chat
  const usersRef = collection(db, "users");
  const querySnapshot = await getDocs(usersRef);

  querySnapshot.forEach((doc) => {
    const user = doc.data();
    if (user.uid !== auth.currentUser.uid) { // Exclude the current user
      const contactItem = document.createElement('div');
      contactItem.className = 'contact-item';
      contactItem.innerHTML = `
        <div class="contact-avatar">${user.displayName.charAt(0).toUpperCase()}</div>
        <div class="contact-name">${user.displayName}</div>
      `;
      contactItem.addEventListener('click', () => {
        startPrivateChat(user);
      });
      contactsList.appendChild(contactItem);
    }
  });
}

// Start a private chat
async function startPrivateChat(recipient) {
  const chatId = [auth.currentUser.uid, recipient.uid].sort().join('_');

  currentChat = {
    id: chatId,
    type: 'private',
    recipient: recipient
  };

  updateChatHeader();
  loadMessages();

  // Add the recipient to the user's contacts
  await addContact(recipient);
}

// Add a contact
async function addContact(contact) {
  const contactRef = doc(db, "users", auth.currentUser.uid, "contacts", contact.uid);
  await setDoc(contactRef, {
    uid: contact.uid,
    displayName: contact.displayName,
    email: contact.email
  }, { merge: true });

  loadContacts();
}

// Update the chat header
function updateChatHeader() {
  const currentChatInfo = document.getElementById("current-chat-info");
  if (currentChat.type === 'public') {
    currentChatInfo.innerHTML = `
      <div class="contact-avatar"><i class="fas fa-users"></i></div>
      <div class="chat-title">Public Chat</div>
    `;
  } else {
    currentChatInfo.innerHTML = `
      <div class="contact-avatar">${currentChat.recipient.displayName.charAt(0).toUpperCase()}</div>
      <div class="chat-title">${currentChat.recipient.displayName}</div>
    `;
  }
}

// Load messages for the current chat
function loadMessages() {
  const chatWindow = document.getElementById("chat-window");
  if (window.messageListener) {
    window.messageListener();
  }

  chatWindow.innerHTML = '';

  let messagesQuery;
  if (currentChat.type === 'public') {
    messagesQuery = query(collection(db, "messages"), orderBy("timestamp"));
  } else {
    messagesQuery = query(
      collection(db, "privateChats", currentChat.id, "messages"),
      orderBy("timestamp")
    );
  }

  window.messageListener = onSnapshot(messagesQuery, (snapshot) => {
    chatWindow.innerHTML = '';
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const div = document.createElement('div');
      div.className = msg.uid === auth.currentUser.uid ? 'my-msg' : 'other-msg';
      div.innerHTML = `
        <span class="msg-info">${msg.displayName || 'Anonymous'} • ${formatTimestamp(msg.timestamp)}</span>
        ${msg.text}
      `;
      chatWindow.appendChild(div);
    });
    chatWindow.scrollTop = chatWindow.scrollHeight;
  });
}

// Send message
document.getElementById("message-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const messageInput = document.getElementById("message-input");
  const msg = messageInput.value.trim();
  if (msg === "") return;

  try {
    const messageData = {
      text: msg,
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
      timestamp: serverTimestamp()
    };

    if (currentChat.type === 'public') {
      await addDoc(collection(db, "messages"), messageData);
    } else {
      await addDoc(collection(db, "privateChats", currentChat.id, "messages"), messageData);
    }

    messageInput.value = "";
  } catch (error) {
    console.error("Failed to send message:", error);
  }
});

// Update user status in Firestore
async function updateUserStatus(online) {
  if (!auth.currentUser) return;
  
  const userRef = doc(db, "users", auth.currentUser.uid);
  await setDoc(userRef, {
    uid: auth.currentUser.uid,
    displayName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
    email: auth.currentUser.email,
    lastSeen: serverTimestamp(),
    online: online
  }, { merge: true });
}

// Auth State Change
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const usersRef = collection(db, "users");
    const userDoc = doc(usersRef, user.uid);
    await setDoc(userDoc, {
      uid: user.uid,
      displayName: user.displayName || user.email.split('@')[0],
      email: user.email
    }, { merge: true }); // Merge to avoid overwriting existing data
    loadContacts(); // Load contacts when user logs in

    // Update user status to online
    await updateUserStatus(true);
    
    // Set up UI
    authSection.style.display = "none";
    chatSection.style.display = "block";
    userStatus.textContent = user.displayName || user.email;
    
    // Load messages
    loadMessages();
    messageInput.focus();
  } else {
    // Update user status to offline
    if (auth.currentUser) {
      await updateUserStatus(false);
    }
    
    // Reset UI
    authSection.style.display = "block";
    chatSection.style.display = "none";
    userStatus.textContent = "";
    currentChat = { id: null, type: 'public', recipient: null };
  }
});

// Event listeners
newChatBtn.addEventListener('click', showModal);
closeModalBtn.addEventListener('click', hideModal);
backToContactsBtn.addEventListener('click', () => {
  contactsSidebar.classList.add('active');
});

userSearch.addEventListener('input', (e) => {
  loadAllUsers(e.target.value);
});

// Window event listeners
window.addEventListener('beforeunload', async () => {
  if (auth.currentUser) {
    await updateUserStatus(false);
  }
});

window.addEventListener('online', () => {
  if (auth.currentUser) {
    updateUserStatus(true);
  }
});

window.addEventListener('offline', () => {
  if (auth.currentUser) {
    updateUserStatus(false);
  }
});

// Google Sign-In (same as before)
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

// Email/Password Sign-In (same as before)
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

// Logout (same as before)
logoutBtn.addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      showToast("Logged out successfully", 'success');
    })
    .catch(error => {
      showToast("Logout failed", 'error');
    });
});

// Toast notification (same as before)
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