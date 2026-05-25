"use client";

type PrintButtonProps = {
  className: string;
};

export function PrintButton({ className }: PrintButtonProps) {
  return (
    <button className={className} onClick={() => window.print()} type="button">
      Print
    </button>
  );
}
