const API_URL = 'http://127.0.0.1:8000';
let token = null;
let currentUsername = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await axios.post(`${API_URL}/token`, new URLSearchParams({
                username: email,
                password: password
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            token = response.data.access_token;
            localStorage.setItem('token', token);
            await fetchCurrentUser();
            document.getElementById('auth-message').textContent = 'Успешный вход!';
            document.getElementById('auth-message').classList.add('success');
            showManagementSection();
            loadClients();
        } catch (error) {
            document.getElementById('auth-message').textContent = error.response?.data?.detail || 'Ошибка входа';
            document.getElementById('auth-message').classList.add('error');
        }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        token = null;
        currentUsername = null;
        localStorage.removeItem('token');
        document.getElementById('management-section').style.display = 'none';
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('auth-message').textContent = '';
    });

    document.getElementById('create-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userData = {
            email: document.getElementById('user-email').value,
            username: document.getElementById('user-username').value,
            password: document.getElementById('user-password').value
        };

        try {
            const response = await axios.post(`${API_URL}/users/`, userData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            document.getElementById('user-message').textContent = 'Пользователь создан!';
            document.getElementById('user-message').classList.add('success');
            document.getElementById('create-user-form').reset();
        } catch (error) {
            document.getElementById('user-message').textContent = error.response?.data?.detail || 'Ошибка создания пользователя';
            document.getElementById('user-message').classList.add('error');
        }
    });

    document.getElementById('create-client-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const clientData = {
            account_number: document.getElementById('client-account-number').value,
            owner_name: document.getElementById('client-owner-name').value,
            email: document.getElementById('client-email').value,
            phone_number: document.getElementById('client-phone-number').value,
            inn: document.getElementById('client-inn').value,
            postal_address: document.getElementById('client-postal-address').value,
            connected_power: parseFloat(document.getElementById('client-connected-power').value) || null,
            passport_data: document.getElementById('client-passport-data').value || null,
            snils: document.getElementById('client-snils').value || null,
            connection_date: document.getElementById('client-connection-date').value || null,
            power_source: document.getElementById('client-power-source').value || null,
            additional_info: document.getElementById('client-additional-info').value || null
        };

        try {
            const response = await axios.post(`${API_URL}/clients/`, clientData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            document.getElementById('client-message').textContent = 'Клиент создан!';
            document.getElementById('client-message').classList.add('success');
            document.getElementById('create-client-form').reset();
            loadClients();
        } catch (error) {
            document.getElementById('client-message').textContent = error.response?.data?.detail || 'Ошибка создания клиента';
            document.getElementById('client-message').classList.add('error');
        }
    });

    document.getElementById('search-btn').addEventListener('click', async () => {
        const searchTerm = document.getElementById('search-term').value;
        await loadClients(searchTerm);
    });
});

function checkAuthStatus() {
    token = localStorage.getItem('token');
    if (token) {
        fetchCurrentUser();
        showManagementSection();
        loadClients();
    } else {
        document.getElementById('auth-section').style.display = 'block';
    }
}

function showManagementSection() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('management-section').style.display = 'block';
    document.getElementById('current-user').textContent = `Пользователь: ${currentUsername || 'Неизвестно'}`;
}

async function fetchCurrentUser() {
    try {
        const response = await axios.get(`${API_URL}/users/me`, { // Предполагаем, что такой эндпоинт будет добавлен
            headers: { 'Authorization': `Bearer ${token}` }
        });
        currentUsername = response.data.username;
        document.getElementById('current-user').textContent = `Пользователь: ${currentUsername}`;
    } catch (error) {
        console.error('Ошибка получения пользователя:', error.response?.data?.detail || error.message);
    }
}

async function loadClients(searchTerm = '') {
    try {
        const url = searchTerm ? `${API_URL}/clients/search/?search=${encodeURIComponent(searchTerm)}` : `${API_URL}/clients/`;
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const clients = response.data;
        const tableBody = document.getElementById('clients-table-body');
        tableBody.innerHTML = '';

        clients.forEach(client => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${client.account_number}</td>
                <td>${client.owner_name}</td>
                <td>${client.email}</td>
                <td>${client.phone_number}</td>
                <td>${client.inn}</td>
                <td>${client.postal_address}</td>
                <td>${client.connected_power || '-'}</td>
                <td>${client.passport_data || '-'}</td>
                <td>${client.snils || '-'}</td>
                <td>${client.connection_date || '-'}</td>
                <td>${client.power_source || '-'}</td>
                <td>${client.additional_info || '-'}</td>
                <td><button onclick="alert('Редактирование пока не реализовано')">Редактировать</button></td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Ошибка загрузки клиентов:', error.response?.data?.detail || error.message);
    }
}