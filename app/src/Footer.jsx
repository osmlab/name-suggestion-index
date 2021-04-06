import React from 'react';

export default function Footer(props) {
  const index = props.index;
  const meta = index && index.meta;
  const version = meta && meta.version;
  const display = version && `NSI v${version}`;

  return (
    <div id='footer'>{display}</div>
  );
};
