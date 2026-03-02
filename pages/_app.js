import '../styles/globals.css';
import { AccountingProvider } from '../utils/accountingStore';

export default function MyApp({ Component, pageProps }) {
  return (
    <AccountingProvider>
      <Component {...pageProps} />
    </AccountingProvider>
  );
}
