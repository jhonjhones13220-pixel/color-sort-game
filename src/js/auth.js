
const Auth = {
  user: null,
  profile: null,
  initialized: false,
  authSubscription: null,

  dispatch(event = 'INITIALIZED') {
    window.dispatchEvent(new CustomEvent('authChanged', {
      detail: {
        user: this.user,
        profile: this.profile,
        event
      }
    }));
  },

  async init() {
    if (this.initialized) {
      return this.user;
    }

    this.initialized = true;

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error('Erro ao verificar sessão:', error.message);
      this.initialized = false;
      return null;
    }

    this.user = data.session?.user || null;

    if (this.user) {
      await this.loadProfile();
    }

    const { data: subscriptionData } =
      supabaseClient.auth.onAuthStateChange((event, session) => {
        this.user = session?.user || null;

        if (!this.user) {
          this.profile = null;
          this.dispatch(event);
          return;
        }

        // Aguarda o callback terminar antes de consultar o banco.
        Promise.resolve().then(async () => {
          await this.loadProfile();
          this.dispatch(event);
        });
      });

    this.authSubscription = subscriptionData.subscription;

    this.dispatch();

    console.log('COLOR SORT: Autenticação inicializada!');

    return this.user;
  },

  async register(email, password, displayName) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });

    if (error) throw error;

    this.user = data.user;
    this.profile = null;

    if (data.session) {
      await this.loadProfile();
    }

    this.dispatch('SIGNED_UP');

    return data;
  },

  async login(email, password) {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    this.user = data.user;

    await this.loadProfile();

    this.dispatch('SIGNED_IN');

    return data;
  },

  async logout() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) throw error;

    this.user = null;
    this.profile = null;

    this.dispatch('SIGNED_OUT');
  },

  async recoverPassword(email) {
    const { data, error } =
      await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });

    if (error) throw error;

    return data;
  },

  async loadProfile() {
    if (!this.user) return null;

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', this.user.id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao carregar perfil:', error.message);
      return null;
    }

    this.profile = data;

    return data;
  },

  async updateProfile(profileData) {
    if (!this.user) {
      throw new Error('Você precisa entrar na sua conta.');
    }

    const allowedFields = {};

    const fields = [
      'display_name',
      'neighborhood',
      'city',
      'state',
      'country'
    ];

    fields.forEach(field => {
      if (profileData[field] !== undefined) {
        allowedFields[field] = profileData[field];
      }
    });

    const { data, error } = await supabaseClient
      .from('profiles')
      .update(allowedFields)
      .eq('id', this.user.id)
      .select()
      .single();

    if (error) throw error;

    this.profile = data;

    this.dispatch('PROFILE_UPDATED');

    return data;
  }
};

window.Auth = Auth;

console.log('COLOR SORT: Sistema de autenticação carregado!');
