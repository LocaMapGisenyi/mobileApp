import type {Currency} from '../store/preferences';
// Rental prices retain their persisted currency until a dated exchange-rate service is configured.
export function convertPrice(priceInRwf: number, toCurrency: Currency): number {
  if(toCurrency!=='RWF')throw new Error('Conversion de devise non configurée.');
  return priceInRwf;
}
export function convertToRwf(price: number, fromCurrency: Currency): number {
  if(fromCurrency!=='RWF')throw new Error('Conversion de devise non configurée.');
  return price;
}
export function formatPrice(price: number,currency: Currency): string {
  if(currency==='RWF')return price.toLocaleString()+' RWF';
  return price.toLocaleString('fr-FR',{style:'currency',currency});
}
export function formatPriceWithOriginal(priceInRwf: number,_displayCurrency: Currency,_showOriginal=true): string {
  return formatPrice(priceInRwf,'RWF');
}
