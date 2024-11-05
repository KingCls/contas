// dashboard.js

import firebaseConfig from './firebaseConfig.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js';

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentAccount = null; // Variável global para armazenar a conta atual
let currentUser = null; // Variável para armazenar o usuário atual

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

// Proteger a página para usuários autenticados
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log('Usuário autenticado:', currentUser.uid);

    // Exibir o NickName do usuário
    const userNicknameElement = document.getElementById('user-nickname');
    userNicknameElement.textContent = `Olá, ${currentUser.displayName || 'Usuário'}!`;

    initApp();
  } else {
    window.location.href = 'index.html';
  }
});

function initApp() {
  // Botão de logout
  document.getElementById('logout-button').addEventListener('click', () => {
    signOut(auth)
      .then(() => {
        window.location.href = 'index.html';
      })
      .catch((error) => {
        console.error('Erro ao fazer logout:', error);
      });
  });
  document.getElementById('import-account-button').addEventListener('click', () => {
    document.getElementById('import-account-modal').classList.remove('hidden');
  });

  // Fechar o modal de importar conta
  document.getElementById('close-import-account-modal').addEventListener('click', () => {
    document.getElementById('import-account-modal').classList.add('hidden');
    document.getElementById('import-account-form').reset();
  });

  // Processar o formulário de importação
  document.getElementById('import-account-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const importText = document.getElementById('import-text').value;
    try {
      const accountsData = parseAccountText(importText);
      if (accountsData && accountsData.length > 0) {
        for (const accountData of accountsData) {
          // Adicionar a conta ao Firestore
          await addDoc(collection(db, 'contas'), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            nickname: accountData.nickname,
            login: accountData.login,
            senha: accountData.senhaLogin,
            email: accountData.email,
            emailPassword: accountData.senhaEmail,
            tipo: accountData.tipo,
            elo: 'Unranked_Rank', // Pode ajustar conforme necessário
            skins: 'N/A', // Pode ajustar conforme necessário
            statusUso: 'Ativa',
            statusCondicao: 'Safe',
            suspensionDate: null,
            createdAt: serverTimestamp(),
          });
        }
        showToast('Conta(s) importada(s) com sucesso!');
        document.getElementById('import-account-modal').classList.add('hidden');
        document.getElementById('import-account-form').reset();
      } else {
        showToast('Não foi possível extrair as informações das contas.', 'error');
      }
    } catch (error) {
      console.error('Erro ao importar conta:', error);
      showToast('Erro ao importar conta: ' + error.message, 'error');
    }
  });

  // Função para extrair as informações das contas do texto
  function parseAccountText(text) {
    const accounts = [];
    const entries = text.split(/\n\s*\n/); // Divide por duplas quebras de linha para separar múltiplas contas

    entries.forEach((entry) => {
      const lines = entry.split('\n');
      let email = '';
      let senhaEmail = '';
      let login = '';
      let senhaLogin = '';
      let tipo = '';
      let nickname = '';

      const simpleFormatMatches = entry.match(/^([^:\s]+):(.+)$/gm); // Para formato simples login:senha
      if (simpleFormatMatches) {
        simpleFormatMatches.forEach((line) => {
          const [user, pass] = line.split(':');
          login = user.trim();
          senhaLogin = pass.trim();
          nickname = login + '#';
          tipo = 'NFA';
          accounts.push({
            email: null,
            senhaEmail: null,
            login,
            senhaLogin,
            tipo,
            nickname,
          });
        });
      } else {
        // Tenta extrair informações de formatos complexos
        lines.forEach((line) => {
          line = line.trim();
          if (line.toLowerCase().includes('full acesso') || line.toLowerCase().includes('full access') || line.toLowerCase().includes('fa')) {
            tipo = 'FA';
          } else if (line.toLowerCase().includes('no full acesso') || line.toLowerCase().includes('nfa') || line.toLowerCase().includes('no full access')) {
            tipo = 'NFA';
          }

          if (line.startsWith('Email:')) {
            email = line.replace('Email:', '').trim();
          } else if (line.startsWith('Senha:') && email && !senhaEmail) {
            senhaEmail = line.replace('Senha:', '').trim();
          } else if (line.startsWith('Usuário:')) {
            login = line.replace('Usuário:', '').trim();
          } else if (line.startsWith('Senha:') && login && !senhaLogin) {
            senhaLogin = line.replace('Senha:', '').trim();
          }
        });

        if (login && senhaLogin) {
          if (!tipo) {
            tipo = email ? 'FA' : 'NFA';
          }
          nickname = login + '#';
          accounts.push({
            email: email || null,
            senhaEmail: senhaEmail || null,
            login,
            senhaLogin,
            tipo,
            nickname,
          });
        }
      }
    });

    return accounts;
  }
  // Controle do passo a passo
  let currentStep = 1;
  const totalSteps = 4;
  const steps = document.querySelectorAll('.step');
  const nextBtn = document.getElementById('next-step');
  const prevBtn = document.getElementById('prev-step');
  const submitBtn = document.getElementById('submit-account');

  function showStep(step) {
    steps.forEach((stepDiv, index) => {
      if (index === step - 1) {
        stepDiv.classList.remove('hidden');
      } else {
        stepDiv.classList.add('hidden');
      }
    });

    updateEmailFields();

    // Controlar a visibilidade dos botões
    if (step === 1) {
      prevBtn.classList.add('hidden');
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
    } else if (step === totalSteps) {
      prevBtn.classList.remove('hidden');
      nextBtn.classList.add('hidden');
      submitBtn.classList.remove('hidden');
    } else {
      prevBtn.classList.remove('hidden');
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
    }
  }

  nextBtn.addEventListener('click', () => {
    if (currentStep < totalSteps) {
      currentStep++;
      showStep(currentStep);
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      showStep(currentStep);
    }
  });

  // Atualizar a exibição dos campos de email e senha do email no Passo 4
  const tipoSelect = document.getElementById('tipo');
  const emailGroup = document.getElementById('email-group');
  const emailPasswordGroup = document.getElementById('email-password-group');
  const emailField = document.getElementById('email');
  const emailPasswordField = document.getElementById('email-password');

  function updateEmailFields() {
    if (tipoSelect.value === 'FA' && currentStep === 4) {
      emailGroup.style.display = 'block';
      emailPasswordGroup.style.display = 'block';
      emailField.required = true;
      emailPasswordField.required = true;
    } else {
      emailGroup.style.display = 'none';
      emailPasswordGroup.style.display = 'none';
      emailField.required = false;
      emailPasswordField.required = false;
    }
  }

  tipoSelect.addEventListener('change', updateEmailFields);

  // Mostrar o modal de adicionar conta ao clicar no botão
  document.getElementById('add-account-button').addEventListener('click', () => {
    document.getElementById('add-account-modal').classList.remove('hidden');
    currentStep = 1;
    showStep(currentStep);
  });

  // Fechar o modal ao clicar no botão de fechar
  document.getElementById('close-add-account-modal').addEventListener('click', () => {
    document.getElementById('add-account-modal').classList.add('hidden');
    resetForm();
  });

  // Atualizar o campo de data de suspensão com base na condição da conta
  const statusCondicaoSelect = document.getElementById('status-condicao');
  const suspensionGroup = document.getElementById('suspension-group');

  statusCondicaoSelect.addEventListener('change', () => {
    if (statusCondicaoSelect.value === 'Suspensa') {
      suspensionGroup.classList.remove('hidden');
    } else {
      suspensionGroup.classList.add('hidden');
      document.getElementById('suspension-date').value = '';
    }
  });

  // Atualizar a imagem do elo ao selecionar um novo elo
  const eloSelect = document.getElementById('elo');
  const eloImage = document.getElementById('elo-image');

  eloSelect.addEventListener('change', () => {
    const selectedElo = eloSelect.value;
    eloImage.src = `rank_png/${selectedElo}.png`;
    eloImage.alt = `Elo ${selectedElo}`;
  });

  // Submissão do formulário para adicionar nova conta
  document.getElementById('add-account-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nickname = document.getElementById('nickname').value;
    const login = document.getElementById('login').value;
    const senha = document.getElementById('senha').value;
    const tipo = document.getElementById('tipo').value;
    const elo = document.getElementById('elo').value;
    const skins = document.getElementById('skins').value;
    const statusUso = document.getElementById('status-uso').value;
    const statusCondicao = document.getElementById('status-condicao').value;
    const suspensionDate = document.getElementById('suspension-date').value;
    const email = emailField.value || null;
    const emailPassword = emailPasswordField.value || null;

    // Validar se o email e senha do email são obrigatórios para contas FA
    if (tipo === 'FA') {
      if (!email || email.trim() === '') {
        showToast('Por favor, insira o email para contas FA.', 'error');
        return;
      }
      if (!emailPassword || emailPassword.trim() === '') {
        showToast('Por favor, insira a senha do email para contas FA.', 'error');
        return;
      }
    }

    try {
      console.log('Adicionando conta para userId:', currentUser.uid, 'email:', currentUser.email);

      await addDoc(collection(db, 'contas'), {
        userId: currentUser.uid, // Associar a conta ao usuário atual
        userEmail: currentUser.email, // Armazenar o email do usuário
        nickname,
        login,
        senha,
        email,
        emailPassword,
        tipo,
        elo,
        skins,
        statusUso,
        statusCondicao,
        suspensionDate: suspensionDate ? new Date(suspensionDate) : null,
        createdAt: serverTimestamp(),
      });
      showToast('Conta adicionada com sucesso!');
      document.getElementById('add-account-modal').classList.add('hidden');
      resetForm();
    } catch (error) {
      console.error('Erro ao adicionar conta:', error);
      showToast('Erro ao adicionar conta: ' + error.message, 'error');
    }
  });

  function resetForm() {
    document.getElementById('add-account-form').reset();
    currentStep = 1;
    showStep(currentStep);
    // Resetar a imagem do elo
    eloImage.src = '';
  }

  // Lógica para exibir as contas
  let filterName = '';
  let filterElo = '';
  let filterType = '';

  // Elementos do filtro
  const filterNameInput = document.getElementById('filter-name');
  const filterEloSelect = document.getElementById('filter-elo');
  const filterTypeSelect = document.getElementById('filter-type');

  // Event Listeners para busca instantânea
  filterNameInput.addEventListener('input', () => {
    filterName = filterNameInput.value.trim().toLowerCase();
    renderAccounts();
  });

  filterEloSelect.addEventListener('change', () => {
    filterElo = filterEloSelect.value;
    renderAccounts();
  });

  filterTypeSelect.addEventListener('change', () => {
    filterType = filterTypeSelect.value;
    renderAccounts();
  });

  // Obter contas do usuário atual em tempo real
  const contasCol = collection(db, 'contas');
  const contasQuery = query(contasCol, where('userId', '==', currentUser.uid));
  let allAccounts = [];

  onSnapshot(contasQuery, (snapshot) => {
    allAccounts = [];
    snapshot.forEach((docData) => {
      const account = { id: docData.id, data: docData.data() };
      allAccounts.push(account);
    });
    renderAccounts();
  });

  document.getElementById('reset-filter-button').addEventListener('click', () => {
    // Limpa os filtros
    filterName = '';
    filterElo = '';
    filterType = '';
  
    // Reseta os valores dos inputs e selects para o padrão
    filterNameInput.value = '';
    filterEloSelect.value = '';
    filterTypeSelect.value = '';
  
    // Renderiza novamente as contas sem os filtros
    renderAccounts();
  });

  // Função para renderizar as contas aplicando os filtros
  function renderAccounts() {
    const accountsTableBody = document.querySelector('#accounts-table tbody');
    accountsTableBody.innerHTML = '';

    // Filtrar as contas
    const filteredAccounts = allAccounts.filter((accountObj) => {
      const account = accountObj.data;
      const matchesName = account.nickname.toLowerCase().includes(filterName);
      const matchesElo = filterElo ? account.elo === filterElo : true;
      const matchesType = filterType ? account.tipo === filterType : true;
      return matchesName && matchesElo && matchesType;
    });

    // Verificar se há contas para exibir
    if (filteredAccounts.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="6" style="text-align: center;">Nenhuma conta encontrada.</td>
      `;
      accountsTableBody.appendChild(tr);
    } else {
      // Renderizar as contas filtradas
      filteredAccounts.forEach((accountObj) => {
        renderAccount(accountObj);
      });
    }
  }

  // Função para renderizar uma conta na tabela (modificada)
  function renderAccount(accountObj) {
    const accountsTableBody = document.querySelector('#accounts-table tbody');
    const tr = document.createElement('tr');
    const account = accountObj.data;
    const docId = accountObj.id;
    const eloImg = `rank_png/${account.elo}.png`;
    const statusUsoClass = updateStatusUsoColor(account.statusUso);
    const statusCondicaoClass = updateStatusCondicaoColor(account.statusCondicao);

    tr.innerHTML = `
      <td>${account.nickname}</td>
      <td>${account.tipo}</td>
      <td><img src="${eloImg}" alt="${account.elo}" class="elo-icon"></td>
      <td class="${statusUsoClass}">${account.statusUso}</td>
      <td class="${statusCondicaoClass}">${account.statusCondicao}</td>
      <td class="actions">
        <button class="view">Ver</button>
        <button class="delete">Excluir</button>
      </td>
    `;

    // Botão Ver
    tr.querySelector('.view').addEventListener('click', () => {
      showAccountDetails(account, docId);
    });

    // Botão Excluir
    tr.querySelector('.delete').addEventListener('click', async () => {
      const confirmDelete = confirm('Tem certeza que deseja excluir esta conta?');
      if (confirmDelete) {
        const docRef = doc(db, 'contas', docId);
        await deleteDoc(docRef);
        showToast('Conta excluída com sucesso!');
      }
    });

    accountsTableBody.appendChild(tr);
  }

  // Funções para atualizar a cor dos status
  function updateStatusUsoColor(status) {
    if (status === 'Ativa') return 'status-ativa';
    if (status === 'Inativa') return 'status-inativa';
    return '';
  }

  function updateStatusCondicaoColor(status) {
    if (status === 'Safe') return 'status-safe';
    if (status === 'Suspensa') return 'status-suspensa';
    if (status === 'Banida') return 'status-banida';
    return '';
  }

  // Mostrar detalhes da conta em um modal
  function showAccountDetails(account, docId) {
    const modal = document.getElementById('account-modal');
    modal.classList.remove('hidden');

    currentAccount = account; // Armazenar a conta atual
    currentAccount.id = docId; // Armazenar o ID do documento

    document.getElementById('modal-nickname').textContent = account.nickname;
    document.getElementById('modal-email').textContent = account.email || 'N/A';
    document.getElementById('modal-login').textContent = account.login;
    document.getElementById('modal-senha').textContent = '••••••••';
    document.getElementById('modal-senha').classList.add('password-hidden');
    document.querySelector('.toggle-password i').classList.remove('fa-eye-slash');
    document.querySelector('.toggle-password i').classList.add('fa-eye');
    document.getElementById('modal-tipo').textContent = account.tipo;
    document.getElementById('modal-skins').textContent = account.skins;
    document.getElementById('modal-status-uso').textContent = account.statusUso;
    document.getElementById('modal-status-condicao').textContent = account.statusCondicao;

    // Mostrar ou esconder o campo de email e senha do email
    const emailDetail = document.getElementById('email-detail');
    const emailPasswordDetail = document.getElementById('email-password-detail');
    if (account.tipo === 'FA') {
      emailDetail.style.display = 'flex';
      emailPasswordDetail.style.display = 'flex';
      document.getElementById('modal-email-password').textContent = '••••••••';
      document.getElementById('modal-email-password').classList.add('password-hidden');
    } else {
      emailDetail.style.display = 'none';
      emailPasswordDetail.style.display = 'none';
    }

    // Mostrar ou esconder a data de suspensão
    const suspensionDateDetail = document.getElementById('suspension-date-detail');
    if (account.statusCondicao === 'Suspensa' && account.suspensionDate) {
      suspensionDateDetail.style.display = 'flex';
      const fimSuspensao = account.suspensionDate.toDate();
      document.getElementById('modal-suspension-date').textContent = fimSuspensao.toLocaleDateString();

      // Calcular dias restantes
      const hoje = new Date();
      const diffTime = fimSuspensao - hoje;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diasRestantes = diffDays > 0 ? diffDays : 0;
      document.getElementById('modal-days-left').textContent = diasRestantes;
    } else {
      suspensionDateDetail.style.display = 'none';
    }

    const eloIcon = document.getElementById('modal-elo-icon');
    eloIcon.src = `rank_png/${account.elo}.png`;
    eloIcon.alt = account.elo;

    // Fechar o modal de detalhes
    document.getElementById('close-modal').addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    // Botão para editar informações
    document.getElementById('edit-account-button').addEventListener('click', () => {
      showEditAccountModal(account, docId);
    });
  }

  // Mostrar modal para editar informações da conta
  function showEditAccountModal(account, docId) {
    const modal = document.getElementById('edit-account-modal');
    modal.classList.remove('hidden');

    // Preencher os campos com as informações atuais
    document.getElementById('edit-nickname').value = account.nickname;
    document.getElementById('edit-senha').value = account.senha;
    document.getElementById('edit-elo').value = account.elo;
    document.getElementById('edit-skins').value = account.skins;
    document.getElementById('edit-status-uso').value = account.statusUso;
    document.getElementById('edit-status-condicao').value = account.statusCondicao;

    // Mostrar ou esconder o campo de data de suspensão
    const editSuspensionGroup = document.getElementById('edit-suspension-group');
    const editSuspensionDate = document.getElementById('edit-suspension-date');
    if (account.statusCondicao === 'Suspensa') {
      editSuspensionGroup.classList.remove('hidden');
      editSuspensionDate.value = account.suspensionDate
        ? account.suspensionDate.toDate().toISOString().substr(0, 10)
        : '';
    } else {
      editSuspensionGroup.classList.add('hidden');
      editSuspensionDate.value = '';
    }

    // Atualizar o campo de data de suspensão com base na nova condição
    const editStatusCondicaoSelect = document.getElementById('edit-status-condicao');
    editStatusCondicaoSelect.addEventListener('change', () => {
      if (editStatusCondicaoSelect.value === 'Suspensa') {
        editSuspensionGroup.classList.remove('hidden');
      } else {
        editSuspensionGroup.classList.add('hidden');
        editSuspensionDate.value = '';
      }
    });

    // Mostrar ou esconder os campos de email e senha do email
    const editEmailGroup = document.getElementById('edit-email-group');
    const editEmailPasswordGroup = document.getElementById('edit-email-password-group');
    if (account.tipo === 'FA') {
      editEmailGroup.style.display = 'block';
      editEmailPasswordGroup.style.display = 'block';
      document.getElementById('edit-email').value = account.email;
      document.getElementById('edit-email-password').value = account.emailPassword;
    } else {
      editEmailGroup.style.display = 'none';
      editEmailPasswordGroup.style.display = 'none';
    }

    // Submissão do formulário para salvar as alterações
    document.getElementById('edit-account-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const newNickname = document.getElementById('edit-nickname').value;
      const newSenha = document.getElementById('edit-senha').value;
      const newElo = document.getElementById('edit-elo').value;
      const newSkins = document.getElementById('edit-skins').value;
      const newStatusUso = document.getElementById('edit-status-uso').value;
      const newStatusCondicao = document.getElementById('edit-status-condicao').value;
      const newSuspensionDateValue = editSuspensionDate.value ? new Date(editSuspensionDate.value) : null;
      const newEmail = document.getElementById('edit-email').value || null;
      const newEmailPassword = document.getElementById('edit-email-password').value || null;

      try {
        const docRef = doc(db, 'contas', docId);
        await updateDoc(docRef, {
          nickname: newNickname,
          senha: newSenha,
          elo: newElo,
          skins: newSkins,
          statusUso: newStatusUso,
          statusCondicao: newStatusCondicao,
          suspensionDate: newSuspensionDateValue,
          email: newEmail,
          emailPassword: newEmailPassword,
        });
        showToast('Informações atualizadas com sucesso!');
        modal.classList.add('hidden');
        document.getElementById('account-modal').classList.add('hidden');
      } catch (error) {
        console.error('Erro ao atualizar informações:', error);
        showToast('Erro ao atualizar informações: ' + error.message, 'error');
      }
    });

    // Fechar o modal de editar informações
    document.getElementById('close-edit-account-modal').addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  // Função para copiar texto para a área de transferência
  window.copyToClipboard = function (elementId) {
    let text = document.getElementById(elementId).textContent;
    if (elementId === 'modal-senha' && text === '••••••••') {
      showToast('Primeiro revele a senha para copiá-la.', 'error');
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast('Texto copiado para a área de transferência!');
      })
      .catch((err) => {
        console.error('Erro ao copiar texto: ', err);
      });
  };



  // Função para alternar a visibilidade da senha
  window.togglePasswordVisibility = function (elementId) {
    const senhaSpan = document.getElementById(elementId);
    const toggleButtonIcon = senhaSpan.nextElementSibling.querySelector('i');
    let fieldName = '';
    if (elementId === 'modal-senha') {
      fieldName = 'senha';
    } else if (elementId === 'modal-email-password') {
      fieldName = 'emailPassword';
    }
    if (senhaSpan.classList.contains('password-hidden')) {
      senhaSpan.textContent = currentAccount[fieldName];
      senhaSpan.classList.remove('password-hidden');
      toggleButtonIcon.classList.remove('fa-eye');
      toggleButtonIcon.classList.add('fa-eye-slash');
    } else {
      senhaSpan.textContent = '••••••••';
      senhaSpan.classList.add('password-hidden');
      toggleButtonIcon.classList.remove('fa-eye-slash');
      toggleButtonIcon.classList.add('fa-eye');
    }
  };
}
