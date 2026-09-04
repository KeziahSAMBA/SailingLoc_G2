function Button({ children, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md bg-action px-4 py-2 text-sm font-medium text-action-text shadow-sm hover:bg-action-hover ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
