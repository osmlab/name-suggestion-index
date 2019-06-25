import React from "react";
import { Link } from "react-router-dom";


export default function CategoryRowSocialitems(props) {
  let items = [];
  let href;

  if (props.facebook) {
    href = 'https://www.facebook.com/' + props.facebook;
    items.push(
      <Link key='facebook' target="_blank" to={href}><i className="fab fa-lg fa-facebook-square"></i></Link>
    );
  }
  if (props.twitter) {
    href = 'https://twitter.com/' + props.twitter;
    items.push(
      <Link key='twitter' target="_blank" to={href}><i className="fab fa-lg fa-twitter-square"></i></Link>
    );
  }
  if (props.instagram) {
    href = 'https://www.instagram.com/' + props.instagram;
    items.push(
      <Link key='instagram' target="_blank" to={href}><i className="fab fa-lg fa-instagram"></i></Link>
    );
  }
  if (props.pinterest) {
    href = 'https://www.pinterest.com/' + props.pinterest;
    items.push(
      <Link key='pinterest' target="_blank" to={href}><i className="fab fa-lg fa-pinterest-square"></i></Link>
    );
  }
  if (props.youtube) {
    href = 'https://www.youtube.com/channel/' + props.youtube;
    items.push(
      <Link key='youtube' target="_blank" to={href}><i className="fab fa-lg fa-youtube-square"></i></Link>
    );
  }
  if (props.vk) {
    href = 'https://vk.com/' + props.vk;
    items.push(
      <Link key='vk' target="_blank" to={href}><i className="fab fa-lg fa-vk"></i></Link>
    );
  }
  if (props.snapchat) {
    href = 'https://www.snapchat.com/add/' + props.snapchat;
    items.push(
      <Link key='snapchat' target="_blank" to={href}><i className="fab fa-lg fa-snapchat-square"></i></Link>
    );
  }
  if (props.linkedin) {
    href = 'https://www.linkedin.com/company/' + props.linkedin;
    items.push(
      <Link key='linkedin' target="_blank" to={href}><i className="fab fa-lg fa-linkedin"></i></Link>
    );
  }

  return !!items.length && (
    <div className="sociallinks">
    {items}
    </div>
  );
};
