import { avatarImage } from '../themes/characters';

/**
 * A player's avatar: an emoji, or a character's face (`img:<id>`).
 * Character avatars always show the face crop, never the whole figure.
 * `fill` covers the parent circle (the parent must be positioned); otherwise it
 * sits inline at the size of the surrounding text.
 */
export function Avatar({ value, fill = false, className = '' }: { value: string | undefined; fill?: boolean; className?: string }) {
  const art = avatarImage(value);
  if (!art) return <>{value?.startsWith('img:') ? '🎭' : value}</>;
  return (
    <img
      src={art.face}
      alt={art.name}
      title={art.name}
      draggable={false}
      decoding="async"
      className={
        fill
          ? `pointer-events-none absolute inset-0 h-full w-full rounded-full object-cover ${className}`
          : `inline-block h-[1.3em] w-[1.3em] rounded-full object-cover align-middle ${className}`
      }
    />
  );
}
