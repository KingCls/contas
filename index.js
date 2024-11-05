// index.js

import firebaseConfig from './firebaseConfig.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-auth.js';

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Função para exibir notificações toast
function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.classList.add('toast');
  toast.textContent = message;

  if (type === 'error') {
    toast.style.backgroundColor = '#ff6b81';
  }

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Manipulação do formulário de login
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const senha = document.getElementById('login-password').value;

  signInWithEmailAndPassword(auth, email, senha)
    .then(() => {
      window.location.href = 'dashboard.html';
    })
    .catch(error => {
      console.error('Erro no login:', error);
      showToast('Erro no login: ' + error.message, 'error');
    });
});
