function initializeCreateClientListeners() {
    document.getElementById('create-client-btn').addEventListener('click', () => showSection('create-client-section'));

const addressInput = document.getElementById('create-client-postal-address');
if (addressInput) {
    addressInput.addEventListener('click', () => {
        const modal = document.getElementById('address-modal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);

        const addressForm = document.getElementById('address-form');
        if (addressForm) {
            addressForm.addEventListener('submit', (e) => {
                e.preventDefault();
                // ... (форматирование адреса остается без изменений)
                modal.classList.remove('active');
                setTimeout(() => modal.style.display = 'none', 300);
            }, { once: true }); // Слушатель одноразовый
        }

        const closeBtn = document.getElementById('address-close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => modal.style.display = 'none', 300);
            }, { once: true }); // Слушатель одноразовый
        }

        const cancelBtn = document.getElementById('address-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => modal.style.display = 'none', 300);
            }, { once: true });
        }
    });
}

document.getElementById('create-client-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const connectionDate = document.getElementById('create-client-connection-date').value;
    const postalAddress = document.getElementById('create-client-postal-address').value;
    if (!postalAddress.match(/^[А-Яа-яA-Za-z\s]+,\s+[А-Яа-яA-Za-z\s]+,\s+\d+$/)) {
        document.getElementById('create-client-message').textContent = 'postal_address: Неверный формат адреса (Требование: Город, Улица, Дом)';
        document.getElementById('create-client-message').classList.add('error');
        return;
    }

    const clientData = {
        postal_address: postalAddress,
        account_number: document.getElementById('create-client-account-number').value,
        owner_name: document.getElementById('create-client-owner-name').value,
        email: document.getElementById('create-client-email').value,
        phone_number: document.getElementById('create-client-phone-number').value,
        inn: document.getElementById('create-client-inn').value,
        connected_power: parseFloat(document.getElementById('create-client-connected-power').value) || null,
        passport_data: document.getElementById('create-client-passport-data').value || null,
        snils: document.getElementById('create-client-snils').value || null,
        connection_date: connectionDate ? new Date(connectionDate).toISOString().split('T')[0] : null,
        power_source: document.getElementById('create-client-power-source').value || null,
        additional_info: document.getElementById('create-client-additional-info').value || null
    };

    try {
        const response = await axios.post(`${API_URL}/clients/`, clientData, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const message = document.getElementById('create-client-message');
        message.textContent = 'Клиент создан!';
        message.classList.remove('error');
        message.classList.add('success');
        document.getElementById('create-client-form').reset();
        loadClients();
        showToast('Клиент успешно создан', 'success');
    } catch (error) {
        const errorDetail = error.response?.data?.detail;
        const message = document.getElementById('create-client-message');
        if (Array.isArray(errorDetail)) {
            const errorMessages = errorDetail.map(err => {
                const field = err.loc[err.loc.length - 1];
                const msg = err.msg;
                const requirements = {
                    postal_address: 'Уникальный адрес, 5-200 символов (Город, Улица, Дом)',
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
            message.textContent = errorMessages.join(', ');
        } else {
            message.textContent = errorDetail || 'Ошибка создания клиента';
        }
        message.classList.add('error');
    }
});
}