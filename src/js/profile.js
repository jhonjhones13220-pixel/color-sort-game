
const Profile = {
  screen: null,
  stats: {
    levels_completed: 0,
    total_score: 0,
    total_moves: 0
  },

  init() {
    this.createScreen();
    this.bindEvents();

    window.addEventListener('authChanged', (event) => {
      if (!event.detail.user) {
        this.hide();
      }
    });

    console.log('COLOR SORT: Sistema de perfil carregado!');
  },

  createScreen() {
    this.screen = document.createElement('div');
    this.screen.id = 'profile-screen';
    this.screen.className = 'profile-screen';

    this.screen.innerHTML = `
      <div class="profile-container">

        <header class="profile-header">
          <div>
            <span class="profile-eyebrow">LABORATÓRIO • PERFIL</span>
            <h2>Meu perfil</h2>
          </div>
          <button class="profile-close" id="profile-close">×</button>
        </header>

        <section class="profile-hero">
          <div class="profile-avatar" id="profile-avatar">CS</div>
          <h2 class="profile-name" id="profile-name">Jogador</h2>
          <p class="profile-email" id="profile-email"></p>
          <p class="profile-location" id="profile-location">
            Localização não informada
          </p>
        </section>

        <section class="profile-stats">
          <div class="profile-stat">
            <strong id="profile-levels">0</strong>
            <span>Fases</span>
          </div>

          <div class="profile-stat">
            <strong id="profile-score">0</strong>
            <span>Pontos</span>
          </div>

          <div class="profile-stat">
            <strong id="profile-moves">0</strong>
            <span>Movimentos</span>
          </div>
        </section>

        <section class="profile-section">
          <h3>Informações pessoais</h3>

          <form id="profile-form">

            <div class="profile-form-field">
              <label for="profile-display-name">Nome de jogador</label>
              <input
                id="profile-display-name"
                type="text"
                maxlength="40"
                required
              >
            </div>

            <div class="profile-form-field">
              <label for="profile-neighborhood">Bairro</label>
              <input
                id="profile-neighborhood"
                type="text"
                maxlength="80"
                placeholder="Seu bairro"
              >
            </div>

            <div class="profile-form-field">
              <label for="profile-city">Cidade</label>
              <input
                id="profile-city"
                type="text"
                maxlength="80"
                placeholder="Sua cidade"
              >
            </div>

            <div class="profile-form-row">
              <div class="profile-form-field">
                <label for="profile-state">Estado</label>
                <input
                  id="profile-state"
                  type="text"
                  maxlength="80"
                  placeholder="Seu estado"
                >
              </div>

              <div class="profile-form-field">
                <label for="profile-country">País</label>
                <input
                  id="profile-country"
                  type="text"
                  maxlength="80"
                  placeholder="Seu país"
                >
              </div>
            </div>

            <button class="profile-save" id="profile-save" type="submit">
              SALVAR ALTERAÇÕES
            </button>

            <div
              class="profile-message"
              id="profile-message"
              role="status"
            ></div>

          </form>
        </section>

        <button class="profile-logout" id="profile-logout">
          SAIR DA CONTA
        </button>

      </div>
    `;

    document.body.appendChild(this.screen);
  },

  bindEvents() {
    this.screen.querySelector('#profile-close')
      .addEventListener('click', () => {
        this.hide();
        if (typeof window.syncActiveNavFromScreens === 'function') {
          window.syncActiveNavFromScreens();
        }
      });

    this.screen.querySelector('#profile-form')
      .addEventListener('submit', (event) => {
        event.preventDefault();
        this.save();
      });

    this.screen.querySelector('#profile-logout')
      .addEventListener('click', () => this.logout());
  },

  async open() {
    if (!Auth.user) {
      AuthUI.show('login');
      return;
    }

    await Auth.loadProfile();

    if (!Auth.profile) {
      alert('Não foi possível carregar seu perfil. Tente novamente.');
      return;
    }

    await this.loadStats();
    this.render();

    this.screen.classList.add('active');
  },

  hide() {
    this.screen.classList.remove('active');
  },

  async loadStats() {
    const { data, error } = await supabaseClient
      .from('player_stats')
      .select('levels_completed, total_score, total_moves')
      .eq('user_id', Auth.user.id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao carregar estatísticas:', error.message);
      return;
    }

    this.stats = data || {
      levels_completed: 0,
      total_score: 0,
      total_moves: 0
    };
  },

  render() {
    const profile = Auth.profile;
    const user = Auth.user;

    const name = profile.display_name || 'Jogador';

    document.getElementById('profile-name').textContent = name;

    document.getElementById('profile-email').textContent =
      user.email || '';

    document.getElementById('profile-avatar').textContent =
      name.trim().charAt(0).toUpperCase() || 'C';

    const location = [
      profile.neighborhood,
      profile.city,
      profile.state,
      profile.country
    ].filter(Boolean).join(' • ');

    document.getElementById('profile-location').textContent =
      location || 'Localização não informada';

    document.getElementById('profile-display-name').value =
      profile.display_name || '';

    document.getElementById('profile-neighborhood').value =
      profile.neighborhood || '';

    document.getElementById('profile-city').value =
      profile.city || '';

    document.getElementById('profile-state').value =
      profile.state || '';

    document.getElementById('profile-country').value =
      profile.country || '';

    document.getElementById('profile-levels').textContent =
      this.formatNumber(this.stats.levels_completed);

    document.getElementById('profile-score').textContent =
      this.formatNumber(this.stats.total_score);

    document.getElementById('profile-moves').textContent =
      this.formatNumber(this.stats.total_moves);
  },

  formatNumber(value) {
    return Number(value || 0).toLocaleString('pt-BR');
  },

  showMessage(message, type) {
    const element = document.getElementById('profile-message');

    element.textContent = message;
    element.className = `profile-message visible ${type}`;
  },

  async save() {
    const button = document.getElementById('profile-save');

    const profileData = {
      display_name: document.getElementById('profile-display-name').value.trim(),
      neighborhood: document.getElementById('profile-neighborhood').value.trim(),
      city: document.getElementById('profile-city').value.trim(),
      state: document.getElementById('profile-state').value.trim(),
      country: document.getElementById('profile-country').value.trim()
    };

    if (profileData.display_name.length < 2) {
      this.showMessage(
        'O nome precisa ter pelo menos 2 caracteres.',
        'error'
      );
      return;
    }

    button.disabled = true;
    button.textContent = 'SALVANDO...';

    try {
      await Auth.updateProfile(profileData);

      this.render();

      this.showMessage(
        'Seu perfil foi atualizado com sucesso!',
        'success'
      );
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);

      this.showMessage(
        error.message || 'Não foi possível salvar as alterações.',
        'error'
      );
    } finally {
      button.disabled = false;
      button.textContent = 'SALVAR ALTERAÇÕES';
    }
  },

  async logout() {
    const confirmed = confirm('Deseja realmente sair da sua conta?');

    if (!confirmed) return;

    try {
      await Auth.logout();
      this.hide();
      AuthUI.show('login');
    } catch (error) {
      alert(error.message || 'Não foi possível sair da conta.');
    }
  }
};

window.Profile = Profile;
