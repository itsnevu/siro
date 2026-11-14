/** Separate from the button: shown when the wallet holds too little ETH to pay for the zap. */
export function GasWarning({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="banner banner-orange" role="alert">
      <span aria-hidden>⛽</span>
      <span>You have almost no ETH on Robinhood Chain. A small amount of ETH is needed to pay network fees.</span>
    </div>
  );
}
