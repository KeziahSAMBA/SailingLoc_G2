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
    burgerContact: {
      hero: { fr: 'Contact & aide', en: 'Contact & help' },
      details: { fr: 'Nous joindre', en: 'Contact us' },
      form: { fr: 'Écrivez-nous', en: 'Write to us' },
      faq: { fr: 'FAQ', en: 'FAQ' },
    },
    burgerProduct: {
      booking: { fr: 'Location', en: 'Booking' },
      specs: { fr: 'Caractéristiques', en: 'Features' },
      reviews: { fr: 'Avis & commentaires', en: 'Reviews & comments' },
      location: { fr: 'Emplacement', en: 'Location' },
      suggestions: { fr: 'Suggestions', en: 'Suggestions' },
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
    navProduct: {
      booking: { fr: 'Location', en: 'Booking' },
      specs: { fr: 'Caractéristiques', en: 'Features' },
      reviews: { fr: 'Avis & commentaires', en: 'Reviews & comments' },
      location: { fr: 'Emplacement', en: 'Location' },
      suggestions: { fr: 'Suggestions', en: 'Suggestions' },
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
      welcome: { fr: 'Bienvenue sur', en: 'Welcome to' },
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

  homeProprio: {
    pageTitle: { fr: 'Espace propriétaire — SailingLoc', en: 'Owner home — SailingLoc' },
    hero: {
      tagline: {
        fr: 'Gérez vos bateaux, vos réservations et vos revenus, le tout en un seul endroit.',
        en: 'Manage your boats, bookings and earnings, all in one place.',
      },
      addBoat: { fr: 'Ajouter un bateau', en: 'Add a boat' },
      noBoats: {
        fr: 'Aucun bateau pour l’instant. Ajoutez votre première annonce !',
        en: 'No boat yet. Add your first listing!',
      },
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

  product: {
    notFound: {
      title: { fr: 'Bateau introuvable', en: 'Boat not found' },
      text: {
        fr: "Cette annonce n'existe pas ou n'est plus publiée.",
        en: 'This listing does not exist or is no longer published.',
      },
      cta: { fr: 'Retour à la flotte', en: 'Back to the fleet' },
    },
    header: {
      ratings_one: { fr: '{{count}} note', en: '{{count}} rating' },
      ratings_other: { fr: '{{count}} notes', en: '{{count}} ratings' },
      comments_one: { fr: '{{count}} commentaire', en: '{{count}} comment' },
      comments_other: { fr: '{{count}} commentaires', en: '{{count}} comments' },
      noReviews: {
        fr: 'Aucun commentaire pour l’instant',
        en: 'No comments yet',
      },
      lengthValue: { fr: '{{size}} m', en: '{{size}} m' },
    },
    booking: {
      available: { fr: 'Disponible', en: 'Available' },
      unavailable: { fr: 'Indisponible', en: 'Unavailable' },
      selectDates: { fr: 'Sélectionner les dates', en: 'Select your dates' },
      days_one: { fr: '{{count}} jour x {{price}}€', en: '{{count}} day x €{{price}}' },
      days_other: { fr: '{{count}} jours x {{price}}€', en: '{{count}} days x €{{price}}' },
      skipperService: { fr: 'Service Skipper (inclus)', en: 'Skipper service (included)' },
      free: { fr: 'Gratuit', en: 'Free' },
      total: { fr: 'Total (TTC)', en: 'Total (tax incl.)' },
      taxIncluded: { fr: 'TTC', en: 'tax incl.' },
      book: { fr: 'Réserver maintenant', en: 'Book now' },
      missingDates: {
        fr: 'Sélectionnez d’abord vos dates de début et de fin.',
        en: 'Please select your start and end dates first.',
      },
      locataireOnly: {
        fr: 'Seul un compte locataire peut réserver un bateau.',
        en: 'Only a renter account can book a boat.',
      },
      noCharge: {
        fr: 'Aucun débit immédiat ne sera effectué',
        en: 'You will not be charged yet',
      },
      secure: {
        fr: 'Paiement sécurisé & Assurance incluse',
        en: 'Secure payment & insurance included',
      },
      help: {
        title: { fr: "Besoin d'aide ?", en: 'Need help?' },
        text: {
          fr: 'Nos conseillers experts en navigation sont disponibles 7j/7 pour vous accompagner.',
          en: 'Our expert sailing advisors are available 7 days a week to assist you.',
        },
        cta: { fr: 'Contactez-nous', en: 'Contact us' },
      },
    },
    ownerContact: {
      text: {
        fr: 'Une question sur ce bateau ? Échangez directement avec son propriétaire.',
        en: 'A question about this boat? Chat directly with its owner.',
      },
      cta: { fr: 'Contacter le propriétaire', en: 'Contact the owner' },
      opening: { fr: 'Ouverture…', en: 'Opening…' },
      locataireOnly: {
        fr: 'Connectez-vous avec un compte locataire pour contacter le propriétaire.',
        en: 'Sign in with a renter account to contact the owner.',
      },
      error: {
        fr: 'Impossible d’ouvrir la conversation pour le moment.',
        en: 'Unable to open the conversation right now.',
      },
    },
    specs: {
      kicker: { fr: 'Caractéristiques', en: 'Characteristics' },
      title: { fr: 'Spécifications techniques', en: 'Technical specifications' },
      subtitle: {
        fr: 'Tous les détails pour les passionnés de navigation',
        en: 'All the details for sailing enthusiasts',
      },
      type: { fr: 'Type', en: 'Type' },
      length: { fr: 'Longueur hors tout', en: 'Overall length' },
      engine: { fr: 'Moteur', en: 'Engine' },
      capacity: { fr: 'Capacité', en: 'Capacity' },
      year: { fr: 'Année', en: 'Year' },
      license: { fr: 'Permis', en: 'License' },
      skipper: { fr: 'Skipper', en: 'Skipper' },
      port: { fr: "Port d'attache", en: 'Home port' },
      equipment: { fr: 'Équipements', en: 'Equipment' },
    },
    location: {
      kicker: { fr: 'Emplacement', en: 'Location' },
      title: { fr: 'Où se situe votre bateau', en: 'Where your boat is located' },
      subtitle: {
        fr: 'Port de départ : {{port}}',
        en: 'Departure port: {{port}}',
      },
    },
  },

  reservation: {
    title: { fr: 'Réserver ce bateau', en: 'Book this boat' },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    working: { fr: 'Un instant…', en: 'One moment…' },
    invalid: {
      fr: 'Réservation impossible : bateau introuvable ou dates manquantes.',
      en: 'Booking unavailable: boat not found or missing dates.',
    },
    back: { fr: 'Retour au bateau', en: 'Back to the boat' },
    previous: { fr: 'Étape précédente', en: 'Previous step' },
    backToCatalog: { fr: 'Voir le catalogue', en: 'Browse the catalog' },
    steps: {
      recap: { fr: 'Récapitulatif', en: 'Summary' },
      payment: { fr: 'Paiement', en: 'Payment' },
    },
    recap: {
      title: { fr: 'Votre réservation', en: 'Your booking' },
      dates: { fr: 'Dates', en: 'Dates' },
      detail: { fr: 'Détail', en: 'Details' },
      days_one: { fr: '{{count}} jour × {{price}} €', en: '{{count}} day × €{{price}}' },
      days_other: { fr: '{{count}} jours × {{price}} €', en: '{{count}} days × €{{price}}' },
      total: { fr: 'Total (TTC)', en: 'Total (tax incl.)' },
      confirm: { fr: 'Confirmer et continuer', en: 'Confirm and continue' },
    },
    documents: {
      notValidated: {
        fr: 'Vos documents ne sont pas encore tous validés par SailingLoc. Réessayez une fois la validation faite — votre réservation reste enregistrée.',
        en: 'Your documents have not all been validated by SailingLoc yet. Try again once validated — your booking remains saved.',
      },
      manageLink: { fr: 'Gérer mes documents', en: 'Manage my documents' },
    },
    payment: {
      title: { fr: 'Paiement', en: 'Payment' },
      amount: { fr: 'Montant à régler', en: 'Amount due' },
      demo: {
        fr: 'Paiement de démonstration : aucune donnée bancaire n’est envoyée ni enregistrée.',
        en: 'Demo payment: no card data is sent or stored.',
      },
      name: { fr: 'Titulaire de la carte', en: 'Cardholder name' },
      card: { fr: 'Carte bancaire', en: 'Card details' },
      stripeTest: {
        fr: 'Paiement sécurisé par Stripe (mode test) — aucun débit avant la confirmation du propriétaire. Carte de test : 4242 4242 4242 4242.',
        en: 'Secure payment by Stripe (test mode) — no charge until the owner confirms. Test card: 4242 4242 4242 4242.',
      },
      number: { fr: 'Numéro de carte', en: 'Card number' },
      expiry: { fr: 'Expiration', en: 'Expiry' },
      cvc: { fr: 'CVC', en: 'CVC' },
      pay: { fr: 'Payer {{total}} €', en: 'Pay €{{total}}' },
      errors: {
        name: { fr: 'Indiquez le titulaire de la carte.', en: 'Enter the cardholder name.' },
        number: { fr: 'Numéro de carte invalide.', en: 'Invalid card number.' },
        expiry: { fr: 'Date d’expiration invalide (MM/AA).', en: 'Invalid expiry date (MM/YY).' },
        expired: { fr: 'Cette carte est expirée.', en: 'This card has expired.' },
        expiresBeforeEnd: {
          fr: 'La carte doit rester valide jusqu’à la fin de la réservation ({{date}}).',
          en: 'The card must remain valid until the end of the booking ({{date}}).',
        },
        cvc: { fr: 'CVC invalide.', en: 'Invalid CVC.' },
      },
    },
    done: {
      title: { fr: 'Demande envoyée au propriétaire !', en: 'Request sent to the owner!' },
      text: {
        fr: 'Votre paiement pour {{boat}} est enregistré mais ne sera débité qu’à la confirmation du propriétaire ; il sera annulé s’il refuse. Suivez votre demande dans « Mes réservations ».',
        en: 'Your payment for {{boat}} is recorded but will only be charged once the owner confirms; it will be cancelled if they refuse. Track your request under “My bookings”.',
      },
      ref: { fr: 'Référence : {{ref}}', en: 'Reference: {{ref}}' },
      myBookings: { fr: 'Mes réservations', en: 'My bookings' },
    },
    errors: {
      createFailed: {
        fr: 'La création de la réservation a échoué. Veuillez réessayer.',
        en: 'Creating the booking failed. Please try again.',
      },
      checkFailed: {
        fr: 'Impossible de vérifier vos documents. Veuillez réessayer.',
        en: 'Could not check your documents. Please try again.',
      },
      payFailed: {
        fr: 'Le paiement a échoué. Veuillez réessayer.',
        en: 'The payment failed. Please try again.',
      },
    },
  },

  share: {
    title: { fr: 'Partager', en: 'Share' },
    copyLink: { fr: 'Copier le lien', en: 'Copy link' },
    copied: { fr: 'Lien copié !', en: 'Link copied!' },
    facebook: { fr: 'Facebook', en: 'Facebook' },
    x: { fr: 'X (Twitter)', en: 'X (Twitter)' },
    whatsapp: { fr: 'WhatsApp', en: 'WhatsApp' },
    email: { fr: 'Email', en: 'Email' },
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
    expandTitle: { fr: 'Déployer la recherche', en: 'Expand search' },
    collapseTitle: { fr: 'Replier la recherche', en: 'Collapse search' },
    resetTitle: { fr: 'Réinitialiser la recherche', en: 'Reset search' },
    resetDatesTitle: { fr: 'Effacer les dates', en: 'Clear dates' },
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
      sales: { fr: 'Conditions générales de vente', en: 'Terms of sale' },
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

  contactPage: {
    pageTitle: { fr: 'Contact & aide — SailingLoc', en: 'Contact & help — SailingLoc' },
    hero: {
      title: { fr: 'Contact & aide', en: 'Contact & help' },
      tagline: {
        fr: 'Une question, un souci ? Notre équipe vous répond du lundi au samedi, de 9 h à 18 h.',
        en: 'A question, an issue? Our team replies Monday to Saturday, 9am to 6pm.',
      },
    },
    details: {
      kicker: { fr: 'Nous joindre', en: 'Contact us' },
      title: { fr: 'Trois façons de nous contacter', en: 'Three ways to reach us' },
      phone: {
        title: { fr: 'Téléphone', en: 'Phone' },
        hours: { fr: 'Du lundi au samedi, 9 h – 18 h.', en: 'Monday to Saturday, 9am – 6pm.' },
      },
      chat: {
        title: { fr: 'Chat en ligne', en: 'Live chat' },
        text: {
          fr: 'Échangez en direct avec le support depuis votre messagerie.',
          en: 'Chat live with our support team from your messages.',
        },
        open: { fr: 'Ouvrir la messagerie', en: 'Open messages' },
        opening: { fr: 'Ouverture…', en: 'Opening…' },
        login: { fr: 'Se connecter pour discuter', en: 'Log in to chat' },
      },
      email: {
        title: { fr: 'Email', en: 'Email' },
        text: { fr: 'Réponse sous 24 h ouvrées.', en: 'Reply within 24 business hours.' },
      },
    },
    form: {
      kicker: { fr: 'Écrivez-nous', en: 'Write to us' },
      title: { fr: 'Envoyer un message', en: 'Send a message' },
      name: { fr: 'Nom *', en: 'Name *' },
      email: { fr: 'Email *', en: 'Email *' },
      subject: { fr: 'Objet *', en: 'Subject *' },
      subjectPlaceholder: {
        fr: 'Ex. : question sur une réservation',
        en: 'E.g.: question about a booking',
      },
      message: { fr: 'Message *', en: 'Message *' },
      messagePlaceholder: { fr: 'Décrivez votre demande…', en: 'Describe your request…' },
      submit: { fr: 'Envoyer le message', en: 'Send message' },
      submitting: { fr: 'Envoi…', en: 'Sending…' },
      error: {
        fr: 'Une erreur est survenue, réessayez.',
        en: 'Something went wrong, please try again.',
      },
      sent: {
        title: { fr: 'Message bien envoyé !', en: 'Message sent!' },
        text: {
          fr: "Notre équipe vous répondra à l'adresse indiquée sous 24 h ouvrées.",
          en: 'Our team will reply to the address you provided within 24 business hours.',
        },
        again: { fr: 'Envoyer un autre message', en: 'Send another message' },
      },
    },
    faq: {
      kicker: { fr: 'FAQ', en: 'FAQ' },
      title: { fr: "Rubriques d'aide", en: 'Help topics' },
      items: {
        findBoat: {
          q: { fr: 'Comment trouver et réserver un bateau ?', en: 'How to find and book a boat?' },
          a: {
            fr: 'Parcourez les annonces depuis la page Catégories ou la recherche par port, puis envoyez une demande de réservation aux dates souhaitées. Le propriétaire confirme (ou refuse) votre demande : vous êtes prévenu par email et dans votre espace.',
            en: "Browse listings from the Categories page or search by port, then send a booking request for your chosen dates. The owner confirms (or declines) your request: you'll be notified by email and in your account.",
          },
        },
        documents: {
          q: {
            fr: 'Quels documents sont requis pour louer ?',
            en: 'What documents are required to rent?',
          },
          a: {
            fr: 'Un permis bateau (côtier ou fluvial selon le bateau), une pièce d’identité en cours de validité et un CV nautique. Déposez-les dans « Mes documents » : notre équipe les vérifie sous 48 h.',
            en: 'A boat license (coastal or river, depending on the boat), a valid ID and a sailing CV. Upload them under "My documents": our team checks them within 48 hours.',
          },
        },
        cancel: {
          q: {
            fr: 'Comment annuler ou modifier une réservation ?',
            en: 'How to cancel or change a booking?',
          },
          a: {
            fr: 'Rendez-vous dans « Mes réservations » depuis votre espace. Une demande en attente peut être annulée librement ; pour une réservation confirmée, contactez le propriétaire via la messagerie — en cas de désaccord, notre équipe peut arbitrer via un litige.',
            en: 'Go to "My bookings" in your account. A pending request can be cancelled freely; for a confirmed booking, contact the owner via messaging — in case of disagreement, our team can arbitrate through a dispute.',
          },
        },
        payment: {
          q: {
            fr: 'Quels modes de paiement sont acceptés ?',
            en: 'What payment methods are accepted?',
          },
          a: {
            fr: 'La carte bancaire et le virement. Le paiement est encaissé à la confirmation de la réservation ; SailingLoc prélève une commission de 10 % sur chaque location.',
            en: 'Credit card and bank transfer. Payment is charged when the booking is confirmed; SailingLoc takes a 10% commission on each rental.',
          },
        },
        listBoat: {
          q: { fr: 'Comment mettre mon bateau en location ?', en: 'How to list my boat for rent?' },
          a: {
            fr: 'Créez un compte propriétaire, puis « Publier un bateau » depuis votre espace : caractéristiques, photos, port d’attache, disponibilités et acte de francisation. Votre annonce est vérifiée par notre équipe avant d’être publiée.',
            en: 'Create an owner account, then "List a boat" from your account: features, photos, home port, availability and proof of registration. Your listing is checked by our team before being published.',
          },
        },
        insurance: {
          q: {
            fr: 'Les bateaux sont-ils assurés pendant la location ?',
            en: 'Are boats insured during the rental?',
          },
          a: {
            fr: 'Oui : chaque propriétaire doit fournir une attestation d’assurance valide, vérifiée par notre équipe avant la publication de l’annonce.',
            en: 'Yes: every owner must provide a valid insurance certificate, checked by our team before the listing is published.',
          },
        },
        review: {
          q: {
            fr: 'Comment laisser un avis après ma location ?',
            en: 'How to leave a review after my rental?',
          },
          a: {
            fr: 'Une fois la location terminée, ouvrez « Mes réservations » : un rappel vous invite à noter le bateau et laisser un commentaire. Les avis sont modérés avant publication.',
            en: 'Once the rental is over, open "My bookings": a reminder invites you to rate the boat and leave a comment. Reviews are moderated before publication.',
          },
        },
        incident: {
          q: {
            fr: "Que faire en cas d'incident en mer ?",
            en: 'What to do in case of an incident at sea?',
          },
          a: {
            fr: 'Votre sécurité d’abord : contactez le CROSS (196 ou VHF canal 16) en cas d’urgence. Ensuite, prévenez le propriétaire via la messagerie et signalez l’incident à notre équipe, qui ouvrira un litige si nécessaire.',
            en: 'Safety first: contact the CROSS rescue service (196 or VHF channel 16) in an emergency. Then notify the owner via messaging and report the incident to our team, who will open a dispute if needed.',
          },
        },
      },
      otherQuestion: { fr: 'Une autre question ?', en: 'Another question?' },
      contactDirect: { fr: 'Contactez-nous en direct', en: 'Contact us directly' },
      otherSuffix: { fr: 'nous sommes là pour vous aider.', en: "we're here to help." },
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
      similar: { fr: 'Embarcations similaires', en: 'Similar boats' },
      similarLink: { fr: 'Voir toute la flotte', en: 'See the whole fleet' },
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

  boatReviews: {
    title: { fr: 'Avis sur ce bateau', en: 'Reviews for this boat' },
    verified: { fr: 'Avis vérifié', en: 'Verified review' },
    ownerReply: { fr: 'Réponse du propriétaire', en: 'Owner’s reply' },
    formTitle: {
      fr: 'Vous avez loué ce bateau — laissez votre avis',
      en: 'You rented this boat — leave your review',
    },
    edit: { fr: 'Modifier', en: 'Edit' },
    delete: { fr: 'Supprimer', en: 'Delete' },
    deleteConfirm: {
      fr: 'Supprimer définitivement votre avis ?',
      en: 'Permanently delete your review?',
    },
    deleted: { fr: 'Votre avis a été supprimé.', en: 'Your review has been deleted.' },
    deleteError: {
      fr: 'La suppression a échoué, réessayez.',
      en: 'Deletion failed, please try again.',
    },
    editTitle: { fr: 'Modifier votre avis', en: 'Edit your review' },
    saveEdit: { fr: 'Enregistrer', en: 'Save' },
    cancel: { fr: 'Annuler', en: 'Cancel' },
    editSaved: { fr: 'Votre avis a été modifié.', en: 'Your review has been updated.' },
  },

  reviewFilters: {
    sortLabel: { fr: 'Trier', en: 'Sort' },
    ratingLabel: { fr: 'Note', en: 'Rating' },
    allRatings: { fr: 'Toutes les notes', en: 'All ratings' },
    stars_one: { fr: '{{count}} étoile', en: '{{count}} star' },
    stars_other: { fr: '{{count}} étoiles', en: '{{count}} stars' },
    noMatch: { fr: 'Aucun avis pour ce filtre.', en: 'No review for this filter.' },
    prevPage: { fr: 'Page précédente', en: 'Previous page' },
    nextPage: { fr: 'Page suivante', en: 'Next page' },
  },

  reviews: {
    kicker: { fr: 'Avis clients', en: 'Customer reviews' },
    title: {
      fr: 'Ce que nos navigateurs disent de nous',
      en: 'What our sailors say about us',
    },
    productTitle: {
      fr: "Ce qu'en pensent les derniers locataires",
      en: 'What recent renters think',
    },
    empty: {
      fr: 'Aucun commentaire pour le moment',
      en: 'No comments yet',
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

  adminLayout: {
    navAria: { fr: 'Navigation administration', en: 'Administration navigation' },
    title: { fr: 'Administration', en: 'Administration' },
    nav: {
      dashboard: { fr: 'Dashboard', en: 'Dashboard' },
      viewRenter: { fr: 'Vue locataire', en: 'Renter view' },
      viewOwner: { fr: 'Vue propriétaire', en: 'Owner view' },
      users: { fr: 'Utilisateurs', en: 'Users' },
      comments: { fr: 'Commentaires', en: 'Comments' },
      publication: { fr: 'Publication', en: 'Publication' },
      documents: { fr: 'Documents', en: 'Documents' },
      bookings: { fr: 'Réservations', en: 'Bookings' },
      ports: { fr: 'Ports', en: 'Marinas' },
      transaction: { fr: 'Transaction', en: 'Transactions' },
      messages: { fr: 'Messagerie', en: 'Messages' },
      contact: { fr: 'Demandes contact', en: 'Contact requests' },
      logs: { fr: 'Journal', en: 'Activity log' },
      tasks: { fr: 'Tâches en cours', en: 'Running tasks' },
      taskSchedule: { fr: 'Programmation', en: 'Scheduling' },
      account: { fr: 'Compte', en: 'Account' },
    },
  },

  adminDashboard: {
    title: { fr: 'Tableau de bord', en: 'Dashboard' },
    greeting: {
      fr: 'Bonjour {{name}}, voici la vue d’ensemble de la plateforme.',
      en: 'Hello {{name}}, here is the platform overview.',
    },
    loadError: {
      fr: 'Erreur de chargement des statistiques.',
      en: 'Failed to load the statistics.',
    },
    users: { fr: 'Utilisateurs', en: 'Users' },
    bookings: { fr: 'Réservations', en: 'Bookings' },
    revenue: { fr: 'Revenus', en: 'Revenue' },
    commission: { fr: 'Commissions', en: 'Commissions' },
    bookingsByStatus: { fr: 'Réservations par statut', en: 'Bookings by status' },
    revenueByMonth: { fr: 'Revenus par mois', en: 'Revenue by month' },
    bookingsByMonth: { fr: 'Réservations par mois', en: 'Bookings by month' },
    commissionByMonth: { fr: 'Commissions par mois', en: 'Commissions by month' },
    status: {
      confirmed: { fr: 'Confirmées', en: 'Confirmed' },
      pending: { fr: 'En attente', en: 'Pending' },
      refused: { fr: 'Refusées', en: 'Refused' },
      cancelled: { fr: 'Annulées', en: 'Cancelled' },
    },
  },

  adminPlaceholder: {
    building: {
      fr: 'Cette section est en cours de construction.',
      en: 'This section is under construction.',
    },
    soon: {
      fr: 'L’interface et les fonctionnalités seront bientôt disponibles.',
      en: 'The interface and features will be available soon.',
    },
  },

  adminAccount: {
    pageTitle: { fr: 'Mon compte — Admin SailingLoc', en: 'My account — Admin SailingLoc' },
    title: { fr: 'Mon compte', en: 'My account' },
    greeting: {
      fr: 'Bonjour {{name}}, gérez vos informations personnelles, votre photo et votre mot de passe.',
      en: 'Hello {{name}}, manage your personal information, photo and password.',
    },
  },

  adminSpectator: {
    renterTitle: { fr: 'Vue locataire', en: 'Renter view' },
    ownerTitle: { fr: 'Vue propriétaire', en: 'Owner view' },
    renterDesc: {
      fr: 'Aperçu live du site vu par un locataire, dans l’espace admin.',
      en: 'Live preview of the site as seen by a renter, within the admin area.',
    },
    ownerDesc: {
      fr: 'Aperçu live du site vu par un propriétaire, dans l’espace admin.',
      en: 'Live preview of the site as seen by an owner, within the admin area.',
    },
    bannerLead: { fr: 'Vue', en: 'View' },
    renterRole: { fr: 'locataire (faux compte de démo)', en: 'renter (fake demo account)' },
    ownerRole: { fr: 'propriétaire (faux compte de démo)', en: 'owner (fake demo account)' },
    bannerRest: {
      fr: '— l’affichage se base sur ce rôle mais aucune vraie donnée n’est chargée. La connexion réelle depuis l’iframe est désactivée.',
      en: '— the display is based on this role but no real data is loaded. Real login from the iframe is disabled.',
    },
  },

  adminMessages: {
    pageTitle: { fr: 'Messagerie — Admin SailingLoc', en: 'Messages — Admin SailingLoc' },
    title: { fr: 'Messagerie', en: 'Messages' },
    subtitle: {
      fr: 'Écrivez à n’importe quel utilisateur de la plateforme.',
      en: 'Message any user on the platform.',
    },
    newMessageTo: { fr: 'Nouveau message à…', en: 'New message to…' },
    searchPlaceholder: { fr: 'Nom, prénom ou email…', en: 'Last name, first name or email…' },
    roleAdmin: { fr: 'Admin', en: 'Admin' },
  },

  spectatorFrame: {
    linkHome: { fr: 'Accueil', en: 'Home' },
    linkLogin: { fr: 'Connexion', en: 'Login' },
    linkRegister: { fr: 'Inscription', en: 'Sign up' },
    reload: { fr: 'Recharger l’aperçu', en: 'Reload preview' },
    go: { fr: 'Aller', en: 'Go' },
    fullscreenSuffix: { fr: 'plein écran', en: 'fullscreen' },
    exit: { fr: '✕ Quitter (Esc)', en: '✕ Exit (Esc)' },
    iframeTitle: { fr: 'Aperçu site public', en: 'Public site preview' },
    reloading: { fr: 'Rechargement…', en: 'Reloading…' },
    fullscreen: { fr: '⛶ Plein écran', en: '⛶ Fullscreen' },
  },

  adminContact: {
    pageTitle: {
      fr: 'Demandes contact — Admin SailingLoc',
      en: 'Contact requests — Admin SailingLoc',
    },
    title: { fr: 'Demandes contact', en: 'Contact requests' },
    subtitle: {
      fr: 'Messages envoyés depuis le formulaire de la page Contact.',
      en: 'Messages sent from the Contact page form.',
    },
    filterByStatus: { fr: 'Filtrer par statut', en: 'Filter by status' },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    empty: { fr: 'Aucune demande pour ce filtre.', en: 'No request for this filter.' },
    loadError: { fr: 'Erreur de chargement.', en: 'Failed to load.' },
    markedProcessed: { fr: 'Demande marquée traitée.', en: 'Request marked as processed.' },
    reopened: { fr: 'Demande rouverte.', en: 'Request reopened.' },
    opError: { fr: 'Échec de l’opération.', en: 'The operation failed.' },
    reopen: { fr: 'Rouvrir la demande', en: 'Reopen request' },
    markProcessed: { fr: '✔ Marquer traitée', en: '✔ Mark as processed' },
    processedOn: { fr: 'Traitée le {{date}}', en: 'Processed on {{date}}' },
    paginationLabel: { fr: 'Demandes', en: 'Requests' },
    status: {
      new: { fr: 'Nouvelle', en: 'New' },
      processed: { fr: 'Traitée', en: 'Processed' },
    },
    filters: {
      new: { fr: 'Nouvelles', en: 'New' },
      all: { fr: 'Toutes', en: 'All' },
      processed: { fr: 'Traitées', en: 'Processed' },
    },
  },

  adminCron: {
    pageTitle: {
      fr: 'Programmation des tâches — Admin SailingLoc',
      en: 'Task scheduling — Admin SailingLoc',
    },
    title: { fr: 'Programmation des tâches', en: 'Task scheduling' },
    subtitle: {
      fr: 'Planning, activation et paramétrage des tâches automatiques.',
      en: 'Schedule, activation and settings of automated tasks.',
    },
    timezoneNotice: {
      fr: 'Les horaires sont exprimés dans le fuseau {{timezone}}.',
      en: 'Times are expressed in the {{timezone}} time zone.',
    },
    refresh: { fr: 'Actualiser', en: 'Refresh' },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    empty: { fr: 'Aucune tâche déclarée.', en: 'No task declared.' },
    loadError: { fr: 'Erreur de chargement des tâches.', en: 'Failed to load tasks.' },
    saveError: { fr: 'Enregistrement impossible.', en: 'Could not save.' },
    runError: { fr: 'Lancement impossible.', en: 'Could not start the task.' },
    runStarted: { fr: 'Exécution lancée.', en: 'Execution started.' },
    activeLabel: { fr: 'Activée', en: 'Enabled' },
    enabled: { fr: 'Tâche activée.', en: 'Task enabled.' },
    disabled: { fr: 'Tâche désactivée.', en: 'Task disabled.' },
    running: { fr: 'En cours', en: 'Running' },
    dryRun: { fr: 'Simulation', en: 'Dry run' },
    live: { fr: 'Réel', en: 'Live' },
    orphan: { fr: 'Retirée du code', en: 'Removed from code' },
    dryRunOn: { fr: 'Passée en simulation.', en: 'Switched to dry run.' },
    liveOn: { fr: 'Passée en mode réel.', en: 'Switched to live mode.' },
    switchToLive: { fr: 'Passer en réel', en: 'Switch to live' },
    switchToDryRun: { fr: 'Passer en simulation', en: 'Switch to dry run' },
    scheduleLabel: { fr: 'Planning', en: 'Schedule' },
    lastRunLabel: { fr: 'Dernière exécution', en: 'Last run' },
    nextRunLabel: { fr: 'Prochaine exécution', en: 'Next run' },
    never: { fr: 'Jamais exécutée', en: 'Never run' },
    notScheduled: { fr: 'Non programmée', en: 'Not scheduled' },
    editSchedule: { fr: 'Modifier le planning', en: 'Edit schedule' },
    runNow: { fr: 'Exécuter maintenant', en: 'Run now' },
    dialogTitle: { fr: 'Planning — {{name}}', en: 'Schedule — {{name}}' },
    frequencyLabel: { fr: 'Fréquence', en: 'Frequency' },
    weekdayLabel: { fr: 'Jour de la semaine', en: 'Day of week' },
    timeLabel: { fr: 'Heure', en: 'Time' },
    minuteLabel: { fr: 'Minute de chaque heure', en: 'Minute of each hour' },
    customLabel: { fr: 'Expression cron', en: 'Cron expression' },
    customHelp: {
      fr: 'Cinq champs : minute, heure, jour du mois, mois, jour de la semaine.',
      en: 'Five fields: minute, hour, day of month, month, day of week.',
    },
    paramsLabel: { fr: 'Paramètres', en: 'Settings' },
    preview: { fr: 'Exécution :', en: 'Runs:' },
    save: { fr: 'Enregistrer', en: 'Save' },
    close: { fr: 'Fermer', en: 'Close' },
    scheduleSaved: { fr: 'Planning enregistré.', en: 'Schedule saved.' },
    freq: {
      hourly: { fr: 'Toutes les heures', en: 'Hourly' },
      daily: { fr: 'Tous les jours', en: 'Daily' },
      weekly: { fr: 'Toutes les semaines', en: 'Weekly' },
      custom: { fr: 'Personnalisée', en: 'Custom' },
      hourlyAt: {
        fr: 'Toutes les heures, à la minute {{minute}}',
        en: 'Every hour, at minute {{minute}}',
      },
      dailyAt: { fr: 'Tous les jours à {{time}}', en: 'Every day at {{time}}' },
      weeklyAt: { fr: 'Chaque {{day}} à {{time}}', en: 'Every {{day}} at {{time}}' },
    },
    weekdays: {
      0: { fr: 'dimanche', en: 'Sunday' },
      1: { fr: 'lundi', en: 'Monday' },
      2: { fr: 'mardi', en: 'Tuesday' },
      3: { fr: 'mercredi', en: 'Wednesday' },
      4: { fr: 'jeudi', en: 'Thursday' },
      5: { fr: 'vendredi', en: 'Friday' },
      6: { fr: 'samedi', en: 'Saturday' },
    },
    params: {
      expiryHours: { fr: 'Délai avant expiration (heures)', en: 'Expiry delay (hours)' },
      retentionDays: { fr: 'Rétention (jours)', en: 'Retention (days)' },
      unprocessedRetentionDays: {
        fr: 'Rétention des demandes sans réponse (jours)',
        en: 'Retention for unanswered requests (days)',
      },
    },
    jobs: {
      'bookings.expire': {
        name: { fr: 'Expiration des demandes non payées', en: 'Expire unpaid requests' },
        description: {
          fr: 'Annule les demandes de réservation restées sans paiement au-delà du délai.',
          en: 'Cancels booking requests left unpaid beyond the delay.',
        },
      },
      'tokens.purge': {
        name: { fr: 'Purge des jetons de session', en: 'Purge session tokens' },
        description: {
          fr: 'Supprime les jetons de rafraîchissement expirés depuis plus longtemps que la rétention. Les jetons encore valides, révoqués ou non, sont conservés.',
          en: 'Deletes refresh tokens expired longer ago than the retention period. Tokens still valid, revoked or not, are kept.',
        },
      },
      'logs.purge': {
        name: { fr: 'Purge du journal d’activité', en: 'Purge activity log' },
        description: {
          fr: 'Supprime les entrées du journal plus anciennes que la rétention. Même règle pour tous les niveaux, y compris les erreurs.',
          en: 'Deletes activity log entries older than the retention period. Same rule for every level, errors included.',
        },
      },
      'contact.purge': {
        name: { fr: 'Purge des demandes de contact', en: 'Purge contact requests' },
        description: {
          fr: 'Supprime les demandes traitées depuis plus longtemps que la rétention, et celles restées sans réponse au-delà du second délai.',
          en: 'Deletes requests processed longer ago than the retention period, and those left unanswered beyond the second delay.',
        },
      },
      'cron.runs.purge': {
        name: { fr: 'Purge de l’historique des tâches', en: 'Purge task history' },
        description: {
          fr: 'Supprime les exécutions terminées depuis plus longtemps que la rétention, avec l’adresse de l’administrateur qui les a déclenchées. L’exécution en cours est toujours épargnée.',
          en: 'Deletes runs finished longer ago than the retention period, along with the email of the admin who triggered them. The current run is always spared.',
        },
      },
      'users.purge': {
        name: { fr: 'Anonymisation des comptes supprimés', en: 'Anonymise deleted accounts' },
        description: {
          fr: 'Anonymise les comptes supprimés depuis plus longtemps que le délai de grâce : identité, e-mail et téléphone effacés, pièces d’identité et avatar supprimés du disque, adresse retirée des journaux. Réservations et paiements sont conservés pour l’obligation comptable, rattachés à un compte anonyme.',
          en: 'Anonymises accounts deleted longer ago than the grace period: identity, email and phone wiped, identity papers and avatar removed from disk, address scrubbed from the logs. Bookings and payments are kept for accounting obligations, attached to an anonymous account.',
        },
      },
      'users.unverified.purge': {
        name: { fr: 'Purge des inscriptions non confirmées', en: 'Purge unconfirmed sign-ups' },
        description: {
          fr: 'Supprime les comptes dont l’e-mail n’a jamais été confirmé au-delà du délai. Ces comptes ne peuvent pas se connecter et n’ont donc rien de rattaché : la suppression est franche, sans anonymisation.',
          en: 'Deletes accounts whose email was never confirmed beyond the delay. These accounts cannot log in and have nothing attached, so they are deleted outright rather than anonymised.',
        },
      },
    },
  },

  adminCronRuns: {
    pageTitle: {
      fr: 'Tâches en cours — Admin SailingLoc',
      en: 'Running tasks — Admin SailingLoc',
    },
    title: { fr: 'Tâches en cours', en: 'Running tasks' },
    subtitle: {
      fr: 'Exécutions en cours et historique des tâches automatiques.',
      en: 'Running executions and history of automated tasks.',
    },
    nowRunning: { fr: 'En cours d’exécution', en: 'Currently running' },
    nothingRunning: { fr: 'Aucune tâche en cours.', en: 'No task running.' },
    startedAt: { fr: 'démarrée le {{date}}', en: 'started on {{date}}' },
    refresh: { fr: 'Actualiser', en: 'Refresh' },
    allJobs: { fr: 'Toutes les tâches', en: 'All tasks' },
    allStatuses: { fr: 'Tous les statuts', en: 'All statuses' },
    tableCaption: {
      fr: 'Historique des exécutions de tâches planifiées',
      en: 'History of scheduled task executions',
    },
    colStarted: { fr: 'Démarrée', en: 'Started' },
    colJob: { fr: 'Tâche', en: 'Task' },
    colStatus: { fr: 'Statut', en: 'Status' },
    colTrigger: { fr: 'Déclenchement', en: 'Trigger' },
    colAffected: { fr: 'Traités', en: 'Processed' },
    colDuration: { fr: 'Durée', en: 'Duration' },
    colActions: { fr: 'Actions', en: 'Actions' },
    modeLabel: { fr: 'Mode', en: 'Mode' },
    finishedLabel: { fr: 'Terminée', en: 'Finished' },
    actorLabel: { fr: 'Déclenchée par', en: 'Triggered by' },
    errorLabel: { fr: 'Erreur', en: 'Error' },
    resultLabel: { fr: 'Détail', en: 'Details' },
    targetsLabel: { fr: 'Enregistrements concernés', en: 'Records affected' },
    targetsPrivacy: {
      fr: 'Identifiants techniques uniquement : aucune donnée personnelle n’est conservée dans la trace.',
      en: 'Technical identifiers only: no personal data is kept in the trace.',
    },
    targetsNone: { fr: 'Aucun enregistrement concerné.', en: 'No record affected.' },
    targetsTruncated: {
      fr: 'Liste tronquée : {{shown}} identifiants affichés sur {{total}} traités.',
      en: 'Truncated list: {{shown}} identifiers shown out of {{total}} processed.',
    },
    open: { fr: 'Ouvrir', en: 'Open' },
    openDetail: { fr: 'Ouvrir l’exécution {{id}}', en: 'Open execution {{id}}' },
    detailTitle: { fr: 'Exécution #{{id}}', en: 'Execution #{{id}}' },
    close: { fr: 'Fermer', en: 'Close' },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    empty: { fr: 'Aucune exécution pour ces filtres.', en: 'No execution for these filters.' },
    loadError: { fr: 'Erreur de chargement des exécutions.', en: 'Failed to load executions.' },
    paginationLabel: { fr: 'Exécutions', en: 'Executions' },
    statuses: {
      running: { fr: 'En cours', en: 'Running' },
      success: { fr: 'Réussie', en: 'Succeeded' },
      failed: { fr: 'Échouée', en: 'Failed' },
      skipped: { fr: 'Ignorée', en: 'Skipped' },
    },
    triggers: {
      schedule: { fr: 'Planifiée', en: 'Scheduled' },
      manual: { fr: 'Manuelle', en: 'Manual' },
    },
  },

  adminLogs: {
    pageTitle: {
      fr: 'Journal d’activité — Admin SailingLoc',
      en: 'Activity log — Admin SailingLoc',
    },
    title: { fr: 'Journal d’activité', en: 'Activity log' },
    subtitle: {
      fr: 'Actions effectuées depuis l’espace d’administration.',
      en: 'Actions performed from the administration area.',
    },
    searchLabel: { fr: 'Recherche', en: 'Search' },
    searchPlaceholder: {
      fr: 'Email, action, id de cible…',
      en: 'Email, action, target id…',
    },
    categoryLabel: { fr: 'Catégorie', en: 'Category' },
    allCategories: { fr: 'Toutes les catégories', en: 'All categories' },
    levelLabel: { fr: 'Niveau', en: 'Level' },
    allLevels: { fr: 'Tous les niveaux', en: 'All levels' },
    roleLabel: { fr: 'Rôle', en: 'Role' },
    allRoles: { fr: 'Tous les rôles', en: 'All roles' },
    fromLabel: { fr: 'Du', en: 'From' },
    toLabel: { fr: 'Au', en: 'To' },
    resetFilters: { fr: 'Réinitialiser les filtres', en: 'Reset filters' },
    tableCaption: {
      fr: 'Liste des actions d’administration enregistrées',
      en: 'List of recorded administration actions',
    },
    colDate: { fr: 'Date', en: 'Date' },
    colActor: { fr: 'Auteur', en: 'Author' },
    colAction: { fr: 'Action', en: 'Action' },
    colTarget: { fr: 'Cible', en: 'Target' },
    colActions: { fr: 'Actions', en: 'Actions' },
    open: { fr: 'Ouvrir', en: 'Open' },
    openDetail: { fr: 'Ouvrir l’entrée {{id}}', en: 'Open entry {{id}}' },
    detailTitle: { fr: 'Entrée de journal #{{id}}', en: 'Log entry #{{id}}' },
    close: { fr: 'Fermer', en: 'Close' },
    download: { fr: 'Télécharger', en: 'Download' },
    downloadOne: { fr: 'Télécharger l’entrée {{id}}', en: 'Download entry {{id}}' },
    fieldEmail: { fr: 'Email', en: 'Email' },
    fieldActorId: { fr: 'Id auteur', en: 'Author id' },
    fieldIp: { fr: 'Adresse IP', en: 'IP address' },
    fieldMessage: { fr: 'Message', en: 'Message' },
    fieldMeta: { fr: 'Données', en: 'Data' },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    empty: { fr: 'Aucune action pour ces filtres.', en: 'No action for these filters.' },
    loadError: { fr: 'Erreur de chargement du journal.', en: 'Failed to load the activity log.' },
    unknownActor: { fr: 'Inconnu', en: 'Unknown' },
    paginationLabel: { fr: 'Entrées', en: 'Entries' },
    levels: {
      info: { fr: 'Information', en: 'Info' },
      warning: { fr: 'Avertissement', en: 'Warning' },
      error: { fr: 'Erreur', en: 'Error' },
    },
    roles: {
      admin: { fr: 'Admin', en: 'Admin' },
      proprietaire: { fr: 'Propriétaire', en: 'Owner' },
      locataire: { fr: 'Locataire', en: 'Renter' },
    },
    categories: {
      auth: { fr: 'Connexion', en: 'Authentication' },
      user: { fr: 'Utilisateurs', en: 'Users' },
      document: { fr: 'Documents', en: 'Documents' },
      boat: { fr: 'Bateaux', en: 'Boats' },
      report: { fr: 'Signalements', en: 'Reports' },
      booking: { fr: 'Réservations', en: 'Bookings' },
      dispute: { fr: 'Litiges', en: 'Disputes' },
      review: { fr: 'Avis', en: 'Reviews' },
      port: { fr: 'Ports', en: 'Marinas' },
      contact: { fr: 'Demandes contact', en: 'Contact requests' },
      support: { fr: 'Support', en: 'Support' },
      message: { fr: 'Messagerie', en: 'Messages' },
      cron: { fr: 'Tâches planifiées', en: 'Scheduled tasks' },
    },
    targets: {
      user: { fr: 'Utilisateur', en: 'User' },
      document: { fr: 'Document', en: 'Document' },
      boat: { fr: 'Bateau', en: 'Boat' },
      boat_report: { fr: 'Signalement', en: 'Report' },
      booking: { fr: 'Réservation', en: 'Booking' },
      dispute: { fr: 'Litige', en: 'Dispute' },
      review: { fr: 'Avis', en: 'Review' },
      port: { fr: 'Port', en: 'Marina' },
      contact: { fr: 'Demande contact', en: 'Contact request' },
      message: { fr: 'Message', en: 'Message' },
      cron_job: { fr: 'Tâche planifiée', en: 'Scheduled task' },
    },
    actions: {
      admin: {
        login: { fr: 'Connexion admin', en: 'Admin sign-in' },
        login_failed: { fr: 'Échec de connexion admin', en: 'Failed admin sign-in' },
      },
      user: {
        create: { fr: 'Création d’un compte', en: 'Account created' },
        update: { fr: 'Modification d’un compte', en: 'Account updated' },
        delete: { fr: 'Suppression d’un compte', en: 'Account deleted' },
      },
      document: {
        status: { fr: 'Statut de document modifié', en: 'Document status changed' },
        upload: { fr: 'Document déposé', en: 'Document uploaded' },
        delete: { fr: 'Document supprimé', en: 'Document deleted' },
      },
      boat: {
        publish: { fr: 'Publication de bateau modifiée', en: 'Boat publication changed' },
        create: { fr: 'Annonce créée', en: 'Listing created' },
        update: { fr: 'Annonce modifiée', en: 'Listing updated' },
        delete: { fr: 'Annonce supprimée', en: 'Listing deleted' },
      },
      report: {
        status: { fr: 'Statut de signalement modifié', en: 'Report status changed' },
      },
      cron: {
        run: { fr: 'Tâche planifiée exécutée', en: 'Scheduled task executed' },
        update: { fr: 'Planning de tâche modifié', en: 'Task schedule changed' },
        trigger: { fr: 'Tâche lancée manuellement', en: 'Task started manually' },
      },
      booking: {
        cancel: { fr: 'Réservation annulée (admin)', en: 'Booking cancelled (admin)' },
        create: { fr: 'Réservation créée', en: 'Booking created' },
        pay: { fr: 'Réservation payée', en: 'Booking paid' },
        decide: { fr: 'Réservation validée ou refusée', en: 'Booking accepted or refused' },
        cancel_guest: {
          fr: 'Réservation annulée par le locataire',
          en: 'Booking cancelled by the renter',
        },
        refund_request: { fr: 'Remboursement demandé', en: 'Refund requested' },
      },
      dispute: {
        status: { fr: 'Statut de litige modifié', en: 'Dispute status changed' },
        open: { fr: 'Litige ouvert', en: 'Dispute opened' },
      },
      review: {
        update: { fr: 'Avis modifié', en: 'Review updated' },
        delete: { fr: 'Avis supprimé', en: 'Review deleted' },
      },
      port: {
        create: { fr: 'Port créé', en: 'Marina created' },
        delete: { fr: 'Port supprimé', en: 'Marina deleted' },
      },
      contact: {
        status: { fr: 'Demande contact traitée', en: 'Contact request handled' },
      },
      support: {
        resolve: { fr: 'Demande support clôturée', en: 'Support request closed' },
      },
      message: {
        update: { fr: 'Message modifié', en: 'Message edited' },
        delete: { fr: 'Message supprimé', en: 'Message deleted' },
      },
    },
  },

  adminComments: {
    title: { fr: 'Commentaires', en: 'Comments' },
    subtitle: {
      fr: 'Modération des avis : valider, modifier, supprimer.',
      en: 'Review moderation: approve, edit, delete.',
    },
    searchPlaceholder: {
      fr: 'Rechercher (auteur, commentaire)…',
      en: 'Search (author, comment)…',
    },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    empty: { fr: 'Aucun avis.', en: 'No review.' },
    loadError: { fr: 'Erreur de chargement.', en: 'Failed to load.' },
    editTitle: { fr: 'Modifier l’avis', en: 'Edit review' },
    ratingLabel: { fr: 'Note', en: 'Rating' },
    commentLabel: { fr: 'Commentaire', en: 'Comment' },
    cancel: { fr: 'Annuler', en: 'Cancel' },
    saving: { fr: 'Enregistrement…', en: 'Saving…' },
    save: { fr: 'Enregistrer', en: 'Save' },
    editSuccess: { fr: 'Avis modifié.', en: 'Review updated.' },
    editError: { fr: 'Échec de la modification.', en: 'Failed to update.' },
    validatedToast: { fr: 'Avis validé.', en: 'Review approved.' },
    refusedToast: { fr: 'Avis refusé.', en: 'Review refused.' },
    genericError: { fr: 'Échec.', en: 'Failed.' },
    confirmDelete: { fr: 'Supprimer cet avis ?', en: 'Delete this review?' },
    deleteSuccess: { fr: 'Avis supprimé.', en: 'Review deleted.' },
    colAuthor: { fr: 'Auteur', en: 'Author' },
    colBoat: { fr: 'Bateau', en: 'Boat' },
    colRating: { fr: 'Note', en: 'Rating' },
    colComment: { fr: 'Commentaire', en: 'Comment' },
    colStatus: { fr: 'Statut', en: 'Status' },
    colActions: { fr: 'Actions', en: 'Actions' },
    actionValidate: { fr: 'Valider', en: 'Approve' },
    actionRefuse: { fr: 'Refuser', en: 'Refuse' },
    actionEdit: { fr: 'Modifier', en: 'Edit' },
    actionDelete: { fr: 'Supprimer', en: 'Delete' },
    paginationLabel: { fr: 'Avis', en: 'Reviews' },
    count_one: { fr: '{{count}} avis.', en: '{{count}} review.' },
    count_other: { fr: '{{count}} avis.', en: '{{count}} reviews.' },
    status: {
      pending: { fr: 'En attente', en: 'Pending' },
      validated: { fr: 'Validé', en: 'Approved' },
      refused: { fr: 'Refusé', en: 'Refused' },
    },
    filters: {
      all: { fr: 'Tous', en: 'All' },
      pending: { fr: 'En attente', en: 'Pending' },
      validated: { fr: 'Validés', en: 'Approved' },
      refused: { fr: 'Refusés', en: 'Refused' },
    },
  },

  adminDocuments: {
    title: { fr: 'Documents', en: 'Documents' },
    subtitle: {
      fr: 'Vérifiez et validez les documents des utilisateurs.',
      en: 'Review and approve users’ documents.',
    },
    searchPlaceholder: {
      fr: 'Rechercher un utilisateur (nom, email)…',
      en: 'Search a user (name, email)…',
    },
    allRoles: { fr: 'Tous les rôles', en: 'All roles' },
    roleRenter: { fr: 'Locataire', en: 'Renter' },
    roleOwner: { fr: 'Propriétaire', en: 'Owner' },
    allTypes: { fr: 'Tous les types', en: 'All types' },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    empty: { fr: 'Aucun document.', en: 'No document.' },
    loadError: { fr: 'Erreur de chargement.', en: 'Failed to load.' },
    viewError: {
      fr: 'Impossible d’ouvrir le document (fichier introuvable).',
      en: 'Unable to open the document (file not found).',
    },
    validatedToast: { fr: 'Document validé.', en: 'Document approved.' },
    refusedToast: { fr: 'Document refusé.', en: 'Document refused.' },
    updateError: { fr: 'Échec de la mise à jour.', en: 'Update failed.' },
    colUser: { fr: 'Utilisateur', en: 'User' },
    colType: { fr: 'Type', en: 'Type' },
    colFile: { fr: 'Fichier', en: 'File' },
    colUploaded: { fr: 'Déposé le', en: 'Uploaded on' },
    colStatus: { fr: 'Statut', en: 'Status' },
    colActions: { fr: 'Actions', en: 'Actions' },
    view: { fr: 'Voir le document', en: 'View document' },
    actionValidate: { fr: 'Valider', en: 'Approve' },
    actionRefuse: { fr: 'Refuser', en: 'Refuse' },
    paginationLabel: { fr: 'Documents', en: 'Documents' },
    count_one: { fr: '{{count}} document.', en: '{{count}} document.' },
    count_other: { fr: '{{count}} documents.', en: '{{count}} documents.' },
    status: {
      pending: { fr: 'En attente', en: 'Pending' },
      validated: { fr: 'Validé', en: 'Approved' },
      refused: { fr: 'Refusé', en: 'Refused' },
    },
    filters: {
      pending: { fr: 'En attente', en: 'Pending' },
      all: { fr: 'Tous', en: 'All' },
      validated: { fr: 'Validés', en: 'Approved' },
      refused: { fr: 'Refusés', en: 'Refused' },
    },
    types: {
      permis_conduire: { fr: 'Permis bateau', en: 'Boat license' },
      piece_identite: { fr: 'Pièce d’identité', en: 'Identity document' },
      cv_nautique: { fr: 'CV nautique', en: 'Sailing résumé' },
      permis: { fr: 'Permis', en: 'License' },
      assurance: { fr: 'Assurance', en: 'Insurance' },
      cv_marin: { fr: 'CV marin', en: 'Maritime résumé' },
      acte_francisation: { fr: 'Acte de francisation', en: 'Registration certificate' },
    },
  },

  adminPorts: {
    title: { fr: 'Ports', en: 'Marinas' },
    subtitle: {
      fr: 'Gérez les ports d’amarrage et visualisez où se trouvent les bateaux.',
      en: 'Manage mooring marinas and see where the boats are located.',
    },
    importButton: { fr: '+ Importer un port', en: '+ Import a marina' },
    catalogTitle: { fr: 'Catalogue maritime français', en: 'French maritime catalog' },
    close: { fr: 'Fermer', en: 'Close' },
    catalogSearchPlaceholder: {
      fr: 'Rechercher un port à importer (nom, commune)…',
      en: 'Search a marina to import (name, town)…',
    },
    catalogLoading: { fr: 'Chargement du catalogue…', en: 'Loading the catalog…' },
    catalogError: {
      fr: 'Impossible de charger le catalogue des ports.',
      en: 'Unable to load the marina catalog.',
    },
    typeToSearch: {
      fr: 'Saisissez au moins 2 caractères pour rechercher.',
      en: 'Type at least 2 characters to search.',
    },
    catalogEmpty: {
      fr: 'Aucun port trouvé dans le catalogue.',
      en: 'No marina found in the catalog.',
    },
    inBase: { fr: 'En base', en: 'In database' },
    import: { fr: 'Importer', en: 'Import' },
    imported: { fr: '« {{name}} » importé en base.', en: '“{{name}}” imported to the database.' },
    importError: { fr: 'Échec de l’import.', en: 'Import failed.' },
    confirmRemove: {
      fr: 'Retirer le port « {{name}} » de la base ?',
      en: 'Remove the marina “{{name}}” from the database?',
    },
    removeSuccess: { fr: 'Port supprimé.', en: 'Marina deleted.' },
    removeError: { fr: 'Échec de la suppression.', en: 'Failed to delete.' },
    loadError: { fr: 'Erreur de chargement.', en: 'Failed to load.' },
    mapEmpty: { fr: 'Aucun port géolocalisé.', en: 'No geolocated marina.' },
    filterPlaceholder: { fr: 'Filtrer (nom, ville)…', en: 'Filter (name, city)…' },
    allRegions: { fr: 'Toutes les régions', en: 'All regions' },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    empty: {
      fr: 'Aucun port. Importez-en depuis le catalogue.',
      en: 'No marina. Import some from the catalog.',
    },
    removeDisabled: {
      fr: 'Suppression impossible : des bateaux y sont rattachés',
      en: 'Cannot delete: boats are attached to it',
    },
    remove: { fr: 'Supprimer', en: 'Delete' },
    paginationLabel: { fr: 'Ports', en: 'Marinas' },
    count_one: { fr: '{{count}} port en base.', en: '{{count}} marina in database.' },
    count_other: { fr: '{{count}} ports en base.', en: '{{count}} marinas in database.' },
    colPort: { fr: 'Port', en: 'Marina' },
    colCity: { fr: 'Ville', en: 'City' },
    colRegion: { fr: 'Région', en: 'Region' },
    colCoords: { fr: 'Coordonnées', en: 'Coordinates' },
    colBoats: { fr: 'Bateaux', en: 'Boats' },
    colActions: { fr: 'Actions', en: 'Actions' },
  },

  adminTransactions: {
    title: { fr: 'Transactions & commissions', en: 'Transactions & commissions' },
    subtitle: {
      fr: 'Suivi des paiements encaissés via la plateforme et des commissions perçues.',
      en: 'Tracking of payments collected through the platform and commissions earned.',
    },
    volume: { fr: 'Volume encaissé', en: 'Collected volume' },
    volumeSub: { fr: 'Paiements réussis', en: 'Successful payments' },
    commission: { fr: 'Commissions perçues', en: 'Commissions earned' },
    commissionSub: { fr: 'Cumul SailingLoc', en: 'SailingLoc total' },
    successCount: { fr: 'Transactions réussies', en: 'Successful transactions' },
    successSub: {
      fr: '{{pending}} en attente · {{failed}} échouées',
      en: '{{pending}} pending · {{failed}} failed',
    },
    refunds: { fr: 'Remboursements', en: 'Refunds' },
    refundsSub: { fr: 'Paiements remboursés', en: 'Refunded payments' },
    searchPlaceholder: {
      fr: 'Rechercher (référence, bateau, email)…',
      en: 'Search (reference, boat, email)…',
    },
    methodLabel: { fr: 'Méthode', en: 'Method' },
    dateFrom: { fr: 'Du', en: 'From' },
    dateTo: { fr: 'Au', en: 'To' },
    reset: { fr: 'Réinitialiser', en: 'Reset' },
    sortLabel: { fr: 'Trier par', en: 'Sort by' },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    empty: { fr: 'Aucune transaction.', en: 'No transaction.' },
    loadError: { fr: 'Erreur de chargement.', en: 'Failed to load.' },
    statsError: {
      fr: 'Erreur de chargement des statistiques.',
      en: 'Failed to load the statistics.',
    },
    refundedAmount: { fr: '−{{amount}} remboursés', en: '−{{amount}} refunded' },
    dispute: { fr: 'Litige #{{id}}', en: 'Dispute #{{id}}' },
    paginationLabel: { fr: 'Transactions', en: 'Transactions' },
    colRef: { fr: 'Référence', en: 'Reference' },
    colDate: { fr: 'Date', en: 'Date' },
    colRenter: { fr: 'Locataire', en: 'Renter' },
    colBoat: { fr: 'Bateau', en: 'Boat' },
    colMethod: { fr: 'Méthode', en: 'Method' },
    colAmount: { fr: 'Montant', en: 'Amount' },
    colCommission: { fr: 'Commission', en: 'Commission' },
    colStatus: { fr: 'Statut', en: 'Status' },
    status: {
      pending: { fr: 'En attente', en: 'Pending' },
      success: { fr: 'Réussi', en: 'Successful' },
      failed: { fr: 'Échoué', en: 'Failed' },
      refunded: { fr: 'Remboursé', en: 'Refunded' },
    },
    statusFilters: {
      all: { fr: 'Tous', en: 'All' },
      success: { fr: 'Réussis', en: 'Successful' },
      pending: { fr: 'En attente', en: 'Pending' },
      failed: { fr: 'Échoués', en: 'Failed' },
      refunded: { fr: 'Remboursés', en: 'Refunded' },
    },
    methods: {
      card: { fr: 'Carte', en: 'Card' },
      bank_transfer: { fr: 'Virement', en: 'Bank transfer' },
      paypal: { fr: 'PayPal', en: 'PayPal' },
      cash: { fr: 'Espèces', en: 'Cash' },
    },
    methodFilters: {
      all: { fr: 'Toutes', en: 'All' },
      card: { fr: 'Carte', en: 'Card' },
      bank_transfer: { fr: 'Virement', en: 'Bank transfer' },
    },
  },

  adminPublication: {
    title: { fr: 'Publication', en: 'Publication' },
    subtitle: {
      fr: 'Gérez la publication des bateaux et traitez les signalements.',
      en: 'Manage boat publication and handle reports.',
    },
    tabBoats: { fr: 'Bateaux', en: 'Boats' },
    tabReports: { fr: 'Signalements', en: 'Reports' },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    emptyBoats: { fr: 'Aucun bateau.', en: 'No boat.' },
    emptyReports: { fr: 'Aucun signalement.', en: 'No report.' },
    loadError: { fr: 'Erreur de chargement.', en: 'Failed to load.' },
    genericError: { fr: 'Échec.', en: 'Failed.' },
    unpublishedToast: {
      fr: 'Bateau dépublié — propriétaire notifié par email.',
      en: 'Boat unpublished — owner notified by email.',
    },
    publishedToast: {
      fr: 'Bateau publié — propriétaire notifié par email.',
      en: 'Boat published — owner notified by email.',
    },
    reportResolvedToast: { fr: 'Signalement traité.', en: 'Report handled.' },
    reportDismissedToast: { fr: 'Signalement rejeté.', en: 'Report dismissed.' },
    unpublishFromReportToast: {
      fr: 'Bateau dépublié — propriétaire notifié, signalement clôturé.',
      en: 'Boat unpublished — owner notified, report closed.',
    },
    published: { fr: 'Publié', en: 'Published' },
    unpublished: { fr: 'Non publié', en: 'Unpublished' },
    pendingReports: { fr: '{{count}} en attente', en: '{{count}} pending' },
    unpublish: { fr: 'Dépublier', en: 'Unpublish' },
    publish: { fr: 'Publier', en: 'Publish' },
    unpublishBoat: { fr: 'Dépublier le bateau', en: 'Unpublish the boat' },
    handle: { fr: 'Traiter', en: 'Handle' },
    dismiss: { fr: 'Rejeter', en: 'Dismiss' },
    paginationBoats: { fr: 'Annonces', en: 'Listings' },
    paginationReports: { fr: 'Signalements', en: 'Reports' },
    colBoat: { fr: 'Bateau', en: 'Boat' },
    colOwner: { fr: 'Propriétaire', en: 'Owner' },
    colPrice: { fr: 'Prix/jour', en: 'Price/day' },
    colStatus: { fr: 'Statut', en: 'Status' },
    colReports: { fr: 'Signalements', en: 'Reports' },
    colAction: { fr: 'Action', en: 'Action' },
    colReason: { fr: 'Motif', en: 'Reason' },
    colReportedBy: { fr: 'Signalé par', en: 'Reported by' },
    colDate: { fr: 'Date', en: 'Date' },
    colActions: { fr: 'Actions', en: 'Actions' },
    reportStatus: {
      pending: { fr: 'En attente', en: 'Pending' },
      resolved: { fr: 'Traité', en: 'Handled' },
      dismissed: { fr: 'Rejeté', en: 'Dismissed' },
    },
    reportFilters: {
      pending: { fr: 'En attente', en: 'Pending' },
      all: { fr: 'Tous', en: 'All' },
      resolved: { fr: 'Traités', en: 'Handled' },
      dismissed: { fr: 'Rejetés', en: 'Dismissed' },
    },
    publishedFilters: {
      all: { fr: 'Tous', en: 'All' },
      published: { fr: 'Publiés', en: 'Published' },
      unpublished: { fr: 'Non publiés', en: 'Unpublished' },
    },
  },

  adminUsers: {
    title: { fr: 'Utilisateurs', en: 'Users' },
    addAccount: { fr: 'Ajouter un compte', en: 'Add an account' },
    searchPlaceholder: { fr: 'Rechercher (nom, email)…', en: 'Search (name, email)…' },
    allRoles: { fr: 'Tous les rôles', en: 'All roles' },
    allStatuses: { fr: 'Tous les statuts', en: 'All statuses' },
    activeFilter: { fr: 'Actifs', en: 'Active' },
    inactiveFilter: { fr: 'Inactifs', en: 'Inactive' },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    empty: { fr: 'Aucun utilisateur.', en: 'No user.' },
    loadError: { fr: 'Erreur de chargement.', en: 'Failed to load.' },
    colName: { fr: 'Nom', en: 'Name' },
    colEmail: { fr: 'Email', en: 'Email' },
    colRole: { fr: 'Rôle', en: 'Role' },
    colPhone: { fr: 'Téléphone', en: 'Phone' },
    colStatus: { fr: 'Statut', en: 'Status' },
    colRegistered: { fr: 'Inscrit le', en: 'Registered on' },
    colActions: { fr: 'Actions', en: 'Actions' },
    sortLabel: { fr: 'Trier par', en: 'Sort by' },
    statusActive: { fr: 'Actif', en: 'Active' },
    statusInactive: { fr: 'Inactif', en: 'Inactive' },
    edit: { fr: 'Modifier', en: 'Edit' },
    activate: { fr: 'Activer', en: 'Activate' },
    deactivate: { fr: 'Désactiver', en: 'Deactivate' },
    delete: { fr: 'Supprimer', en: 'Delete' },
    paginationLabel: { fr: 'Utilisateurs', en: 'Users' },
    countHint_one: {
      fr: '{{count}} utilisateur — clic sur un en-tête pour trier.',
      en: '{{count}} user — click a header to sort.',
    },
    countHint_other: {
      fr: '{{count}} utilisateurs — clic sur un en-tête pour trier.',
      en: '{{count}} users — click a header to sort.',
    },
    updatedToast: { fr: 'Utilisateur mis à jour.', en: 'User updated.' },
    updateError: { fr: 'Échec de la mise à jour.', en: 'Update failed.' },
    activatedToast: { fr: 'Compte activé.', en: 'Account activated.' },
    deactivatedToast: { fr: 'Compte désactivé.', en: 'Account deactivated.' },
    confirmDelete: {
      fr: 'Supprimer le compte de {{name}} ?',
      en: 'Delete {{name}}’s account?',
    },
    deletedToast: { fr: 'Compte supprimé.', en: 'Account deleted.' },
    deleteError: { fr: 'Échec de la suppression.', en: 'Failed to delete.' },
    editTitle: { fr: 'Modifier l’utilisateur', en: 'Edit user' },
    firstName: { fr: 'Prénom', en: 'First name' },
    lastName: { fr: 'Nom', en: 'Last name' },
    email: { fr: 'Email', en: 'Email' },
    phone: { fr: 'Téléphone', en: 'Phone' },
    roleLabel: { fr: 'Rôle', en: 'Role' },
    cancel: { fr: 'Annuler', en: 'Cancel' },
    saving: { fr: 'Enregistrement…', en: 'Saving…' },
    save: { fr: 'Enregistrer', en: 'Save' },
    roles: {
      locataire: { fr: 'Locataire', en: 'Renter' },
      proprietaire: { fr: 'Propriétaire', en: 'Owner' },
      admin: { fr: 'Admin', en: 'Admin' },
    },
  },

  adminBookings: {
    title: { fr: 'Réservations', en: 'Bookings' },
    subtitle: {
      fr: 'Vue globale des réservations, annulation et gestion des litiges.',
      en: 'Global view of bookings, cancellation and dispute management.',
    },
    tabBookings: { fr: 'Réservations', en: 'Bookings' },
    tabDisputes: { fr: 'Litiges', en: 'Disputes' },
    searchPlaceholder: {
      fr: 'Rechercher (locataire, bateau)…',
      en: 'Search (renter, boat)…',
    },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    emptyBookings: { fr: 'Aucune réservation.', en: 'No booking.' },
    emptyDisputes: { fr: 'Aucun litige.', en: 'No dispute.' },
    loadError: { fr: 'Erreur de chargement.', en: 'Failed to load.' },
    genericError: { fr: 'Échec.', en: 'Failed.' },
    cancelPrompt: { fr: 'Motif de l’annulation :', en: 'Cancellation reason:' },
    cancelDefault: {
      fr: 'Annulée par un administrateur.',
      en: 'Cancelled by an administrator.',
    },
    cancelledToast: { fr: 'Réservation annulée.', en: 'Booking cancelled.' },
    cancelBooking: { fr: 'Annuler la réservation', en: 'Cancel the booking' },
    openDisputes: { fr: '{{count}} ouvert(s)', en: '{{count}} open' },
    paginationBookings: { fr: 'Réservations', en: 'Bookings' },
    paginationDisputes: { fr: 'Litiges', en: 'Disputes' },
    photoAlt: { fr: 'Photo jointe au litige', en: 'Photo attached to the dispute' },
    resolutionPrefix: { fr: 'Résolution : {{text}}', en: 'Resolution: {{text}}' },
    disputeResolve: { fr: 'Résoudre', en: 'Resolve' },
    disputeReject: { fr: 'Rejeter', en: 'Reject' },
    colRenter: { fr: 'Locataire', en: 'Renter' },
    colBoat: { fr: 'Bateau', en: 'Boat' },
    colDates: { fr: 'Dates', en: 'Dates' },
    colAmount: { fr: 'Montant', en: 'Amount' },
    colStatus: { fr: 'Statut', en: 'Status' },
    colDisputes: { fr: 'Litiges', en: 'Disputes' },
    colAction: { fr: 'Action', en: 'Action' },
    colBooking: { fr: 'Réservation', en: 'Booking' },
    colReason: { fr: 'Motif', en: 'Reason' },
    colOpenedBy: { fr: 'Ouvert par', en: 'Opened by' },
    colActions: { fr: 'Actions', en: 'Actions' },
    modalResolveTitle: { fr: 'Résoudre le litige', en: 'Resolve the dispute' },
    modalRejectTitle: { fr: 'Rejeter le litige', en: 'Reject the dispute' },
    resolutionNote: {
      fr: 'Note de résolution (optionnel)',
      en: 'Resolution note (optional)',
    },
    rejectReason: { fr: 'Motif du rejet (optionnel)', en: 'Rejection reason (optional)' },
    decisionPlaceholder: { fr: 'Détaillez la décision…', en: 'Detail the decision…' },
    noPayment: {
      fr: 'Aucun paiement réussi rattaché à cette réservation : remboursement indisponible.',
      en: 'No successful payment attached to this booking: refund unavailable.',
    },
    refundRenter: { fr: 'Rembourser le locataire', en: 'Refund the renter' },
    refundPercent: { fr: 'Pourcentage à rembourser', en: 'Percentage to refund' },
    refundCommission: {
      fr: 'Rembourser aussi la commission ({{amount}})',
      en: 'Also refund the commission ({{amount}})',
    },
    amountPaid: { fr: 'Montant payé', en: 'Amount paid' },
    commission: { fr: 'Commission', en: 'Commission' },
    commissionIncluded: { fr: 'incluse', en: 'included' },
    commissionKept: { fr: 'conservée', en: 'kept' },
    refund: { fr: 'Remboursement', en: 'Refund' },
    cancel: { fr: 'Annuler', en: 'Cancel' },
    modalResolve: { fr: 'Résoudre', en: 'Resolve' },
    modalReject: { fr: 'Rejeter', en: 'Reject' },
    disputeResolvedRefundToast: {
      fr: 'Litige résolu — {{amount}} remboursé(s).',
      en: 'Dispute resolved — {{amount}} refunded.',
    },
    disputeResolvedToast: { fr: 'Litige résolu.', en: 'Dispute resolved.' },
    disputeRejectedToast: { fr: 'Litige rejeté.', en: 'Dispute rejected.' },
    disputeStatus: {
      open: { fr: 'Ouvert', en: 'Open' },
      resolved: { fr: 'Résolu', en: 'Resolved' },
      rejected: { fr: 'Rejeté', en: 'Rejected' },
    },
    bookingFilters: {
      all: { fr: 'Toutes', en: 'All' },
      pending: { fr: 'En attente', en: 'Pending' },
      confirmed: { fr: 'Confirmées', en: 'Confirmed' },
      refused: { fr: 'Refusées', en: 'Refused' },
      cancelled: { fr: 'Annulées', en: 'Cancelled' },
    },
    disputeFilters: {
      open: { fr: 'Ouverts', en: 'Open' },
      all: { fr: 'Tous', en: 'All' },
      resolved: { fr: 'Résolus', en: 'Resolved' },
      rejected: { fr: 'Rejetés', en: 'Rejected' },
    },
  },

  proprietaireBoatForm: {
    pageTitleCreate: { fr: 'Publier un bateau — SailingLoc', en: 'List a boat — SailingLoc' },
    pageTitleEdit: { fr: 'Modifier mon bateau — SailingLoc', en: 'Edit my boat — SailingLoc' },
    titleCreate: { fr: 'Publier un bateau', en: 'List a boat' },
    titleEditDraft: { fr: 'Modifier mon brouillon', en: 'Edit my draft' },
    titleEdit: { fr: 'Modifier mon annonce', en: 'Edit my listing' },
    subtitleCreate: {
      fr: 'Décrivez votre bateau : l’annonce sera vérifiée par notre équipe avant publication.',
      en: 'Describe your boat: the listing will be reviewed by our team before publication.',
    },
    subtitleDraft: {
      fr: 'Complétez votre brouillon, puis soumettez-le pour validation quand il est prêt.',
      en: 'Complete your draft, then submit it for review when ready.',
    },
    subtitlePublished: {
      fr: 'Prix, port et disponibilités s’appliquent immédiatement. Toute autre modification enverra l’annonce en revalidation par notre équipe.',
      en: 'Price, marina and availability apply immediately. Any other change will send the listing back for review by our team.',
    },
    subtitleEdit: {
      fr: 'Après modification, l’annonce sera (re)soumise à la validation de notre équipe.',
      en: 'After editing, the listing will be (re)submitted for our team’s approval.',
    },
    types: {
      voilier: { fr: 'Voilier', en: 'Sailboat' },
      catamaran: { fr: 'Catamaran', en: 'Catamaran' },
      moteur: { fr: 'Bateau à moteur', en: 'Motorboat' },
      peniche: { fr: 'Péniche', en: 'Barge' },
      trimaran: { fr: 'Trimaran', en: 'Trimaran' },
      hors_bord: { fr: 'Hors-bord', en: 'Outboard' },
      jet_ski: { fr: 'Jet-ski', en: 'Jet ski' },
      gulet: { fr: 'Gulet', en: 'Gulet' },
    },
    featuresTitle: { fr: 'Caractéristiques', en: 'Features' },
    homePortTitle: { fr: 'Port d’attache', en: 'Home marina' },
    skipperOffered: { fr: 'Skipper proposé', en: 'Skipper offered' },
    skipperHint: {
      fr: '(CV marin requis dans Mes documents)',
      en: '(sailing CV required in My documents)',
    },
    addPhoto: { fr: '+ Ajouter', en: '+ Add' },
    addDoc: {
      fr: '+ Ajouter l’acte de francisation (sera vérifié)',
      en: '+ Add the registration certificate (will be reviewed)',
    },
    addPeriod: { fr: '+ Ajouter une période', en: '+ Add a period' },
    removePeriod: { fr: 'Supprimer la période {{n}}', en: 'Remove period {{n}}' },
    nameLabel: { fr: 'Nom du bateau *', en: 'Boat name *' },
    namePlaceholder: { fr: 'Ex. : Le Mistral', en: 'E.g. Le Mistral' },
    typeLabel: { fr: 'Type *', en: 'Type *' },
    registrationLabel: { fr: 'Immatriculation *', en: 'Registration *' },
    registrationPlaceholder: { fr: 'Ex. : FR-MRS-042', en: 'E.g. FR-MRS-042' },
    registrationHint: {
      fr: 'Format : XX-XXX-000 (pays, port, numéro).',
      en: 'Format: XX-XXX-000 (country, marina, number).',
    },
    registrationTitle: {
      fr: 'Format : 2 lettres (pays), 3 lettres (port), 3 chiffres — ex. FR-MRS-042',
      en: 'Format: 2 letters (country), 3 letters (marina), 3 digits — e.g. FR-MRS-042',
    },
    lengthLabel: { fr: 'Taille (mètres) *', en: 'Length (metres) *' },
    capacityLabel: { fr: 'Capacité (personnes) *', en: 'Capacity (people) *' },
    priceLabel: { fr: 'Prix par jour (€) *', en: 'Price per day (€) *' },
    buildYearLabel: { fr: 'Année de construction', en: 'Year built' },
    notSpecified: { fr: 'Non renseignée', en: 'Not specified' },
    engineLabel: { fr: 'Motorisation', en: 'Engine' },
    enginePlaceholder: { fr: 'Ex. : Diesel 30cv', en: 'E.g. Diesel 30hp' },
    descriptionLabel: { fr: 'Description', en: 'Description' },
    descriptionPlaceholder: {
      fr: 'Présentez votre bateau aux locataires…',
      en: 'Introduce your boat to renters…',
    },
    licenseRequired: { fr: 'Permis bateau requis', en: 'Boating licence required' },
    portLabel: { fr: 'Port *', en: 'Marina *' },
    portPlaceholder: { fr: 'Ex. : Port de Marseille', en: 'E.g. Port de Marseille' },
    portRequired: {
      fr: 'Sélectionnez un port d’attache dans la liste.',
      en: 'Select a home marina from the list.',
    },
    portSelected: {
      fr: '✓ Port sélectionné : {{name}} ({{city}})',
      en: '✓ Marina selected: {{name}} ({{city}})',
    },
    portSelectHint: {
      fr: 'Sélectionnez un port dans la liste.',
      en: 'Select a marina from the list.',
    },
    photosTitle: { fr: 'Photos', en: 'Photos' },
    photosHint: {
      fr: 'Jusqu’à {{max}} photos (JPG, PNG ou WebP, 5 Mo max chacune). La première sera la photo principale de l’annonce.',
      en: 'Up to {{max}} photos (JPG, PNG or WebP, 5 MB max each). The first one will be the listing’s main photo.',
    },
    chooseOption: { fr: '— Choisir —', en: '— Select —' },
    docStatusInline: {
      pending: { fr: 'en attente de vérification', en: 'awaiting review' },
      validated: { fr: 'validé', en: 'approved' },
      refused: { fr: 'refusé', en: 'refused' },
    },
    mainPhoto: { fr: 'Principale', en: 'Main' },
    removePhoto: { fr: 'Supprimer la photo {{n}}', en: 'Remove photo {{n}}' },
    documentsTitle: { fr: 'Documents du bateau', en: 'Boat documents' },
    documentsHint: {
      fr: 'Acte de francisation (carte d’enregistrement du bateau) — PDF, JPG ou PNG, 5 Mo max. Il sera vérifié par notre équipe et n’est jamais visible des locataires.',
      en: 'Registration certificate (boat registration card) — PDF, JPG or PNG, 5 MB max. It will be reviewed by our team and is never visible to renters.',
    },
    docValidated: { fr: 'Validé', en: 'Approved' },
    docRefused: { fr: 'Refusé', en: 'Refused' },
    docPending: { fr: 'En attente de vérification', en: 'Awaiting review' },
    replaceDoc: {
      fr: 'Remplacer l’acte de francisation (sera vérifié)',
      en: 'Replace the registration certificate (will be reviewed)',
    },
    willBeReviewedInline: {
      fr: '(sera vérifié par notre équipe)',
      en: '(will be reviewed by our team)',
    },
    uploadNewInline: {
      fr: 'ou en déposer un nouveau (sera vérifié)',
      en: 'or upload a new one (will be reviewed)',
    },
    removeDoc: { fr: 'Retirer', en: 'Remove' },
    useExistingDoc: {
      fr: 'Utiliser un acte de francisation déjà déposé',
      en: 'Use a registration certificate already uploaded',
    },
    docTip: {
      fr: 'Astuce : les actes de francisation déposés dans',
      en: 'Tip: certificates uploaded in',
    },
    docTipEnd: {
      fr: 'sont réutilisables ici — chacun ne peut être rattaché qu’à une seule annonce.',
      en: 'can be reused here — each one can only be linked to a single listing.',
    },
    myDocuments: { fr: 'Mes documents', en: 'My documents' },
    availabilityTitle: { fr: 'Disponibilités', en: 'Availability' },
    availabilityHint: {
      fr: 'Périodes pendant lesquelles le bateau peut être loué. Le prix spécifique remplace le prix par jour sur la période (haute saison, promotion…).',
      en: 'Periods when the boat can be rented. The specific price overrides the daily price for that period (high season, promotion…).',
    },
    from: { fr: 'Du', en: 'From' },
    to: { fr: 'Au', en: 'To' },
    specificPrice: { fr: 'Prix spécifique (€)', en: 'Specific price (€)' },
    note: { fr: 'Note', en: 'Note' },
    optional: { fr: 'Optionnel', en: 'Optional' },
    cancel: { fr: 'Annuler', en: 'Cancel' },
    saveDraft: { fr: 'Enregistrer en brouillon', en: 'Save as draft' },
    sending: { fr: 'Envoi…', en: 'Sending…' },
    submitForReview: { fr: 'Soumettre pour validation', en: 'Submit for review' },
    saveChanges: { fr: 'Enregistrer les modifications', en: 'Save changes' },
    resubmit: { fr: 'Soumettre à nouveau', en: 'Submit again' },
    draftNotFound: { fr: 'Brouillon introuvable.', en: 'Draft not found.' },
    draftSaved: { fr: 'Brouillon enregistré.', en: 'Draft saved.' },
    listingUpdated: { fr: 'Annonce mise à jour.', en: 'Listing updated.' },
    listingResubmitted: {
      fr: 'Annonce envoyée en revalidation : elle sera de nouveau visible après vérification.',
      en: 'Listing sent for re-review: it will be visible again after verification.',
    },
    listingSubmitted: {
      fr: 'Annonce soumise ! Elle sera visible après validation par notre équipe.',
      en: 'Listing submitted! It will be visible after our team approves it.',
    },
    genericError: { fr: 'Une erreur est survenue.', en: 'Something went wrong.' },
  },

  proprietaireRevenus: {
    pageTitle: { fr: 'Mes revenus — SailingLoc', en: 'My earnings — SailingLoc' },
    title: { fr: 'Mes revenus', en: 'My earnings' },
    subtitle: {
      fr: 'Historique des transactions sur vos bateaux, commissions SailingLoc déduites.',
      en: 'Transaction history on your boats, SailingLoc commission deducted.',
    },
    loadError: { fr: 'Erreur de chargement des revenus.', en: 'Failed to load earnings.' },
    genericError: { fr: 'Une erreur est survenue.', en: 'Something went wrong.' },
    status: {
      pending: { fr: 'En attente', en: 'Pending' },
      success: { fr: 'Encaissé', en: 'Received' },
      failed: { fr: 'Échoué', en: 'Failed' },
      refunded: { fr: 'Remboursé', en: 'Refunded' },
    },
    method: {
      card: { fr: 'Carte bancaire', en: 'Card' },
      bank_transfer: { fr: 'Virement', en: 'Bank transfer' },
    },
    filters: {
      all: { fr: 'Tous', en: 'All' },
      success: { fr: 'Encaissés', en: 'Received' },
      pending: { fr: 'En attente', en: 'Pending' },
      refunded: { fr: 'Remboursés', en: 'Refunded' },
      failed: { fr: 'Échoués', en: 'Failed' },
    },
    filterAria: { fr: 'Filtrer par statut', en: 'Filter by status' },
    periodLabel: { fr: 'Période', en: 'Period' },
    periods: {
      all: { fr: 'Depuis le début', en: 'All time' },
      '12m': { fr: '12 derniers mois', en: 'Last 12 months' },
      year: { fr: 'Année en cours', en: 'This year' },
      '30d': { fr: '30 derniers jours', en: 'Last 30 days' },
    },
    stripe: {
      title: { fr: 'Virements de vos revenus', en: 'Payouts of your earnings' },
      onboarded: {
        fr: 'Compte Stripe configuré : vos revenus vous sont reversés automatiquement (90 % du montant, commission SailingLoc déduite).',
        en: 'Stripe account set up: your earnings are paid out automatically (90% of the amount, SailingLoc commission deducted).',
      },
      incomplete: {
        fr: 'Configuration Stripe incomplète : reprenez-la pour activer vos virements.',
        en: 'Stripe setup incomplete: resume it to enable your payouts.',
      },
      notStarted: {
        fr: 'Configurez vos virements chez Stripe (coordonnées bancaires collectées par Stripe, jamais par SailingLoc).',
        en: 'Set up your payouts with Stripe (bank details collected by Stripe, never by SailingLoc).',
      },
      enabled: { fr: '✓ Virements activés', en: '✓ Payouts enabled' },
      opening: { fr: 'Ouverture…', en: 'Opening…' },
      manage: { fr: 'Gérer mon compte Stripe', en: 'Manage my Stripe account' },
      redirecting: { fr: 'Redirection…', en: 'Redirecting…' },
      resume: { fr: 'Reprendre la configuration', en: 'Resume setup' },
      setup: { fr: 'Configurer mes virements', en: 'Set up my payouts' },
    },
    totalsAria: { fr: 'Totaux des revenus', en: 'Earnings totals' },
    netEarnings: { fr: 'Revenus nets', en: 'Net earnings' },
    grossAmount: { fr: 'Montant brut', en: 'Gross amount' },
    commissions: { fr: 'Commissions déduites', en: 'Commission deducted' },
    commissionHint: {
      fr: 'Commission SailingLoc prélevée sur chaque location',
      en: 'SailingLoc commission charged on each rental',
    },
    transactionCount_one: { fr: '{{count}} transaction', en: '{{count}} transaction' },
    transactionCount_other: { fr: '{{count}} transactions', en: '{{count}} transactions' },
    chartMonths: { fr: 'Revenus nets par mois', en: 'Net earnings by month' },
    chartMonthsHint: {
      fr: 'Paiements encaissés, commissions déduites',
      en: 'Received payments, commission deducted',
    },
    chartBoats: { fr: 'Revenus nets par bateau', en: 'Net earnings by boat' },
    chartBoatsHint: {
      fr: 'Du plus rentable au moins rentable',
      en: 'From most to least profitable',
    },
    chartAria: {
      fr: 'Revenus nets par mois : {{series}}',
      en: 'Net earnings by month: {{series}}',
    },
    barAria: { fr: '{{month}} : {{value}} nets', en: '{{month}}: {{value}} net' },
    otherBoats: { fr: 'Autres', en: 'Others' },
    otherBoat: { fr: 'Autre', en: 'Other' },
    history: { fr: 'Historique des transactions', en: 'Transaction history' },
    historyCount: { fr: '{{shown}} sur {{total}}', en: '{{shown}} of {{total}}' },
    emptyAll: {
      fr: 'Aucune transaction sur vos bateaux pour le moment.',
      en: 'No transaction on your boats yet.',
    },
    emptyFilter: {
      fr: 'Aucune transaction ne correspond à ces filtres.',
      en: 'No transaction matches these filters.',
    },
    table: {
      date: { fr: 'Date', en: 'Date' },
      rental: { fr: 'Location', en: 'Rental' },
      method: { fr: 'Moyen', en: 'Method' },
      gross: { fr: 'Brut', en: 'Gross' },
      commission: { fr: 'Commission', en: 'Commission' },
      net: { fr: 'Net', en: 'Net' },
      status: { fr: 'Statut', en: 'Status' },
    },
    refundedAmount: { fr: 'Remboursé : {{amount}}', en: 'Refunded: {{amount}}' },
    paginationRange: {
      fr: 'Transactions {{first}} à {{last}} sur {{total}}',
      en: 'Transactions {{first}} to {{last}} of {{total}}',
    },
  },

  proprietaireReservations: {
    pageTitle: { fr: 'Mes réservations — SailingLoc', en: 'My bookings — SailingLoc' },
    title: { fr: 'Mes réservations', en: 'My bookings' },
    subtitle: {
      fr: 'Historique des demandes sur vos bateaux : confirmez, refusez ou annulez.',
      en: 'History of requests on your boats: confirm, refuse or cancel.',
    },
    loadError: {
      fr: 'Erreur de chargement des réservations.',
      en: 'Failed to load bookings.',
    },
    statusFilterAria: { fr: 'Filtrer par statut', en: 'Filter by status' },
    periodFilterAria: { fr: 'Filtrer par période', en: 'Filter by period' },
    filters: {
      all: { fr: 'Toutes', en: 'All' },
      pending: { fr: 'En attente', en: 'Pending' },
      confirmed: { fr: 'Confirmées', en: 'Confirmed' },
      cancelled: { fr: 'Annulées', en: 'Cancelled' },
      refused: { fr: 'Refusées', en: 'Refused' },
    },
    periods: {
      all: { fr: 'Toutes périodes', en: 'All periods' },
      upcoming: { fr: 'À venir', en: 'Upcoming' },
      current: { fr: 'En cours', en: 'Ongoing' },
      past: { fr: 'Passées', en: 'Past' },
    },
    openDispute: { fr: 'Litige en cours', en: 'Open dispute' },
    paidToValidate: { fr: 'Payée — à valider', en: 'Paid — to approve' },
    awaitingPayment: { fr: 'En attente de paiement', en: 'Awaiting payment' },
    bookedOn: { fr: 'Réservée le', en: 'Booked on' },
    cancellationLabel: { fr: 'Annulation :', en: 'Cancellation:' },
    cancellationDate: { fr: ' (le {{date}})', en: ' (on {{date}})' },
    confirm: { fr: 'Confirmer', en: 'Confirm' },
    refuse: { fr: 'Refuser', en: 'Refuse' },
    cancelBooking: { fr: 'Annuler la réservation', en: 'Cancel booking' },
    reportProblem: { fr: 'Signaler un problème', en: 'Report a problem' },
    viewLocataire: {
      fr: 'Voir le profil et les documents du locataire',
      en: "View the guest's profile and documents",
    },
    locataire: {
      title: { fr: 'Profil du locataire', en: 'Guest profile' },
      loading: { fr: 'Chargement…', en: 'Loading…' },
      phone: { fr: 'Téléphone', en: 'Phone' },
      noPhone: { fr: 'Non renseigné', en: 'Not provided' },
      memberSince: { fr: 'Membre depuis', en: 'Member since' },
      sendMessage: { fr: 'Envoyer un message', en: 'Send a message' },
      documents: { fr: 'Documents', en: 'Documents' },
      noDocuments: {
        fr: 'Aucun document déposé par le locataire.',
        en: 'The guest has not uploaded any document.',
      },
      view: { fr: 'Voir', en: 'View' },
      loadError: {
        fr: 'Impossible de charger le profil du locataire.',
        en: 'Could not load the guest profile.',
      },
      fileError: {
        fr: 'Impossible d’ouvrir le document.',
        en: 'Could not open the document.',
      },
      close: { fr: 'Fermer', en: 'Close' },
    },
    emptyAll: {
      fr: 'Aucune réservation reçue sur vos bateaux pour le moment.',
      en: 'No booking received on your boats yet.',
    },
    emptyFilter: {
      fr: 'Aucune réservation pour ce filtre.',
      en: 'No booking for this filter.',
    },
    modal: {
      refuseTitle: { fr: 'Refuser la demande', en: 'Refuse the request' },
      disputeTitle: { fr: 'Signaler un problème', en: 'Report a problem' },
      cancelTitle: { fr: 'Annuler la réservation', en: 'Cancel the booking' },
      range: { fr: ', du {{start}} au {{end}}.', en: ', from {{start}} to {{end}}.' },
      describeProblem: { fr: 'Décrivez le problème', en: 'Describe the problem' },
      cancelReasonLabel: {
        fr: 'Motif de l’annulation (optionnel)',
        en: 'Cancellation reason (optional)',
      },
      photosLabel: { fr: 'Photos (optionnel, 5 max)', en: 'Photos (optional, 5 max)' },
      removePhoto: { fr: 'Retirer la photo', en: 'Remove photo' },
      addPhotos: { fr: 'Ajouter des photos', en: 'Add photos' },
      disputePlaceholder: {
        fr: 'Ex. : bateau rendu endommagé, caution à retenir…',
        en: 'E.g. boat returned damaged, deposit to be withheld…',
      },
      cancelPlaceholder: {
        fr: 'Ex. : bateau indisponible suite à une avarie…',
        en: 'E.g. boat unavailable following a breakdown…',
      },
      refuseNotice: {
        fr: 'Le locataire sera informé du refus par email. Son paiement en attente sera annulé : aucun montant ne lui sera prélevé.',
        en: 'The renter will be notified of the refusal by email. Their pending payment will be cancelled: no amount will be charged.',
      },
      disputeNotice: {
        fr: 'Votre signalement ouvrira un litige, examiné par l’équipe SailingLoc.',
        en: 'Your report will open a dispute, reviewed by the SailingLoc team.',
      },
      cancelNotice: {
        fr: 'Le locataire sera informé de l’annulation par email, avec ce motif.',
        en: 'The renter will be notified of the cancellation by email, with this reason.',
      },
      back: { fr: 'Retour', en: 'Back' },
      sending: { fr: 'Envoi…', en: 'Sending…' },
      sendReport: { fr: 'Envoyer le signalement', en: 'Send report' },
      confirmCancel: { fr: 'Confirmer l’annulation', en: 'Confirm cancellation' },
    },
    describeProblemError: {
      fr: 'Décrivez le problème rencontré.',
      en: 'Please describe the problem.',
    },
    reportSent: { fr: 'Signalement envoyé.', en: 'Report sent.' },
    confirmed: {
      fr: 'Réservation confirmée, paiement encaissé.',
      en: 'Booking confirmed, payment captured.',
    },
    refused: { fr: 'Demande refusée, paiement annulé.', en: 'Request refused, payment cancelled.' },
    cancelled: { fr: 'Réservation annulée.', en: 'Booking cancelled.' },
    genericError: { fr: 'Une erreur est survenue.', en: 'Something went wrong.' },
  },

  proprietaireAccount: {
    pageTitle: { fr: 'Mon compte — SailingLoc', en: 'My account — SailingLoc' },
    title: { fr: 'Mon compte', en: 'My account' },
    subtitle: {
      fr: 'Bonjour {{name}}, gérez vos informations personnelles et votre mot de passe.',
      en: 'Hello {{name}}, manage your personal details and password.',
    },
  },

  proprietaireDocuments: {
    pageTitle: { fr: 'Mes documents — SailingLoc', en: 'My documents — SailingLoc' },
    title: { fr: 'Mes documents', en: 'My documents' },
    subtitle: {
      fr: 'Déposez vos documents (PDF, JPG ou PNG, 5 Mo max) : ils seront vérifiés par notre équipe. Les actes de francisation déposés ici sont réutilisables dans vos annonces.',
      en: 'Upload your documents (PDF, JPG or PNG, 5 MB max): our team will review them. Registration certificates uploaded here can be reused in your listings.',
    },
    counts: {
      fr: '{{provided}} / {{total}} types fournis',
      en: '{{provided}} / {{total}} types provided',
    },
  },

  proprietaireMessages: {
    pageTitle: { fr: 'Messagerie — SailingLoc', en: 'Messages — SailingLoc' },
    title: { fr: 'Messagerie', en: 'Messages' },
    subtitle: {
      fr: 'Échangez avec les locataires de vos bateaux et le support SailingLoc.',
      en: 'Chat with the renters of your boats and SailingLoc support.',
    },
  },

  pagination: {
    previous: { fr: 'Précédent', en: 'Previous' },
    next: { fr: 'Suivant', en: 'Next' },
    page: { fr: 'Page {{n}}', en: 'Page {{n}}' },
    aria: { fr: 'Pagination — {{label}}', en: 'Pagination — {{label}}' },
    range: {
      fr: '{{label}} {{first}} à {{last}} sur {{total}}',
      en: '{{label}} {{first}} to {{last}} of {{total}}',
    },
  },

  proprietaireBoats: {
    pageTitle: { fr: 'Mes bateaux — SailingLoc', en: 'My boats — SailingLoc' },
    title: { fr: 'Mes bateaux', en: 'My boats' },
    subtitle: {
      fr: 'Vos annonces et leur statut : brouillon, en attente de validation, publiée ou refusée.',
      en: 'Your listings and their status: draft, pending approval, published or refused.',
    },
    addBoat: { fr: '+ Ajouter un bateau', en: '+ Add a boat' },
    loadError: { fr: 'Erreur de chargement des bateaux.', en: 'Failed to load boats.' },
    filterAria: { fr: 'Filtrer par statut', en: 'Filter by status' },
    status: {
      draft: { fr: 'Brouillon', en: 'Draft' },
      pending: { fr: 'En attente', en: 'Pending' },
      published: { fr: 'Publié', en: 'Published' },
      refused: { fr: 'Refusé', en: 'Refused' },
    },
    filters: {
      all: { fr: 'Tous', en: 'All' },
      draft: { fr: 'Brouillons', en: 'Drafts' },
      pending: { fr: 'En attente', en: 'Pending' },
      published: { fr: 'Publiés', en: 'Published' },
      refused: { fr: 'Refusés', en: 'Refused' },
    },
    noPhoto: { fr: 'Pas encore de photo', en: 'No photo yet' },
    boatAlt: { fr: 'Bateau {{name}}', en: 'Boat {{name}}' },
    pricePerDay: { fr: 'Prix / jour', en: 'Price / day' },
    capacity: { fr: 'Capacité', en: 'Capacity' },
    people: { fr: '{{count}} pers.', en: '{{count}} people' },
    pendingBookings_one: {
      fr: '{{count}} demande de réservation en attente',
      en: '{{count}} pending booking request',
    },
    pendingBookings_other: {
      fr: '{{count}} demandes de réservation en attente',
      en: '{{count}} pending booking requests',
    },
    refusedNotice: {
      fr: 'Annonce retirée par la modération : modifiez-la pour la soumettre à nouveau.',
      en: 'Listing removed by moderation: edit it to submit it again.',
    },
    editDraft: { fr: 'Modifier le brouillon', en: 'Edit draft' },
    edit: { fr: 'Modifier', en: 'Edit' },
    delete: { fr: 'Supprimer', en: 'Delete' },
    emptyAll: {
      fr: 'Aucun bateau pour l’instant. Cliquez sur « Ajouter un bateau » pour créer votre première annonce.',
      en: 'No boat yet. Click “Add a boat” to create your first listing.',
    },
    emptyFilter: { fr: 'Aucun bateau pour ce filtre.', en: 'No boat for this filter.' },
    paginationLabel: { fr: 'Bateaux', en: 'Boats' },
    draftDeleted: { fr: 'Brouillon supprimé.', en: 'Draft deleted.' },
    listingDeleted: { fr: 'Annonce supprimée.', en: 'Listing deleted.' },
    genericError: { fr: 'Une erreur est survenue.', en: 'Something went wrong.' },
    deleteDraftTitle: { fr: 'Supprimer le brouillon', en: 'Delete draft' },
    deleteListingTitle: { fr: 'Supprimer l’annonce', en: 'Delete listing' },
    deletePublishedWarning: {
      fr: 'L’annonce ne sera plus visible des locataires. Cette action est définitive.',
      en: 'The listing will no longer be visible to renters. This action is permanent.',
    },
    deleteWarning: { fr: 'Cette action est définitive.', en: 'This action is permanent.' },
    back: { fr: 'Retour', en: 'Back' },
    deleting: { fr: 'Suppression…', en: 'Deleting…' },
    deleteConfirm: { fr: 'Supprimer définitivement', en: 'Delete permanently' },
  },

  proprietaireDashboard: {
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
    kpisTitle: { fr: 'Indicateurs clés', en: 'Key figures' },
    statLoading: { fr: '{{label}} : chargement en cours', en: '{{label}}: loading' },
    statValue: { fr: '{{label}} : {{value}}', en: '{{label}}: {{value}}' },
    publishedBoats: { fr: 'Bateaux publiés', en: 'Published boats' },
    pendingBookings: { fr: 'Réservations à confirmer', en: 'Bookings to confirm' },
    monthRevenue: { fr: 'Revenus du mois', en: 'This month’s earnings' },
    recentBookings: { fr: 'Dernières réservations', en: 'Latest bookings' },
    seeAll: { fr: 'Tout voir', en: 'See all' },
    noBookings: {
      fr: 'Vous n’avez pas encore de réservation sur vos bateaux.',
      en: 'You have no bookings on your boats yet.',
    },
    myBoats: { fr: 'Mes bateaux', en: 'My boats' },
    noBoats: {
      fr: 'Aucun bateau publié pour l’instant. Ajoutez votre premier bateau !',
      en: 'No published boat yet. Add your first boat!',
    },
    boatAlt: { fr: 'Bateau {{name}}', en: 'Boat {{name}}' },
    perDay: { fr: '{{price}} / jour', en: '{{price}} / day' },
  },

  proprietaireReviews: {
    pageTitle: { fr: 'Avis reçus — SailingLoc', en: 'Reviews received — SailingLoc' },
    title: { fr: 'Avis reçus', en: 'Reviews received' },
    subtitle: {
      fr: 'Les avis reçus sur vos bateaux, y compris ceux en attente de validation. Répondez-y publiquement.',
      en: 'Reviews received on your boats, including those awaiting validation. Reply to them publicly.',
    },
    loadError: {
      fr: 'Impossible de charger vos avis. Veuillez réessayer.',
      en: 'Could not load your reviews. Please try again.',
    },
    empty: {
      fr: 'Aucun avis reçu sur vos bateaux pour le moment.',
      en: 'No review received on your boats yet.',
    },
    emptyFilter: { fr: 'Aucun avis pour ce filtre.', en: 'No review for this filter.' },
    filterAria: { fr: 'Filtrer les avis par statut', en: 'Filter reviews by status' },
    filters: {
      all: { fr: 'Tous', en: 'All' },
      validated: { fr: 'Validés', en: 'Validated' },
      pending: { fr: 'En attente', en: 'Pending' },
    },
    status: {
      validated: { fr: 'Validé', en: 'Validated' },
      pending: { fr: 'En attente', en: 'Pending' },
    },
    replyLabel: { fr: 'Votre réponse', en: 'Your reply' },
    replyPlaceholder: {
      fr: 'Remerciez le locataire ou apportez une précision…',
      en: 'Thank the guest or add a clarification…',
    },
    reply: { fr: 'Répondre', en: 'Reply' },
    sending: { fr: 'Envoi…', en: 'Sending…' },
    yourReply: { fr: 'Votre réponse', en: 'Your reply' },
    edit: { fr: 'Modifier', en: 'Edit' },
    cancel: { fr: 'Annuler', en: 'Cancel' },
    replySent: { fr: 'Votre réponse a été publiée.', en: 'Your reply has been published.' },
    replyError: {
      fr: 'L’envoi de la réponse a échoué. Veuillez réessayer.',
      en: 'Sending the reply failed. Please try again.',
    },
  },

  proprietaireLayout: {
    navAria: { fr: 'Navigation espace propriétaire', en: 'Owner area navigation' },
    mySpace: { fr: 'Mon espace', en: 'My space' },
    nav: {
      dashboard: { fr: 'Dashboard', en: 'Dashboard' },
      account: { fr: 'Compte', en: 'Account' },
      documents: { fr: 'Mes documents', en: 'My documents' },
      reservations: { fr: 'Mes réservations', en: 'My bookings' },
      reviews: { fr: 'Avis reçus', en: 'Reviews received' },
      revenues: { fr: 'Mes revenus', en: 'My earnings' },
      boats: { fr: 'Mes bateaux', en: 'My boats' },
      messages: { fr: 'Messagerie', en: 'Messages' },
    },
  },

  locataireLayout: {
    navAria: { fr: 'Navigation espace locataire', en: 'Renter area navigation' },
    mySpace: { fr: 'Mon espace', en: 'My space' },
    nav: {
      dashboard: { fr: 'Dashboard', en: 'Dashboard' },
      account: { fr: 'Compte', en: 'Account' },
      documents: { fr: 'Mes documents', en: 'My documents' },
      reservations: { fr: 'Mes réservations', en: 'My bookings' },
      expenses: { fr: 'Mes dépenses', en: 'My spending' },
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
    periodFilterAria: { fr: 'Filtrer par période', en: 'Filter by period' },
    periodFilters: {
      all: { fr: 'Toutes périodes', en: 'Any time' },
      upcoming: { fr: 'À venir', en: 'Upcoming' },
      current: { fr: 'En cours', en: 'Ongoing' },
      past: { fr: 'Passées', en: 'Past' },
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
    viewProduct: { fr: 'Voir le produit', en: 'View product' },
    paymentBadge: {
      paid: { fr: 'Payée — en attente du propriétaire', en: 'Paid — awaiting owner' },
      refunded: { fr: 'Remboursée', en: 'Refunded' },
      disputeOpen: { fr: 'Litige en cours', en: 'Dispute in progress' },
    },
    actions: {
      review: { fr: 'Laisser un avis', en: 'Leave a review' },
      cancel: { fr: 'Annuler la réservation', en: 'Cancel booking' },
      refund: { fr: 'Demander un remboursement', en: 'Request a refund' },
      dispute: { fr: 'Signaler un problème', en: 'Report an issue' },
    },
    reviewModal: {
      title: { fr: 'Laisser un avis', en: 'Leave a review' },
      ratingLabel: { fr: 'Votre note', en: 'Your rating' },
      starLabel_one: { fr: '{{count}} étoile', en: '{{count}} star' },
      starLabel_other: { fr: '{{count}} étoiles', en: '{{count}} stars' },
      ratingRequired: {
        fr: 'Sélectionnez une note entre 1 et 5 étoiles.',
        en: 'Select a rating between 1 and 5 stars.',
      },
      commentLabel: { fr: 'Votre commentaire', en: 'Your comment' },
      commentPlaceholder: {
        fr: 'Décrivez votre expérience avec ce bateau…',
        en: 'Describe your experience with this boat…',
      },
      commentTooShort: {
        fr: 'Votre commentaire doit contenir au moins 10 caractères.',
        en: 'Your comment must contain at least 10 characters.',
      },
      moderationHint: {
        fr: 'Votre avis apparaîtra publiquement après validation.',
        en: 'Your review will appear publicly after approval.',
      },
      cancel: { fr: 'Annuler', en: 'Cancel' },
      submit: { fr: 'Envoyer mon avis', en: 'Submit my review' },
      submitting: { fr: 'Envoi…', en: 'Submitting…' },
      sent: {
        fr: 'Merci ! Votre avis a été envoyé et sera publié après validation.',
        en: 'Thank you! Your review has been sent and will be published after approval.',
      },
      error: {
        fr: 'L’envoi de votre avis a échoué. Veuillez réessayer.',
        en: 'Submitting your review failed. Please try again.',
      },
    },
    modal: {
      cancelTitle: { fr: 'Annuler la réservation', en: 'Cancel the booking' },
      refundTitle: { fr: 'Demander un remboursement', en: 'Request a refund' },
      cancelHintPaid: {
        fr: 'Le montant encaissé vous sera intégralement remboursé.',
        en: 'The charged amount will be fully refunded to you.',
      },
      cancelHintHold: {
        fr: 'Aucun montant n’a été débité : votre paiement en attente sera simplement annulé.',
        en: 'Nothing has been charged: your pending payment will simply be cancelled.',
      },
      cancelHintNone: {
        fr: 'Aucun montant ne vous a été débité.',
        en: 'Nothing has been charged.',
      },
      cancelReasonLabel: { fr: 'Motif (optionnel)', en: 'Reason (optional)' },
      refundReasonLabel: { fr: 'Motif de la demande', en: 'Reason for the request' },
      refundReasonRequired: {
        fr: 'Indiquez le motif de votre demande.',
        en: 'Please state the reason for your request.',
      },
      refundHint: {
        fr: 'Votre demande sera examinée par l’équipe SailingLoc.',
        en: 'Your request will be reviewed by the SailingLoc team.',
      },
      disputeTitle: { fr: 'Signaler un problème', en: 'Report an issue' },
      disputeReasonLabel: { fr: 'Décrivez le problème', en: 'Describe the issue' },
      disputePhotosLabel: { fr: 'Photos (optionnel, 5 max)', en: 'Photos (optional, 5 max)' },
      disputeAddPhotos: { fr: 'Ajouter des photos', en: 'Add photos' },
      disputeRemovePhoto: { fr: 'Retirer la photo', en: 'Remove photo' },
      disputeHint: {
        fr: 'Votre signalement ouvrira un litige, examiné par l’équipe SailingLoc.',
        en: 'Your report will open a dispute, reviewed by the SailingLoc team.',
      },
      back: { fr: 'Retour', en: 'Back' },
      confirmCancel: { fr: 'Confirmer l’annulation', en: 'Confirm cancellation' },
      submitRefund: { fr: 'Envoyer la demande', en: 'Send request' },
      submitDispute: { fr: 'Envoyer le signalement', en: 'Send report' },
      working: { fr: 'Envoi…', en: 'Sending…' },
    },
    toasts: {
      reviewSubmitted: {
        fr: 'Avis envoyé. Il sera publié après validation.',
        en: 'Review submitted. It will be published after approval.',
      },
      reviewError: { fr: 'Impossible d’envoyer cet avis.', en: 'Unable to submit this review.' },
      cancelled: { fr: 'Réservation annulée.', en: 'Booking cancelled.' },
      cancelledRefunded: {
        fr: 'Réservation annulée — remboursement intégral effectué.',
        en: 'Booking cancelled — fully refunded.',
      },
      refundRequested: { fr: 'Demande de remboursement envoyée.', en: 'Refund request sent.' },
      disputeSent: { fr: 'Signalement envoyé.', en: 'Report sent.' },
      error: { fr: 'Une erreur est survenue.', en: 'Something went wrong.' },
    },
  },

  locataireDepenses: {
    pageTitle: { fr: 'Mes dépenses — SailingLoc', en: 'My spending — SailingLoc' },
    title: { fr: 'Mes dépenses', en: 'My spending' },
    subtitle: {
      fr: 'Historique de vos paiements et remboursements.',
      en: 'History of your payments and refunds.',
    },
    loadError: { fr: 'Erreur de chargement des dépenses.', en: 'Failed to load spending.' },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    empty: { fr: 'Aucun paiement pour le moment.', en: 'No payments yet.' },
    emptyFiltered: { fr: 'Aucun paiement pour ce filtre.', en: 'No payments for this filter.' },
    filterAria: { fr: 'Filtrer par statut', en: 'Filter by status' },
    filters: {
      all: { fr: 'Tous', en: 'All' },
      success: { fr: 'Payés', en: 'Paid' },
      pending: { fr: 'En attente', en: 'Pending' },
      refunded: { fr: 'Remboursés', en: 'Refunded' },
      failed: { fr: 'Annulés / échoués', en: 'Cancelled / failed' },
    },
    periodFilterAria: { fr: 'Filtrer par période', en: 'Filter by period' },
    periodFilters: {
      all: { fr: 'Toutes périodes', en: 'Any time' },
      last30: { fr: '30 derniers jours', en: 'Last 30 days' },
      last180: { fr: '6 derniers mois', en: 'Last 6 months' },
      year: { fr: 'Cette année', en: 'This year' },
    },
    totals: {
      paid: { fr: 'Total payé', en: 'Total paid' },
      refunded: { fr: 'Total remboursé', en: 'Total refunded' },
      net: { fr: 'Dépense nette', en: 'Net spending' },
    },
    status: {
      pending: { fr: 'Empreinte en attente', en: 'Hold pending' },
      success: { fr: 'Payé', en: 'Paid' },
      refunded: { fr: 'Remboursé', en: 'Refunded' },
      failed: { fr: 'Annulé / échoué', en: 'Cancelled / failed' },
    },
    paidOn: { fr: 'Payé le {{date}}', en: 'Paid on {{date}}' },
    stay: { fr: 'Séjour du {{start}} au {{end}}', en: 'Stay from {{start}} to {{end}}' },
    refundedDetail: {
      fr: '{{amount}} remboursés le {{date}}',
      en: '{{amount}} refunded on {{date}}',
    },
    reference: { fr: 'Réf. {{ref}}', en: 'Ref. {{ref}}' },
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
    avatar: {
      alt: { fr: 'Votre photo de profil', en: 'Your profile photo' },
      manage: { fr: 'Gérer la photo de profil', en: 'Manage profile photo' },
      change: { fr: 'Changer la photo', en: 'Change photo' },
      sending: { fr: 'Envoi…', en: 'Uploading…' },
      remove: { fr: 'Supprimer la photo', en: 'Remove photo' },
      hint: {
        fr: 'JPG, PNG ou WebP — 3 Mo max. Sans photo, un avatar est généré automatiquement.',
        en: 'JPG, PNG or WebP — 3 MB max. Without a photo, an avatar is generated automatically.',
      },
      updateSuccess: {
        fr: 'Photo de profil mise à jour.',
        en: 'Profile photo updated.',
      },
      updateError: {
        fr: 'Échec de l’envoi de la photo.',
        en: 'Failed to upload the photo.',
      },
      removeSuccess: {
        fr: 'Photo de profil supprimée.',
        en: 'Profile photo removed.',
      },
      removeError: {
        fr: 'Échec de la suppression.',
        en: 'Failed to remove the photo.',
      },
    },
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
      saveShort: { fr: 'Enregistrer', en: 'Save' },
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

  messenger: {
    roles: {
      locataire: { fr: 'Locataire', en: 'Renter' },
      proprietaire: { fr: 'Propriétaire', en: 'Owner' },
    },
    conversations: { fr: 'Conversations', en: 'Conversations' },
    threadAria: { fr: 'Fil de discussion', en: 'Conversation thread' },
    loading: { fr: 'Chargement…', en: 'Loading…' },
    noConversations: {
      fr: 'Aucune conversation pour le moment.',
      en: 'No conversation yet.',
    },
    you: { fr: 'Vous : ', en: 'You: ' },
    deletedMessage: { fr: 'Message supprimé', en: 'Message deleted' },
    selectConversation: {
      fr: 'Sélectionnez une conversation pour afficher les messages.',
      en: 'Select a conversation to display the messages.',
    },
    resolving: { fr: 'Clôture…', en: 'Closing…' },
    markResolved: { fr: '✔ Marquer comme traité', en: '✔ Mark as handled' },
    noMessages: {
      fr: 'Aucun message pour l’instant : écrivez le premier !',
      en: 'No message yet: write the first one!',
    },
    resolvedMarker: {
      fr: '✔ Demande marquée comme traitée · {{time}}',
      en: '✔ Request marked as handled · {{time}}',
    },
    editMessageLabel: { fr: 'Modifier le message', en: 'Edit the message' },
    saveEdit: { fr: 'Enregistrer la modification', en: 'Save changes' },
    cancelEdit: { fr: 'Annuler la modification', en: 'Cancel editing' },
    edited: { fr: 'modifié', en: 'edited' },
    read: { fr: 'Lu', en: 'Read' },
    sent: { fr: 'Envoyé', en: 'Sent' },
    sentUnread: { fr: 'Envoyé, non lu', en: 'Sent, unread' },
    messageActions: { fr: 'Actions sur le message', en: 'Message actions' },
    edit: { fr: 'Modifier', en: 'Edit' },
    confirmDelete: { fr: 'Confirmer la suppression ?', en: 'Confirm deletion?' },
    deleteForAll: { fr: 'Supprimer pour tout le monde', en: 'Delete for everyone' },
    deleteForMe: { fr: 'Supprimer pour moi', en: 'Delete for me' },
    yourMessage: { fr: 'Votre message', en: 'Your message' },
    placeholder: { fr: 'Écrivez votre message…', en: 'Write your message…' },
    sending: { fr: 'Envoi…', en: 'Sending…' },
    send: { fr: 'Envoyer', en: 'Send' },
    resolveSuccess: {
      fr: 'Demande marquée comme traitée.',
      en: 'Request marked as handled.',
    },
    errors: {
      loadThread: { fr: 'Erreur de chargement du fil.', en: 'Failed to load the thread.' },
      send: { fr: 'Échec de l’envoi.', en: 'Failed to send.' },
      edit: { fr: 'Échec de la modification.', en: 'Failed to edit.' },
      resolve: { fr: 'Échec de l’opération.', en: 'The operation failed.' },
      delete: { fr: 'Échec de la suppression.', en: 'Failed to delete.' },
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
    chooseFile: { fr: 'Choisir un fichier', en: 'Choose a file' },
    noFile: { fr: 'Aucun fichier sélectionné', en: 'No file selected' },
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

  legalLayout: {
    navAria: { fr: 'Documents légaux', en: 'Legal documents' },
    updatedLabel: { fr: 'Dernière mise à jour : {{date}}', en: 'Last updated: {{date}}' },
    disclaimer: {
      fr: "SailingLoc est un projet pédagogique fictif : aucune location, aucun paiement ni aucun engagement contractuel réel n'est possible via ce site. Les présents documents sont rédigés à titre d'exercice et ne constituent pas un conseil juridique.",
      en: 'SailingLoc is a fictional educational project: no real rental, payment or contractual commitment is possible through this site. These documents are written for practice purposes and do not constitute legal advice.',
    },
  },

  cguPage: {
    pageTitle: { fr: 'CGU — SailingLoc', en: 'Terms of service — SailingLoc' },
    title: { fr: "Conditions générales d'utilisation", en: 'Terms of service' },
    updated: { fr: '9 juillet 2026', en: 'July 9, 2026' },
    s1: {
      title: { fr: '1. Objet', en: '1. Purpose' },
      p1: {
        fr: 'Les présentes CGU encadrent l’utilisation de la plateforme SailingLoc, qui met en relation des propriétaires de bateaux et des locataires. SailingLoc agit en qualité d’intermédiaire : elle n’est ni propriétaire des bateaux proposés, ni partie aux contrats de location conclus entre utilisateurs.',
        en: 'These Terms of Service govern the use of the SailingLoc platform, which connects boat owners and renters. SailingLoc acts as an intermediary: it is neither the owner of the listed boats nor a party to the rental contracts entered into between users.',
      },
      p2: {
        fr: 'L’utilisation du site vaut acceptation pleine et entière des présentes CGU. Les conditions financières (réservation, paiement, annulation) sont détaillées dans les <cgv>CGV</cgv>.',
        en: 'Using the site constitutes full acceptance of these Terms of Service. Financial terms (booking, payment, cancellation) are detailed in the <cgv>Terms of Sale</cgv>.',
      },
    },
    s2: {
      title: {
        fr: '2. Accès au service et création de compte',
        en: '2. Access to the service and account creation',
      },
      p1: {
        fr: 'La consultation des annonces est libre. La réservation, la publication d’annonces, la messagerie et les avis nécessitent un compte. Deux profils existent : <renter>locataire</renter> et <owner>propriétaire</owner>.',
        en: 'Browsing listings is free. Booking, publishing listings, messaging and reviews all require an account. Two profiles exist: <renter>renter</renter> and <owner>owner</owner>.',
      },
      p2: {
        fr: 'L’utilisateur s’engage à fournir des informations exactes et à jour, à être majeur, et à garder ses identifiants confidentiels. Toute activité effectuée depuis son compte est réputée être de son fait. L’adresse email est vérifiée à l’inscription.',
        en: 'Users agree to provide accurate, up-to-date information, to be of legal age, and to keep their login credentials confidential. Any activity carried out from their account is deemed to be their own doing. The email address is verified at registration.',
      },
    },
    s3: {
      title: { fr: '3. Documents requis pour louer', en: '3. Documents required to rent' },
      p1: {
        fr: 'La location d’un bateau nécessite le dépôt préalable de justificatifs : permis bateau (côtier ou fluvial selon le bateau), pièce d’identité en cours de validité et CV nautique. Ces documents sont vérifiés par l’équipe SailingLoc sous 48 h ouvrées ; une réservation ne peut être confirmée sans documents valides.',
        en: 'Renting a boat requires supporting documents to be submitted beforehand: a boat license (coastal or inland, depending on the boat), a valid ID document and a sailing résumé. These documents are checked by the SailingLoc team within 48 business hours; a booking cannot be confirmed without valid documents.',
      },
    },
    s4: {
      title: { fr: '4. Obligations des propriétaires', en: '4. Owners’ obligations' },
      p1: {
        fr: 'Le propriétaire garantit que son bateau est en bon état de navigabilité, régulièrement entretenu, assuré (attestation vérifiée avant publication de l’annonce) et conforme à la réglementation. Il s’engage à décrire fidèlement son bateau (caractéristiques, photos, port d’attache, disponibilités) et à honorer les réservations qu’il confirme.',
        en: 'The owner guarantees that their boat is seaworthy, regularly maintained, insured (certificate checked before the listing is published) and compliant with regulations. They agree to accurately describe their boat (features, photos, home marina, availability) and to honour the bookings they confirm.',
      },
      p2: {
        fr: 'Chaque annonce est vérifiée par l’équipe SailingLoc avant d’être publiée.',
        en: 'Every listing is checked by the SailingLoc team before being published.',
      },
    },
    s5: {
      title: { fr: '5. Obligations des locataires', en: '5. Renters’ obligations' },
      p1: {
        fr: 'Le locataire s’engage à utiliser le bateau en bon père de famille, dans le respect de la réglementation maritime, de la capacité maximale indiquée et de la zone de navigation convenue. Il s’engage à restituer le bateau à la date prévue, dans l’état constaté lors de l’état des lieux de départ.',
        en: 'The renter agrees to use the boat responsibly, in compliance with maritime regulations, the stated maximum capacity and the agreed sailing area. They agree to return the boat on the scheduled date, in the condition recorded at the initial check-in inventory.',
      },
    },
    s6: {
      title: { fr: '6. Avis et contenus', en: '6. Reviews and content' },
      p1: {
        fr: 'Après une location terminée, le locataire peut noter le bateau et laisser un commentaire. Les avis sont modérés avant publication. Sont interdits : les contenus illicites, diffamatoires, discriminatoires, publicitaires, ou sans lien avec l’expérience de location. SailingLoc peut retirer tout contenu contraire aux présentes CGU.',
        en: 'Once a rental is complete, the renter can rate the boat and leave a comment. Reviews are moderated before publication. The following are prohibited: unlawful, defamatory, discriminatory or promotional content, or content unrelated to the rental experience. SailingLoc may remove any content that breaches these Terms of Service.',
      },
    },
    s7: {
      title: { fr: '7. Messagerie interne', en: '7. Internal messaging' },
      p1: {
        fr: 'La messagerie permet les échanges entre locataires, propriétaires et le support. Elle ne doit pas être utilisée pour contourner la plateforme (conclusion de locations hors site), ni pour diffuser des contenus illicites. Les conversations peuvent être consultées par l’équipe en cas de litige signalé.',
        en: 'The messaging system enables exchanges between renters, owners and support. It must not be used to bypass the platform (arranging rentals outside the site), nor to spread unlawful content. Conversations may be reviewed by the team in the event of a reported dispute.',
      },
    },
    s8: {
      title: { fr: '8. Responsabilité', en: '8. Liability' },
      p1: {
        fr: 'SailingLoc met en œuvre les moyens raisonnables pour assurer la disponibilité du service mais ne garantit ni l’absence d’interruption, ni l’exactitude des annonces rédigées par les propriétaires. La location est conclue entre le propriétaire et le locataire, seuls responsables de son exécution. En cas d’incident en mer, contactez le CROSS (196 ou VHF canal 16) avant toute autre démarche.',
        en: 'SailingLoc uses reasonable means to ensure the availability of the service but does not guarantee uninterrupted service or the accuracy of listings written by owners. The rental is entered into between the owner and the renter, who alone are responsible for its performance. In the event of an incident at sea, contact the CROSS rescue service (196 or VHF channel 16) before any other action.',
      },
    },
    s9: {
      title: { fr: '9. Suspension et résiliation', en: '9. Suspension and termination' },
      p1: {
        fr: 'L’utilisateur peut supprimer son compte à tout moment depuis son espace ou en contactant le support. SailingLoc peut suspendre ou supprimer un compte en cas de manquement grave ou répété aux présentes CGU (faux documents, annonces trompeuses, impayés, comportement abusif), après notification par email sauf urgence.',
        en: 'Users may delete their account at any time from their account area or by contacting support. SailingLoc may suspend or delete an account in the event of a serious or repeated breach of these Terms of Service (falsified documents, misleading listings, unpaid amounts, abusive behaviour), after notification by email except in urgent cases.',
      },
    },
    s10: {
      title: { fr: '10. Droit applicable', en: '10. Governing law' },
      p1: {
        fr: 'Les présentes CGU sont soumises au droit français. En cas de litige, une solution amiable sera recherchée en priorité ; à défaut, les tribunaux de Marseille sont compétents, sous réserve des règles protectrices du consommateur.',
        en: 'These Terms of Service are governed by French law. In the event of a dispute, an amicable solution will be sought first; failing that, the courts of Marseille have jurisdiction, subject to consumer protection rules.',
      },
    },
  },

  cgvPage: {
    pageTitle: { fr: 'CGV — SailingLoc', en: 'Terms of sale — SailingLoc' },
    title: { fr: 'Conditions générales de vente', en: 'Terms of sale' },
    updated: { fr: '9 juillet 2026', en: 'July 9, 2026' },
    s1: {
      title: { fr: "1. Champ d'application", en: '1. Scope' },
      p1: {
        fr: 'Les présentes CGV s’appliquent à toute réservation effectuée sur SailingLoc. SailingLoc agit comme intermédiaire de mise en relation : le contrat de location est conclu directement entre le propriétaire et le locataire. Toute réservation vaut acceptation des présentes CGV et des <cgu>CGU</cgu>.',
        en: 'These Terms of Sale apply to every booking made on SailingLoc. SailingLoc acts as an intermediary connecting users: the rental contract is entered into directly between the owner and the renter. Every booking constitutes acceptance of these Terms of Sale and of the <cgu>Terms of Service</cgu>.',
      },
    },
    s2: {
      title: { fr: '2. Prix', en: '2. Prices' },
      p1: {
        fr: 'Les prix de location sont fixés librement par les propriétaires et affichés en euros, toutes taxes comprises, par jour de location. Le prix total (jours × tarif journalier, options éventuelles telles que le skipper) est récapitulé avant la validation de la demande de réservation.',
        en: 'Rental prices are freely set by owners and displayed in euros, tax included, per rental day. The total price (days × daily rate, plus any options such as a skipper) is summarised before the booking request is confirmed.',
      },
    },
    s3: {
      title: { fr: '3. Commission de la plateforme', en: '3. Platform commission' },
      p1: {
        fr: 'SailingLoc prélève une commission de <strong>10 %</strong> sur le montant de chaque location, à la charge du propriétaire, déduite lors du reversement. Le montant payé par le locataire est celui affiché lors de la réservation.',
        en: 'SailingLoc charges a <strong>10%</strong> commission on the amount of each rental, payable by the owner and deducted at payout. The amount paid by the renter is the one shown at the time of booking.',
      },
    },
    s4: {
      title: { fr: '4. Réservation', en: '4. Booking' },
      p1: {
        fr: 'Le locataire envoie une demande de réservation aux dates souhaitées. Le propriétaire l’accepte ou la refuse ; le locataire est informé par email et dans son espace. La réservation n’est ferme qu’à la confirmation du propriétaire <em>et</em> à l’encaissement du paiement. Les documents du locataire (permis, pièce d’identité, CV nautique) doivent être vérifiés avant la confirmation.',
        en: 'The renter sends a booking request for the desired dates. The owner accepts or declines it; the renter is notified by email and in their account. The booking is only final once the owner has confirmed it <em>and</em> payment has been collected. The renter’s documents (license, ID document, sailing résumé) must be verified before confirmation.',
      },
    },
    s5: {
      title: { fr: '5. Paiement', en: '5. Payment' },
      p1: {
        fr: 'Le paiement s’effectue en ligne par carte bancaire ou virement, via notre prestataire de paiement sécurisé (Stripe). Il est encaissé à la confirmation de la réservation. SailingLoc ne stocke aucun numéro de carte bancaire. Le reversement au propriétaire, déduction faite de la commission, intervient après le début de la location.',
        en: 'Payment is made online by card or bank transfer, through our secure payment provider (Stripe). It is collected when the booking is confirmed. SailingLoc does not store any card numbers. The payout to the owner, minus the commission, takes place after the rental has started.',
      },
    },
    s6: {
      title: { fr: '6. Annulation et modification', en: '6. Cancellation and changes' },
      p1: {
        fr: '<strong>Demande en attente</strong> : annulable librement et sans frais depuis l’espace « Mes réservations ».',
        en: '<strong>Pending request</strong>: can be freely cancelled at no cost from the “My bookings” area.',
      },
      p2: {
        fr: '<strong>Réservation confirmée</strong> : contactez le propriétaire via la messagerie pour convenir d’une modification ou d’une annulation. En cas de désaccord, l’équipe SailingLoc peut arbitrer via l’ouverture d’un litige ; le remboursement éventuel dépend du délai de prévenance et des circonstances (météo rendant la navigation dangereuse, avarie du bateau…).',
        en: '<strong>Confirmed booking</strong>: contact the owner via messaging to agree on a change or cancellation. In the event of a disagreement, the SailingLoc team can arbitrate by opening a dispute; any refund depends on the notice given and the circumstances (weather making sailing unsafe, boat breakdown, etc.).',
      },
      p3: {
        fr: '<strong>Annulation par le propriétaire</strong> : le locataire est intégralement remboursé.',
        en: '<strong>Cancellation by the owner</strong>: the renter is fully refunded.',
      },
    },
    s7: {
      title: { fr: '7. Droit de rétractation', en: '7. Right of withdrawal' },
      p1: {
        fr: 'Conformément à l’article L221-28 12° du Code de la consommation, le droit de rétractation de 14 jours ne s’applique pas aux prestations de services de loisirs fournies à une date ou période déterminée. Les conditions d’annulation de l’article 6 s’appliquent en lieu et place.',
        en: 'In accordance with Article L221-28 12° of the French Consumer Code, the 14-day right of withdrawal does not apply to leisure services provided on a specific date or period. The cancellation terms in Article 6 apply instead.',
      },
    },
    s8: {
      title: {
        fr: '8. Assurance et état des lieux',
        en: '8. Insurance and check-in/check-out inventory',
      },
      p1: {
        fr: 'Chaque bateau proposé est couvert par l’assurance de son propriétaire (attestation vérifiée avant publication). Un état des lieux contradictoire est réalisé à la remise des clés et à la restitution. Les dommages constatés à la restitution et non signalés au départ sont à la charge du locataire, dans les conditions convenues avec le propriétaire.',
        en: 'Every listed boat is covered by its owner’s insurance (certificate checked before publication). A joint inventory is carried out when the keys are handed over and when the boat is returned. Damage found at return that was not reported at departure is the renter’s responsibility, under the terms agreed with the owner.',
      },
    },
    s9: {
      title: { fr: '9. Litiges et médiation', en: '9. Disputes and mediation' },
      p1: {
        fr: 'En cas de litige lié à une location, ouvrez un litige depuis votre espace ou contactez le support : l’équipe SailingLoc instruit le dossier (échanges de la messagerie, états des lieux, justificatifs) et propose une résolution. Conformément aux articles L611-1 et suivants du Code de la consommation, le consommateur peut recourir gratuitement à un médiateur de la consommation. Plateforme européenne de règlement en ligne des litiges : <odr>ec.europa.eu/consumers/odr</odr>.',
        en: 'In the event of a dispute related to a rental, open a dispute from your account or contact support: the SailingLoc team reviews the case (messaging exchanges, check-in/check-out inventories, supporting documents) and proposes a resolution. In accordance with Articles L611-1 et seq. of the French Consumer Code, consumers may use a consumer mediator free of charge. European online dispute resolution platform: <odr>ec.europa.eu/consumers/odr</odr>.',
      },
    },
    s10: {
      title: { fr: '10. Droit applicable', en: '10. Governing law' },
      p1: {
        fr: 'Les présentes CGV sont soumises au droit français. À défaut de résolution amiable, les tribunaux de Marseille sont compétents, sous réserve des règles protectrices du consommateur.',
        en: 'These Terms of Sale are governed by French law. Failing an amicable resolution, the courts of Marseille have jurisdiction, subject to consumer protection rules.',
      },
    },
  },

  confidentialitePage: {
    pageTitle: {
      fr: 'Politique de confidentialité — SailingLoc',
      en: 'Privacy policy — SailingLoc',
    },
    title: { fr: 'Politique de confidentialité', en: 'Privacy policy' },
    updated: { fr: '9 juillet 2026', en: 'July 9, 2026' },
    s1: {
      title: { fr: '1. Responsable du traitement', en: '1. Data controller' },
      p1: {
        fr: 'SailingLoc SAS, 12 Quai du Port, 13002 Marseille, est responsable du traitement des données collectées sur la plateforme. Contact : <email>dpo@sailingloc.fr</email>.',
        en: 'SailingLoc SAS, 12 Quai du Port, 13002 Marseille, France, is the controller for the data collected on the platform. Contact: <email>dpo@sailingloc.fr</email>.',
      },
    },
    s2: {
      title: { fr: '2. Données collectées', en: '2. Data collected' },
      li1: {
        fr: '<strong>Compte</strong> : nom, prénom, email, téléphone (facultatif), mot de passe (haché), photo de profil (facultative), rôle (locataire/propriétaire).',
        en: '<strong>Account</strong>: last name, first name, email, phone (optional), password (hashed), profile photo (optional), role (renter/owner).',
      },
      li2: {
        fr: '<strong>Justificatifs</strong> : permis bateau, pièce d’identité, CV nautique (locataires) ; acte de francisation, attestation d’assurance (propriétaires).',
        en: '<strong>Supporting documents</strong>: boat license, ID document, sailing résumé (renters); registration certificate, insurance certificate (owners).',
      },
      li3: {
        fr: '<strong>Activité</strong> : annonces, réservations, avis, messages échangés via la messagerie interne, demandes de contact.',
        en: '<strong>Activity</strong>: listings, bookings, reviews, messages exchanged via internal messaging, contact requests.',
      },
      li4: {
        fr: '<strong>Paiement</strong> : traité par notre prestataire Stripe — SailingLoc ne stocke aucun numéro de carte bancaire.',
        en: '<strong>Payment</strong>: processed by our provider Stripe — SailingLoc does not store any card numbers.',
      },
      li5: {
        fr: '<strong>Navigation</strong> : uniquement avec votre consentement — statistiques de visite via notre outil Matomo auto-hébergé (voir section cookies).',
        en: '<strong>Browsing</strong>: only with your consent — visit statistics via our self-hosted Matomo tool (see the cookies section).',
      },
    },
    s3: {
      title: { fr: '3. Finalités et bases légales', en: '3. Purposes and legal bases' },
      li1: {
        fr: '<strong>Exécution du contrat</strong> : création du compte, mise en relation, réservations, messagerie, paiements.',
        en: '<strong>Contract performance</strong>: account creation, connecting users, bookings, messaging, payments.',
      },
      li2: {
        fr: '<strong>Obligation légale</strong> : vérification des documents de navigation, facturation, conservation comptable.',
        en: '<strong>Legal obligation</strong>: verification of sailing documents, invoicing, accounting record retention.',
      },
      li3: {
        fr: '<strong>Intérêt légitime</strong> : sécurité du service (sessions, détection de fraude), gestion des litiges, modération des avis.',
        en: '<strong>Legitimate interest</strong>: service security (sessions, fraud detection), dispute management, review moderation.',
      },
      li4: {
        fr: '<strong>Consentement</strong> : cookies non essentiels (mesure d’audience, personnalisation, publicité) — retirable à tout moment.',
        en: '<strong>Consent</strong>: non-essential cookies (analytics, personalisation, advertising) — withdrawable at any time.',
      },
    },
    s4: {
      title: { fr: '4. Durées de conservation', en: '4. Retention periods' },
      li1: {
        fr: 'Compte et données associées : durée de vie du compte, puis 3 ans après la dernière activité.',
        en: 'Account and related data: for the lifetime of the account, then 3 years after the last activity.',
      },
      li2: {
        fr: 'Justificatifs : durée de détention du compte, supprimés à sa clôture.',
        en: 'Supporting documents: for as long as the account exists, deleted when it is closed.',
      },
      li3: {
        fr: 'Factures et pièces comptables : 10 ans (obligation légale).',
        en: 'Invoices and accounting records: 10 years (legal obligation).',
      },
      li4: {
        fr: 'Journaux de sécurité : 12 mois.',
        en: 'Security logs: 12 months.',
      },
      li5: {
        fr: 'Données de mesure d’audience : <strong1>25 mois maximum</strong1> ; choix de consentement : <strong2>6 mois</strong2> ; cookies : <strong3>13 mois maximum</strong3>.',
        en: 'Analytics data: <strong1>25 months maximum</strong1>; consent choice: <strong2>6 months</strong2>; cookies: <strong3>13 months maximum</strong3>.',
      },
    },
    s5: {
      title: { fr: '5. Cookies et traceurs', en: '5. Cookies and trackers' },
      p1: {
        fr: 'Au premier accès, une bannière vous permet d’accepter, de refuser, ou de paramétrer les cookies finalité par finalité. <strong>Aucun cookie soumis à consentement n’est déposé avant votre choix</strong>, et refuser est aussi simple qu’accepter. Votre choix est conservé 6 mois, puis redemandé.',
        en: 'On your first visit, a banner lets you accept, refuse, or set cookies purpose by purpose. <strong>No cookie subject to consent is set before you make your choice</strong>, and refusing is as easy as accepting. Your choice is kept for 6 months, after which you will be asked again.',
      },
      li1: {
        fr: '<strong>Cookies essentiels (exemptés de consentement)</strong> : session de connexion, panier de réservation, préférence de langue, mémorisation de vos choix de consentement, sécurité.',
        en: '<strong>Essential cookies (exempt from consent)</strong>: login session, booking cart, language preference, storage of your consent choices, security.',
      },
      li2: {
        fr: '<strong>Mesure d’audience (consentement)</strong> : Matomo, auto-hébergé par SailingLoc — aucune donnée transmise à des tiers, adresses IP anonymisées, cookies conservés 13 mois.',
        en: '<strong>Analytics (consent)</strong>: Matomo, self-hosted by SailingLoc — no data shared with third parties, anonymised IP addresses, cookies kept for 13 months.',
      },
      li3: {
        fr: '<strong>Publicité & réseaux sociaux, personnalisation (consentement)</strong> : finalités décrites dans le panneau de paramétrage.',
        en: '<strong>Advertising & social media, personalisation (consent)</strong>: purposes described in the settings panel.',
      },
      p2: {
        fr: 'Vous pouvez modifier votre choix à tout moment : <button>gérer mes cookies</button> (également accessible en bas de chaque page).',
        en: 'You can change your choice at any time: <button>manage my cookies</button> (also available at the bottom of every page).',
      },
    },
    s6: {
      title: { fr: '6. Destinataires des données', en: '6. Data recipients' },
      p1: {
        fr: 'Les données sont traitées par l’équipe SailingLoc et ses sous-traitants techniques : hébergeur, prestataire de paiement (Stripe), service d’envoi d’emails. Le propriétaire et le locataire d’une même réservation accèdent aux informations nécessaires à la location (nom, messagerie). Aucune donnée n’est vendue à des tiers.',
        en: 'Data is processed by the SailingLoc team and its technical subprocessors: hosting provider, payment provider (Stripe), email delivery service. The owner and renter of a given booking can access the information needed for the rental (name, messaging). No data is sold to third parties.',
      },
    },
    s7: {
      title: { fr: '7. Sécurité', en: '7. Security' },
      p1: {
        fr: 'Mots de passe hachés (bcrypt), authentification par jetons à durée limitée avec révocation des sessions (notamment en cas de changement de mot de passe ou de détection de réutilisation d’un jeton), déconnexion automatique après inactivité, chiffrement des échanges (HTTPS en production), accès aux justificatifs restreint à l’équipe de vérification.',
        en: 'Hashed passwords (bcrypt), time-limited token authentication with session revocation (notably on password change or detection of token reuse), automatic logout after inactivity, encrypted communications (HTTPS in production), access to supporting documents restricted to the verification team.',
      },
      p2: {
        fr: '<strong>Chiffrement des données sensibles</strong> : les documents justificatifs (permis, pièces d’identité, attestations) sont stockés de manière chiffrée sur nos serveurs ; les données bancaires sont traitées exclusivement par notre prestataire Stripe, certifié PCI-DSS, et chiffrées de bout en bout — elles ne transitent ni ne sont stockées en clair chez SailingLoc.',
        en: '<strong>Encryption of sensitive data</strong>: supporting documents (licenses, ID documents, certificates) are stored encrypted on our servers; banking data is processed exclusively by our provider Stripe, PCI-DSS certified, and encrypted end to end — it never passes through or is stored in clear text at SailingLoc.',
      },
    },
    s8: {
      title: { fr: '8. Vos droits', en: '8. Your rights' },
      p1: {
        fr: 'Conformément au RGPD, vous disposez des droits d’accès, de rectification, d’effacement, de portabilité, de limitation et d’opposition sur vos données. Vous pouvez les exercer depuis votre espace (rubrique « Mon compte ») ou en écrivant à <email>dpo@sailingloc.fr</email> — réponse sous 30 jours.',
        en: 'In accordance with the GDPR, you have the rights to access, rectify, erase, port, restrict and object to the processing of your data. You can exercise these rights from your account (“My account” section) or by writing to <email>dpo@sailingloc.fr</email> — reply within 30 days.',
      },
      p2: {
        fr: '<strong>Droit à l’effacement (art. 17 RGPD)</strong> : vous pouvez demander la suppression de votre compte et de vos données personnelles. Vos informations d’identification (nom, email, téléphone, photo, justificatifs) sont alors effacées ou anonymisées sous 30 jours. Certaines données sont conservées au-delà lorsque la loi l’impose (pièces comptables : 10 ans) ; elles sont alors dissociées de votre identité.',
        en: '<strong>Right to erasure (GDPR Art. 17)</strong>: you can request the deletion of your account and personal data. Your identifying information (name, email, phone, photo, supporting documents) is then erased or anonymised within 30 days. Some data is retained beyond that when required by law (accounting records: 10 years); it is then dissociated from your identity.',
      },
      p3: {
        fr: '<strong>Droit à la portabilité (art. 20 RGPD)</strong> : vous pouvez obtenir une copie des données que vous nous avez fournies (profil, annonces, réservations, avis, messages) dans un format structuré et lisible par machine (JSON), afin de les réutiliser ou de les transmettre à un autre service. La demande s’effectue auprès de <email>dpo@sailingloc.fr</email>.',
        en: '<strong>Right to data portability (GDPR Art. 20)</strong>: you can obtain a copy of the data you have provided us (profile, listings, bookings, reviews, messages) in a structured, machine-readable format (JSON), so you can reuse it or transmit it to another service. Requests can be made to <email>dpo@sailingloc.fr</email>.',
      },
      p4: {
        fr: 'Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL : <cnil>cnil.fr/fr/plaintes</cnil>.',
        en: 'If you believe your rights are not being respected, you can lodge a complaint with the CNIL, the French data protection authority: <cnil>cnil.fr/fr/plaintes</cnil>.',
      },
    },
    s9: {
      title: { fr: '9. Mise à jour de la politique', en: '9. Policy updates' },
      p1: {
        fr: 'La présente politique peut évoluer (nouvelles finalités, nouveaux partenaires). En cas de changement substantiel concernant les cookies, votre consentement sera redemandé via la bannière.',
        en: 'This policy may evolve (new purposes, new partners). In the event of a substantial change regarding cookies, your consent will be requested again via the banner.',
      },
    },
  },

  mentionsLegalesPage: {
    pageTitle: { fr: 'Mentions légales — SailingLoc', en: 'Legal notice — SailingLoc' },
    title: { fr: 'Mentions légales', en: 'Legal notice' },
    updated: { fr: '9 juillet 2026', en: 'July 9, 2026' },
    s1: {
      title: { fr: '1. Éditeur du site', en: '1. Site publisher' },
      p1: {
        fr: 'Le site <site>sailingloc.fr</site> est édité par <company>SailingLoc SAS</company>, société par actions simplifiée au capital de 10 000 €, immatriculée au RCS de Marseille sous le numéro 000 000 000 (fictif).',
        en: 'The site <site>sailingloc.fr</site> is published by <company>SailingLoc SAS</company>, a simplified joint-stock company (SAS) with capital of €10,000, registered with the Marseille Trade and Companies Register under number 000 000 000 (fictitious).',
      },
      address: {
        fr: 'Siège social : 12 Quai du Port, 13002 Marseille, France',
        en: 'Registered office: 12 Quai du Port, 13002 Marseille, France',
      },
      phoneLine: {
        fr: 'Téléphone : +33 (0)2 00 66 77 89',
        en: 'Phone: +33 (0)2 00 66 77 89',
      },
      emailLine: {
        fr: 'Email : <email>contact@sailingloc.fr</email>',
        en: 'Email: <email>contact@sailingloc.fr</email>',
      },
    },
    s2: {
      title: { fr: '2. Directeur de la publication', en: '2. Publication director' },
      p1: {
        fr: 'Le directeur de la publication est le représentant légal de SailingLoc SAS.',
        en: 'The publication director is the legal representative of SailingLoc SAS.',
      },
    },
    s3: {
      title: { fr: '3. Hébergement', en: '3. Hosting' },
      p1: {
        fr: 'Le site est hébergé par <strong>OVHcloud</strong> — 2 rue Kellermann, 59100 Roubaix, France — <muted>(hébergeur indiqué à titre d’exemple pour ce projet pédagogique)</muted>.',
        en: 'The site is hosted by <strong>OVHcloud</strong> — 2 rue Kellermann, 59100 Roubaix, France — <muted>(host given as an example for this educational project)</muted>.',
      },
    },
    s4: {
      title: { fr: '4. Propriété intellectuelle', en: '4. Intellectual property' },
      p1: {
        fr: 'L’ensemble des éléments du site (structure, textes, logos, images, charte graphique, code) est la propriété de SailingLoc ou de ses partenaires. Toute reproduction, représentation ou adaptation, totale ou partielle, sans autorisation écrite préalable est interdite (articles L335-2 et suivants du Code de la propriété intellectuelle).',
        en: 'All elements of the site (structure, text, logos, images, visual identity, code) are the property of SailingLoc or its partners. Any reproduction, representation or adaptation, in whole or in part, without prior written authorisation is prohibited (Articles L335-2 et seq. of the French Intellectual Property Code).',
      },
      p2: {
        fr: 'Les photos des bateaux sont fournies par leurs propriétaires, qui garantissent en détenir les droits.',
        en: 'Photos of the boats are provided by their owners, who guarantee that they hold the rights to them.',
      },
    },
    s5: {
      title: { fr: '5. Données personnelles & cookies', en: '5. Personal data & cookies' },
      p1: {
        fr: 'Le traitement des données personnelles et l’usage des cookies sont détaillés dans la <privacy>politique de confidentialité</privacy>.',
        en: 'The processing of personal data and the use of cookies are detailed in the <privacy>privacy policy</privacy>.',
      },
    },
    s6: {
      title: { fr: "6. Signalement d'un contenu", en: '6. Reporting content' },
      p1: {
        fr: 'Pour signaler un contenu illicite ou une erreur, utilisez la <contact>page contact</contact> ou écrivez à contact@sailingloc.fr. Nous accusons réception sous 48 h ouvrées.',
        en: 'To report unlawful content or an error, use the <contact>contact page</contact> or write to contact@sailingloc.fr. We acknowledge receipt within 48 business hours.',
      },
    },
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
