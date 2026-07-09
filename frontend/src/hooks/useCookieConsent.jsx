import { useContext } from 'react';
import CookieConsentContext from '../context/CookieConsentContext.jsx';

export function useCookieConsent() {
  return useContext(CookieConsentContext);
}
