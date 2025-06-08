declare module 'playwright-stealth' {
  import { Page } from 'playwright';
  
  function stealth(page: Page): Promise<void>;
  export default stealth;
} 