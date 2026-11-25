
const SUPABASE_URL = 'https://gfytluqcdasietnghhfi.supabase.co';

const SUPABASE_KEY = 'sb_publishable_Tg05Zk5x8h_XzZ4jJzLO6g_XDUxtsa7';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

window.supabaseClient = supabaseClient;

async function testarSupabase() {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id')
    .limit(1);

  if (error) {
    console.error('ERRO AO CONSULTAR SUPABASE:', error.message);
    return;
  }

  console.log('COLOR SORT: Banco de dados funcionando!', data);
}

testarSupabase();
