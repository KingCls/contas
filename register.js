// register.js

import firebaseConfig from './firebaseConfig.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-auth.js';

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

// Manipulação do formulário de registro
document.getElementById('register-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const nickname = document.getElementById('register-nickname').value;
  const email = document.getElementById('register-email').value;
  const senha = document.getElementById('register-password').value;
  const confirmSenha = document.getElementById('register-confirm-password').value;

  if (senha !== confirmSenha) {
    showToast('As senhas não coincidem.', 'error');
    return;
  }

  createUserWithEmailAndPassword(auth, email, senha)
    .then((userCredential) => {
      // Atualizar o perfil do usuário com o NickName
      updateProfile(userCredential.user, {
        displayName: nickname
      })
        .then(() => {
          showToast('Usuário cadastrado com sucesso!');
          window.location.href = 'dashboard.html';
        })
        .catch((error) => {
          console.error('Erro ao atualizar o perfil:', error);
          showToast('Erro ao atualizar o perfil: ' + error.message, 'error');
        });
    })
    .catch((error) => {
      console.error('Erro no cadastro:', error);
      showToast('Erro no cadastro: ' + error.message, 'error');
    });
});
