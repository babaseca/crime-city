export default function Button({ children, icon: Icon, variant = "primary", className = "", ...props }) {
  return (
    <button className={`ui-button ${variant} ${className}`.trim()} type="button" {...props}>
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
