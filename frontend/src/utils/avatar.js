export function nameToAvatarUrl(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const gender = Math.abs(hash) % 2 === 0 ? 'women' : 'men';
  const index = (Math.abs(hash) % 70) + 1;
  return `https://randomuser.me/api/portraits/${gender}/${index}.jpg`;
}
