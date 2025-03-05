function initializeClientsListeners() {
    const clientsBtn = document.getElementById('clients-btn');
    if (clientsBtn) {
        clientsBtn.addEventListener('click', () => {
            showSection('clients-section');
            loadClients(); // Загружаем клиентов при переходе на страницу
        });
    }

    const searchBtn = document.getElementById('clients-search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const searchTerm = document.getElementById('clients-search-term').value;
            await loadClients(searchTerm);
        });
    }

    const closeModal = document.getElementById('edit-client-close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            const editModal = document.getElementById('edit-modal');
            editModal.classList.remove('active');
            setTimeout(() => {
                editModal.style.display = 'none';
            }, 300);
        });
    }

    const editForm = document.getElementById('edit-client-form');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const postalAddress = document.getElementById('edit-client-postal-address').value;
            const connectionDate = document.getElementById('edit-client-connection-date').value;
            const clientData = {
                postal_address: postalAddress,
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
                showToast('Клиент успешно обновлён', 'success');
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
        <td>${client.owner_name}</td>
        <td>${client.email}</td>
        <td>${client.phone_number}</td>
        <td>${client.inn}</td>
        <td>
            ${isAdmin ? `<button class="btn btn-edit" onclick="editClient('${encodeURIComponent(client.postal_address)}')"><span class="material-icons">edit</span></button>` : ''}
            ${isAdmin ? `<button class="btn btn-danger" onclick="deleteClient('${encodeURIComponent(client.postal_address)}')"><span class="material-icons">delete</span></button>` : ''}
            <button class="btn btn-secondary" onclick="showClientDetails('${encodeURIComponent(client.postal_address)}')"><span class="material-icons">info</span></button>
        </td>
    `;
    tableBody.appendChild(row);
});
    } catch (error) {
        if (clients.detail) {
            document.getElementById('create-client-message').textContent = clients.detail;
            document.getElementById('create-client-message').classList.add('error');
}       else {
            document.getElementById('create-client-message').style.display = 'none';
}
    }
}

// Функция удаления клиента
async function deleteClient(postalAddress) {
    if (confirm('Вы уверены, что хотите удалить этого клиента?')) {
        try {
            await axios.delete(`${API_URL}/clients/${postalAddress}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            showToast('Клиент удалён', 'success');
            loadClients();
        } catch (error) {
            showToast(`Ошибка удаления клиента: ${error.response?.data?.detail || error.message}`, 'error');
        }
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

        // Открытие модального окна при клике на поле адреса
        const addressInput = document.getElementById('edit-client-postal-address');
        addressInput.addEventListener('click', () => {
            const modal = document.getElementById('edit-address-modal');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);

            // Заполняем поля текущим адресом (если есть)
            const addressParts = client.postal_address.split(', ');
            document.getElementById('edit-address-subject').value = addressParts[0] || '';
            document.getElementById('edit-address-district').value = addressParts[1]?.replace(' р-н', '') || '';
            document.getElementById('edit-address-city').value = addressParts[2]?.replace('г. ', '') || '';
            document.getElementById('edit-address-settlement').value = addressParts[3]?.replace('с. ', '') || '';
            document.getElementById('edit-address-street').value = addressParts[4]?.replace('ул. ', '') || '';
            document.getElementById('edit-address-house').value = addressParts[5]?.replace('д. ', '') || '';
            document.getElementById('edit-address-extension').value = addressParts.slice(6).join(', ') || '';

            // Обработчики внутри функции для избежания null
            const closeModalBtn = document.getElementById('edit-address-close-modal');
            const cancelBtn = document.getElementById('edit-address-cancel-btn');
            const addressForm = document.getElementById('edit-address-form');

            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', () => {
                    modal.classList.remove('active');
                    setTimeout(() => modal.style.display = 'none', 300);
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    modal.classList.remove('active');
                    setTimeout(() => modal.style.display = 'none', 300);
                });
            }

            if (addressForm) {
                addressForm.addEventListener('submit', (e) => {
                    e.preventDefault();

                    const subject = document.getElementById('edit-address-subject').value.trim();
                    const district = document.getElementById('edit-address-district').value.trim();
                    const city = document.getElementById('edit-address-city').value.trim();
                    const settlement = document.getElementById('edit-address-settlement').value.trim();
                    const street = document.getElementById('edit-address-street').value.trim();
                    const house = document.getElementById('edit-address-house').value.trim();
                    const extension = document.getElementById('edit-address-extension').value.trim();

                    const regionTypes = {
                        'республика': 'Респ.',
                        'область': 'обл.',
                        'край': 'кр.',
                        'автономный округ': 'АО'
                    };
                    let formattedSubject = subject;
                    for (const [type, abbr] of Object.entries(regionTypes)) {
                        if (subject.toLowerCase().includes(type)) {
                            formattedSubject = `${subject.replace(new RegExp(type, 'i'), '').trim()} ${abbr}`;
                            break;
                        }
                    }

                    const formattedAddress = [
                        formattedSubject ? formattedSubject : '',
                        district ? `${district} р-н` : '',
                        city ? `г. ${city}` : '',
                        settlement ? `с. ${settlement}` : '',
                        street ? `ул. ${street}` : '',
                        house ? `д. ${house}` : '',
                        extension ? extension : ''
                    ].filter(part => part).join(', ');

                    document.getElementById('edit-client-postal-address').value = formattedAddress;

                    modal.classList.remove('active');
                    setTimeout(() => modal.style.display = 'none', 300);
                });
            }
        });

        const editModal = document.getElementById('edit-modal');
        editModal.style.display = 'flex';
        setTimeout(() => editModal.classList.add('active'), 10);
    } catch (error) {
        console.error('Ошибка получения данных клиента:', error.response?.data?.detail || error.message);
        document.getElementById('create-client-message').textContent = error.response?.data?.detail || 'Ошибка загрузки данных клиента';
        document.getElementById('create-client-message').classList.add('error');
    }
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
                <td>${client.owner_name}</td>
                <td>${client.email}</td>
                <td>${client.phone_number}</td>
                <td>${client.inn}</td>
                <td>
                    ${isAdmin ? `<button class="btn btn-edit" onclick="editClient('${encodeURIComponent(client.postal_address)}')"><span class="material-icons">edit</span></button>` : ''}
                    ${isAdmin ? `<button class="btn btn-danger" onclick="deleteClient('${encodeURIComponent(client.postal_address)}')"><span class="material-icons">delete</span></button>` : ''}
                    <button class="btn btn-secondary" onclick="showClientDetails('${encodeURIComponent(client.postal_address)}')"><span class="material-icons">info</span></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Ошибка загрузки клиентов:', error.response?.data?.detail || error.message);
        document.getElementById('create-client-message').textContent = error.response?.data?.detail || 'Ошибка загрузки списка клиентов';
        document.getElementById('create-client-message').classList.add('error');
    }
}

async function showClientDetails(encodedPostalAddress) {
    try {
        const postalAddress = decodeURIComponent(encodedPostalAddress);
        console.log('Fetching client details for:', postalAddress);
        const response = await axios.get(`${API_URL}/clients/${encodeURIComponent(postalAddress)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const client = response.data;
        console.log('Client data received:', client);

        if (!client || Object.keys(client).length === 0) {
            console.error('No client data received');
            showToast('Данные клиента не найдены', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'client-details-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="close" onclick="this.parentElement.parentElement.remove()" aria-label="Закрыть">×</button>
                <header>
                    <h2><span class="material-icons">person</span> ${client.owner_name || 'Без имени'}</h2>
                </header>
                <div class="client-details">
                    <p><strong>Адрес:</strong> ${client.postal_address || '-'}</p>
                    <p><strong>Номер счета:</strong> ${client.account_number || '-'}</p>
                    <p><strong>Email:</strong> ${client.email || '-'}</p>
                    <p><strong>Телефон:</strong> ${client.phone_number || '-'}</p>
                    <p><strong>ИНН:</strong> ${client.inn || '-'}</p>
                    <p><strong>Мощность:</strong> ${client.connected_power !== null ? client.connected_power : '-'}</p>
                    <p><strong>Паспорт:</strong> ${client.passport_data || '-'}</p>
                    <p><strong>СНИЛС:</strong> ${client.snils || '-'}</p>
                    <p><strong>Дата подключения:</strong> ${client.connection_date ? new Date(client.connection_date).toLocaleDateString() : '-'}</p>
                    <p><strong>Источник питания:</strong> ${client.power_source || '-'}</p>
                    <p><strong>Дополнительно:</strong> ${client.additional_info || '-'}</p>
                    <p><strong>Создан пользователем (ID):</strong> ${client.created_by || '-'}</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        console.log('Modal appended to DOM:', modal);
        setTimeout(() => {
            modal.classList.add('active');
            console.log('Modal class "active" added:', modal.classList);
        }, 10);
    } catch (error) {
        console.error('Ошибка в showClientDetails:', error);
        showToast(`Ошибка загрузки данных клиента: ${error.response?.data?.detail || error.message}`, 'error');
    }
}