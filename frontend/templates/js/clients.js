let currentPage = 1;
const itemsPerPage = 10;





    const nextPageBtn = document.getElementById('next-page');
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const totalPages = parseInt(document.getElementById('total-pages').textContent);
            if (currentPage < totalPages) {
                currentPage++;
                const searchTerm = document.getElementById('clients-search-term').value;
                const connectionDate = document.getElementById('clients-connection-date').value || null;
                const powerMin = document.getElementById('clients-power-min').value ? parseFloat(document.getElementById('clients-power-min').value) : null;
                const powerMax = document.getElementById('clients-power-max').value ? parseFloat(document.getElementById('clients-power-max').value) : null;
                loadClients(searchTerm, connectionDate, powerMin, powerMax);
            }
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


async function loadClients(searchTerm = '', connectionDate = null, powerMin = null, powerMax = null) {
    const loadingRow = document.getElementById('clients-loading');
    const tableBody = document.getElementById('clients-table-body');

    if (loadingRow) loadingRow.style.display = 'table-row'; // Показываем спиннер только если элемент есть
    if (tableBody) tableBody.innerHTML = ''; // Очищаем таблицу только если она есть

    try {
        const skip = (currentPage - 1) * itemsPerPage;
        let url = `${API_URL}/clients/search/?skip=${skip}&limit=${itemsPerPage}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
        if (connectionDate) url += `&connection_date=${connectionDate}`;
        if (powerMin !== null) url += `&connected_power_min=${powerMin}`;
        if (powerMax !== null) url += `&connected_power_max=${powerMax}`;

        const [clientsResponse, userResponse] = await Promise.all([
            axios.get(url, { headers: { 'Authorization': `Bearer ${token}` } }),
            axios.get(`${API_URL}/users/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        const data = clientsResponse.data;
        const clients = data.clients;
        const totalClients = data.total;
        const isAdmin = userResponse.data.is_admin;

        if (!Array.isArray(clients)) {
            document.getElementById('create-client-message').textContent = clients.detail || 'Ошибка загрузки списка клиентов';
            document.getElementById('create-client-message').classList.add('error');
            if (loadingRow) loadingRow.style.display = 'none';
            return;
        }

        if (tableBody) {
            clients.forEach((client, index) => {
                // Объявляем phoneNumbers только один раз внутри итерации
                const phoneNumbers = client.phone_number.split(';');
                const firstPhone = phoneNumbers[0]; // Берем только первый номер

                const row = document.createElement('tr');
                row.style.setProperty('--row-index', index);
                row.innerHTML = `
                    <td>${client.postal_address}</td>
                    <td>${client.owner_name}</td>
                    <td>${client.email}</td>
                    <td>${firstPhone}</td> <!-- Отображаем только первый номер -->
                    <td>${client.inn}</td>
                    <td>
                        ${isAdmin ? `<button class="btn btn-edit" onclick="editClient('${encodeURIComponent(client.postal_address)}')"><span class="material-icons">edit</span></button>` : ''}
                        ${isAdmin ? `<button class="btn btn-danger" onclick="deleteClient('${encodeURIComponent(client.postal_address)}')"><span class="material-icons">delete</span></button>` : ''}
                        <button class="btn btn-secondary" onclick="showClientDetails('${encodeURIComponent(client.postal_address)}')"><span class="material-icons">info</span></button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }

        const totalPages = Math.ceil(totalClients / itemsPerPage);
        document.getElementById('current-page').textContent = currentPage;
        document.getElementById('total-pages').textContent = totalPages;
        document.getElementById('prev-page').disabled = currentPage === 1;
        document.getElementById('next-page').disabled = currentPage === totalPages;

    } catch (error) {
        console.error('Ошибка загрузки клиентов:', error.response?.data?.detail || error.message);
        document.getElementById('create-client-message').textContent = error.response?.data?.detail || 'Ошибка загрузки списка клиентов';
        document.getElementById('create-client-message').classList.add('error');
    } finally {
        if (loadingRow) loadingRow.style.display = 'none'; // Скрываем спиннер, если элемент есть
    }
}

function initializeClientsListeners() {
    const clientsBtn = document.getElementById('clients-btn');
    if (clientsBtn) {
        clientsBtn.addEventListener('click', () => {
            showSection('clients-section');
            loadClients(); // Загружаем без фильтров при клике на кнопку меню
        });
    }

    const searchBtn = document.getElementById('clients-search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            currentPage = 1; // Сбрасываем страницу при новом поиске
            const searchTerm = document.getElementById('clients-search-term')?.value || '';
            const connectionDate = document.getElementById('clients-connection-date')?.value || null;
            const powerMin = document.getElementById('clients-power-min')?.value ? parseFloat(document.getElementById('clients-power-min').value) : null;
            const powerMax = document.getElementById('clients-power-max')?.value ? parseFloat(document.getElementById('clients-power-max').value) : null;
            await loadClients(searchTerm, connectionDate, powerMin, powerMax);
        });
    }

    const prevPageBtn = document.getElementById('prev-page');
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                const searchTerm = document.getElementById('clients-search-term')?.value || '';
                const connectionDate = document.getElementById('clients-connection-date')?.value || null;
                const powerMin = document.getElementById('clients-power-min')?.value ? parseFloat(document.getElementById('clients-power-min').value) : null;
                const powerMax = document.getElementById('clients-power-max')?.value ? parseFloat(document.getElementById('clients-power-max').value) : null;
                loadClients(searchTerm, connectionDate, powerMin, powerMax);
            }
        });
    }

    const nextPageBtn = document.getElementById('next-page');
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const totalPages = parseInt(document.getElementById('total-pages').textContent);
            if (currentPage < totalPages) {
                currentPage++;
                const searchTerm = document.getElementById('clients-search-term')?.value || '';
                const connectionDate = document.getElementById('clients-connection-date')?.value || null;
                const powerMin = document.getElementById('clients-power-min')?.value ? parseFloat(document.getElementById('clients-power-min').value) : null;
                const powerMax = document.getElementById('clients-power-max')?.value ? parseFloat(document.getElementById('clients-power-max').value) : null;
                loadClients(searchTerm, connectionDate, powerMin, powerMax);
            }
        });
    }

    const closeModal = document.getElementById('edit-client-close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            const editModal = document.getElementById('edit-modal');
            editModal.classList.remove('active');
            setTimeout(() => editModal.style.display = 'none', 300);
        });
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

        const editModal = document.getElementById('edit-modal');
        if (!editModal) {
            console.error('Edit modal not found');
            showToast('Ошибка: модальное окно редактирования клиента не найдено', 'error');
            return;
        }
        editModal.style.display = 'flex';
        setTimeout(() => editModal.classList.add('active'), 10);

        const fields = {
            'edit-client-postal-address': client.postal_address || '',
            'edit-client-account-number': client.account_number || '',
            'edit-client-owner-name': client.owner_name || '',
            'edit-client-department': client.department || '',
            'edit-client-email': client.email || '',
            'edit-client-inn': client.inn || '',
            'edit-client-connected-power': client.connected_power !== null ? client.connected_power : '',
            'edit-client-passport-data': client.passport_data || '',
            'edit-client-snils': client.snils || '',
            'edit-client-connection-date': client.connection_date || '',
            'edit-client-power-source': client.power_source || '',
            'edit-client-additional-info': client.additional_info || ''
        };

        for (const [id, value] of Object.entries(fields)) {
            const element = document.getElementById(id);
            if (!element) {
                console.error(`Element with ID ${id} not found`);
                showToast(`Ошибка: элемент ${id} не найден`, 'error');
                editModal.style.display = 'none';
                return;
            }
            element.value = value;
        }

        const message = document.getElementById('edit-client-message');
        if (message) {
            message.textContent = '';
            message.classList.remove('error', 'success');
        }

        // Заполняем номера телефона
        const phoneList = document.getElementById('edit-client-phone-list');
        phoneList.innerHTML = '';
        const phoneNumbers = client.phone_number.split(';');
        phoneNumbers.forEach((number, index) => {
            const phoneWrapper = document.createElement('div');
            phoneWrapper.className = 'phone-input-wrapper';
            phoneWrapper.innerHTML = `
                <input type="text" class="phone-input" value="${number}" maxlength="12" required>
                <span class="material-icons">phone</span>
                <button type="button" class="remove-phone btn btn-danger" style="${index === 0 ? 'display: none;' : ''}">
                    <span class="material-icons">delete</span>
                </button>
            `;
            phoneList.appendChild(phoneWrapper);
            const phoneInput = phoneWrapper.querySelector('.phone-input');
            phoneInput.addEventListener('input', enforcePhoneFormat);
            phoneWrapper.querySelector('.remove-phone').addEventListener('click', () => {
                if (phoneList.children.length > 1) {
                    phoneList.removeChild(phoneWrapper);
                }
            });
        });

        document.getElementById('add-phone-edit').addEventListener('click', () => {
            addPhoneInput('edit-client-phone-list');
        });

        const editForm = document.getElementById('edit-client-form');
        if (!editForm) {
            console.error('Edit form not found');
            showToast('Ошибка: форма редактирования клиента не найдена', 'error');
            editModal.style.display = 'none';
            return;
        }

        // Обработчик клика для редактирования адреса (восстановлено из исходного кода)
        const addressInput = document.getElementById('edit-client-postal-address');
        if (addressInput) {
            addressInput.addEventListener('click', () => {
                const modal = document.getElementById('edit-address-modal');
                if (!modal) {
                    console.error('Edit address modal not found');
                    return;
                }
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 10);

                const addressParts = client.postal_address.split(', ');
                document.getElementById('edit-address-subject').value = addressParts[0] || '';
                document.getElementById('edit-address-district').value = addressParts[1]?.replace(' р-н', '') || '';
                document.getElementById('edit-address-city').value = addressParts[2]?.replace('г. ', '') || '';
                document.getElementById('edit-address-settlement').value = addressParts[3]?.replace('с. ', '') || '';
                document.getElementById('edit-address-street').value = addressParts[4]?.replace('ул. ', '') || '';
                document.getElementById('edit-address-house').value = addressParts[5]?.replace('д. ', '') || '';
                document.getElementById('edit-address-extension').value = addressParts.slice(6).join(', ') || '';

                const addressForm = document.getElementById('edit-address-form');
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

                        addressInput.value = formattedAddress;

                        modal.classList.remove('active');
                        setTimeout(() => modal.style.display = 'none', 300);
                    }, { once: true });
                }

                const cancelBtn = document.getElementById('edit-address-cancel-btn');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        modal.classList.remove('active');
                        setTimeout(() => modal.style.display = 'none', 300);
                    }, { once: true });
                }
            }, { once: true });
        }

        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const updatedPostalAddress = document.getElementById('edit-client-postal-address').value;
            const connectionDate = document.getElementById('edit-client-connection-date').value;
            const phoneInputs = document.querySelectorAll('#edit-client-phone-list .phone-input');
            const phoneNumbers = Array.from(phoneInputs).map(input => input.value);
            const clientData = {
                postal_address: updatedPostalAddress,
                account_number: document.getElementById('edit-client-account-number').value,
                owner_name: document.getElementById('edit-client-owner-name').value,
                department: document.getElementById('edit-client-department').value,
                email: document.getElementById('edit-client-email').value,
                phone_number: phoneNumbers.join(';'),
                inn: document.getElementById('edit-client-inn').value,
                connected_power: parseFloat(document.getElementById('edit-client-connected-power').value) || null,
                passport_data: document.getElementById('edit-client-passport-data').value || null,
                snils: document.getElementById('edit-client-snils').value || null,
                connection_date: connectionDate ? new Date(connectionDate).toISOString().split('T')[0] : null,
                power_source: document.getElementById('edit-client-power-source').value || null,
                additional_info: document.getElementById('edit-client-additional-info').value || null
            };

            console.log('Original postalAddress:', decodeURIComponent(postalAddress));
            console.log('New postalAddress:', updatedPostalAddress);
            console.log('Sending PUT to:', `${API_URL}/clients/${postalAddress}`);
            console.log('Client data:', clientData);

            try {
                const response = await axios.put(`${API_URL}/clients/${postalAddress}`, clientData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (message) {
                    message.textContent = 'Клиент обновлён!';
                    message.classList.remove('error');
                    message.classList.add('success');
                }
                editModal.classList.remove('active');
                setTimeout(() => editModal.style.display = 'none', 300);
                loadClients();
                showToast('Клиент успешно обновлён', 'success');
            } catch (error) {
                console.error('Ошибка обновления клиента:', error.response?.data || error);
                if (message) {
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
                                additional_info: 'До 500 символов (опционально)',
                                department: 'Должен быть ЮЭС, ЦЭС или СЭС'
                            };
                            return `${field}: ${msg} (Требование: ${requirements[field] || 'Неизвестно'})`;
                        });
                        message.textContent = errorMessages.join(', ');
                    } else {
                        message.textContent = errorDetail || 'Ошибка обновления клиента';
                    }
                    message.classList.add('error');
                }
            }
        }, { once: true });

        const closeModal = document.getElementById('edit-client-close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                editModal.classList.remove('active');
                setTimeout(() => editModal.style.display = 'none', 300);
            });
        }

    } catch (error) {
        console.error('Ошибка получения данных клиента:', error.response?.data?.detail || error.message);
        const message = document.getElementById('edit-client-message');
        if (message) {
            message.textContent = error.response?.data?.detail || 'Ошибка загрузки данных клиента';
            message.classList.add('error');
        }
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

        // Словарь для преобразования department в полное название
        const departmentNames = {
            'YES': 'Южные электрические сети',
            'CES': 'Центральные электрические сети',
            'SES': 'Северные электрические сети'
        };

        // Получаем полное название отдела или '-' если department отсутствует/невалиден
        const departmentFullName = departmentNames[client.department] || '-';

        const modal = document.createElement('div');
        modal.className = 'client-details-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="close" onclick="this.parentElement.parentElement.remove()" aria-label="Закрыть">×</button>
                <header>
                    <h2><span class="material-icons">person</span> ${client.owner_name || 'Без имени'}</h2>
                </header>
                <div class="client-details">
                    <p><strong>Регион:</strong> ${departmentFullName}</p>
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
