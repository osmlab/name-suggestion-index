import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFacebookSquare,
  faInstagram,
  faLinkedin,
  faPinterestSquare,
  faSnapchatSquare,
  faTiktok,
  faSquareThreads,
  faSquareXTwitter,
  faVk,
  faWeibo,
  faWeixin,
  faYoutubeSquare,
} from "@fortawesome/free-brands-svg-icons";

export function CategoryRowSocialLinks(props) {
  let items = [];
  let href;

  if (props.facebook) {
    href = 'https://www.facebook.com/' + props.facebook;
    items.push(
      <a key='facebook' target='_blank' href={href}><FontAwesomeIcon icon={faFacebookSquare} size='lg' /></a>
    );
  }
  if (props.twitter) {
    href = 'https://twitter.com/' + props.twitter;
    items.push(
      <a key='twitter' target='_blank' href={href}><FontAwesomeIcon icon={faSquareXTwitter} size='lg' /></a>
    );
  }
  if (props.instagram) {
    href = 'https://www.instagram.com/' + props.instagram;
    items.push(
      <a key='instagram' target='_blank' href={href}><FontAwesomeIcon icon={faInstagram} size='lg' /></a>
    );
  }
  if (props.threads) {
    href = 'https://www.threads.net/@' + props.threads;
    items.push(
      <a key='threads' target='_blank' href={href}><FontAwesomeIcon icon={faSquareThreads} size='lg' /></a>
    );
  }
  if (props.tiktok) {
    href = 'https://tiktok.com/@' + props.tiktok;
    items.push(
      <a key='tiktok' target='_blank' href={href}><FontAwesomeIcon icon={faTiktok} size='lg' /></a>
    );
  }
  if (props.pinterest) {
    href = 'https://www.pinterest.com/' + props.pinterest;
    items.push(
      <a key='pinterest' target='_blank' href={href}><FontAwesomeIcon icon={faPinterestSquare} size='lg' /></a>
    );
  }
  if (props.youtube || props.youtubeHandle) {
    if (props.youtube) {
      href = 'https://www.youtube.com/channel/' + props.youtube;
    } else {
      href = 'https://www.youtube.com/@' + props.youtubeHandle;
    }
    items.push(
      <a key='youtube' target='_blank' href={href}><FontAwesomeIcon icon={faYoutubeSquare} size='lg' /></a>
    );
  }
  if (props.vk) {
    href = 'https://vk.com/' + props.vk;
    items.push(
      <a key='vk' target='_blank' href={href}><FontAwesomeIcon icon={faVk} size='lg' /></a>
    );
  }
  if (props.weibo) {
    href = 'https://weibo.com/' + props.weibo;
    items.push(
      <a key='weibo' target='_blank' href={href}><FontAwesomeIcon icon={faWeibo} size='lg' /></a>
    );
  }
  if (props.weixin) {
    href = 'https://open.weixin.qq.com/qr/code?username=' + props.weixin;
    items.push(
      <a key='weixin' target='_blank' href={href}><FontAwesomeIcon icon={faWeixin} size='lg' /></a>
    );
  }
  if (props.snapchat) {
    href = 'https://www.snapchat.com/add/' + props.snapchat;
    items.push(
      <a key='snapchat' target='_blank' href={href}><FontAwesomeIcon icon={faSnapchatSquare} size='lg' /></a>
    );
  }
  if (props.linkedin) {
    href = 'https://www.linkedin.com/company/' + props.linkedin;
    items.push(
      <a key='linkedin' target='_blank' href={href}><FontAwesomeIcon icon={faLinkedin} size='lg' /></a>
    );
  }

  return !!items.length && (
    <div className='sociallinks'>
    {items}
    </div>
  );
};
