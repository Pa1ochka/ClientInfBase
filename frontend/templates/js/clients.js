function initializeClientsListeners() {
    document.getElementById('clients-btn').addEventListener('click', () => showSection('clients-section'));

    document.getElementById('clients-search-btn').addEventListener('click', async () => {
        const searchTerm = document.getElementById('clients-search-term').value;
        await loadClients(searchTerm);
    });

    document.getElementById('edit-client-close-modal').addEventListener('click', () => {
        document.getElementById('edit-modal').style.display = 'none';
    });

    document.getElementById('edit-client-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const postalAddress = document.getElementById('edit-client-postal-address').value;
        const connectionDate = document.getElementById('edit-client-connection-date').value;
        const clientData = {
            account_number: document.getElementById('edit-client-account-number').value,
            owner_name: document.getElementById('edit-client-owner-name').value,
            email: document.getElementById('edit-client-email').value,
            phone_number: document.getElementById('edit-client-phone-number').value,
            inn: document.getElementById('edit-client-inn').value,
            connected_power: parseFloat(document.getElementById('edit-client-connected-power').value) || null,
            passport_data: document.getElementById('edit-client-passport-data').value || null,
            snils: document.getElementById('edit-client-snils').value || null,
            connection_date: connectionDate ? new Date(connectionDate).toISOString().split('T')[0] : null,
            power_source: document.getElementById('edit-client-power-source').value || null,
            additional_info: document.getElementById('edit-client-additional-info').value || null
        };

        try {
            const response = await axios.put(`${API_URL}/clients/${encodeURIComponent(postalAddress)}`, clientData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            document.getElementById('edit-client-message').textContent = 'Клиент обновлён!';
            document.getElementById('edit-client-message').classList.remove('error');
            document.getElementById('edit-client-message').classList.add('success');
            document.getElementById('edit-modal').style.display = 'none';
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
                        connected_power: 'Число (опционально)',
                        passport_data: 'До 50 символов (опционально)',
                        snils: 'До 12 символов (опционально)',
                        connection_date: 'Формат ГГГГ-ММ-ДД (опционально)',
                        power_source: 'До 100 символов (опционально)',
                        additional_info: 'До 500 символов (опционально)'
                    };
                    return `${field}: ${msg} (Требование: ${requirements[field] || 'Неизвестно'})`;
                });
                document.getElementById('edit-client-message').textContent = errorMessages.join(', ');
            } else {
                document.getElementById('edit-client-message').textContent = errorDetail || 'Ошибка обновления клиента';
            }
            document.getElementById('edit-client-message').classList.add('error');
        }
    });
}

async function loadClients(searchTerm = '') {
    try {
        const url = searchTerm ? `${API_URL}/clients/search/?search=${encodeURIComponent(searchTerm)}` : `${API_URL}/clients/`;
        const [clientsResponse, userResponse] = await Promise.all([
            axios.get(url, { headers: { 'Authorization': `Bearer ${token}` } }),
            axios.get(`${API_URL}/users/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        const clients = clientsResponse.data;
        const isAdmin = userResponse.data.is_admin;
        const tableBody = document.getElementById('clients-table-body');
        tableBody.innerHTML = '';

        if (!Array.isArray(clients)) {
            document.getElementById('create-client-message').textContent = clients.detail || 'Ошибка загрузки списка клиентов';
            document.getElementById('create-client-message').classList.add('error');
            return;
        }

        clients.forEach(client => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${client.postal_address}</td>
                <td>${client.account_number}</td>
                <td>${client.owner_name}</td>
                <td>${client.email}</td>
                <td>${client.phone_number}</td>
                <td>${client.inn}</td>
                <td>${client.connected_power || '-'}</td>
                <td>${client.passport_data || '-'}</td>
                <td>${client.snils || '-'}</td>
                <td>${client.connection_date || '-'}</td>
                <td>${client.power_source || '-'}</td>
                <td>${client.additional_info || '-'}</td>
                <td>${isAdmin ? `<button class="btn btn-edit" onclick="editClient('${encodeURIComponent(client.postal_address)}')"><span class="material-icons">edit</span> Редактировать</button>` : ''}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Ошибка загрузки клиентов:', error.response?.data?.detail || error.message);
        document.getElementById('create-client-message').textContent = error.response?.data?.detail || 'Ошибка загрузки списка клиентов';
        document.getElementById('create-client-message').classList.add('error');
    }
}

async function editClient(postalAddress) {
    try {
        const response = await axios.get(`${API_URL}/clients/${postalAddress}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const client = response.data;

        document.getElementById('edit-client-postal-address').value = client.postal_address;
        document.getElementById('edit-client-account-number').value = client.account_number;
        document.getElementById('edit-client-owner-name').value = client.owner_name;
        document.getElementById('edit-client-email').value = client.email;
        document.getElementById('edit-client-phone-number').value = client.phone_number;
        document.getElementById('edit-client-inn').value = client.inn;
        document.getElementById('edit-client-connected-power').value = client.connected_power || '';
        document.getElementById('edit-client-passport-data').value = client.passport_data || '';
        document.getElementById('edit-client-snils').value = client.snils || '';
        document.getElementById('edit-client-connection-date').value = client.connection_date || '';
        document.getElementById('edit-client-power-source').value = client.power_source || '';
        document.getElementById('edit-client-additional-info').value = client.additional_info || '';

        document.getElementById('edit-modal').style.display = 'flex';
    } catch (error) {
        console.error('Ошибка получения данных клиента:', error.response?.data?.detail || error.message);
        document.getElementById('create-client-message').textContent = error.response?.data?.detail || 'Ошибка загрузки данных клиента';
        document.getElementById('create-client-message').classList.add('error');
    }
}