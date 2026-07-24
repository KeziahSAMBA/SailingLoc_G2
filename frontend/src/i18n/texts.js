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
      imageAlt: {
        fr: '{{name}}, {{type}} disponible à la location à {{location}}',
        en: '{{name}}, {{type}} available to rent in {{location}}',
      },
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
      title: { fr: 'Localisation', en: 'Where the boat is moored' },
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
      documents: { fr: 'Documents', en: 'Documents' },
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
      intro: {
        fr: 'Pour finaliser votre réservation, vos trois documents (permis, pièce d’identité, CV nautique) doivent être déposés puis validés par l’équipe SailingLoc. Votre demande non payée est conservée 72 heures (annulée automatiquement au-delà). Après le paiement, rien n’est débité : le montant reste en attente jusqu’à la décision du propriétaire, et les dates ne sont bloquées qu’à sa confirmation.',
        en: 'To finalise your booking, your three documents (licence, ID, sailing CV) must be uploaded and then validated by the SailingLoc team. An unpaid request is kept for 72 hours (then cancelled automatically). After payment, nothing is charged: the amount stays on hold until the owner decides, and the dates are only secured once the owner confirms.',
      },
      notValidated: {
        fr: 'Vos documents ne sont pas encore tous validés par SailingLoc. Réessayez une fois la validation faite — votre réservation reste enregistrée.',
        en: 'Your documents have not all been validated by SailingLoc yet. Try again once validated — your booking remains saved.',
      },
      continue: { fr: 'Vérifier et continuer', en: 'Check and continue' },
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

  proprietaireLayout: {
    navAria: { fr: 'Navigation espace propriétaire', en: 'Owner area navigation' },
    mySpace: { fr: 'Mon espace', en: 'My space' },
    nav: {
      dashboard: { fr: 'Dashboard', en: 'Dashboard' },
      account: { fr: 'Compte', en: 'Account' },
      documents: { fr: 'Mes documents', en: 'My documents' },
      reservations: { fr: 'Mes réservations', en: 'My bookings' },
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
      cancel: { fr: 'Annuler la réservation', en: 'Cancel booking' },
      refund: { fr: 'Demander un remboursement', en: 'Request a refund' },
      dispute: { fr: 'Signaler un problème', en: 'Report an issue' },
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
