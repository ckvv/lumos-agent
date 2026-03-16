import type { MessageSchema } from '#renderer/i18n/locales/zh-CN'

export const en = {
  shell: {
    eyebrow: 'lumos',
    title: 'Electron + Vite desktop app starter',
    description: 'A practical baseline for desktop prototypes and production apps with clear process boundaries, routing, i18n, and a scalable Vue UI structure.',
    currentUser: 'Signed in as {username}',
    languageLabel: 'Language',
    languageSwitch: 'Switch language',
    logout: 'Log out',
  },
  auth: {
    shell: {
      eyebrow: 'Local authentication',
      title: 'Establish the local account and session before rendering the protected app.',
      description: 'After the database bootstrap completes, the app branches into registration, login, or authenticated mode based on the local machine state. Protected content never renders before authentication succeeds.',
    },
    init: {
      eyebrow: 'Database bootstrap',
      failedBody: 'The local SQLite bootstrap failed. Fix the issue and retry to restart the bootstrap flow.',
      failedTitle: 'Database initialization failed',
      initializingBody: 'The main process is preparing the local database and auth tables. The app will move into registration or login once initialization completes.',
      initializingTitle: 'Initializing the local database',
      retry: 'Retry initialization',
    },
    register: {
      description: 'This is the first launch. Create the only local account and the app will immediately enter the authenticated state.',
      eyebrow: 'First-time registration',
      submit: 'Create local account',
      title: 'Register the local account',
    },
    login: {
      description: 'A local account already exists. Enter the correct username and password to restore the current device session.',
      eyebrow: 'Account login',
      submit: 'Log in',
      title: 'Use the local account to enter the app',
    },
    form: {
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter password',
      submitting: 'Submitting...',
      usernameLabel: 'Username',
      usernamePlaceholder: 'Enter username',
    },
  },
  navigation: {
    ariaLabel: 'Application navigation',
  },
  home: {
    eyebrow: 'Home',
    title: 'A starting point you can keep building on from shell to feature screens',
    body: 'This starter cleanly separates the Electron main process, preload bridge, and Vue renderer while staying lightweight enough for dashboards, utilities, and internal desktop tools.',
    meta: {
      runtime: 'Electron Forge + Vite',
      router: 'Vue Router auto routes',
      i18n: 'Built-in locale switcher',
    },
    sections: {
      highlights: 'What is included',
      quickStart: 'Quick start',
      runtimeBridge: 'Main-process RPC',
    },
    highlights: {
      stack: {
        title: 'Modern frontend stack included',
        body: 'The renderer ships with Vue 3, TypeScript, Tailwind CSS, and Nuxt UI so forms, settings, dashboards, and data views can be added without extra setup.',
      },
      desktop: {
        title: 'Desktop responsibilities stay clear',
        body: 'Main owns windows and lifecycle, preload exposes safe bridges, and renderer stays focused on UX so future native capabilities do not leak across layers.',
      },
      scale: {
        title: 'Built to grow past the template phase',
        body: 'The directory layout already follows runtime ownership, making it straightforward to add new screens, bridge APIs, or window modules without restructuring later.',
      },
    },
    quickStart: {
      title: 'Keep the default conventions and get the app running first',
      install: 'pnpm install',
      dev: 'pnpm start',
      package: 'pnpm package',
      note: 'Validate the startup and packaging flow first so the main process, preload script, and renderer work together before layering in business features.',
    },
    runtimeBridge: {
      title: 'Renderer data now comes through a typed oRPC bridge',
      body: 'The preload script establishes a MessagePort-backed oRPC client, so renderer features call main-process procedures through one contract-driven transport that can grow cleanly.',
      loading: 'Loading runtime information from the main process...',
      error: 'Main-process call failed: {message}',
      labels: {
        version: 'App {value}',
        electron: 'Electron {value}',
        platform: 'Platform {value}',
        locale: 'Locale {value}',
      },
    },
  },
  about: {
    eyebrow: 'About',
    title: 'Default project boundaries tailored for Electron desktop apps',
    body: 'Instead of baking in heavy business assumptions, this project focuses on clean directory ownership, a usable app shell, and the core dependencies most desktop apps need first.',
    sections: {
      boundaries: 'Ownership',
      scenarios: 'Good fits',
    },
    boundaries: {
      main: {
        title: 'main: windows, lifecycle, and OS entry points',
        body: 'Use the main process as the home for bootstrapping, BrowserWindow management, menus, tray behavior, and future system-level integrations.',
      },
      preload: {
        title: 'preload: the safe bridge for desktop APIs',
        body: 'Expose a narrow, auditable surface between renderer and Electron APIs so Node capabilities stay controlled instead of leaking directly into the UI layer.',
      },
      renderer: {
        title: 'renderer: UI organized around features',
        body: 'Route files stay thin while layouts, components, and composables remain focused, which makes settings screens, dashboards, and localized content easier to scale.',
      },
    },
    scenariosTitle: 'Good directions to extend this starter',
    scenarios: {
      settings: 'Settings centers, preference panels, account pages, and other common desktop app flows.',
      integrations: 'File system access, clipboard features, local persistence, or external process integration through preload APIs.',
      distribution: 'Packaging, signing, and release automation once the application is ready to ship as a desktop product.',
    },
  },
  locale: {
    'zh-CN': '中文',
    'en': 'English',
  },
} satisfies MessageSchema
