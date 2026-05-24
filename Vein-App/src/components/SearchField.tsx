/** Controlled search box — uses type="text" so iOS/PWA reliably fires updates. */
export function SearchField({
  value,
  onChange,
  placeholder,
  className = '',
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}) {
  function sync(value: string) {
    onChange(value)
  }

  return (
    <input
      type="text"
      inputMode="search"
      enterKeyHint="search"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      autoFocus={autoFocus}
      placeholder={placeholder}
      value={value}
      onChange={(e) => sync(e.target.value)}
      onInput={(e) => sync(e.currentTarget.value)}
      className={className}
    />
  )
}
