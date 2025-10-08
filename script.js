document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let cards = [];
    let decks = [];
    let currentUser = null;
    let activeDeck = 'all';
    let unsubscribeDecks = null;
    let unsubscribeCards = null;
    let currentQuiz = [];
    let currentCardIndex = 0;

    // --- FIREBASE INITIALIZATION & REFS ---
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    let decksRef;
    let cardsRef;

    // --- DOM ELEMENTS ---
    const authContainer = document.getElementById('auth-container');
    const deckListDiv = document.getElementById('deck-list');
    const newDeckInput = document.getElementById('new-deck-input');
    const addDeckBtn = document.getElementById('add-deck-btn');
    const cardsListDiv = document.getElementById('cards-list');
    const cardsListTitle = document.getElementById('cards-list-title');
    const deckSelect = document.getElementById('deck-select');
    const frontInput = document.getElementById('front-input');
    const backInput = document.getElementById('back-input');
    const infoModal = new bootstrap.Modal(document.getElementById('info-modal'));
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalBody = document.getElementById('info-modal-body');
    const editModal = new bootstrap.Modal(document.getElementById('edit-modal'));
    const saveEditBtn = document.getElementById('save-edit-btn');
    const editCardId = document.getElementById('edit-card-id');
    const editDeckSelect = document.getElementById('edit-deck-select');
    const editFrontInput = document.getElementById('edit-front-input');
    const editBackInput = document.getElementById('edit-back-input');
    const quizSetupDiv = document.getElementById('quiz-setup');
    const quizViewDiv = document.getElementById('quiz-view');
    const quizCard = quizViewDiv.querySelector('.quiz-card');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const endQuizBtn = document.getElementById('end-quiz-btn');
    const quizDeckFilter = document.getElementById('quiz-deck-filter');
    const quizDirectionSelect = document.getElementById('quiz-direction');
    const quizProgress = document.getElementById('quiz-progress');
    const quizFront = document.getElementById('quiz-front');
    const quizIpa = document.getElementById('quiz-ipa');
    const quizBack = document.getElementById('quiz-back');
    const ttsUSBtn = document.getElementById('tts-us-btn');
    const ttsUKBtn = document.getElementById('tts-uk-btn');
    const statusButtonsDiv = document.getElementById('status-buttons');
    // Elements for Synonym Quiz
    //const synonymQuizDeckFilter = document.getElementById('synonym-quiz-deck-filter');
    const synonymDeckCheckboxes = document.getElementById('synonym-deck-checkboxes');
    const synonymToggleAllDecks = document.getElementById('synonym-toggle-all-decks');
    const startSynonymQuizBtn = document.getElementById('start-synonym-quiz-btn');
    const synonymQuizSetupDiv = document.getElementById('synonym-quiz-setup');
    const synonymQuizViewDiv = document.getElementById('synonym-quiz-view');
    const endSynonymQuizBtn = document.getElementById('end-synonym-quiz-btn');
    const synonymQuizProgress = document.getElementById('synonym-quiz-progress');
    const synonymQuestionWord = document.getElementById('synonym-question-word');
    const synonymOptionsContainer = document.getElementById('synonym-options-container');
    const synonymFeedback = document.getElementById('synonym-feedback');
    const nextSynonymQuestionBtn = document.getElementById('next-synonym-question-btn');
    // Elements for Synonym Manager in Add Card tab
    const searchSynonymsBtn = document.getElementById('search-synonyms-btn');
    const synonymsListDiv = document.getElementById('synonyms-list');
    const manualSynonymInput = document.getElementById('manual-synonym-input');
    const addSynonymBtn = document.getElementById('add-synonym-btn');
    // Elements for Synonym Manager in Edit Modal
    const editSynonymsListDiv = document.getElementById('edit-synonyms-list');
    const editSearchSynonymsBtn = document.getElementById('edit-search-synonyms-btn');
    const editManualSynonymInput = document.getElementById('edit-manual-synonym-input');
    const editAddSynonymBtn = document.getElementById('edit-add-synonym-btn');
    const batchUpdateSynonymsBtn = document.getElementById('batch-update-synonyms-btn');

    // --- AUTH FUNCTIONS ---
    const signOut = () => {
        auth.signOut().catch(error => console.error("Lỗi đăng xuất:", error));
    };

    // --- AUTH STATE OBSERVER ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            decksRef = db.collection('users').doc(user.uid).collection('decks');
            cardsRef = db.collection('users').doc(user.uid).collection('cards');
            authContainer.innerHTML = `<div id="user-info"><img src="${user.photoURL}" alt="${user.displayName}" class="profile-pic"><span>Chào, ${user.displayName.split(' ')[0]}</span><button id="logout-btn" class="btn btn-sm btn-outline-secondary">Đăng xuất</button></div>`;
            authContainer.querySelector('#logout-btn').addEventListener('click', signOut);
            document.body.classList.remove('logged-out');
            loadDataFromFirestore();
        } else {
            currentUser = null;
            window.location.href = 'login.html';
        }
    });

    // --- FIRESTORE DATA FUNCTIONS ---
    const loadDataFromFirestore = () => {
        if (unsubscribeDecks) unsubscribeDecks();
        if (unsubscribeCards) unsubscribeCards();

        unsubscribeDecks = decksRef.orderBy('name').onSnapshot(snapshot => {
            decks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderUI();
        }, error => console.error("Lỗi khi tải decks:", error));

        unsubscribeCards = cardsRef.onSnapshot(snapshot => {
            cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderUI();
        }, error => console.error("Lỗi khi tải cards:", error));
    };

    const clearUI = () => {
        if (unsubscribeDecks) unsubscribeDecks();
        if (unsubscribeCards) unsubscribeCards();
        decks = [];
        cards = [];
        activeDeck = 'all';
        renderUI();
    };

    // --- API & SPEAK FUNCTIONS ---
    const speak = (text, lang) => {
        if (!text || typeof window.speechSynthesis === 'undefined') return alert("Trình duyệt của bạn không hỗ trợ chức năng này.");
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

        // --- API & SPEAK FUNCTIONS ---
    const fetchWordDefinition = async (word) => {
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            if (!response.ok) {
                console.error('Không tìm thấy từ này trong từ điển.');
                return null;
            }
            const data = await response.json();
            return data[0];
        } catch (error) {
            console.error('Lỗi API:', error);
            alert('Có lỗi xảy ra khi kết nối tới API từ điển.');
            return null;
        }
    };
    
    // --- UI RENDERING ---
    const renderUI = () => {
        renderDecks();
        displayCardsByDeck(activeDeck);
        populateDeckDropdowns();
    };

    const renderDecks = () => {
        deckListDiv.innerHTML = `<div class="col-md-4 col-sm-6"><div class="card deck-card text-center h-100 ${activeDeck === 'all' ? 'active' : ''}" data-deck="all"><div class="card-body"><h5 class="card-title">All Cards</h5><p class="card-text text-muted">${cards.length} cards</p></div></div></div>`;
        decks.forEach(deck => {
            const cardCount = cards.filter(c => c.deck === deck.name).length;
            deckListDiv.innerHTML += `<div class="col-md-4 col-sm-6"><div class="card deck-card text-center h-100 ${activeDeck === deck.name ? 'active' : ''}" data-deck="${deck.name}"><button class="btn delete-deck-btn" data-id="${deck.id}" data-deck-name="${deck.name}"><i class="bi bi-x-circle"></i></button><div class="card-body"><h5 class="card-title">${deck.name}</h5><p class="card-text text-muted">${cardCount} cards:</p></div></div></div>`;
        });
    };

    const displayCardsByDeck = (deckName) => {
        activeDeck = deckName;
        cardsListTitle.innerText = deckName === 'all' ? 'All Cards' : `Cards in Deck: ${deckName}`;
        const filteredCards = deckName === 'all' ? cards : cards.filter(card => card.deck === deckName);
        cardsListDiv.innerHTML = '';
        if (filteredCards.length === 0) {
            cardsListDiv.innerHTML = '<p class="text-center text-muted mt-3">No cards found.</p>';
            return;
        }
        filteredCards.forEach(card => {
            cardsListDiv.innerHTML += `<div class="list-group-item d-flex justify-content-between align-items-center"><span>${card.front}</span><div class="card-item-actions"><button class="btn btn-sm btn-outline-info info-btn" data-word="${card.front}"><i class="bi bi-info-circle"></i></button><button class="btn btn-sm btn-outline-secondary edit-btn" data-id="${card.id}"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-outline-danger delete-btn" data-id="${card.id}"><i class="bi bi-trash"></i></button></div></div>`;
        });
    };

const populateDeckDropdowns = () => {
        const deckNames = decks.map(d => d.name);
        if (deckNames.length === 0) deckNames.push('Default');

        // --- Xử lý các dropdown cũ ---
        deckSelect.innerHTML = '';
        editDeckSelect.innerHTML = '';
        quizDeckFilter.innerHTML = '<option value="all">All decks</option>';
        deckNames.forEach(name => {
            const option = `<option value="${name}">${name}</option>`;
            deckSelect.innerHTML += option;
            editDeckSelect.innerHTML += option;
            quizDeckFilter.innerHTML += option;
        });

        // --- PHẦN MỚI: Tạo checkboxes cho Luyện tập Từ đồng nghĩa ---
        synonymDeckCheckboxes.innerHTML = '';
        if (decks.length > 0) {
            decks.forEach(deck => {
                const checkboxHTML = `
                    <div class="form-check">
                        <input class="form-check-input deck-filter-checkbox" type="checkbox" value="${deck.name}" id="deck-check-${deck.id}" checked>
                        <label class="form-check-label" for="deck-check-${deck.id}">
                            ${deck.name}
                        </label>
                    </div>`;
                synonymDeckCheckboxes.innerHTML += checkboxHTML;
            });
        } else {
            synonymDeckCheckboxes.innerHTML = '<p class="text-muted small m-1">Chưa có bộ thẻ nào.</p>';
        }
    };

    // --- SYNONYM MANAGER FUNCTIONS ---

    // Hàm để hiển thị danh sách từ đồng nghĩa trong UI
    const renderSynonymBadges = (synonyms, container) => {
        container.innerHTML = ''; // Xóa danh sách cũ
        if (!synonyms || synonyms.length === 0) {
            container.innerHTML = '<p class="text-muted fst-italic">Thẻ này chưa có từ đồng nghĩa.</p>';
            return;
        }
        synonyms.forEach(syn => addSynonymBadge(syn, container));
    };

    // Hàm để thêm một "badge" từ đồng nghĩa vào UI
    const addSynonymBadge = (synonymText, container) => {
        // Nếu đang có thông báo placeholder, hãy xóa nó đi
        const placeholder = container.querySelector('p');
        if (placeholder) placeholder.remove();
        
        const badge = document.createElement('span');
        badge.className = 'badge text-bg-secondary me-2 mb-2 p-2 fw-normal d-inline-flex align-items-center';
        
        const textSpan = document.createElement('span');
        textSpan.textContent = synonymText;
        textSpan.className = 'synonym-text';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-close btn-close-white ms-2';
        deleteBtn.setAttribute('aria-label', 'Close');

        badge.appendChild(textSpan);
        badge.appendChild(deleteBtn);
        container.appendChild(badge);
    };

    // Hàm để lấy tất cả từ đồng nghĩa hiện có trong UI
    const getSynonymsFromUI = (container) => {
        const badges = container.querySelectorAll('.synonym-text');
        return Array.from(badges).map(badge => badge.textContent.trim());
    };

    // --- EVENT LISTENERS (CRUD) ---
    addDeckBtn.addEventListener('click', () => {
        const newDeckName = newDeckInput.value.trim();
        if (newDeckName && !decks.some(d => d.name === newDeckName)) {
            decksRef.add({ name: newDeckName, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
                .then(() => newDeckInput.value = '')
                .catch(error => console.error("Lỗi khi thêm bộ thẻ:", error));
        } else alert('Tên bộ thẻ không hợp lệ hoặc đã tồn tại!');
    });

    deckListDiv.addEventListener('click', (e) => {
        const deckCard = e.target.closest('.deck-card');
        const deleteBtn = e.target.closest('.delete-deck-btn');
        if (deleteBtn) {
            e.stopPropagation();
            const deckIdToDelete = deleteBtn.dataset.id;
            const deckNameToDelete = deleteBtn.dataset.deckName;
            if (confirm(`Bạn có chắc muốn xóa bộ thẻ "${deckNameToDelete}"? (Các thẻ bên trong sẽ không bị xóa)`)) {
                decksRef.doc(deckIdToDelete).delete().catch(error => console.error("Lỗi xóa bộ thẻ:", error));
            }
        } else if (deckCard) {
            document.querySelectorAll('.deck-card').forEach(c => c.classList.remove('active'));
            deckCard.classList.add('active');
            displayCardsByDeck(deckCard.dataset.deck);
        }
    });

    // --- Event Listeners for Synonym Manager within EDIT MODAL ---

    editSearchSynonymsBtn.addEventListener('click', async () => {
        const frontText = editFrontInput.value.trim();
        if (!frontText) return alert('Vui lòng nhập từ ở "Mặt trước".');
        
        editSynonymsListDiv.innerHTML = '<p class="text-muted fst-italic">Đang tìm...</p>';
        const wordData = await fetchWordDefinition(frontText);
        let synonyms = [];
        if (wordData && wordData.meanings) {
            const synonymSet = new Set();
            wordData.meanings.forEach(meaning => {
                if (meaning.synonyms && meaning.synonyms.length > 0) {
                    meaning.synonyms.forEach(syn => synonymSet.add(syn));
                }
            });
            synonyms = Array.from(synonymSet);
        }
        renderSynonymBadges(synonyms, editSynonymsListDiv);
    });

    editAddSynonymBtn.addEventListener('click', () => {
        const newSynonym = editManualSynonymInput.value.trim();
        if (newSynonym) {
            addSynonymBadge(newSynonym, editSynonymsListDiv);
            editManualSynonymInput.value = '';
        }
    });

    editManualSynonymInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            editAddSynonymBtn.click();
        }
    });

    editSynonymsListDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-close')) {
            e.target.parentElement.remove();
        }
    });

    editSynonymsListDiv.addEventListener('dblclick', (e) => {
        if (e.target.classList.contains('synonym-text')) {
            const currentText = e.target.textContent;
            const parentBadge = e.target.parentElement;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentText;
            input.className = 'form-control form-control-sm';
            
            const finishEditing = (event) => {
                const newText = event.target.value.trim();
                if (newText) {
                    e.target.textContent = newText;
                }
                parentBadge.replaceChild(e.target, input);
            }

            input.addEventListener('blur', finishEditing);
            input.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    finishEditing(event);
                }
            });

            parentBadge.replaceChild(input, e.target);
            input.focus();
        }
    });

    // Event Listener cho nút "Tự động tìm từ đồng nghĩa"
    searchSynonymsBtn.addEventListener('click', async () => {
        const frontText = frontInput.value.trim();
        if (!frontText) {
            alert('Vui lòng nhập từ ở "Mặt trước" trước khi tìm.');
            return;
        }
        synonymsListDiv.innerHTML = '<p class="text-muted fst-italic">Đang tìm...</p>';
        const wordData = await fetchWordDefinition(frontText);
        let synonyms = [];
        if (wordData && wordData.meanings) {
            const synonymSet = new Set();
            wordData.meanings.forEach(meaning => {
                if (meaning.synonyms && meaning.synonyms.length > 0) {
                    meaning.synonyms.forEach(syn => synonymSet.add(syn));
                }
            });
            synonyms = Array.from(synonymSet);
        }
        renderSynonymBadges(synonyms, synonymsListDiv);
    });

    // Event Listener cho nút "Thêm" thủ công
    addSynonymBtn.addEventListener('click', () => {
        const newSynonym = manualSynonymInput.value.trim();
        if (newSynonym) {
            addSynonymBadge(newSynonym, synonymsListDiv);
            manualSynonymInput.value = '';
        }
    });
     manualSynonymInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addSynonymBtn.click();
        }
    });

    // Event listener để XÓA một từ đồng nghĩa (dùng event delegation)
    // Và cho phép SỬA khi double click
    synonymsListDiv.addEventListener('click', (e) => {
        // Logic XÓA
        if (e.target.classList.contains('btn-close')) {
            e.target.parentElement.remove();
        }
    });

    synonymsListDiv.addEventListener('dblclick', (e) => {
        // Logic SỬA
        if (e.target.classList.contains('synonym-text')) {
            const currentText = e.target.textContent;
            const parentBadge = e.target.parentElement;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentText;
            input.className = 'form-control form-control-sm';
            
            input.addEventListener('blur', finishEditing);
            input.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    finishEditing(event);
                }
            });

            function finishEditing(event) {
                const newText = event.target.value.trim();
                if (newText) {
                    e.target.textContent = newText;
                }
                parentBadge.replaceChild(e.target, input);
            }

            parentBadge.replaceChild(input, e.target);
            input.focus();
        }
    });

// Nút Lưu Thẻ - PHIÊN BẢN CUỐI CÙNG
    const saveCardButton = document.getElementById('save-card-btn');
    if (saveCardButton) {
        saveCardButton.addEventListener('click', () => { // Bỏ async, không cần gọi API ở đây nữa
            if (!deckSelect.value) return alert("Vui lòng tạo một bộ thẻ trước!");
            
            const frontText = frontInput.value.trim();
            const backText = backInput.value.trim();

            if (!frontText || !backText) {
                return alert('Vui lòng điền đầy đủ thông tin!');
            }

            // Lấy danh sách từ đồng nghĩa cuối cùng từ trong UI
            const finalSynonyms = getSynonymsFromUI(synonymsListDiv);

            const card = {
                front: frontText,
                back: backText,
                deck: deckSelect.value,
                status: 'chua-thuoc',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                synonyms: finalSynonyms // Lưu danh sách đã được chỉnh sửa
            };

            cardsRef.add(card).then(() => {
                activeDeck = card.deck;
                document.getElementById('library-tab').click();
                
                // Xóa dữ liệu đã nhập để chuẩn bị cho thẻ mới
                frontInput.value = '';
                backInput.value = '';
                synonymsListDiv.innerHTML = '';
                manualSynonymInput.value = '';

                console.log(`Đã lưu thẻ '${card.front}' với ${card.synonyms.length} từ đồng nghĩa.`);
            }).catch(error => console.error("Lỗi thêm thẻ:", error));
        });
    }

    cardsListDiv.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const cardId = target.dataset.id;

        if (target.classList.contains('info-btn')) {
            const word = target.dataset.word;
            infoModalTitle.textContent = word;
            infoModalBody.innerHTML = '<p class="text-center">Đang tải...</p>';
            infoModal.show();
            const data = await fetchWordDefinition(word);
            if (data) {
                let html = `<p><strong>Phiên âm:</strong> ${data.phonetic || (data.phonetics.find(p => p.text)?.text || 'N/A')} <span class="badge bg-secondary" onclick="speak('${word}', 'en-US')">🔊 US</span> <span class="badge bg-secondary" onclick="speak('${word}', 'en-GB')">🔊 UK</span></p>`;
                data.meanings.forEach(meaning => {
                    html += `<h6><em>${meaning.partOfSpeech}</em></h6>`;
                    meaning.definitions.forEach((def, index) => {
                        html += `<p><b>${index + 1}.</b> ${def.definition}</p>${def.example ? `<p class="text-muted fst-italic">"${def.example}"</p>` : ''}`;
                    });
                    if (meaning.synonyms?.length > 0) html += `<p><strong>Từ đồng nghĩa:</strong> ${meaning.synonyms.join(', ')}</p>`;
                    if (meaning.antonyms?.length > 0) html += `<p><strong>Từ trái nghĩa:</strong> ${meaning.antonyms.join(', ')}</p>`;
                });
                infoModalBody.innerHTML = html;
            } else {
                infoModalBody.innerHTML = '<p class="text-center text-danger">Không thể tải thông tin cho từ này.</p>';
            }
        } else if (target.classList.contains('edit-btn')) {
            const cardToEdit = cards.find(c => c.id === cardId);
            if (cardToEdit) {
                editCardId.value = cardToEdit.id;
                editDeckSelect.value = cardToEdit.deck;
                editFrontInput.value = cardToEdit.front;
                editBackInput.value = cardToEdit.back;
                
                // HIỂN THỊ TỪ ĐỒNG NGHĨA KHI MỞ MODAL
                renderSynonymBadges(cardToEdit.synonyms || [], editSynonymsListDiv);
                
                editModal.show();
            }
        } else if (target.classList.contains('delete-btn')) {
            if (confirm('Bạn có chắc muốn xóa thẻ này?')) {
                cardsRef.doc(cardId).delete().catch(error => console.error("Lỗi xóa thẻ:", error));
            }
        }
    });

    saveEditBtn.addEventListener('click', () => {
        const id = editCardId.value;
        
        // Lấy danh sách từ đồng nghĩa cuối cùng từ UI của modal
        const finalSynonyms = getSynonymsFromUI(editSynonymsListDiv);

        const updatedData = {
            deck: editDeckSelect.value,
            front: editFrontInput.value.trim(),
            back: editBackInput.value.trim(),
            synonyms: finalSynonyms // Thêm trường synonyms vào dữ liệu cập nhật
        };
        cardsRef.doc(id).update(updatedData)
            .then(() => editModal.hide())
            .catch(error => console.error("Lỗi cập nhật thẻ:", error));
    });

    // --- QUIZ LOGIC ---
    const startQuiz = () => {
        const selectedDeck = quizDeckFilter.value;
        const selectedStatuses = [...document.querySelectorAll('.status-filter:checked')].map(el => el.value);
        if (selectedStatuses.length === 0) return alert('Bạn phải chọn ít nhất một trạng thái để ôn tập!');

        let filteredCards = cards;
        if (selectedDeck !== 'all') {
            filteredCards = cards.filter(card => card.deck === selectedDeck);
        }

        currentQuiz = filteredCards.filter(card => selectedStatuses.includes(card.status));
        currentQuiz.sort(() => Math.random() - 0.5);

        if (currentQuiz.length === 0) return alert('Không có thẻ nào phù hợp với lựa chọn của bạn.');

        currentCardIndex = 0;
        quizSetupDiv.classList.add('hidden');
        quizViewDiv.classList.remove('hidden');
        showNextCard();
    };

    const endQuiz = () => {
        quizSetupDiv.classList.remove('hidden');
        quizViewDiv.classList.add('hidden');
    };

    const showNextCard = () => {
        quizCard.classList.remove('is-flipped');
        setTimeout(() => {
            const card = currentQuiz[currentCardIndex];
            const direction = quizDirectionSelect.value;
            // Dòng kiểm tra lỗi đã được xóa bỏ
            if (direction === 'front-to-back') {
                quizFront.textContent = card.front;
                quizBack.textContent = card.back;
            } else {
                quizFront.textContent = card.back;
                quizBack.textContent = card.front;
            }
            quizIpa.textContent = card.ipa || '';
            quizProgress.textContent = `Card ${currentCardIndex + 1} / ${currentQuiz.length}`;
            statusButtonsDiv.classList.add('hidden');
        }, 300);
    };

    const flipCardAction = () => {
        if (quizViewDiv.classList.contains('hidden')) return;
        quizCard.classList.toggle('is-flipped');
        statusButtonsDiv.classList.toggle('hidden');
    }

    statusButtonsDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('status-btn')) {
            const newStatus = e.target.dataset.status;
            const currentCardInQuiz = currentQuiz[currentCardIndex];
            cardsRef.doc(currentCardInQuiz.id).update({ status: newStatus })
                .catch(error => console.error("Lỗi cập nhật trạng thái thẻ:", error));

            currentCardIndex++;
            if (currentCardIndex < currentQuiz.length) {
                showNextCard();
            } else {
                alert('Bạn đã hoàn thành phiên ôn tập!');
                endQuiz();
            }
        }
    });

    startQuizBtn.addEventListener('click', startQuiz);
    endQuizBtn.addEventListener('click', endQuiz);
    quizCard.addEventListener('click', flipCardAction);
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !quizViewDiv.classList.contains('hidden')) {
            e.preventDefault();
            flipCardAction();
        }
    });
    ttsUSBtn.addEventListener('click', (e) => { e.stopPropagation(); speak(quizFront.textContent, 'en-US') });
    ttsUKBtn.addEventListener('click', (e) => { e.stopPropagation(); speak(quizFront.textContent, 'en-GB') });

// --- SYNONYM QUIZ LOGIC ---
    let currentSynonymQuiz = [];
    let currentSynonymQuestionIndex = 0;
    let correctSynonymAnswer = '';

    const startSynonymQuiz = () => {
        // Lấy danh sách các bộ thẻ đã được chọn từ checkboxes
        const selectedDecks = [...document.querySelectorAll('#synonym-deck-checkboxes .deck-filter-checkbox:checked')]
                                 .map(cb => cb.value);

        if (selectedDecks.length === 0) {
            return alert('Bạn phải chọn ít nhất một bộ thẻ để ôn tập!');
        }
        
        // Lọc các thẻ thuộc những bộ đã chọn
        let potentialCards = cards.filter(card => selectedDecks.includes(card.deck));

        // Chỉ lọc những thẻ có từ đồng nghĩa
        currentSynonymQuiz = potentialCards.filter(card => card.synonyms && card.synonyms.length > 0);
        currentSynonymQuiz.sort(() => Math.random() - 0.5); // Xáo trộn

        if (currentSynonymQuiz.length < 1) {
            return alert('Không có thẻ nào có từ đồng nghĩa trong (các) bộ thẻ bạn chọn.');
        }

        currentSynonymQuestionIndex = 0;
        synonymQuizSetupDiv.classList.add('hidden');
        synonymQuizViewDiv.classList.remove('hidden');
        displaySynonymQuestion();
    };

    const displaySynonymQuestion = () => {
        // Reset
        synonymOptionsContainer.innerHTML = '';
        synonymFeedback.innerHTML = '';
        nextSynonymQuestionBtn.classList.add('hidden');

        const currentCard = currentSynonymQuiz[currentSynonymQuestionIndex];
        synonymQuestionWord.textContent = currentCard.front;
        synonymQuizProgress.textContent = `Question ${currentSynonymQuestionIndex + 1} / ${currentSynonymQuiz.length}`;
        
        // --- Logic tạo câu hỏi trắc nghiệm ---
        // 1. Lấy một đáp án đúng
        correctSynonymAnswer = currentCard.synonyms[Math.floor(Math.random() * currentCard.synonyms.length)];

        // 2. Lấy 3 đáp án sai (distractors)
        const allOtherSynonyms = cards
            .filter(c => c.id !== currentCard.id && c.synonyms && c.synonyms.length > 0)
            .flatMap(c => c.synonyms);
        const uniqueDistractors = [...new Set(allOtherSynonyms)]
            .filter(s => !currentCard.synonyms.includes(s)); // Loại bỏ các từ đồng nghĩa của câu hỏi hiện tại
        
        const distractors = [];
        for (let i = 0; i < 3; i++) {
            if (uniqueDistractors.length > 0) {
                const randomIndex = Math.floor(Math.random() * uniqueDistractors.length);
                distractors.push(uniqueDistractors.splice(randomIndex, 1)[0]);
            }
        }
        
        // 3. Gộp và xáo trộn các lựa chọn
        const options = [...distractors, correctSynonymAnswer];
        options.sort(() => Math.random() - 0.5);

        // 4. Hiển thị các lựa chọn
        options.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-outline-primary';
            button.textContent = option;
            synonymOptionsContainer.appendChild(button);
        });
    };

    const checkSynonymAnswer = (selectedAnswer) => {
        // Vô hiệu hóa các nút lựa chọn
        Array.from(synonymOptionsContainer.children).forEach(button => {
            button.disabled = true;
            if (button.textContent === correctSynonymAnswer) {
                button.classList.remove('btn-outline-primary');
                button.classList.add('btn-success'); // Tô màu xanh cho đáp án đúng
            }
        });

        if (selectedAnswer === correctSynonymAnswer) {
            synonymFeedback.innerHTML = `<p class="text-success fw-bold">Chính xác! 🎉</p>`;
        } else {
            synonymFeedback.innerHTML = `<p class="text-danger fw-bold">Không đúng. Đáp án đúng là "${correctSynonymAnswer}".</p>`;
            // Tô màu đỏ cho đáp án sai đã chọn
            const selectedBtn = Array.from(synonymOptionsContainer.children).find(b => b.textContent === selectedAnswer);
            if(selectedBtn) {
                selectedBtn.classList.remove('btn-outline-primary');
                selectedBtn.classList.add('btn-danger');
            }
        }

        nextSynonymQuestionBtn.classList.remove('hidden');
    };
    
    const endSynonymQuiz = () => {
        synonymQuizSetupDiv.classList.remove('hidden');
        synonymQuizViewDiv.classList.add('hidden');
    };

    // --- Event Listeners for Synonym Quiz ---
    startSynonymQuizBtn.addEventListener('click', startSynonymQuiz);
    endSynonymQuizBtn.addEventListener('click', endSynonymQuiz);

    synonymOptionsContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            checkSynonymAnswer(e.target.textContent);
        }
    });

    nextSynonymQuestionBtn.addEventListener('click', () => {
        currentSynonymQuestionIndex++;
        if (currentSynonymQuestionIndex < currentSynonymQuiz.length) {
            displaySynonymQuestion();
        } else {
            alert('Bạn đã hoàn thành phần luyện tập từ đồng nghĩa!');
            endSynonymQuiz();
        }
    });

    synonymToggleAllDecks.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('#synonym-deck-checkboxes .deck-filter-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = synonymToggleAllDecks.checked;
        });
    });

    // --- INITIALIZATION ---
    window.speak = speak;
    // --- BATCH UPDATE LOGIC ---
    const batchUpdateSynonyms = async () => {
        if (!confirm('Bạn có muốn bắt đầu quá trình cập nhật từ đồng nghĩa cho các thẻ cũ không? Quá trình này có thể mất một lúc và sẽ thực hiện các thay đổi lên cơ sở dữ liệu của bạn.')) {
            return;
        }

        // Lọc ra những thẻ chưa có trường "synonyms"
        const cardsToUpdate = cards.filter(card => typeof card.synonyms === 'undefined');

        if (cardsToUpdate.length === 0) {
            alert('Tuyệt vời! Tất cả các thẻ của bạn đều đã được xử lý từ đồng nghĩa.');
            return;
        }

        let updatedCount = 0;
        let failedCount = 0;
        const total = cardsToUpdate.length;
        alert(`Bắt đầu cập nhật cho ${total} thẻ. Vui lòng không đóng tab này cho đến khi có thông báo hoàn thành.`);
        
        // Dùng vòng lặp for...of để xử lý tuần tự, tránh quá tải API
        for (const card of cardsToUpdate) {
            try {
                console.log(`Đang xử lý thẻ: "${card.front}"...`);
                const wordData = await fetchWordDefinition(card.front);
                let synonyms = [];
                if (wordData && wordData.meanings) {
                    const synonymSet = new Set();
                    wordData.meanings.forEach(meaning => {
                        if (meaning.synonyms && meaning.synonyms.length > 0) {
                            meaning.synonyms.forEach(syn => synonymSet.add(syn));
                        }
                    });
                    synonyms = Array.from(synonymSet);
                }

                // Cập nhật thẻ trên Firestore
                await cardsRef.doc(card.id).update({ synonyms: synonyms });
                console.log(` -> Đã cập nhật "${card.front}" với ${synonyms.length} từ đồng nghĩa.`);
                updatedCount++;

            } catch (error) {
                console.error(`Lỗi khi cập nhật thẻ "${card.front}":`, error);
                failedCount++;
            }
            
            // Thêm một khoảng nghỉ nhỏ giữa các lần gọi API để tránh bị chặn
            await new Promise(resolve => setTimeout(resolve, 300)); // nghỉ 300ms
        }
        
        alert(`Hoàn thành! \n- ${updatedCount} thẻ được cập nhật thành công. \n- ${failedCount} thẻ gặp lỗi (kiểm tra console để xem chi tiết).`);
    };

    // Gán sự kiện cho nút
    batchUpdateSynonymsBtn.addEventListener('click', batchUpdateSynonyms);
});