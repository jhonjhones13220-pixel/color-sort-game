
const AuthUI = {
  screen: null,
  currentView: 'login',

  init() {
    this.createScreen();
    this.bindEvents();

    window.addEventListener('authChanged', (event) => {
      if (event.detail.user) {
        this.hide();
      } else if (event.detail.event === 'SIGNED_OUT') {
        this.show('login');
      }
    });

    console.log('COLOR SORT: Interface de autenticação inicializada!');
  },

  createScreen() {
    this.screen = document.createElement('div');
    this.screen.className = 'auth-screen';
    this.screen.id = 'auth-screen';

    this.screen.innerHTML = `
      <div class="auth-container">

        <div class="auth-brand">
          <div class="auth-logo">CS</div>
          <h1>COLOR SORT</h1>
          <p>Organize as cores. Supere seus limites.</p>
        </div>

        <div class="auth-card">

          <div id="auth-login-view">
            <h2>Bem-vindo de volta!</h2>
            <p class="auth-description">
              Entre na sua conta para acompanhar seu progresso
              e competir nos rankings.
            </p>

            <div id="auth-login-message" class="auth-message"></div>

            <form id="auth-login-form">
              <div class="auth-field">
                <label for="login-email">E-mail</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  autocomplete="email"
                  required
                >
              </div>

              <div class="auth-field">
                <label for="login-password">Senha</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Sua senha"
                  autocomplete="current-password"
                  required
                >
              </div>

              <button class="auth-submit" type="submit">
                ENTRAR
              </button>
            </form>

            <div class="auth-links">
              <button class="auth-link" data-auth-view="recover">
                Esqueci minha senha
              </button>

              <button class="auth-link" data-auth-view="register">
                Criar uma conta
              </button>
            </div>
          </div>

          <div id="auth-register-view" hidden>
            <h2>Crie sua conta</h2>
            <p class="auth-description">
              Entre para fazer parte da comunidade Color Sort.
            </p>

            <div id="auth-register-message" class="auth-message"></div>

            <form id="auth-register-form">
              <div class="auth-field">
                <label for="register-name">Nome de jogador</label>
                <input
                  id="register-name"
                  type="text"
                  placeholder="Como quer ser chamado?"
                  maxlength="40"
                  autocomplete="name"
                  required
                >
              </div>

              <div class="auth-field">
                <label for="register-email">E-mail</label>
                <input
                  id="register-email"
                  type="email"
                  placeholder="seu@email.com"
                  autocomplete="email"
                  required
                >
              </div>

              <div class="auth-field">
                <label for="register-password">Senha</label>
                <input
                  id="register-password"
                  type="password"
                  placeholder="Mínimo de 6 caracteres"
                  minlength="6"
                  autocomplete="new-password"
                  required
                >
              </div>

              <button class="auth-submit" type="submit">
                CRIAR CONTA
              </button>
            </form>

            <div class="auth-links">
              <button class="auth-link" data-auth-view="login">
                Já tenho uma conta. Entrar
              </button>
            </div>
          </div>

          <div id="auth-recover-view" hidden>
            <h2>Recuperar senha</h2>
            <p class="auth-description">
              Informe seu e-mail para receber as instruções
              de recuperação.
            </p>

            <div id="auth-recover-message" class="auth-message"></div>

            <form id="auth-recover-form">
              <div class="auth-field">
                <label for="recover-email">E-mail</label>
                <input
                  id="recover-email"
                  type="email"
                  placeholder="seu@email.com"
                  autocomplete="email"
                  required
                >
              </div>

              <button class="auth-submit" type="submit">
                ENVIAR INSTRUÇÕES
              </button>
            </form>

            <div class="auth-links">
              <button class="auth-link" data-auth-view="login">
                Voltar para o login
              </button>
            </div>
          </div>

        </div>

        <button class="auth-back" id="auth-guest-button">
          Continuar sem conta
        </button>

      </div>
    `;

    document.body.appendChild(this.screen);
  },

  bindEvents() {
    this.screen.querySelectorAll('[data-auth-view]').forEach(button => {
      button.addEventListener('click', () => {
        this.show(button.dataset.authView);
      });
    });

    this.screen.querySelector('#auth-login-form')
      .addEventListener('submit', event => {
        event.preventDefault();
        this.login();
      });

    this.screen.querySelector('#auth-register-form')
      .addEventListener('submit', event => {
        event.preventDefault();
        this.register();
      });

    this.screen.querySelector('#auth-recover-form')
      .addEventListener('submit', event => {
        event.preventDefault();
        this.recover();
      });

    this.screen.querySelector('#auth-guest-button')
      .addEventListener('click', () => {
        this.hide();
      });
  },

  show(view = 'login') {
    this.currentView = view;

    ['login', 'register', 'recover'].forEach(name => {
      const element = this.screen.querySelector(`#auth-${name}-view`);
      element.hidden = name !== view;
    });

    this.screen.classList.add('active');
  },

  hide() {
    if (this.screen) {
      this.screen.classList.remove('active');
    }
  },

  message(view, text, type = 'error') {
    const element = this.screen.querySelector(`#auth-${view}-message`);

    element.textContent = text;
    element.className = `auth-message visible ${type}`;
  },

  clearMessage(view) {
    const element = this.screen.querySelector(`#auth-${view}-message`);

    element.textContent = '';
    element.className = 'auth-message';
  },

  async login() {
    const email = this.screen.querySelector('#login-email').value.trim();
    const password = this.screen.querySelector('#login-password').value;
    const button = this.screen.querySelector('#auth-login-form button');

    this.clearMessage('login');
    button.disabled = true;
    button.textContent = 'ENTRANDO...';

    try {
      await Auth.login(email, password);
      this.hide();
    } catch (error) {
      this.message('login', error.message || 'Não foi possível entrar.');
    } finally {
      button.disabled = false;
      button.textContent = 'ENTRAR';
    }
  },

  async register() {
    const name = this.screen.querySelector('#register-name').value.trim();
    const email = this.screen.querySelector('#register-email').value.trim();
    const password = this.screen.querySelector('#register-password').value;
    const button = this.screen.querySelector('#auth-register-form button');

    this.clearMessage('register');

    if (name.length < 2) {
      this.message('register', 'Digite um nome com pelo menos 2 caracteres.');
      return;
    }

    if (password.length < 6) {
      this.message('register', 'A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    button.disabled = true;
    button.textContent = 'CRIANDO CONTA...';

    try {
      const result = await Auth.register(email, password, name);

      if (result.session) {
        this.message('register', 'Conta criada com sucesso!', 'success');
        this.hide();
      } else {
        this.message(
          'register',
          'Cadastro iniciado! Verifique seu e-mail para confirmar a conta antes de entrar.',
          'success'
        );
      }
    } catch (error) {
      this.message('register', error.message || 'Não foi possível criar a conta.');
    } finally {
      button.disabled = false;
      button.textContent = 'CRIAR CONTA';
    }
  },

  async recover() {
    const email = this.screen.querySelector('#recover-email').value.trim();
    const button = this.screen.querySelector('#auth-recover-form button');

    this.clearMessage('recover');
    button.disabled = true;
    button.textContent = 'ENVIANDO...';

    try {
      await Auth.recoverPassword(email);

      this.message(
        'recover',
        'Se o endereço estiver cadastrado, você receberá um e-mail com as instruções.',
        'success'
      );
    } catch (error) {
      this.message('recover', error.message || 'Não foi possível enviar o e-mail.');
    } finally {
      button.disabled = false;
      button.textContent = 'ENVIAR INSTRUÇÕES';
    }
  }
};

window.AuthUI = AuthUI;

console.log('COLOR SORT: Sistema de autenticação carregado!');
