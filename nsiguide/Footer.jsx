import { useContext } from 'react';
import { AppContext } from './AppContext';


export function Footer() {
  const context = useContext(AppContext);
  const meta = context.index?.meta;
  const version = meta?.version;
  const generated = meta?.generated;
  const released = generated && new Date(Date.parse(generated));
  const display = released && version && `NSI v${version} (Generated: ${released})`;

  return (
    <div id='footer'>{display}</div>
  );
};
