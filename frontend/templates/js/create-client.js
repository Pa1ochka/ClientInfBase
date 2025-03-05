function initializeCreateClientListeners() {
    document.getElementById('create-client-btn').addEventListener('click', () => showSection('create-client-section'));

    const addressInput = document.getElementById('create-client-postal-address');
    if (addressInput) {
        addressInput.addEventListener('click', () => {
            const modal = document.getElementById('address-modal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 10);
            }
        });
    }

    const closeModalBtn = document.getElementById('address-close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('address-modal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.style.display = 'none', 300);
            }
        });
    }

    const cancelBtn = document.getElementById('address-cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const modal = document.getElementById('address-modal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.style.display = 'none', 300);
            }
        });
    }

    const addressForm = document.getElementById('address-form');
    if (addressForm) {
        addressForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const subject = document.getElementById('address-subject').value.trim();
            const district = document.getElementById('address-district').value.trim();
            const city = document.getElementById('address-city').value.trim();
            const settlement = document.getElementById('address-settlement').value.trim();
            const street = document.getElementById('address-street').value.trim();
            const house = document.getElementById('address-house').value.trim();
            const extension = document.getElementById('address-extension').value.trim();

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

            if (addressInput) {
                addressInput.value = formattedAddress;
            }

            const modal = document.getElementById('address-modal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.style.display = 'none', 300);
            }
        });
    }

    document.getElementById('create-client-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const connectionDate = document.getElementById('create-client-connection-date').value;
        const postalAddress = document.getElementById('create-client-postal-address').value;

        if (!postalAddress) {
            document.getElementById('create-client-message').textContent = 'postal_address: Адрес обязателен';
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
            document.getElementById('create-client-message').textContent = 'Клиент создан!';
            document.getElementById('create-client-message').classList.remove('error');
            document.getElementById('create-client-message').classList.add('success');
            document.getElementById('create-client-form').reset();
            loadClients();
            showToast('Клиент успешно создан', 'success');
        } catch (error) {
            const errorDetail = error.response?.data?.detail;
            if (Array.isArray(errorDetail)) {
                const errorMessages = errorDetail.map(err => {
                    const field = err.loc[err.loc.length - 1];
                    const msg = err.msg;
                    const requirements = {
                        postal_address: 'Уникальный адрес, 5-200 символов',
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
                document.getElementById('create-client-message').textContent = errorMessages.join(', ');
            } else {
                document.getElementById('create-client-message').textContent = errorDetail || 'Ошибка создания клиента';
            }
            document.getElementById('create-client-message').classList.add('error');
        }
    });
}