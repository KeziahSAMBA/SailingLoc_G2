export function getContactNavigationItems(t) {
  return [
    {
      label: t('header.burgerContact.hero'),
      anchor: 'contact-hero',
      path: '/contact',
    },
    {
      label: t('header.burgerContact.details'),
      anchor: 'contact-details',
      path: '/contact',
    },
    {
      label: t('header.burgerContact.form'),
      anchor: 'contact-form',
      path: '/contact',
    },
    {
      label: t('header.burgerContact.faq'),
      anchor: 'contact-faq',
      path: '/contact',
    },
  ];
}
