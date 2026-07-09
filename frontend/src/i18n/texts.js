// Source unique des textes de l'application, FR et EN côte à côte, organisés
// par composant/page. Chaque feuille est un objet { fr, en } ; buildResources()
// (dans ./index.js) la sépare en deux arbres exploitables par i18next.

export const TEXTS = {
  header: {
    burger: {
      search: { fr: 'Chercher une location', en: 'Find a rental' },
      suggestions: { fr: 'Nos suggestions', en: 'Our suggestions' },
      tutorial: { fr: 'Tutoriel', en: 'Tutorial' },
      whyUs: { fr: 'Pourquoi nous choisir ?', en: 'Why choose us?' },
      reviews: { fr: 'Avis & commentaires', en: 'Reviews & comments' },
    },
    burgerCategory: {
      boats: { fr: 'Nos bateaux', en: 'Our boats' },
      suggestions: { fr: 'Nos suggestions', en: 'Our suggestions' },
      reviews: { fr: 'Avis & commentaires', en: 'Reviews & comments' },
    },
    nav: {
      discover: { fr: 'Découvrir', en: 'Discover' },
      contact: { fr: 'Contact', en: 'Contact' },
      about: { fr: 'À propos', en: 'About' },
    },
    auth: {
      login: { fr: "Se connecter / S'inscrire", en: 'Log in / Sign up' },
      dashboard: { fr: 'Mon dashboard', en: 'My dashboard' },
      account: { fr: 'Mon compte', en: 'My account' },
      documents: { fr: 'Mes documents', en: 'My documents' },
      logout: { fr: 'Se déconnecter', en: 'Log out' },
    },
  },

  dashboardHeader: {
    menuAria: { fr: 'Menu navigation', en: 'Navigation menu' },
    userMenuAria: { fr: 'Menu utilisateur', en: 'User menu' },
    messagesAria: { fr: 'Messagerie', en: 'Messages' },
  },

  headerLocataire: {
    nav: {
      search: { fr: 'Chercher une location', en: 'Find a rental' },
      suggestions: { fr: 'Nos suggestions', en: 'Our suggestions' },
      tutorial: { fr: 'Tutoriel', en: 'Tutorial' },
      whyUs: { fr: 'Pourquoi nous choisir ?', en: 'Why choose us?' },
      reviews: { fr: 'Avis & commentaires', en: 'Reviews & comments' },
    },
    navCategory: {
      boats: { fr: 'Nos bateaux', en: 'Our boats' },
      suggestions: { fr: 'Nos suggestions', en: 'Our suggestions' },
      reviews: { fr: 'Avis & commentaires', en: 'Reviews & comments' },
    },
    center: {
      discover: { fr: 'Découvrir', en: 'Discover' },
      contact: { fr: 'Contact', en: 'Contact' },
      about: { fr: 'À propos', en: 'About' },
    },
    menu: {
      dashboard: { fr: 'Mon dashboard', en: 'My dashboard' },
      account: { fr: 'Compte', en: 'Account' },
      documents: { fr: 'Mes documents', en: 'My documents' },
      reservations: { fr: 'Mes réservations', en: 'My bookings' },
      favorites: { fr: 'Favoris', en: 'Favorites' },
      logout: { fr: 'Déconnexion', en: 'Log out' },
    },
  },

  headerProprio: {
    nav: {
      myBoats: { fr: 'Voir mes bateaux', en: 'View my boats' },
      publish: { fr: 'Publier un bateau', en: 'List a boat' },
    },
    center: {
      publications: { fr: 'Mes publications', en: 'My listings' },
      contact: { fr: 'Contact', en: 'Contact' },
      about: { fr: 'À propos', en: 'About' },
    },
    menu: {
      dashboard: { fr: 'Mon dashboard', en: 'My dashboard' },
      account: { fr: 'Mon compte', en: 'My account' },
      documents: { fr: 'Mes documents', en: 'My documents' },
      reservations: { fr: 'Mes réservations', en: 'My bookings' },
      transactions: { fr: 'Mes transactions', en: 'My transactions' },
      boats: { fr: 'Mes bateaux', en: 'My boats' },
      logout: { fr: 'Déconnexion', en: 'Log out' },
    },
  },

  home: {
    hero: {
      tagline: {
        fr: 'Réservez le bateau de vos rêves auprès de propriétaires passionnés dans tous les ports de France',
        en: 'Book the boat of your dreams from passionate owners in every port of France',
      },
      mobileApp: { fr: 'Rejoignez notre application mobile', en: 'Join our mobile app' },
    },
    steps: {
      kicker: { fr: 'Comment ça marche ?', en: 'How it works' },
      title: {
        fr: "Réserver un bateau n'a jamais été aussi simple",
        en: 'Booking a boat has never been this simple',
      },
      cta: { fr: 'Lancer ma recherche', en: 'Start my search' },
      step1: {
        title: { fr: 'Recherchez', en: 'Search' },
        text: {
          fr: 'Utilisez nos filtres précis pour trouver le bateau idéal selon vos dates et votre budget.',
          en: 'Use our precise filters to find the ideal boat for your dates and budget.',
        },
      },
      step2: {
        title: { fr: 'Réservez', en: 'Book' },
        text: {
          fr: 'Échangez avec le propriétaire et confirmez votre réservation en quelques clics via notre interface sécurisée.',
          en: 'Chat with the owner and confirm your booking in a few clicks through our secure platform.',
        },
      },
      step3: {
        title: { fr: 'Naviguez', en: 'Sail' },
        text: {
          fr: "Le jour J, faites l'état des lieux, recevez les clés et profitez de votre aventure sur l'eau.",
          en: 'On the day, do the check-in, get the keys and enjoy your adventure on the water.',
        },
      },
    },
    values: {
      kicker: { fr: 'Pourquoi nous choisir ?', en: 'Why choose us?' },
      title: { fr: "L'expérience marine réinventée", en: 'The marine experience reinvented' },
      cta: { fr: 'En savoir plus', en: 'Learn more' },
      fleet: {
        title: { fr: 'Flotte sélectionnée', en: 'Curated fleet' },
        text: {
          fr: 'Chaque bateau est vérifié et validé par notre équipe pour garantir qualité et sécurité à bord.',
          en: 'Every boat is inspected and approved by our team to guarantee quality and safety on board.',
        },
      },
      payment: {
        title: { fr: 'Paiement sécurisé', en: 'Secure payment' },
        text: {
          fr: 'Vos transactions sont protégées de bout en bout. Réservez en toute confiance, sans mauvaise surprise.',
          en: 'Your transactions are fully protected. Book with confidence, no surprises.',
        },
      },
      owners: {
        title: { fr: 'Propriétaires passionnés', en: 'Passionate owners' },
        text: {
          fr: 'Louez directement auprès de marins expérimentés qui partagent leur passion et leurs conseils.',
          en: 'Rent directly from experienced sailors who share their passion and advice.',
        },
      },
      support: {
        title: { fr: 'Assistance 7j/7', en: '7-day support' },
        text: {
          fr: 'Notre équipe est disponible à tout moment pour vous accompagner avant, pendant et après votre sortie.',
          en: 'Our team is available at any time to help you before, during and after your trip.',
        },
      },
    },
    reviews: {
      tagline: {
        fr: "L'horizon n'attend pas. Votre bateau non plus.",
        en: "The horizon won't wait. Neither should your boat.",
      },
      cta: { fr: 'Trouver mon bateau', en: 'Find my boat' },
    },
  },

  category: {
    results: {
      kicker: { fr: 'Selon vos recherches', en: 'Based on your search' },
      title: { fr: 'Liste des propositions', en: 'List of listings' },
      count_one: { fr: '{{count}} bateau disponible', en: '{{count}} boat available' },
      count_other: { fr: '{{count}} bateaux disponibles', en: '{{count}} boats available' },
      empty: {
        fr: 'Aucune offre ne correspond à votre recherche.',
        en: 'No offer matches your search.',
      },
      loadMore: { fr: "Voir plus d'offres", en: 'See more listings' },
    },
    map: {
      title: { fr: 'Carte Interactive', en: 'Interactive map' },
      live: { fr: 'Mise à jour Live', en: 'Live update' },
      empty: { fr: 'Aucun bateau à afficher.', en: 'No boats to display.' },
      hint: {
        fr: 'Cliquez sur un marqueur pour voir les détails du bateau',
        en: 'Click a marker to see the boat details',
      },
    },
    card: {
      persons: { fr: '{{count}} Pers.', en: '{{count}} people' },
      new: { fr: 'Nouveau', en: 'New' },
      skipperIncluded: { fr: 'Skipper inclus', en: 'Skipper included' },
      skipperExcluded: { fr: 'Sans skipper', en: 'No skipper' },
      licenseRequired: { fr: 'Avec permis', en: 'License required' },
      noLicenseRequired: { fr: 'Sans permis', en: 'No license' },
      perDay: { fr: '/ jour', en: '/ day' },
      book: { fr: 'Réserver', en: 'Book' },
    },
    badge: {
      topPick: { fr: 'Coup de cœur', en: 'Top pick' },
    },
  },

  filterBar: {
    label: { fr: 'Filtres', en: 'Filters' },
    reset: { fr: 'Réinitialiser', en: 'Reset' },
    boatType: {
      title: { fr: 'Type de bateau', en: 'Boat type' },
      voilier: { fr: 'Voiliers', en: 'Sailboats' },
      catamaran: { fr: 'Catamarans', en: 'Catamarans' },
      trimaran: { fr: 'Trimarans', en: 'Trimarans' },
      moteur: { fr: 'Bateaux à moteur', en: 'Motorboats' },
      peniche: { fr: 'Péniches', en: 'Canal boats' },
      jet_ski: { fr: 'Jet-skis', en: 'Jet skis' },
      hors_bord: { fr: 'Hors-bords', en: 'Speedboats' },
      gulet: { fr: 'Gulets', en: 'Gulets' },
    },
    license: {
      title: { fr: 'Permis', en: 'License' },
      notRequired: { fr: 'Sans permis requis', en: 'No license required' },
      required: { fr: 'Avec permis', en: 'License required' },
      chipNotRequired: { fr: 'Sans permis', en: 'No license' },
      chipRequired: { fr: 'Avec permis', en: 'License required' },
    },
    skipper: {
      included: { fr: 'Skipper inclus', en: 'Skipper included' },
      excluded: { fr: 'Sans skipper inclus', en: 'No skipper included' },
      chipExcluded: { fr: 'Sans skipper', en: 'No skipper' },
    },
    price: {
      title: { fr: 'Prix / jour', en: 'Price / day' },
      min: { fr: 'Min €', en: 'Min €' },
      max: { fr: 'Max €', en: 'Max €' },
      from: { fr: 'Dès {{price}}€', en: 'From €{{price}}' },
      upTo: { fr: "Jusqu'à {{price}}€", en: 'Up to €{{price}}' },
      range: { fr: '{{min}}€ – {{max}}€', en: '€{{min}} – €{{max}}' },
    },
    sort: {
      title: { fr: 'Trier par', en: 'Sort by' },
      relevance: { fr: 'Pertinence', en: 'Relevance' },
      rating: { fr: 'Les mieux notés', en: 'Top rated' },
      popularity: { fr: 'Les plus populaires', en: 'Most popular' },
    },
    coupDeCoeur: { fr: 'Coup de cœur', en: 'Top pick' },
  },

  searchBar: {
    destination: { fr: 'Destination', en: 'Destination' },
    destinationPlaceholder: { fr: 'Lieu / Port de départ', en: 'Place / Departure port' },
    dates: { fr: 'Dates', en: 'Dates' },
    addDate: { fr: 'Ajouter des dates', en: 'Add dates' },
    datesAvailable: { fr: 'Dates disponibles', en: 'Available dates' },
    travelers: { fr: 'Voyageurs', en: 'Travelers' },
    travelersPlaceholder: { fr: 'Nombre de personnes', en: 'Number of people' },
    search: { fr: 'Rechercher', en: 'Search' },
    resetTitle: { fr: 'Réinitialiser la recherche', en: 'Reset search' },
    noPortMatch: {
      fr: 'Aucun port à « {{query}} ». Le plus proche :',
      en: 'No port matching "{{query}}". Nearest:',
    },
    distanceKm: { fr: '~{{km}} km', en: '~{{km}} km' },
  },

  breadcrumb: {
    home: { fr: 'Accueil', en: 'Home' },
    categorie: { fr: 'Catégorie', en: 'Category' },
  },

  footer: {
    contact: { fr: 'Contact', en: 'Contact' },
    help: { fr: 'Aide & Assistance', en: 'Help & Support' },
    info: { fr: 'Informations', en: 'Information' },
    chat: { fr: 'Chat en ligne', en: 'Live chat' },
    moreInfo: { fr: 'Information complémentaire', en: 'More information' },
    founded: { fr: 'Fondée en 2023', en: 'Founded in 2023' },
    address: {
      fr: '12 Quai du Port, 13002 Marseille, France',
      en: '12 Quai du Port, 13002 Marseille, France',
    },
    copyright: {
      fr: '© 2023–2026 SailingLoc. Tous droits réservés.',
      en: '© 2023–2026 SailingLoc. All rights reserved.',
    },
    disclaimer: {
      fr: 'Projet fictif à des fins pédagogiques — aucun achat/réservation réelle. Toute ressemblance avec un site existant est fortuite.',
      en: 'Fictional project for educational purposes — no real purchases or bookings. Any resemblance to an existing site is coincidental.',
    },
    helpLinks: {
      findBoat: {
        fr: 'Comment trouver et réserver un bateau ?',
        en: 'How to find and book a boat?',
      },
      documents: {
        fr: 'Quels documents sont requis pour louer ?',
        en: 'What documents are required to rent?',
      },
      cancel: {
        fr: 'Comment annuler ou modifier une réservation ?',
        en: 'How to cancel or change a booking?',
      },
      payment: {
        fr: 'Quels modes de paiement sont acceptés ?',
        en: 'What payment methods are accepted?',
      },
      listBoat: {
        fr: 'Comment mettre mon bateau en location ?',
        en: 'How to list my boat for rent?',
      },
      insurance: {
        fr: 'Les bateaux sont-ils assurés pendant la location ?',
        en: 'Are boats insured during the rental?',
      },
      review: {
        fr: 'Comment laisser un avis après ma location ?',
        en: 'How to leave a review after my rental?',
      },
      incident: {
        fr: "Que faire en cas d'incident en mer ?",
        en: 'What to do in case of an incident at sea?',
      },
      other: {
        fr: 'Une autre question ? Contactez-nous en direct',
        en: 'Another question? Contact us directly',
      },
    },
    infoLinks: {
      legal: { fr: 'Mentions légales', en: 'Legal notice' },
      privacy: { fr: 'Politique de confidentialité', en: 'Privacy policy' },
      terms: { fr: "Conditions générales d'utilisation", en: 'Terms of service' },
    },
    manageCookies: { fr: 'Gérer les cookies', en: 'Manage cookies' },
  },

  cookieConsent: {
    banner: {
      title: { fr: 'Cookies & confidentialité', en: 'Cookies & privacy' },
      body: {
        fr: 'SailingLoc (via son outil de mesure Matomo, hébergé par nos soins) et ses partenaires (régies publicitaires, réseaux sociaux) souhaitent déposer des cookies pour mesurer l’audience, personnaliser les contenus et afficher des publicités ciblées. Vous pouvez accepter, refuser, ou choisir finalité par finalité. Sans action de votre part, aucun de ces cookies ne sera déposé.',
        en: 'SailingLoc (via its self-hosted Matomo analytics tool) and its partners (advertising networks, social media) would like to set cookies to measure audience, personalise content and display targeted ads. You can accept, refuse, or choose purpose by purpose. Until you act, none of these cookies will be set.',
      },
      acceptAll: { fr: 'Tout accepter', en: 'Accept all' },
      refuseAll: { fr: 'Tout refuser', en: 'Refuse all' },
      customize: { fr: 'Personnaliser mes choix', en: 'Customise my choices' },
    },
    prefs: {
      title: { fr: 'Paramétrer les cookies', en: 'Cookie settings' },
      intro: {
        fr: 'Choisissez, pour chaque finalité, si SailingLoc et les partenaires indiqués peuvent déposer des cookies. Votre choix est conservé 6 mois, puis nous vous le redemanderons. Vous pouvez le modifier à tout moment via « Gérer les cookies » en bas de page.',
        en: 'Choose, for each purpose, whether SailingLoc and the listed partners may set cookies. Your choice is kept for 6 months, after which we will ask again. You can change it at any time via “Manage cookies” at the bottom of the page.',
      },
      essentialTitle: {
        fr: 'Cookies essentiels — toujours actifs',
        en: 'Essential cookies — always on',
      },
      essentialDesc: {
        fr: 'Déposés par SailingLoc uniquement, indispensables au fonctionnement du site et exemptés de consentement : session de connexion, panier de réservation, préférence de langue, mémorisation de vos choix de consentement, sécurité (anti-fraude, répartition de charge).',
        en: 'Set by SailingLoc only, required for the site to work and exempt from consent: login session, booking cart, language preference, storage of your consent choices, security (anti-fraud, load balancing).',
      },
      purposes: {
        analytics: {
          name: { fr: 'Mesure d’audience', en: 'Analytics' },
          desc: {
            fr: 'Déposés par Matomo, notre outil de mesure hébergé par SailingLoc — aucune donnée n’est transmise à des tiers. Sert à comprendre comment le site est utilisé (pages visitées, provenance) pour améliorer nos services. Cookies conservés 13 mois, données 25 mois au maximum.',
            en: 'Set by Matomo, our analytics tool hosted by SailingLoc — no data is shared with third parties. Used to understand how the site is used (pages visited, traffic sources) to improve our services. Cookies kept 13 months, data 25 months at most.',
          },
        },
        ads: {
          name: { fr: 'Publicité & réseaux sociaux', en: 'Advertising & social media' },
          desc: {
            fr: 'Déposés par nos régies publicitaires et les réseaux sociaux (Meta, X) pour vous proposer des publicités ciblées et permettre le partage de contenus.',
            en: 'Set by our advertising partners and social networks (Meta, X) to show you targeted ads and enable content sharing.',
          },
        },
        personalization: {
          name: { fr: 'Personnalisation du contenu', en: 'Content personalisation' },
          desc: {
            fr: 'Déposés par SailingLoc pour adapter les suggestions de bateaux et de destinations à votre navigation.',
            en: 'Set by SailingLoc to tailor boat and destination suggestions to your browsing.',
          },
        },
      },
      toggleAria: { fr: 'Activer la finalité {{name}}', en: 'Enable purpose {{name}}' },
      save: { fr: 'Enregistrer mes choix', en: 'Save my choices' },
      close: { fr: 'Fermer', en: 'Close' },
    },
  },

  aboutPage: {
    pageTitle: { fr: 'À propos — SailingLoc', en: 'About — SailingLoc' },
    hero: {
      title: { fr: 'À propos de SailingLoc', en: 'About SailingLoc' },
      tagline: {
        fr: 'La plateforme qui met en relation propriétaires passionnés et amoureux de la mer, dans tous les ports de France.',
        en: 'The platform connecting passionate boat owners with sea lovers, in every port of France.',
      },
    },
    story: {
      kicker: { fr: 'Qui sommes-nous ?', en: 'Who are we?' },
      title: {
        fr: 'La location de bateaux, entre passionnés',
        en: 'Boat rental, between enthusiasts',
      },
      p1: {
        fr: 'Née à Marseille en 2023, SailingLoc est partie d’un constat simple : des milliers de bateaux dorment au port la majeure partie de l’année, pendant que des milliers de marins rêvent de larguer les amarres. Nous avons créé la passerelle entre les deux.',
        en: 'Founded in Marseille in 2023, SailingLoc started from a simple observation: thousands of boats sit idle in harbours most of the year, while thousands of sailors dream of casting off. We built the bridge between the two.',
      },
      p2: {
        fr: 'Chaque annonce est vérifiée par notre équipe — documents, assurance, état du bateau — pour que chaque sortie en mer se fasse en toute confiance. De la voile légère au yacht avec skipper, il y a forcément un bateau pour votre prochaine aventure.',
        en: 'Every listing is checked by our team — documents, insurance, boat condition — so that every trip starts with peace of mind. From light sailing to skippered yachts, there is a boat for your next adventure.',
      },
      imageAlt: {
        fr: 'Voilier naviguant le long de la côte méditerranéenne',
        en: 'Sailboat cruising along the Mediterranean coast',
      },
    },
    stats: {
      boats: { fr: 'Bateaux vérifiés', en: 'Verified boats' },
      destinations: { fr: 'Destinations', en: 'Destinations' },
      founded: { fr: 'Année de création', en: 'Founded in' },
      rating: { fr: 'Note moyenne', en: 'Average rating' },
    },
    values: {
      kicker: { fr: 'Nos valeurs', en: 'Our values' },
      title: { fr: 'Ce qui nous fait naviguer', en: 'What keeps us sailing' },
      trust: {
        title: { fr: 'Confiance', en: 'Trust' },
        text: {
          fr: 'Annonces vérifiées, paiements sécurisés, avis modérés : la sérénité avant, pendant et après la location.',
          en: 'Verified listings, secure payments, moderated reviews: peace of mind before, during and after the rental.',
        },
      },
      passion: {
        title: { fr: 'Passion', en: 'Passion' },
        text: {
          fr: 'Nos propriétaires sont des marins expérimentés qui partagent leurs conseils, leurs itinéraires et leur amour de la mer.',
          en: 'Our owners are experienced sailors who share their tips, routes and love of the sea.',
        },
      },
      simplicity: {
        title: { fr: 'Simplicité', en: 'Simplicity' },
        text: {
          fr: 'Recherchez, réservez, naviguez : tout se fait en quelques clics, de la demande de réservation à l’état des lieux.',
          en: 'Search, book, sail: everything happens in a few clicks, from booking request to check-in.',
        },
      },
    },
    destinations: {
      kicker: { fr: 'Nos destinations', en: 'Our destinations' },
      title: {
        fr: 'Des ports qui font rêver',
        en: 'Harbours that make you dream',
      },
      soon: { fr: 'Bientôt disponible', en: 'Coming soon' },
      linkAria: {
        fr: 'Voir les bateaux à {{city}}',
        en: 'See boats in {{city}}',
      },
    },
    cta: {
      title: { fr: 'Prêt à larguer les amarres ?', en: 'Ready to cast off?' },
      text: {
        fr: 'Trouvez le bateau de vos rêves ou posez-nous vos questions — on s’occupe du reste.',
        en: 'Find the boat of your dreams or ask us anything — we’ll take care of the rest.',
      },
      browse: { fr: 'Trouver un bateau', en: 'Find a boat' },
      contact: { fr: 'Nous contacter', en: 'Contact us' },
    },
  },

  carrousel: {
    soon: { fr: 'Bientôt disponible', en: 'Coming soon' },
    prev: { fr: 'Précédent', en: 'Previous' },
    next: { fr: 'Suivant', en: 'Next' },
    newRating: { fr: '★ Nouveau', en: '★ New' },
    seeMore: { fr: 'Voir plus', en: 'See more' },
    perDay: { fr: '€/j', en: '€/day' },
    sections: {
      ports: { fr: 'Choisissez votre port de départ', en: 'Choose your departure port' },
      recent: { fr: 'Annonces consultées récemment', en: 'Recently viewed listings' },
      recentLink: { fr: 'Voir toutes mes annonces', en: 'View all my listings' },
      destinations: { fr: "Destinations d'intérêt", en: 'Destinations of interest' },
      destinationsLink: { fr: 'Explorer les destinations', en: 'Explore destinations' },
      popular: { fr: 'Bateaux les plus populaires', en: 'Most popular boats' },
      popularLink: { fr: 'Voir le classement', en: 'See the ranking' },
      cheapest: { fr: 'Locations les moins chères', en: 'Cheapest rentals' },
      cheapestLink: { fr: 'Voir les bons plans', en: 'See the best deals' },
      current: { fr: 'Annonces du moment', en: 'Current listings' },
      currentLink: { fr: "Voir plus d'annonces", en: 'See more listings' },
    },
    boatType: {
      voilier: { fr: 'Voilier', en: 'Sailboat' },
      catamaran: { fr: 'Catamaran', en: 'Catamaran' },
      peniche: { fr: 'Péniche', en: 'Canal boat' },
      moteur: { fr: 'Bateau à moteur', en: 'Motorboat' },
      trimaran: { fr: 'Trimaran', en: 'Trimaran' },
      hors_bord: { fr: 'Hors-bord', en: 'Speedboat' },
      jet_ski: { fr: 'Jet-ski', en: 'Jet ski' },
      gulet: { fr: 'Gulet', en: 'Gulet' },
      sans_permis: { fr: 'Sans permis', en: 'No license required' },
    },
    persons: { fr: '{{count}} pers.', en: '{{count}} people' },
  },

  reviews: {
    kicker: { fr: 'Avis clients', en: 'Customer reviews' },
    title: {
      fr: 'Ce que nos navigateurs disent de nous',
      en: 'What our sailors say about us',
    },
    roleFilters: {
      all: { fr: 'Tous', en: 'All' },
      locataire: { fr: 'Locataires', en: 'Renters' },
      proprietaire: { fr: 'Propriétaires', en: 'Owners' },
    },
    roleLabels: {
      locataire: { fr: 'Locataire', en: 'Renter' },
      proprietaire: { fr: 'Propriétaire', en: 'Owner' },
    },
    sort: {
      recent: { fr: 'Plus récents', en: 'Most recent' },
      oldest: { fr: 'Plus anciens', en: 'Oldest' },
      best: { fr: 'Mieux notés', en: 'Highest rated' },
      critical: { fr: 'Plus critiques', en: 'Most critical' },
    },
  },

  bookingStatus: {
    pending: { fr: 'En attente', en: 'Pending' },
    confirmed: { fr: 'Confirmée', en: 'Confirmed' },
    refused: { fr: 'Refusée', en: 'Refused' },
    cancelled: { fr: 'Annulée', en: 'Cancelled' },
  },

  locataireLayout: {
    navAria: { fr: 'Navigation espace locataire', en: 'Renter area navigation' },
    mySpace: { fr: 'Mon espace', en: 'My space' },
    nav: {
      dashboard: { fr: 'Dashboard', en: 'Dashboard' },
      account: { fr: 'Compte', en: 'Account' },
      documents: { fr: 'Mes documents', en: 'My documents' },
      reservations: { fr: 'Mes réservations', en: 'My bookings' },
      favorites: { fr: 'Mes favoris', en: 'My favorites' },
      messages: { fr: 'Messagerie', en: 'Messages' },
    },
  },

  locataireDashboard: {
    pageTitle: { fr: 'Tableau de bord — SailingLoc', en: 'Dashboard — SailingLoc' },
    title: { fr: 'Tableau de bord', en: 'Dashboard' },
    greeting: {
      fr: 'Bonjour {{name}}, voici un aperçu de votre activité.',
      en: 'Hello {{name}}, here is an overview of your activity.',
    },
    loadError: {
      fr: 'Erreur de chargement du tableau de bord.',
      en: 'Failed to load the dashboard.',
    },
    kpisTitle: { fr: 'Indicateurs clés', en: 'Key metrics' },
    statLoading: { fr: '{{label}} : chargement en cours', en: '{{label}}: loading' },
    statValue: { fr: '{{label}} : {{value}}', en: '{{label}}: {{value}}' },
    stats: {
      activeBookings: { fr: 'Réservations en cours', en: 'Active bookings' },
      reviewsToLeave: { fr: 'Avis à laisser', en: 'Reviews to leave' },
      favorites: { fr: 'Favoris', en: 'Favorites' },
      unreadMessages: { fr: 'Messages non lus', en: 'Unread messages' },
    },
    docsAlert: {
      missing_one: { fr: '{{count}} manquant', en: '{{count}} missing' },
      missing_other: { fr: '{{count}} manquants', en: '{{count}} missing' },
      pending_one: { fr: '{{count}} en attente ou refusé', en: '{{count}} pending or refused' },
      pending_other: { fr: '{{count}} en attente ou refusés', en: '{{count}} pending or refused' },
      and: { fr: 'et', en: 'and' },
      prefix: { fr: 'Documents à compléter :', en: 'Documents to complete:' },
      suffix: { fr: 'Cliquez pour les régulariser.', en: 'Click to fix them.' },
    },
    nextBooking: {
      sectionAria: { fr: 'Prochaine réservation', en: 'Next booking' },
      label: { fr: 'Prochaine réservation', en: 'Next booking' },
      today: { fr: "Aujourd'hui", en: 'Today' },
      inDays: { fr: 'Dans {{days}} j', en: 'In {{days}} d' },
      dates: { fr: 'Dates', en: 'Dates' },
      amount: { fr: 'Montant', en: 'Amount' },
    },
    recentBookings: {
      title: { fr: 'Dernières réservations', en: 'Recent bookings' },
      seeAll: { fr: 'Tout voir', en: 'See all' },
      empty: {
        fr: "Vous n'avez pas encore de réservation.",
        en: "You don't have any booking yet.",
      },
    },
    favoritesPreview: {
      title: { fr: 'Mes favoris', en: 'My favorites' },
      seeAll: { fr: 'Tout voir', en: 'See all' },
      empty: {
        fr: "Aucun favori pour l'instant. Explorez les bateaux et ajoutez-en !",
        en: 'No favorites yet. Explore the boats and add some!',
      },
      perDay: { fr: '/ jour', en: '/ day' },
    },
  },

  locataireAccount: {
    pageTitle: { fr: 'Mon compte — SailingLoc', en: 'My account — SailingLoc' },
    title: { fr: 'Mon compte', en: 'My account' },
    subtitle: {
      fr: 'Bonjour {{name}}, consultez et modifiez vos informations personnelles.',
      en: 'Hello {{name}}, view and edit your personal information.',
    },
  },

  locataireDocuments: {
    pageTitle: { fr: 'Mes documents — SailingLoc', en: 'My documents — SailingLoc' },
    title: { fr: 'Mes documents', en: 'My documents' },
    subtitle: {
      fr: 'Déposez vos documents obligatoires (PDF, JPG ou PNG, 5 Mo max). Ils seront vérifiés par notre équipe.',
      en: 'Upload your required documents (PDF, JPG or PNG, 5 MB max). They will be reviewed by our team.',
    },
    count: {
      fr: '{{provided}} / {{total}} types fournis',
      en: '{{provided}} / {{total}} types provided',
    },
  },

  locataireFavorites: {
    pageTitle: { fr: 'Mes favoris — SailingLoc', en: 'My favorites — SailingLoc' },
    title: { fr: 'Mes favoris', en: 'My favorites' },
    subtitle: {
      fr: 'Les bateaux que vous avez enregistrés pour les retrouver facilement.',
      en: 'The boats you saved so you can find them easily.',
    },
    loadError: { fr: 'Erreur de chargement des favoris.', en: 'Failed to load favorites.' },
    removeSuccess: { fr: 'Bateau retiré de vos favoris.', en: 'Boat removed from your favorites.' },
    removeError: { fr: 'Échec du retrait.', en: 'Failed to remove.' },
    filterAria: { fr: 'Filtrer par type', en: 'Filter by type' },
    all: { fr: 'Tous', en: 'All' },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    emptyAll: {
      fr: "Aucun favori pour l'instant. Explorez les bateaux et ajoutez-en !",
      en: 'No favorites yet. Explore the boats and add some!',
    },
    emptyFiltered: { fr: 'Aucun favori pour ce filtre.', en: 'No favorites for this filter.' },
    persons: { fr: '{{count}} personnes', en: '{{count}} people' },
    perDay: { fr: '/ jour', en: '/ day' },
    removing: { fr: 'Retrait…', en: 'Removing…' },
    remove: { fr: 'Retirer', en: 'Remove' },
  },

  locataireReservations: {
    pageTitle: { fr: 'Mes réservations — SailingLoc', en: 'My bookings — SailingLoc' },
    title: { fr: 'Mes réservations', en: 'My bookings' },
    subtitle: {
      fr: "Retrouvez l'ensemble de vos locations, passées et à venir.",
      en: 'Find all your rentals, past and upcoming.',
    },
    loadError: { fr: 'Erreur de chargement des réservations.', en: 'Failed to load bookings.' },
    filterAria: { fr: 'Filtrer par statut', en: 'Filter by status' },
    filters: {
      all: { fr: 'Toutes', en: 'All' },
      pending: { fr: 'En attente', en: 'Pending' },
      confirmed: { fr: 'Confirmées', en: 'Confirmed' },
      cancelled: { fr: 'Annulées', en: 'Cancelled' },
      refused: { fr: 'Refusées', en: 'Refused' },
    },
    dates: { fr: 'Dates', en: 'Dates' },
    amount: { fr: 'Montant', en: 'Amount' },
    bookedOn: { fr: 'Réservée le', en: 'Booked on' },
    cancellation: { fr: 'Annulation :', en: 'Cancellation:' },
    cancelledOn: { fr: '(le {{date}})', en: '(on {{date}})' },
    reviewDone: { fr: '✓ Avis déposé', en: '✓ Review submitted' },
    reviewHint: {
      fr: '★ Pensez à laisser un avis sur cette location',
      en: '★ Remember to leave a review for this rental',
    },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    emptyAll: {
      fr: 'Vous n’avez aucune réservation pour le moment.',
      en: "You don't have any booking yet.",
    },
    emptyFiltered: { fr: 'Aucune réservation pour ce filtre.', en: 'No bookings for this filter.' },
  },

  dashboardPage: {
    greeting: { fr: 'Bonjour {{name}} !', en: 'Hello {{name}}!' },
    connectedAs: { fr: 'Vous êtes connecté en tant que', en: 'You are logged in as' },
    wip: { fr: 'Tableau de bord en cours de construction', en: 'Dashboard under construction' },
    wipText: {
      fr: 'Cette section sera bientôt disponible.',
      en: 'This section will be available soon.',
    },
  },

  roleLabels: {
    locataire: { fr: 'Locataire', en: 'Renter' },
    proprietaire: { fr: 'Propriétaire', en: 'Owner' },
    admin: { fr: 'Administrateur', en: 'Administrator' },
  },

  accountPage: {
    title: { fr: 'Mon compte', en: 'My account' },
    subtitle: {
      fr: 'Consultez et modifiez vos informations personnelles.',
      en: 'View and edit your personal information.',
    },
  },

  myDocumentsPage: {
    fallbackLabel: { fr: 'Compte', en: 'Account' },
    title: { fr: 'Mes documents', en: 'My documents' },
    subtitle: {
      fr: 'Déposez vos documents obligatoires (PDF, JPG ou PNG, 5 Mo max). Ils seront vérifiés par notre équipe.',
      en: 'Upload your required documents (PDF, JPG or PNG, 5 MB max). They will be reviewed by our team.',
    },
    count: {
      fr: '{{provided}} / {{total}} types fournis',
      en: '{{provided}} / {{total}} types provided',
    },
  },

  accountForm: {
    personalInfo: {
      title: { fr: 'Informations personnelles', en: 'Personal information' },
      firstName: { fr: 'Prénom', en: 'First name' },
      lastName: { fr: 'Nom', en: 'Last name' },
      email: { fr: 'Email', en: 'Email' },
      emailReadonly: { fr: '(non modifiable)', en: '(cannot be changed)' },
      phone: { fr: 'Téléphone', en: 'Phone' },
      phoneOptional: { fr: '(facultatif)', en: '(optional)' },
      phonePlaceholder: { fr: '+33 6 12 34 56 78', en: '+33 6 12 34 56 78' },
      cancel: { fr: 'Annuler', en: 'Cancel' },
      saving: { fr: 'Enregistrement…', en: 'Saving…' },
      save: { fr: 'Enregistrer les modifications', en: 'Save changes' },
      updateSuccess: {
        fr: 'Vos informations ont été mises à jour.',
        en: 'Your information has been updated.',
      },
      errors: {
        firstNameRequired: { fr: 'Le prénom est requis.', en: 'First name is required.' },
        lastNameRequired: { fr: 'Le nom est requis.', en: 'Last name is required.' },
        phoneInvalid: {
          fr: 'Le numéro de téléphone est invalide.',
          en: 'The phone number is invalid.',
        },
      },
    },
    genericError: { fr: 'Une erreur est survenue.', en: 'Something went wrong.' },
    password: {
      title: { fr: 'Modifier mon mot de passe', en: 'Change my password' },
      subtitle: {
        fr: 'Pour des raisons de sécurité, votre mot de passe actuel est requis.',
        en: 'For security reasons, your current password is required.',
      },
      current: { fr: 'Mot de passe actuel', en: 'Current password' },
      new: { fr: 'Nouveau mot de passe', en: 'New password' },
      confirm: { fr: 'Confirmer le nouveau mot de passe', en: 'Confirm new password' },
      hint: {
        fr: '12 caractères minimum, 1 majuscule, 1 minuscule, 1 caractère spécial.',
        en: 'At least 12 characters, 1 uppercase, 1 lowercase, 1 special character.',
      },
      updating: { fr: 'Mise à jour…', en: 'Updating…' },
      submit: { fr: 'Modifier le mot de passe', en: 'Change password' },
      updateSuccess: {
        fr: 'Mot de passe mis à jour. Reconnectez-vous.',
        en: 'Password updated. Please log in again.',
      },
      errors: {
        currentRequired: {
          fr: 'Le mot de passe actuel est requis.',
          en: 'Current password is required.',
        },
        newInvalid: {
          fr: 'Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule et un caractère spécial.',
          en: 'Password must contain at least 12 characters, one uppercase, one lowercase and one special character.',
        },
        mismatch: {
          fr: 'Les mots de passe ne correspondent pas.',
          en: 'Passwords do not match.',
        },
      },
    },
  },

  documentsManager: {
    docTypes: {
      locataire: {
        permis_conduire: {
          label: { fr: 'Permis bateau', en: 'Boat license' },
          desc: { fr: 'Permis bateau côtier ou fluvial.', en: 'Coastal or inland boat license.' },
        },
        piece_identite: {
          label: { fr: "Pièce d'identité", en: 'Identity document' },
          desc: {
            fr: "Carte nationale d'identité ou passeport en cours de validité.",
            en: 'Valid national ID card or passport.',
          },
        },
        cv_nautique: {
          label: { fr: 'CV nautique', en: 'Sailing résumé' },
          desc: {
            fr: 'Document décrivant votre expérience de navigation.',
            en: 'Document describing your sailing experience.',
          },
        },
      },
      proprietaire: {
        permis: {
          label: { fr: 'Permis', en: 'License' },
          desc: { fr: 'Permis bateau ou de conduire.', en: 'Boat or driving license.' },
        },
        assurance: {
          label: { fr: 'Assurance', en: 'Insurance' },
          desc: { fr: 'Attestation d’assurance du bateau.', en: 'Boat insurance certificate.' },
        },
        cv_marin: {
          label: { fr: 'CV marin', en: 'Maritime résumé' },
          desc: {
            fr: 'Document décrivant votre expérience maritime.',
            en: 'Document describing your maritime experience.',
          },
        },
        acte_francisation: {
          label: { fr: 'Acte de francisation', en: 'Registration certificate' },
          desc: {
            fr: 'Vous pouvez en déposer plusieurs (un par bateau).',
            en: 'You can upload several (one per boat).',
          },
        },
      },
    },
    status: {
      pending: { fr: 'En attente de validation', en: 'Pending validation' },
      validated: { fr: 'Validé', en: 'Validated' },
      refused: { fr: 'Refusé', en: 'Refused' },
    },
    notProvided: { fr: 'Non fourni', en: 'Not provided' },
    filesCount_one: { fr: '{{count}} fichier', en: '{{count}} file' },
    filesCount_other: { fr: '{{count}} fichiers', en: '{{count}} files' },
    view: { fr: 'Voir', en: 'View' },
    delete: { fr: 'Supprimer', en: 'Delete' },
    sending: { fr: 'Envoi…', en: 'Uploading…' },
    add: { fr: 'Ajouter', en: 'Add' },
    replace: { fr: 'Remplacer', en: 'Replace' },
    send: { fr: 'Envoyer', en: 'Upload' },
    acceptedFormats: {
      fr: 'Formats acceptés : PDF, JPG, PNG — 5 Mo maximum.',
      en: 'Accepted formats: PDF, JPG, PNG — 5 MB maximum.',
    },
    selectFile: { fr: 'Sélectionnez un fichier.', en: 'Select a file.' },
    uploadError: { fr: "Échec de l'envoi.", en: 'Upload failed.' },
    uploadSuccess: { fr: '{{label}} envoyé.', en: '{{label}} uploaded.' },
    deleteSuccess: { fr: '{{label}} supprimé.', en: '{{label}} deleted.' },
    deleteError: { fr: 'Échec de la suppression.', en: 'Deletion failed.' },
    viewError: { fr: "Impossible d'ouvrir le document.", en: 'Unable to open the document.' },
    loading: { fr: 'Chargement…', en: 'Loading…' },
  },
};

function isLeaf(node) {
  return (
    node && typeof node === 'object' && typeof node.fr === 'string' && typeof node.en === 'string'
  );
}

export function buildResources(node = TEXTS) {
  if (isLeaf(node)) {
    return { fr: node.fr, en: node.en };
  }
  const fr = {};
  const en = {};
  for (const [key, value] of Object.entries(node)) {
    const split = buildResources(value);
    fr[key] = split.fr;
    en[key] = split.en;
  }
  return { fr, en };
}
