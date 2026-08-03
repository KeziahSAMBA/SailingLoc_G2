export function getAboutNavigationItems(t) {
  return [
    {
      label: t('aboutPage.story.kicker'),
      anchor: 'top',
      path: '/a-propos',
    },
    {
      label: t('aboutPage.values.kicker'),
      anchor: 'about-values',
      path: '/a-propos',
    },
    {
      label: t('aboutPage.destinations.kicker'),
      anchor: 'about-destinations',
      path: '/a-propos',
    },
  ];
}
