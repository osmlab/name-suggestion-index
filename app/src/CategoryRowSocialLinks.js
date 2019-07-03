import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { faFacebookSquare } from '@fortawesome/free-brands-svg-icons';
import { faInstagram } from '@fortawesome/free-brands-svg-icons';
import { faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { faPinterestSquare } from '@fortawesome/free-brands-svg-icons';
import { faSnapchatSquare } from '@fortawesome/free-brands-svg-icons';
import { faTwitterSquare } from '@fortawesome/free-brands-svg-icons';
import { faVk } from '@fortawesome/free-brands-svg-icons';
import { faYoutubeSquare } from '@fortawesome/free-brands-svg-icons';


export default function CategoryRowSocialLinks(props) {
  let items = [];
  let href;

  if (props.facebook) {
    href = 'https://www.facebook.com/' + props.facebook;
    items.push(
      <a key='facebook' target="_blank" href={href}><FontAwesomeIcon icon={faFacebookSquare} size="lg" /></a>
    );
  }
  if (props.twitter) {
    href = 'https://twitter.com/' + props.twitter;
    items.push(
      <a key='twitter' target="_blank" href={href}><FontAwesomeIcon icon={faTwitterSquare} size="lg" /></a>
    );
  }
  if (props.instagram) {
    href = 'https://www.instagram.com/' + props.instagram;
    items.push(
      <a key='instagram' target="_blank" href={href}><FontAwesomeIcon icon={faInstagram} size="lg" /></a>
    );
  }
  if (props.pinterest) {
    href = 'https://www.pinterest.com/' + props.pinterest;
    items.push(
      <a key='pinterest' target="_blank" href={href}><FontAwesomeIcon icon={faPinterestSquare} size="lg" /></a>
    );
  }
  if (props.youtube) {
    href = 'https://www.youtube.com/channel/' + props.youtube;
    items.push(
      <a key='youtube' target="_blank" href={href}><FontAwesomeIcon icon={faYoutubeSquare} size="lg" /></a>
    );
  }
  if (props.vk) {
    href = 'https://vk.com/' + props.vk;
    items.push(
      <a key='vk' target="_blank" href={href}><FontAwesomeIcon icon={faVk} size="lg" /></a>
    );
  }
  if (props.snapchat) {
    href = 'https://www.snapchat.com/add/' + props.snapchat;
    items.push(
      <a key='snapchat' target="_blank" href={href}><FontAwesomeIcon icon={faSnapchatSquare} size="lg" /></a>
    );
  }
  if (props.linkedin) {
    href = 'https://www.linkedin.com/company/' + props.linkedin;
    items.push(
      <a key='linkedin' target="_blank" href={href}><FontAwesomeIcon icon={faLinkedin} size="lg" /></a>
    );
  }

  return !!items.length && (
    <div className="sociallinks">
    {items}
    </div>
  );
};
