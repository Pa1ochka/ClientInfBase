const API_URL = 'http://127.0.0.1:8000';
let token = null;
let currentUsername = null;

document.addEventListener('DOMContentLoaded', () => {
    const sectionsToLoad = [
        { fileName: 'auth', container: '#main-content', sectionId: 'auth-section' },
        { fileName: 'create-user', container: '#main-content', sectionId: 'create-user-section' },
        { fileName: 'create-client', container: '#main-content', sectionId: 'create-client-section' },
        { fileName: 'clients', container: '#main-content', sectionId: 'clients-section' },
        { fileName: 'edit-client', container: '#modal-container', sectionId: 'edit-modal' },
        { fileName: 'profile', container: '#modal-container', sectionId: 'profile-modal' }
    ];

    Promise.all(sectionsToLoad.map(section =>
        loadSection(section.fileName, section.container, section.sectionId)
    )).then(() => {
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
                    section.style.display = sectionId === 'auth-section' ? 'block' : 'none';
                    container.appendChild(section);
                }
            }
        })
        .catch(error => console.error(`Ошибка загрузки ${fileName}.html:`, error));
}

function checkAuthStatus() {
    token = localStorage.getItem('token');
    if (token) {
        fetchCurrentUser().then(() => {
            showManagementSection();
            showSection('clients-section');
        }).catch(() => {
            console.error('Не удалось загрузить данные пользователя при старте');
            document.getElementById('auth-section').style.display = 'block';
            document.getElementById('sidebar-nav').style.display = 'none';
        });
    } else {
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('sidebar-nav').style.display = 'none';
    }
}

function showManagementSection() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('sidebar-nav').style.display = 'flex';
    document.getElementById('current-user').textContent = `${currentUsername || 'Неизвестно'}`;
}

async function fetchCurrentUser() {
    const response = await axios.get(`${API_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    currentUsername = response.data.username;
    return response.data;
}

function showSection(sectionId) {
    const sections = ['create-user-section', 'create-client-section', 'clients-section'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.display = id === sectionId ? 'block' : 'none';
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