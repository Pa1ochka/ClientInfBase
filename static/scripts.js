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
            const errorDetail = error.response?.data?.detail;
            document.getElementById('user-message').textContent = Array.isArray(errorDetail)
                ? errorDetail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ')
                : errorDetail || 'Ошибка создания пользователя';
            document.getElementById('user-message').classList.add('error');
        }
    });

    document.getElementById('create-client-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const connectionDate = document.getElementById('client-connection-date').value;
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
            connection_date: connectionDate ? new Date(connectionDate).toISOString().split('T')[0] : null,
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
            const errorDetail = error.response?.data?.detail;
            if (Array.isArray(errorDetail)) {
                const errorMessages = errorDetail.map(err => {
                    const field = err.loc[err.loc.length - 1];
                    const msg = err.msg;
                    const requirements = {
                        account_number: 'От 1 до 50 символов',
                        owner_name: 'От 1 до 100 символов',
                        email: 'Корректный email (должен содержать @)',
                        phone_number: 'От 5 до 20 символов',
                        inn: 'От 10 до 12 символов',
                        postal_address: 'От 5 до 200 символов',
                        connected_power: 'Число (опционально)',
                        passport_data: 'До 50 символов (опционально)',
                        snils: 'До 12 символов (опционально)',
                        connection_date: 'Формат ГГГГ-ММ-ДД (опционально)',
                        power_source: 'До 100 символов (опционально)',
                        additional_info: 'До 500 символов (опционально)'
                    };
                    return `${field}: ${msg} (Требование: ${requirements[field] || 'Неизвестно'})`;
                });
                document.getElementById('client-message').textContent = errorMessages.join(', ');
            } else {
                document.getElementById('client-message').textContent = errorDetail || 'Ошибка создания клиента';
            }
            document.getElementById('client-message').classList.add('error');
        }
    });

    document.getElementById('search-btn').addEventListener('click', async () => {
        const searchTerm = document.getElementById('search-term').value;
        await loadClients(searchTerm);
    });

    // Закрытие модального окна
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('edit-modal').style.display = 'none';
    });

    // Редактирование клиента
    document.getElementById('edit-client-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const accountNumber = document.getElementById('edit-account-number').value;
        const connectionDate = document.getElementById('edit-connection-date').value;
        const clientData = {
            owner_name: document.getElementById('edit-owner-name').value,
            email: document.getElementById('edit-email').value,
            phone_number: document.getElementById('edit-phone-number').value,
            inn: document.getElementById('edit-inn').value,
            postal_address: document.getElementById('edit-postal-address').value,
            connected_power: parseFloat(document.getElementById('edit-connected-power').value) || null,
            passport_data: document.getElementById('edit-passport-data').value || null,
            snils: document.getElementById('edit-snils').value || null,
            connection_date: connectionDate ? new Date(connectionDate).toISOString().split('T')[0] : null,
            power_source: document.getElementById('edit-power-source').value || null,
            additional_info: document.getElementById('edit-additional-info').value || null
        };

        try {
            const response = await axios.put(`${API_URL}/clients/${accountNumber}`, clientData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            document.getElementById('edit-message').textContent = 'Клиент обновлён!';
            document.getElementById('edit-message').classList.add('success');
            document.getElementById('edit-modal').style.display = 'none';
            loadClients();
        } catch (error) {
            const errorDetail = error.response?.data?.detail;
            if (Array.isArray(errorDetail)) {
                const errorMessages = errorDetail.map(err => {
                    const field = err.loc[err.loc.length - 1];
                    const msg = err.msg;
                    const requirements = {
                        owner_name: 'От 1 до 100 символов',
                        email: 'Корректный email (должен содержать @)',
                        phone_number: 'От 5 до 20 символов',
                        inn: 'От 10 до 12 символов',
                        postal_address: 'От 5 до 200 символов',
                        connected_power: 'Число (опционально)',
                        passport_data: 'До 50 символов (опционально)',
                        snils: 'До 12 символов (опционально)',
                        connection_date: 'Формат ГГГГ-ММ-ДД (опционально)',
                        power_source: 'До 100 символов (опционально)',
                        additional_info: 'До 500 символов (опционально)'
                    };
                    return `${field}: ${msg} (Требование: ${requirements[field] || 'Неизвестно'})`;
                });
                document.getElementById('edit-message').textContent = errorMessages.join(', ');
            } else {
                document.getElementById('edit-message').textContent = errorDetail || 'Ошибка обновления клиента';
            }
            document.getElementById('edit-message').classList.add('error');
        }
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
        const response = await axios.get(`${API_URL}/users/me`, {
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

        if (!Array.isArray(clients)) {
            document.getElementById('client-message').textContent = clients.detail || 'Ошибка загрузки списка клиентов';
            document.getElementById('client-message').classList.add('error');
            return;
        }

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
                <td><button onclick="editClient('${client.account_number}')">Редактировать</button></td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Ошибка загрузки клиентов:', error.response?.data?.detail || error.message);
        document.getElementById('client-message').textContent = error.response?.data?.detail || 'Ошибка загрузки списка клиентов';
        document.getElementById('client-message').classList.add('error');
    }
}

async function editClient(accountNumber) {
    try {
        const response = await axios.get(`${API_URL}/clients/${accountNumber}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const client = response.data;

        document.getElementById('edit-account-number').value = client.account_number;
        document.getElementById('edit-owner-name').value = client.owner_name;
        document.getElementById('edit-email').value = client.email;
        document.getElementById('edit-phone-number').value = client.phone_number;
        document.getElementById('edit-inn').value = client.inn;
        document.getElementById('edit-postal-address').value = client.postal_address;
        document.getElementById('edit-connected-power').value = client.connected_power || '';
        document.getElementById('edit-passport-data').value = client.passport_data || '';
        document.getElementById('edit-snils').value = client.snils || '';
        document.getElementById('edit-connection-date').value = client.connection_date || '';
        document.getElementById('edit-power-source').value = client.power_source || '';
        document.getElementById('edit-additional-info').value = client.additional_info || '';

        document.getElementById('edit-modal').style.display = 'flex';
    } catch (error) {
        console.error('Ошибка получения данных клиента:', error.response?.data?.detail || error.message);
        document.getElementById('client-message').textContent = error.response?.data?.detail || 'Ошибка загрузки данных клиента';
        document.getElementById('client-message').classList.add('error');
    }
}