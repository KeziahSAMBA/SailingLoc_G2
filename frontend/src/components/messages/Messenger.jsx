import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getConversations,
  getThread,
  sendMessage,
  updateMessage,
  deleteMessage,
} from '../../services/messageService.js';
import { useToast } from '../../hooks/useToast.jsx';

const ROLE_LABEL = { locataire: 'Locataire', proprietaire: 'Propriétaire', admin: 'SailingLoc' };
const TIME = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

function fmtTime(value) {
  return value ? TIME.format(new Date(value)) : '';
}

// Accusé de lecture sur mes messages : une coche = envoyé (non lu),
// deux coches bleues = lu par le destinataire.
function ReadReceipt({ read }) {
  return (
    <span
      role="img"
      aria-label={read ? 'Lu' : 'Envoyé, non lu'}
      title={read ? 'Lu' : 'Envoyé, non lu'}
      className={`ml-1 inline-flex ${read ? 'text-[#5AB4EC]' : 'text-slate-400'}`}
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
function Messenger({ externalUser = null }) {
  const { showToast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // interlocuteur { id_user, ... }
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

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
    if (externalUser) setSelected(externalUser);
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
            showToast(err.response?.data?.message || 'Erreur de chargement du fil.', 'error');
        })
        .finally(() => {
          if (!silent) setThreadLoading(false);
        });
    };

    refresh(false);
    const interval = setInterval(() => refresh(true), 4000);
    return () => clearInterval(interval);
  }, [selected, showToast]);

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
      showToast(err.response?.data?.message || 'Échec de l’envoi.', 'error');
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
      showToast(err.response?.data?.message || 'Échec de la modification.', 'error');
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
      showToast(err.response?.data?.message || 'Échec de la suppression.', 'error');
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Conversations */}
      <aside
        aria-label="Conversations"
        className="rounded-2xl border border-slate-800 bg-slate-900/70"
      >
        <h2 className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-slate-200">
          Conversations
        </h2>
        {loading ? (
          <p className="px-4 py-6 text-sm text-slate-400">Chargement…</p>
        ) : conversations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-400">Aucune conversation pour le moment.</p>
        ) : (
          <ul className="max-h-[430px] divide-y divide-slate-800 overflow-y-auto">
            {conversations.map((c) => {
              const active = selected?.id_user === c.user.id_user;
              return (
                <li key={c.user.id_user}>
                  <button
                    type="button"
                    onClick={() => setSelected(c.user)}
                    aria-current={active || undefined}
                    className={`block w-full px-4 py-3 text-left transition ${FOCUS_RING} ${
                      active ? 'bg-[#0A3172]/40' : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-100">
                        {displayName(c.user)}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-500">
                        {fmtTime(c.last_message?.sent_at)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-slate-400">
                        {c.last_message?.from_me ? 'Vous : ' : ''}
                        {c.last_message?.deleted ? (
                          <span className="italic">Message supprimé</span>
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
                    <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-slate-500">
                      {ROLE_LABEL[c.user.role] || c.user.role}
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
        aria-label="Fil de discussion"
        className="flex min-h-[480px] flex-col rounded-2xl border border-slate-800 bg-slate-900/70"
      >
        {!selected ? (
          <p className="m-auto px-6 text-center text-sm text-slate-400">
            Sélectionnez une conversation pour afficher les messages.
          </p>
        ) : (
          <>
            <header className="border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold text-white">{displayName(selected)}</p>
              <p className="text-xs text-slate-500">{ROLE_LABEL[selected.role] || selected.role}</p>
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {threadLoading ? (
                <p className="text-sm text-slate-400">Chargement…</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Aucun message pour l’instant : écrivez le premier !
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id_message}
                    className={`group flex items-start gap-1 ${
                      m.from_me ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        m.from_me
                          ? 'rounded-br-sm bg-[#0A3172] text-white'
                          : 'rounded-bl-sm bg-slate-800 text-slate-100'
                      }`}
                    >
                      {editing?.id_message === m.id_message ? (
                        /* Édition inline du message */
                        <form onSubmit={submitEdit} className="flex items-center gap-2">
                          <label htmlFor={`edit-${m.id_message}`} className="sr-only">
                            Modifier le message
                          </label>
                          <input
                            id={`edit-${m.id_message}`}
                            type="text"
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            maxLength={2000}
                            autoFocus
                            className="w-56 rounded-lg border border-slate-500 bg-slate-900/60 px-2 py-1 text-sm text-white outline-none focus:border-[#5AB4EC]"
                          />
                          <button
                            type="submit"
                            aria-label="Enregistrer la modification"
                            className="text-[#5AB4EC] hover:text-white"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            aria-label="Annuler la modification"
                            onClick={() => setEditing(null)}
                            className="text-slate-300 hover:text-white"
                          >
                            ✕
                          </button>
                        </form>
                      ) : m.deleted ? (
                        <p className="italic text-slate-400">Message supprimé</p>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      )}
                      <p
                        className={`mt-1 flex items-center justify-end gap-0.5 text-right text-[10px] ${
                          m.from_me ? 'text-slate-300/70' : 'text-slate-500'
                        }`}
                      >
                        {m.edited && <span className="mr-1 italic">modifié</span>}
                        {fmtTime(m.sent_at)}
                        {m.from_me && !m.deleted && <ReadReceipt read={m.read} />}
                        {m.from_me && !m.deleted && m.id_message === lastMineId && (
                          <span className={m.read ? 'text-[#5AB4EC]' : undefined}>
                            {m.read ? 'Lu' : 'Envoyé'}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Menu ⋯ : Modifier / Supprimer pour tout le monde (mes
                        messages), Supprimer pour moi (tous). */}
                    <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        aria-label="Actions sur le message"
                        aria-expanded={menuFor === m.id_message}
                        onClick={() => {
                          setMenuFor(menuFor === m.id_message ? null : m.id_message);
                          setConfirmKey(null);
                        }}
                        className={`rounded-full px-1.5 py-0.5 text-slate-500 opacity-60 transition hover:bg-slate-800 hover:text-slate-200 group-hover:opacity-100 ${FOCUS_RING}`}
                      >
                        ⋯
                      </button>
                      {menuFor === m.id_message && (
                        <div
                          role="menu"
                          className={`absolute z-20 mt-1 w-56 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 text-sm shadow-xl ${
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
                                className="block w-full px-3 py-2 text-left text-slate-100 transition hover:bg-slate-700"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleDelete(m.id_message, 'all')}
                                className="block w-full px-3 py-2 text-left text-red-300 transition hover:bg-slate-700"
                              >
                                {confirmKey === `${m.id_message}:all`
                                  ? 'Confirmer la suppression ?'
                                  : 'Supprimer pour tout le monde'}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleDelete(m.id_message, 'me')}
                            className="block w-full px-3 py-2 text-left text-slate-300 transition hover:bg-slate-700"
                          >
                            {confirmKey === `${m.id_message}:me`
                              ? 'Confirmer la suppression ?'
                              : 'Supprimer pour moi'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-800 p-3">
              <label htmlFor="message-draft" className="sr-only">
                Votre message
              </label>
              <input
                id="message-draft"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
                placeholder="Écrivez votre message…"
                className="w-full rounded-full border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-[#5AB4EC]"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className={`shrink-0 rounded-full bg-[#0A3172] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d3d8c] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                {sending ? 'Envoi…' : 'Envoyer'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export default Messenger;
