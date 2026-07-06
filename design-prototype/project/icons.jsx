// Inline SVG icons — all stroke-based, 1.5px, currentColor
const Icon = ({ path, size = 16, fill, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill={fill || 'none'} stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round" {...props}>
    {path}
  </svg>
);

const Icons = {
  Search: (p) => <Icon {...p} path={<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>}/>,
  Plus: (p) => <Icon {...p} path={<><path d="M12 5v14M5 12h14"/></>}/>,
  Filter: (p) => <Icon {...p} path={<><path d="M3 6h18M6 12h12M10 18h4"/></>}/>,
  Arrow: (p) => <Icon {...p} path={<><path d="M5 12h14M12 5l7 7-7 7"/></>}/>,
  ArrowLeft: (p) => <Icon {...p} path={<><path d="M19 12H5M12 19l-7-7 7-7"/></>}/>,
  Check: (p) => <Icon {...p} path={<><path d="M20 6 9 17l-5-5"/></>}/>,
  CheckCircle: (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></>}/>,
  Send: (p) => <Icon {...p} path={<><path d="m22 2-11 11M22 2l-7 20-4-9-9-4Z"/></>}/>,
  Paperclip: (p) => <Icon {...p} path={<><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></>}/>,
  Image: (p) => <Icon {...p} path={<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5L3 21"/></>}/>,
  Menu: (p) => <Icon {...p} path={<><path d="M3 6h18M3 12h18M3 18h18"/></>}/>,
  Close: (p) => <Icon {...p} path={<><path d="M18 6 6 18M6 6l12 12"/></>}/>,
  Bell: (p) => <Icon {...p} path={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>}/>,
  Inbox: (p) => <Icon {...p} path={<><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></>}/>,
  Clock: (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>}/>,
  Users: (p) => <Icon {...p} path={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}/>,
  Calendar: (p) => <Icon {...p} path={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>}/>,
  Sparkle: (p) => <Icon {...p} path={<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>}/>,
  Chevron: (p) => <Icon {...p} path={<><path d="m9 18 6-6-6-6"/></>}/>,
  Upload: (p) => <Icon {...p} path={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></>}/>,
  MapPin: (p) => <Icon {...p} path={<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>}/>,
  Mail: (p) => <Icon {...p} path={<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></>}/>,
  Settings: (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></>}/>,
  Info: (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>}/>,
  Trash: (p) => <Icon {...p} path={<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>}/>,
};

window.Icons = Icons;
