import { getSiteURL } from '@/lib/get-site-url';

export interface Config {
  site: { name: string; description: string; themeColor: string; url: string };
}

export const config: Config = {
  site: { name: 'Generation Interval', description: '', themeColor: '#090a0b', url: getSiteURL() },
};