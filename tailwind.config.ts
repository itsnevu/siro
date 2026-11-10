const colors = Object.fromEntries(
  ["bg", "surface", "surface-2", "card", "fg", "fg-70", "muted", "line", "primary", "primary-fg", "primary-soft", "secondary", "secondary-soft", "success", "danger", "warning"].map(
    (name) => [name, `var(--${name})`]
  )
);

const config = { darkMode: "class" as const, theme: { extend: { colors } } };
export default config;
