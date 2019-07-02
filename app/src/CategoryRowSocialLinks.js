import React from "react";
import { a } from "react-router-dom";


export default function CategoryRowSocialitems(props) {
  let items = [];
  let href;

  if (props.facebook) {
    href = 'https://www.facebook.com/' + props.facebook;
    items.push(
      <a key='facebook' target="_blank" href={href}><i className="fab fa-lg fa-facebook-square"></i></a>
    );
  }
  if (props.twitter) {
    href = 'https://twitter.com/' + props.twitter;
    items.push(
      <a key='twitter' target="_blank" href={href}><i className="fab fa-lg fa-twitter-square"></i></a>
    );
  }
  if (props.instagram) {
    href = 'https://www.instagram.com/' + props.instagram;
    items.push(
      <a key='instagram' target="_blank" href={href}><i className="fab fa-lg fa-instagram"></i></a>
    );
  }
  if (props.pinterest) {
    href = 'https://www.pinterest.com/' + props.pinterest;
    items.push(
      <a key='pinterest' target="_blank" href={href}><i className="fab fa-lg fa-pinterest-square"></i></a>
    );
  }
  if (props.youtube) {
    href = 'https://www.youtube.com/channel/' + props.youtube;
    items.push(
      <a key='youtube' target="_blank" href={href}><i className="fab fa-lg fa-youtube-square"></i></a>
    );
  }
  if (props.vk) {
    href = 'https://vk.com/' + props.vk;
    items.push(
      <a key='vk' target="_blank" href={href}><i className="fab fa-lg fa-vk"></i></a>
    );
  }
  if (props.snapchat) {
    href = 'https://www.snapchat.com/add/' + props.snapchat;
    items.push(
      <a key='snapchat' target="_blank" href={href}><i className="fab fa-lg fa-snapchat-square"></i></a>
    );
  }
  if (props.linkedin) {
    href = 'https://www.linkedin.com/company/' + props.linkedin;
    items.push(
      <a key='linkedin' target="_blank" href={href}><i className="fab fa-lg fa-linkedin"></i></a>
    );
  }

  return !!items.length && (
    <div className="sociallinks">
    {items}
    </div>
  );
};
