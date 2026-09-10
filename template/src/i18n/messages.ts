export const languages = ['pt-BR', 'en-US', 'es-ES'] as const;
export type AppLanguage = (typeof languages)[number];

export const languageNames: Record<AppLanguage, string> = {
  'pt-BR': 'pt-BR',
  'en-US': 'en-US',
  'es-ES': 'es-ES',
};

export type AppMessages = {
  nav: {
    signIn: string;
    signUp: string;
    login: string;
    title: string;
    home: string;
    services: string;
    plans: string;
    contact: string;
    theme: string;
    language: string;
    light: string;
    dark: string;
    system: string;
    color: string;
    blue: string;
    green: string;
    purple: string;
    teal: string;
    red: string;
    orange: string;
    coral: string;
    openMenu: string;
    closeMenu: string;
  };
  home: {
    heroLead: string;
    heroVerbs: string;
    heroReducedVerb: string;
    heroTail: string;
    heroSub: string;
    searchPlaceholder: string;
    searchButton: string;
    categoriesTitle: string;
    categoriesAll: string;
    nearbyTitle: string;
    nearbySub: string;
    howTitle: string;
    step1Title: string;
    step1Text: string;
    step2Title: string;
    step2Text: string;
    step3Title: string;
    step3Text: string;
    joinKicker: string;
    joinTitle: string;
    joinText: string;
    joinCta: string;
  };
  sejaPrestador: {
    metaTitle: string;
    headline: string;
    subhead: string;
    stepsTitle: string;
    step1Title: string;
    step1Text: string;
    step2Title: string;
    step2Text: string;
    step3Title: string;
    step3Text: string;
    formTitle: string;
    benefitsTitle: string;
    benefit1: string;
    benefit2: string;
    benefit3: string;
    benefit4: string;
    ctaCreateAccount: string;
    haveAccount: string;
  };
  default: {
    dashboard: string;
  };
};

export const messages: Record<AppLanguage, AppMessages> = {
  'pt-BR': {
    nav: {
      title: 'Foco Total',
      signIn: 'Entrar',
      signUp: 'Registrar-se',
      login: 'Login',
      home: 'Inicio',
      services: 'Servicos',
      plans: 'Planos',
      contact: 'Contato',
      theme: 'Tema',
      language: 'Idioma',
      light: 'Claro',
      dark: 'Escuro',
      system: 'Sistema',
      color: 'Cor',
      blue: 'Azul',
      green: 'Verde',
      purple: 'Roxo',
      teal: 'Verde-azulado',
      red: 'Vermelho',
      orange: 'Laranja',
      coral: 'Coral',
      openMenu: 'Abrir menu',
      closeMenu: 'Fechar menu',
    },
    home: {
      heroLead: 'Precisa',
      heroVerbs: 'consertar, ensinar, reformar, cuidar, pintar, montar',
      heroReducedVerb: 'resolver',
      heroTail: 'perto de você?',
      heroSub: 'Profissionais avaliados por quem já contratou, aqui na sua região.',
      searchPlaceholder: 'buscar serviço ou profissional',
      searchButton: 'Buscar',
      categoriesTitle: 'Explore por categoria',
      categoriesAll: 'Ver todas',
      nearbyTitle: 'Quem está por perto',
      nearbySub: 'Uma amostra de quem está oferecendo serviço agora.',
      howTitle: 'Como funciona',
      step1Title: 'Busque',
      step1Text: 'Diga o que você precisa. A gente mostra quem faz isso perto de você.',
      step2Title: 'Converse',
      step2Text: 'Fale direto com o profissional, tire dúvidas e peça um orçamento.',
      step3Title: 'Combine',
      step3Text: 'Fechou? Combine data, valor e pagamento com quem você escolheu.',
      joinKicker: 'Para quem oferece serviço',
      joinTitle: 'Você também faz?',
      joinText: 'Publique seu serviço de graça e apareça para quem procura na sua região.',
      joinCta: 'Anunciar meu serviço',
    },
    sejaPrestador: {
      metaTitle: 'Seja um prestador',
      headline: 'Transforme seu serviço em mais clientes',
      subhead:
        'Entre ou crie sua conta grátis e comece a aparecer para quem procura o que você faz na sua região.',
      stepsTitle: 'Como começar',
      step1Title: 'Crie seu perfil',
      step1Text: 'Conta rápida e gratuita. Adicione sua área de atuação e onde você atende.',
      step2Title: 'Publique seus serviços',
      step2Text: 'Descreva o que você faz, adicione fotos e defina seus preços.',
      step3Title: 'Receba contatos',
      step3Text: 'Clientes da sua região falam direto com você, sem intermediário.',
      formTitle: 'Bem-vindo, prestador',
      benefitsTitle: 'O que você ganha',
      benefit1: 'Apareça para clientes que já estão procurando na sua região',
      benefit2: 'Anuncie de graça, sem mensalidade para começar',
      benefit3: 'Gerencie seus serviços e sua agenda num só lugar',
      benefit4: 'Fale direto com o cliente, sem comissão sobre o combinado',
      ctaCreateAccount: 'Criar conta grátis',
      haveAccount: 'Já tem conta? Use o formulário para entrar.',
    },
    default: {
      dashboard: 'Meu Painel',
    },
  },
  'en-US': {
    nav: {
      title: 'Foco Total',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      login: 'Login',
      home: 'Home',
      services: 'Services',
      plans: 'Plans',
      contact: 'Contact',
      theme: 'Theme',
      language: 'Language',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      color: 'Color',
      blue: 'Blue',
      green: 'Green',
      purple: 'Purple',
      teal: 'Teal',
      red: 'Red',
      orange: 'Orange',
      coral: 'Coral',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
    },
    home: {
      heroLead: 'Need to',
      heroVerbs: 'fix, teach, renovate, care, paint, assemble',
      heroReducedVerb: 'get it done',
      heroTail: 'near you?',
      heroSub: 'Pros rated by people who already hired them, right here in your area.',
      searchPlaceholder: 'search for a service or pro',
      searchButton: 'Search',
      categoriesTitle: 'Browse by category',
      categoriesAll: 'See all',
      nearbyTitle: 'Whos nearby',
      nearbySub: 'A sample of who is offering services right now.',
      howTitle: 'How it works',
      step1Title: 'Search',
      step1Text: 'Tell us what you need. We show you who does it near you.',
      step2Title: 'Chat',
      step2Text: 'Talk straight to the pro, ask questions, and request a quote.',
      step3Title: 'Arrange',
      step3Text: 'Good to go? Set the date, price, and payment with the pro you picked.',
      joinKicker: 'For service providers',
      joinTitle: 'You do this too?',
      joinText: 'Post your service for free and show up for people searching in your area.',
      joinCta: 'List my service',
    },
    sejaPrestador: {
      metaTitle: 'Become a provider',
      headline: 'Turn your work into more clients',
      subhead:
        'Sign in or create your free account and start showing up for people looking for what you do in your area.',
      stepsTitle: 'How to start',
      step1Title: 'Create your profile',
      step1Text: 'Quick, free account. Add what you do and where you work.',
      step2Title: 'Publish your services',
      step2Text: 'Describe your work, add photos, and set your prices.',
      step3Title: 'Get contacted',
      step3Text: 'Clients in your area reach you directly, no middleman.',
      formTitle: 'Welcome, provider',
      benefitsTitle: 'What you get',
      benefit1: 'Show up for clients already searching in your area',
      benefit2: 'List for free, no subscription to get started',
      benefit3: 'Manage your services and schedule in one place',
      benefit4: 'Talk straight to the client, no commission on what you agree',
      ctaCreateAccount: 'Create free account',
      haveAccount: 'Already have an account? Use the form to sign in.',
    },
    default: {
      dashboard: 'Dashboard',
    },
  },
  'es-ES': {
    nav: {
      title: 'Foco Total',
      signIn: 'Iniciar sesión',
      signUp: 'Registrarse',
      login: 'Login',
      home: 'Inicio',
      services: 'Servicios',
      plans: 'Planes',
      contact: 'Contacto',
      theme: 'Tema',
      language: 'Idioma',
      light: 'Claro',
      dark: 'Oscuro',
      system: 'Sistema',
      color: 'Color',
      blue: 'Azul',
      green: 'Verde',
      purple: 'Morado',
      teal: 'Verde azulado',
      red: 'Rojo',
      orange: 'Naranja',
      coral: 'Coral',
      openMenu: 'Abrir menu',
      closeMenu: 'Cerrar menú',
    },
    home: {
      heroLead: 'Necesitas',
      heroVerbs: 'reparar, enseñar, reformar, cuidar, pintar, montar',
      heroReducedVerb: 'resolverlo',
      heroTail: 'cerca de ti?',
      heroSub: 'Profesionales valorados por quienes ya los contrataron, aquí en tu zona.',
      searchPlaceholder: 'buscar servicio o profesional',
      searchButton: 'Buscar',
      categoriesTitle: 'Explora por categoría',
      categoriesAll: 'Ver todas',
      nearbyTitle: 'Quién está cerca',
      nearbySub: 'Una muestra de quienes están ofreciendo servicios ahora.',
      howTitle: 'Cómo funciona',
      step1Title: 'Busca',
      step1Text: 'Di lo que necesitas. Te mostramos quién lo hace cerca de ti.',
      step2Title: 'Conversa',
      step2Text: 'Habla directo con el profesional, resuelve dudas y pide un presupuesto.',
      step3Title: 'Acuerda',
      step3Text: '¿Todo listo? Acuerda fecha, precio y pago con quien elegiste.',
      joinKicker: 'Para quienes ofrecen servicios',
      joinTitle: '¿Tú también lo haces?',
      joinText: 'Publica tu servicio gratis y aparece para quienes buscan en tu zona.',
      joinCta: 'Publicar mi servicio',
    },
    sejaPrestador: {
      metaTitle: 'Sé un profesional',
      headline: 'Convierte tu trabajo en más clientes',
      subhead:
        'Inicia sesión o crea tu cuenta gratis y empieza a aparecer para quienes buscan lo que haces en tu zona.',
      stepsTitle: 'Cómo empezar',
      step1Title: 'Crea tu perfil',
      step1Text: 'Cuenta rápida y gratuita. Añade tu área de trabajo y dónde atiendes.',
      step2Title: 'Publica tus servicios',
      step2Text: 'Describe lo que haces, añade fotos y define tus precios.',
      step3Title: 'Recibe contactos',
      step3Text: 'Los clientes de tu zona hablan directo contigo, sin intermediarios.',
      formTitle: 'Bienvenido, profesional',
      benefitsTitle: 'Qué ganas',
      benefit1: 'Aparece para clientes que ya están buscando en tu zona',
      benefit2: 'Publica gratis, sin mensualidad para empezar',
      benefit3: 'Gestiona tus servicios y tu agenda en un solo lugar',
      benefit4: 'Habla directo con el cliente, sin comisión sobre lo acordado',
      ctaCreateAccount: 'Crear cuenta gratis',
      haveAccount: '¿Ya tienes cuenta? Usa el formulario para iniciar sesión.',
    },
    default: {
      dashboard: 'Dashboard',
    },
  },
};
