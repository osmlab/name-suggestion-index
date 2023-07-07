import React from 'react';

export default function Footer(props) {
  const index = props.index;
  const meta = index?.meta;
  const version = meta?.version;
  const generated = meta?.generated;
  const released = generated && new Date(Date.parse(generated));
  const display = released && version && `NSI v${version} (Generated: ${released})`;

  return (
    <div id='footer'>{display}</div>
  );
};
