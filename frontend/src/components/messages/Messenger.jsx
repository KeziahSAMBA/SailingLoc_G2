import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getConversations,
  getThread,
  sendMessage,
  updateMessage,
  deleteMessage,
  resolveSupport,
} from '../../services/messageService.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import Spinner from '../common/Spinner.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import { formatDate } from '../../utils/formatDate.js';

const TIME_OPTS = {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

function fmtTime(value) {
  return formatDate(value, TIME_OPTS);
}

// Accusé de lecture sur mes messages : une coche = envoyé (non lu),
// deux coches bleues = lu par le destinataire.
function ReadReceipt({ read }) {
  const { t } = useTranslation();
  const label = read ? t('messenger.read') : t('messenger.sentUnread');
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`ml-1 inline-flex ${read ? 'text-white' : 'text-white/50'}`}
    >
      <svg width="14" height="10" viewBox="0 0 18 12" fill="none" aria-hidden="true">
        <path
          d="M1 6.5 4.5 10 11 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {read && (
          <path
            d="M7.5 6.5 11 10 17.5 2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  );
}

function displayName(user) {
  if (!user) return '';
  if (user.role === 'admin') return 'SailingLoc (support)';
  return [user.first_name, user.last_name].filter(Boolean).join(' ');
}

// Messagerie interne (thème sombre) : liste des conversations + fil ouvert.
// `externalUser` permet à la page hôte (ex. recherche admin) d'ouvrir une
// conversation avec quelqu'un qui n'apparaît pas encore dans la liste.
function Messenger({ externalUser = null, tabletConversationDropdown = false }) {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const roleLabel = (role) =>
    role === 'admin' ? 'SailingLoc' : t(`messenger.roles.${role}`, { defaultValue: role });
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // interlocuteur { id_user, ... }
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  // Mobile : la liste et le fil occupent la même place — on affiche l'un OU
  // l'autre (la liste par défaut). En lg+, les deux sont côte à côte.
  const [listOpen, setListOpen] = useState(true);
  // Variante locataire sur tablette : la liste devient un menu déroulant
  // indépendant du basculement mobile entre la liste et le fil.
  const [tabletListOpen, setTabletListOpen] = useState(false);

  const loadConversations = useCallback(() => {
    getConversations()
      .then((res) => setConversations(res.data.conversations || []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  // La liste des conversations se rafraîchit en continu (toutes les 4 s),
  // qu'un fil soit ouvert ou non : les messages entrants et envoyés
  // apparaissent à gauche sans recharger la page.
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 4000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Ouverture d'une conversation choisie par la page hôte (recherche admin).
  useEffect(() => {
    if (externalUser) {
      setSelected(externalUser);
      setListOpen(false);
      setTabletListOpen(false);
    }
  }, [externalUser]);

  // Chargement du fil à la sélection (les non-lus passent lus côté serveur),
  // puis rafraîchissement toutes les 4 s tant que le fil est ouvert : les
  // nouveaux messages arrivent et les accusés « lu » se mettent à jour sans
  // recharger la page.
  useEffect(() => {
    if (!selected) return undefined;

    const refresh = (silent) => {
      if (!silent) setThreadLoading(true);
      getThread(selected.id_user)
        .then((res) => {
          setMessages(res.data.messages || []);
          setConversations((prev) =>
            prev.map((c) => (c.user.id_user === selected.id_user ? { ...c, unread: 0 } : c))
          );
          // Prévient le header : le badge de non-lus se met à jour en direct.
          window.dispatchEvent(new window.Event('sailingloc:messages-read'));
        })
        .catch((err) => {
          if (!silent)
            showToast(err.response?.data?.message || t('messenger.errors.loadThread'), 'error');
        })
        .finally(() => {
          if (!silent) setThreadLoading(false);
        });
    };

    refresh(false);
    const interval = setInterval(() => refresh(true), 4000);
    return () => clearInterval(interval);
  }, [selected, showToast, t]);

  // Défilement en bas du fil seulement quand un message s'ajoute (pas à
  // chaque rafraîchissement silencieux, pour ne pas gêner la lecture).
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  // Dernier de mes messages : porte le libellé « Envoyé » / « Lu ».
  const lastMineId = [...messages].reverse().find((m) => m.from_me)?.id_message ?? null;

  // Menu ⋯ d'un message, édition inline et confirmation de suppression en
  // deux clics (le libellé devient « Confirmer ? » au premier clic).
  const [menuFor, setMenuFor] = useState(null);
  const [editing, setEditing] = useState(null); // { id_message, value }
  const [confirmKey, setConfirmKey] = useState(null); // `${id}:${scope}`

  useEffect(() => {
    if (menuFor == null) return undefined;
    const close = () => {
      setMenuFor(null);
      setConfirmKey(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuFor]);

  async function handleSend(e) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !selected) return;
    setSending(true);
    try {
      const res = await sendMessage(selected.id_user, content);
      setMessages((prev) => [...prev, res.data.message]);
      setDraft('');
      loadConversations();
    } catch (err) {
      showToast(err.response?.data?.message || t('messenger.errors.send'), 'error');
    } finally {
      setSending(false);
    }
  }

  async function submitEdit(e) {
    e.preventDefault();
    const content = editing.value.trim();
    if (!content) return;
    try {
      const res = await updateMessage(editing.id_message, content);
      setMessages((prev) =>
        prev.map((m) => (m.id_message === editing.id_message ? { ...m, ...res.data.message } : m))
      );
      setEditing(null);
      loadConversations();
    } catch (err) {
      showToast(err.response?.data?.message || t('messenger.errors.edit'), 'error');
    }
  }

  // Admin : marque la demande support de l'interlocuteur comme traitée.
  const [resolving, setResolving] = useState(false);
  async function handleResolve() {
    if (!selected || resolving) return;
    setResolving(true);
    try {
      const res = await resolveSupport(selected.id_user);
      setMessages((prev) => [...prev, res.data.message]);
      showToast(t('messenger.resolveSuccess'), 'success');
      loadConversations();
    } catch (err) {
      showToast(err.response?.data?.message || t('messenger.errors.resolve'), 'error');
    } finally {
      setResolving(false);
    }
  }

  async function handleDelete(idMessage, scope) {
    const key = `${idMessage}:${scope}`;
    if (confirmKey !== key) {
      setConfirmKey(key);
      return;
    }
    try {
      await deleteMessage(idMessage, scope);
      setMessages((prev) =>
        scope === 'all'
          ? // Le message reste dans le fil sous forme de « Message supprimé ».
            prev.map((m) =>
              m.id_message === idMessage ? { ...m, deleted: true, content: null } : m
            )
          : prev.filter((m) => m.id_message !== idMessage)
      );
      setMenuFor(null);
      setConfirmKey(null);
      loadConversations();
    } catch (err) {
      showToast(err.response?.data?.message || t('messenger.errors.delete'), 'error');
    }
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Mobile : quand le fil est affiché, bouton pour revenir à la liste. */}
      {!listOpen && (
        <button
          type="button"
          onClick={() => setListOpen(true)}
          className={`flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-xl px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 lg:hidden ${
            tabletConversationDropdown ? 'md:hidden' : ''
          } ${FOCUS_RING}`}
        >
          ← {t('messenger.conversations')}
          {totalUnread > 0 && (
            <span className="rounded-full bg-[#5AB4EC] px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
              {totalUnread}
            </span>
          )}
        </button>
      )}

      {tabletConversationDropdown && (
        <button
          type="button"
          aria-expanded={tabletListOpen}
          aria-controls="messenger-tablet-conversations"
          onClick={() => setTabletListOpen((open) => !open)}
          className={`hidden w-full items-center justify-between gap-4 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-left text-white backdrop-blur-xl transition hover:bg-white/15 md:flex lg:hidden ${FOCUS_RING}`}
        >
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-white/60">
              {t('messenger.conversations')}
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-white">
              {selected ? displayName(selected) : t('messenger.selectConversation')}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {totalUnread > 0 && (
              <span className="rounded-full bg-[#5AB4EC] px-2 py-0.5 text-[10px] font-bold text-slate-950">
                {totalUnread}
              </span>
            )}
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className={`h-5 w-5 text-white/70 transition-transform duration-200 ${
                tabletListOpen ? 'rotate-180' : ''
              }`}
            >
              <path
                d="m5 7.5 5 5 5-5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      )}

      {/* Conversations : sur mobile la liste occupe la place du fil (l'un OU
          l'autre) ; sur grand écran les deux sont côte à côte. */}
      <aside
        id={tabletConversationDropdown ? 'messenger-tablet-conversations' : undefined}
        aria-label={t('messenger.conversations')}
        className={`${listOpen ? 'flex' : 'hidden'} ${
          tabletConversationDropdown ? (tabletListOpen ? 'md:flex' : 'md:hidden') : ''
        } min-w-0 flex-col rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl lg:flex lg:h-[70vh] lg:max-h-[720px] lg:min-h-[420px]`}
      >
        <h2
          className={`border-b border-white/20 px-4 py-3 text-sm font-semibold text-white/90 ${
            tabletConversationDropdown ? 'md:hidden lg:block' : ''
          }`}
        >
          {t('messenger.conversations')}
        </h2>
        {loading ? (
          <Spinner label={t('messenger.loading')} />
        ) : conversations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-white/70">{t('messenger.noConversations')}</p>
        ) : (
          <ul
            className={`max-h-[60vh] divide-y divide-white/15 overflow-y-auto ${
              tabletConversationDropdown ? 'min-h-0 md:max-h-80' : ''
            } lg:max-h-none lg:flex-1`}
          >
            {conversations.map((c) => {
              const active = selected?.id_user === c.user.id_user;
              return (
                <li key={c.user.id_user}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(c.user);
                      // Mobile : choisir une conversation referme le panneau.
                      setListOpen(false);
                      setTabletListOpen(false);
                    }}
                    aria-current={active || undefined}
                    className={`block w-full px-4 py-3 text-left transition ${FOCUS_RING} ${
                      active ? 'bg-[#5AB4EC]/20' : 'hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-semibold text-white">
                        {displayName(c.user)}
                      </span>
                      <span className="shrink-0 text-[10px] text-white/60">
                        {fmtTime(c.last_message?.sent_at)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs text-white/70">
                        {c.last_message?.from_me ? t('messenger.you') : ''}
                        {c.last_message?.deleted ? (
                          <span className="italic">{t('messenger.deletedMessage')}</span>
                        ) : (
                          c.last_message?.content
                        )}
                      </span>
                      {c.unread > 0 && (
                        <span className="shrink-0 rounded-full bg-[#5AB4EC] px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                          {c.unread}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-white/60">
                      {roleLabel(c.user.role)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Fil ouvert */}
      <section
        aria-label={t('messenger.threadAria')}
        className={`${listOpen ? 'hidden' : 'flex'} ${
          tabletConversationDropdown ? 'md:flex' : ''
        } h-[70vh] max-h-[720px] min-h-[420px] min-w-0 flex-col rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl lg:flex`}
      >
        {!selected ? (
          <p className="m-auto px-6 text-center text-sm text-white/70">
            {t('messenger.selectConversation')}
          </p>
        ) : (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-white/20 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">{displayName(selected)}</p>
                <p className="text-xs text-white/60">{roleLabel(selected.role)}</p>
              </div>
              {me?.role === 'admin' && selected.role !== 'admin' && (
                <button
                  type="button"
                  onClick={handleResolve}
                  disabled={resolving}
                  className={`shrink-0 rounded-full border border-emerald-500/40 px-4 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {resolving ? t('messenger.resolving') : t('messenger.markResolved')}
                </button>
              )}
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {threadLoading ? (
                <Spinner label={t('messenger.loading')} />
              ) : messages.length === 0 ? (
                <p className="text-sm text-white/70">{t('messenger.noMessages')}</p>
              ) : (
                messages.map((m) =>
                  m.type === 'support_resolved' ? (
                    /* Marqueur système : la demande a été clôturée. */
                    <div key={m.id_message} className="flex justify-center py-1">
                      <p className="rounded-full bg-emerald-500/10 px-4 py-1 text-center text-xs italic text-emerald-300">
                        {t('messenger.resolvedMarker', { time: fmtTime(m.sent_at) })}
                      </p>
                    </div>
                  ) : (
                    <div
                      key={m.id_message}
                      className={`group flex items-start gap-1 ${
                        m.from_me ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                          m.from_me
                            ? 'rounded-br-sm bg-sky-500 text-white'
                            : 'rounded-bl-sm bg-white/10 text-white'
                        }`}
                      >
                        {editing?.id_message === m.id_message ? (
                          /* Édition inline du message */
                          <form onSubmit={submitEdit} className="flex items-center gap-2">
                            <label htmlFor={`edit-${m.id_message}`} className="sr-only">
                              {t('messenger.editMessageLabel')}
                            </label>
                            <input
                              id={`edit-${m.id_message}`}
                              type="text"
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                              maxLength={2000}
                              autoFocus
                              className="w-56 rounded-lg border border-white/40 bg-white/10 px-2 py-1 text-sm text-white outline-none focus:border-[#5AB4EC]"
                            />
                            <button
                              type="submit"
                              aria-label={t('messenger.saveEdit')}
                              className="text-[#5AB4EC] hover:text-white"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              aria-label={t('messenger.cancelEdit')}
                              onClick={() => setEditing(null)}
                              className="text-white/80 hover:text-white"
                            >
                              ✕
                            </button>
                          </form>
                        ) : m.deleted ? (
                          <p className="italic text-white/70">{t('messenger.deletedMessage')}</p>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        )}
                        <p
                          className={`mt-1 flex items-center justify-end gap-0.5 text-right text-[10px] ${
                            m.from_me ? 'text-white/70' : 'text-white/60'
                          }`}
                        >
                          {m.edited && <span className="mr-1 italic">{t('messenger.edited')}</span>}
                          {fmtTime(m.sent_at)}
                          {m.from_me && !m.deleted && <ReadReceipt read={m.read} />}
                          {m.from_me && !m.deleted && m.id_message === lastMineId && (
                            <span className={m.read ? 'font-semibold text-white' : undefined}>
                              {m.read ? t('messenger.read') : t('messenger.sent')}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Menu ⋯ : Modifier / Supprimer pour tout le monde (mes
                        messages), Supprimer pour moi (tous). */}
                      <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          aria-label={t('messenger.messageActions')}
                          aria-expanded={menuFor === m.id_message}
                          onClick={() => {
                            setMenuFor(menuFor === m.id_message ? null : m.id_message);
                            setConfirmKey(null);
                          }}
                          className={`rounded-full px-1.5 py-0.5 text-white/60 opacity-60 transition hover:bg-white/10 hover:text-white/90 group-hover:opacity-100 ${FOCUS_RING}`}
                        >
                          ⋯
                        </button>
                        {menuFor === m.id_message && (
                          <div
                            role="menu"
                            className={`absolute z-20 mt-1 w-56 overflow-hidden rounded-lg border border-white/30 bg-white/10 text-sm shadow-xl ${
                              m.from_me ? 'right-0' : 'left-0'
                            }`}
                          >
                            {m.from_me && !m.deleted && (
                              <>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setEditing({ id_message: m.id_message, value: m.content });
                                    setMenuFor(null);
                                  }}
                                  className="block w-full px-3 py-2 text-left text-white transition hover:bg-white/10"
                                >
                                  {t('messenger.edit')}
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleDelete(m.id_message, 'all')}
                                  className="block w-full px-3 py-2 text-left text-red-300 transition hover:bg-white/10"
                                >
                                  {confirmKey === `${m.id_message}:all`
                                    ? t('messenger.confirmDelete')
                                    : t('messenger.deleteForAll')}
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleDelete(m.id_message, 'me')}
                              className="block w-full px-3 py-2 text-left text-white/80 transition hover:bg-white/10"
                            >
                              {confirmKey === `${m.id_message}:me`
                                ? t('messenger.confirmDelete')
                                : t('messenger.deleteForMe')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="flex gap-2 border-t border-white/20 p-3">
              <label htmlFor="message-draft" className="sr-only">
                {t('messenger.yourMessage')}
              </label>
              <input
                id="message-draft"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
                placeholder={t('messenger.placeholder')}
                className="w-full rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none transition focus:border-[#5AB4EC]"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className={`shrink-0 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                {sending ? t('messenger.sending') : t('messenger.send')}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export default Messenger;
