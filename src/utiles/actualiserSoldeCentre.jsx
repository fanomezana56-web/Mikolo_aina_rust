export function signalerChangementSoldeCentre() {
  window.dispatchEvent(
    new Event("solde-centre-change")
  );
}