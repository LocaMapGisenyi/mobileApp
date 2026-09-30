import {expect,it} from 'vitest';
import {convertPrice, convertToRwf, formatPriceWithOriginal} from '../src/utils/currency';
it('refuses unconfigured exchange rates instead of inventing a rental price',()=>{
  expect(()=>convertPrice(300000,'USD')).toThrow();
  expect(()=>convertToRwf(100,'EUR')).toThrow();
});
it('keeps the original RWF amount visible when another display preference was saved',()=>{
  expect(formatPriceWithOriginal(300000,'USD')).toContain('RWF');
  expect(formatPriceWithOriginal(300000,'USD')).not.toContain('$');
});
