let API_URL;
let token = null;
let currentUsername = null;

async function loadConfig() {
    try {
        const response = await fetch('/config');
        const config = await response.json();
        API_URL = config.api_url;
    } catch (error) {
        console.error('Ошибка загрузки конфигурации:', error);
        API_URL = ''; // Используем относительный путь на случай ошибки
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();

    const sectionsToLoad = [
        { fileName: 'auth', container: '#main-content', sectionId: 'auth-section' },
        { fileName: 'create-user', container: '#main-content', sectionId: 'create-user-section' },
        { fileName: 'create-client', container: '#main-content', sectionId: 'create-client-section' },
        { fileName: 'clients', container: '#main-content', sectionId: 'clients-section' },
        { fileName: 'edit-client', container: '#modal-container', sectionId: 'edit-modal' },
        { fileName: 'profile', container: '#modal-container', sectionId: 'profile-modal' },
        { fileName: 'create-client', container: '#modal-container', sectionId: 'address-modal' },
        { fileName: 'edit-client', container: '#modal-container', sectionId: 'edit-address-modal' },
        { fileName: 'create-user', container: '#modal-container', sectionId: 'create-user-modal' }, // Модальное окно создания
        { fileName: 'create-user', container: '#modal-container', sectionId: 'edit-user-modal' }  // Модальное окно редактирования
    ];

    await Promise.all(sectionsToLoad.map(section =>
        loadSection(section.fileName, section.container, section.sectionId)
    )).then(() => {
        console.log('All sections loaded successfully');
        initializeAuthListeners();
        initializeCreateUserListeners();
        initializeCreateClientListeners();
        initializeClientsListeners();
        initializeProfileListeners();
        checkAuthStatus();
    }).catch(error => {
        console.error('Ошибка при загрузке секций:', error);
    });
});

function loadSection(fileName, containerSelector, sectionId) {
    return fetch(`/static/${fileName}.html`)
        .then(response => response.text())
        .then(html => {
            const container = document.querySelector(containerSelector);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const section = tempDiv.querySelector(`#${sectionId}`);
            if (section) {
                if (!container.querySelector(`#${sectionId}`)) {
                    section.style.display = sectionId === 'auth-section' ? 'flex' : 'none';
                    container.appendChild(section);
                }
            }
        })
        .catch(error => console.error(`Ошибка загрузки ${fileName}.html:`, error));
}

function checkAuthStatus() {
    token = localStorage.getItem('token');
    const authSection = document.getElementById('auth-section');
    const sidebar = document.getElementById('sidebar-nav');

    if (token && token !== 'null') {
        fetchCurrentUser().then(() => {
            showManagementSection();
            showSection('clients-section');
            authSection.style.display = 'none';
        }).catch((error) => {
            console.error('Не удалось загрузить данные пользователя при старте:', error);
            authSection.style.display = 'flex';
            setTimeout(() => authSection.classList.add('active'), 10);
            sidebar.style.display = 'none';
            localStorage.removeItem('token'); // Удаляем невалидный токен
        });
    } else {
        authSection.style.display = 'flex';
        setTimeout(() => authSection.classList.add('active'), 10);
        sidebar.style.display = 'none';
        const sections = ['create-user-section', 'create-client-section', 'clients-section'];
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) section.style.display = 'none';
        });
    }
}

function initializeClientsListeners() {
    const clientsBtn = document.getElementById('clients-btn');
    if (clientsBtn) {
        clientsBtn.addEventListener('click', () => {
            showSection('clients-section');
            loadClients(); // Автоматическая загрузка списка клиентов
        });
    }
    // ... (остальной код остается без изменений)
}

function showManagementSection() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('sidebar-nav').style.display = 'flex';
    document.getElementById('current-user').textContent = `${currentUsername || 'Неизвестно'}`;
    updateSidebarMenu();
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-icons">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}</span>
        <p>${message}</p>
    `;

    const toastContainer = document.getElementById('toast-container');
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}

async function fetchCurrentUser() {
    const response = await axios.get(`${API_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    currentUsername = response.data.username;
    document.getElementById('sidebar-avatar').src = response.data.avatar_url || '/static/img/default-avatar.png';
    document.getElementById('current-user').textContent = currentUsername;
    return response.data;
}
function showSection(sectionId) {
    const sections = ['create-user-section', 'create-client-section', 'clients-section'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            if (id === sectionId) {
                setTimeout(() => {
                    section.style.display = 'block';
                    setTimeout(() => section.classList.add('active'), 10);
                }, 300); // Ждем завершения анимации закрытия
            } else {
                section.classList.remove('active');
                setTimeout(() => section.style.display = 'none', 300);
            }
        }
    });
    const buttons = ['create-user-btn', 'create-client-btn', 'clients-btn'];
    buttons.forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            button.classList.toggle('active', id === `${sectionId.replace('-section', '-btn')}`);
        }
    });
}

function updateSidebarMenu() {
    fetch(`${API_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(user => {
        const isAdmin = user.is_admin;
        document.getElementById('create-user-btn').style.display = isAdmin ? 'flex' : 'none';
        document.getElementById('create-client-btn').style.display = isAdmin ? 'flex' : 'none';
        document.getElementById('clients-btn').style.display = 'flex';
        document.getElementById('profile-btn').style.display = 'flex';
        document.getElementById('logout-btn').style.display = 'flex';
        document.getElementById('sidebar-avatar').src = user.avatar_url || '/static/img/default-avatar.png';
    })
    .catch(error => {
        console.error('Ошибка получения данных пользователя:', error);
    });
}