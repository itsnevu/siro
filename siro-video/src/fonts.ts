import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {F} from './theme';
export const fontsReady=Promise.all([
 loadFont({family:F.sans,url:staticFile('fonts/siro/sans.woff2'),weight:'400'}),
 loadFont({family:F.sans,url:staticFile('fonts/siro/sans500.woff2'),weight:'500'}),
 loadFont({family:F.sans,url:staticFile('fonts/siro/sans600.woff2'),weight:'600'}),
 loadFont({family:F.sans,url:staticFile('fonts/siro/sans700.woff2'),weight:'700'}),
 loadFont({family:F.display,url:staticFile('fonts/siro/display.woff2'),weight:'400'}),
 loadFont({family:F.italic,url:staticFile('fonts/siro/italic.woff2'),weight:'400',style:'italic'}),
]);
