function initializeCreateClientListeners() {
    document.getElementById('create-client-btn').addEventListener('click', () => showSection('create-client-section'));

    const addressInput = document.getElementById('create-client-postal-address');
    const useIdentifierCheckbox = document.getElementById('use-identifier');
    if (addressInput && useIdentifierCheckbox) {
        addressInput.addEventListener('click', () => {
            if (!useIdentifierCheckbox.checked) { // Открываем модальное окно только если чекбокс не включен
                const modal = document.getElementById('address-modal');
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 10);

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

                        document.getElementById('create-client-postal-address').value = formattedAddress;

                        modal.classList.remove('active');
                        setTimeout(() => modal.style.display = 'none', 300);
                    }, { once: true });
                }

                const closeBtn = document.getElementById('address-close-modal');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        modal.classList.remove('active');
                        setTimeout(() => modal.style.display = 'none', 300);
                    }, { once: true });
                }

                const cancelBtn = document.getElementById('address-cancel-btn');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        modal.classList.remove('active');
                        setTimeout(() => modal.style.display = 'none', 300);
                    }, { once: true });
                }
            }
        });

        // Динамически обновляем placeholder в зависимости от состояния чекбокса
        useIdentifierCheckbox.addEventListener('change', () => {
            addressInput.placeholder = useIdentifierCheckbox.checked
                ? "Введите кадастровый номер или идентификатор (например, 50:22:0010203:45)"
                : "Нажмите для ввода адреса";
            addressInput.readOnly = useIdentifierCheckbox.checked ? false : true; // Разрешаем ввод вручную только для идентификатора
        });
    }

    document.getElementById('create-client-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateClientForm()) {
            return;
        }

        const connectionDate = document.getElementById('create-client-connection-date').value;
        const postalAddress = document.getElementById('create-client-postal-address').value;
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
                        postal_address: 'Уникальный адрес или идентификатор (5-200 символов)',
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

function validateClientForm() {
    const email = document.getElementById('create-client-email').value;
    const inn = document.getElementById('create-client-inn').value;
    const phone = document.getElementById('create-client-phone-number').value;
    const postalAddress = document.getElementById('create-client-postal-address').value;
    const useIdentifier = document.getElementById('use-identifier').checked;
    const message = document.getElementById('create-client-message');
    message.textContent = '';
    message.classList.remove('error', 'success');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const innRegex = /^\d{10,12}$/;
    const phoneRegex = /^\+?\d{5,20}$/;
    const cadastralRegex = /^[0-9]{2}:[0-9]{2}:[0-9]{6,7}:[0-9]+$/;
    const simpleIdRegex = /^[A-Za-z0-9-]{5,50}$/;

    if (!emailRegex.test(email)) {
        message.textContent = 'Некорректный формат email (пример: user@example.com)';
        message.classList.add('error');
        return false;
    }
    if (!innRegex.test(inn)) {
        message.textContent = 'ИНН должен содержать от 10 до 12 цифр';
        message.classList.add('error');
        return false;
    }
    if (!phoneRegex.test(phone)) {
        message.textContent = 'Телефон должен содержать от 5 до 20 цифр (можно с + в начале)';
        message.classList.add('error');
        return false;
    }
    if (useIdentifier) {
        if (!cadastralRegex.test(postalAddress) && !simpleIdRegex.test(postalAddress)) {
            message.textContent = 'Неверный формат идентификатора (примеры: "50:22:0010203:45" или "ID-12345")';
            message.classList.add('error');
            return false;
        }
    } else {
        // Проверяем только длину поля, без строгого формата адреса
        if (postalAddress.length < 5 || postalAddress.length > 200) {
            message.textContent = 'Адрес должен содержать от 5 до 200 символов';
            message.classList.add('error');
            return false;
        }
    }
    return true;
}