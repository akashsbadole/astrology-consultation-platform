'use client';

type Props = {
  label: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  loading?: boolean;
  disabled?: boolean;
};

export function PrimaryButton({ label, onClick, type = 'button', loading, disabled }: Props) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`w-full rounded-[10px] py-3.5 text-[16px] font-bold text-midnight transition-opacity ${
        isDisabled
          ? 'cursor-not-allowed bg-brass-dim opacity-70'
          : 'bg-gradient-to-br from-brass to-[#B08A44] hover:opacity-90'
      }`}
    >
      {loading ? (
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-midnight/30 border-t-midnight align-middle" />
      ) : (
        label
      )}
    </button>
  );
}
