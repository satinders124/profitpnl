type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-[#1E1E38] bg-[#161628] ${className}`}
    >
      {children}
    </div>
  );
}