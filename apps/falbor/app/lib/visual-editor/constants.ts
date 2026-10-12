import BarChart from '~/components/visual-editor/icons/bar_chart'
import Calendar from '~/components/visual-editor/icons/calendar'
import CheckCircle from '~/components/visual-editor/icons/check_circled'
import Chip from '~/components/visual-editor/icons/chip'
import ClipboardIcon from '~/components/visual-editor/icons/clipboardIcon'
import Compass from '~/components/visual-editor/icons/compass'
import Database from '~/components/visual-editor/icons/database'
import Flag from '~/components/visual-editor/icons/flag'
import Headphone from '~/components/visual-editor/icons/headphone'
import Home from '~/components/visual-editor/icons/home'
import Info from '~/components/visual-editor/icons/info'
import LinkIcon from '~/components/visual-editor/icons/link'
import Lock from '~/components/visual-editor/icons/lock'
import Message from '~/components/visual-editor/icons/messages'
import Notification from '~/components/visual-editor/icons/notification'
import Payment from '~/components/visual-editor/icons/payment'
import Person from '~/components/visual-editor/icons/person'
import Pipelines from '~/components/visual-editor/icons/pipelines'
import PluraCategory from '~/components/visual-editor/icons/plura-category'
import Power from '~/components/visual-editor/icons/power'
import Receipt from '~/components/visual-editor/icons/receipt'
import Send from '~/components/visual-editor/icons/send'
import Settings from '~/components/visual-editor/icons/settings'
import Shield from '~/components/visual-editor/icons/shield'
import Star from '~/components/visual-editor/icons/star'
import Tune from '~/components/visual-editor/icons/tune'
import Video from '~/components/visual-editor/icons/video_recorder'
import Wallet from '~/components/visual-editor/icons/wallet'
import Warning from '~/components/visual-editor/icons/warning'
export const pricingCards = [
  {
    title: 'Starter',
    description: 'Perfect for trying out plura',
    price: 'Free',
    duration: '',
    highlight: 'Key features',
    features: ['3 Sub accounts', '2 Team members', 'Unlimited pipelines'],
    priceId: '',
  },
  {
    title: 'Unlimited Saas',
    description: 'The ultimate agency kit',
    price: '$49',
    duration: 'month',
    highlight: 'Key features',
    features: ['Rebilling', '24/7 Support team'],
    priceId: 'price_1OvjbQSHUq0fyoXwOsLhgIog',
  },
  {
    title: 'Basic',
    description: 'For serious agency owners',
    price: '$29',
    duration: 'month',
    highlight: 'Everything in Starter, plus',
    features: ['Unlimited Sub accounts', 'Unlimited Team members'],
    priceId: 'price_1OvjbQSHUq0fyoXw5juRXpha',
  },
]

export const addOnProducts = [
  { title: 'Priority Support', id: 'prod_PlGOtjXSCxJr86' },
]

export const icons = [
  {
    value: 'chart',
    label: 'Bar Chart',
    path: BarChart,
  },
  {
    value: 'headphone',
    label: 'Headphones',
    path: Headphone,
  },
  {
    value: 'send',
    label: 'Send',
    path: Send,
  },
  {
    value: 'pipelines',
    label: 'Pipelines',
    path: Pipelines,
  },
  {
    value: 'calendar',
    label: 'Calendar',
    path: Calendar,
  },
  {
    value: 'settings',
    label: 'Settings',
    path: Settings,
  },
  {
    value: 'check',
    label: 'Check Circled',
    path: CheckCircle,
  },
  {
    value: 'chip',
    label: 'Chip',
    path: Chip,
  },
  {
    value: 'compass',
    label: 'Compass',
    path: Compass,
  },
  {
    value: 'database',
    label: 'Database',
    path: Database,
  },
  {
    value: 'flag',
    label: 'Flag',
    path: Flag,
  },
  {
    value: 'home',
    label: 'Home',
    path: Home,
  },
  {
    value: 'info',
    label: 'Info',
    path: Info,
  },
  {
    value: 'link',
    label: 'Link',
    path: LinkIcon,
  },
  {
    value: 'lock',
    label: 'Lock',
    path: Lock,
  },
  {
    value: 'messages',
    label: 'Messages',
    path: Message,
  },
  {
    value: 'notification',
    label: 'Notification',
    path: Notification,
  },
  {
    value: 'payment',
    label: 'Payment',
    path: Payment,
  },
  {
    value: 'power',
    label: 'Power',
    path: Power,
  },
  {
    value: 'receipt',
    label: 'Receipt',
    path: Receipt,
  },
  {
    value: 'shield',
    label: 'Shield',
    path: Shield,
  },
  {
    value: 'star',
    label: 'Star',
    path: Star,
  },
  {
    value: 'tune',
    label: 'Tune',
    path: Tune,
  },
  {
    value: 'videorecorder',
    label: 'Video Recorder',
    path: Video,
  },
  {
    value: 'wallet',
    label: 'Wallet',
    path: Wallet,
  },
  {
    value: 'warning',
    label: 'Warning',
    path: Warning,
  },
  {
    value: 'person',
    label: 'Person',
    path: Person,
  },
  {
    value: 'category',
    label: 'Category',
    path: PluraCategory,
  },
  {
    value: 'clipboardIcon',
    label: 'Clipboard Icon',
    path: ClipboardIcon,
  },
]

export type EditorBtns =
  | 'text'
  | 'container'
  | 'section'
  | 'contactForm'
  | 'paymentForm'
  | 'link'
  | '2Col'
  | 'video'
  | '__body'
  | 'image'
  | 'paypal'
  | 'html'
  | null
  | '3Col'

export const defaultStyles: React.CSSProperties = {
  backgroundPosition: 'center',
  objectFit: 'cover',
  backgroundRepeat: 'no-repeat',
  textAlign: 'left',
  opacity: '100%',
}